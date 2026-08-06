import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { BrowserTransport } from "../../../scripts/runtime-smoke/browser/transport";
import type {
  BrowserFrameExpectation,
  BrowserTransportDispatch,
} from "../../../scripts/runtime-smoke/browser/contracts";
import {
  decodeBrowserFrameStream,
  encodeBrowserFrame,
  successFrame,
} from "../../../scripts/runtime-smoke/browser/protocol";
import {
  logicalFailureBytes,
  logicalSuccessBytes,
} from "../../../scripts/runtime-smoke/browser/action-frames";

const expectation: BrowserFrameExpectation = {
  runId: "run-1",
  manifestSha256: createHash("sha256").update("manifest").digest("hex"),
  scenarioId: "scenario",
  segmentId: "segment-0001",
  actionIds: ["a", "b", "c"],
};

test("browser protocol rejects incomplete, duplicate, and digest-drifted frames", () => {
  const first = successFrame({ expectation, sequence: 1, output: { ok: true } });
  expect(() => decodeBrowserFrameStream(encodeBrowserFrame(first), expectation)).toThrow();
  const complete = [
    first,
    successFrame({ expectation, sequence: 2, output: { value: 2 } }),
    successFrame({ expectation, sequence: 3, output: { value: 3 } }),
  ];
  const encoded = Buffer.concat(complete.map((frame) => encodeBrowserFrame(frame)));
  expect(decodeBrowserFrameStream(encoded, expectation)).toHaveLength(3);
  const duplicate = Buffer.concat([encodeBrowserFrame(first), encodeBrowserFrame(first)]);
  expect(() => decodeBrowserFrameStream(duplicate, expectation)).toThrow();
  const tampered = Buffer.from(encoded.toString("utf8").replace('"value":2', '"value":9'));
  expect(() => decodeBrowserFrameStream(tampered, expectation)).toThrow();
});

test("browser transport batches action sources and preserves exact logical output bytes", async () => {
  let closed = false;
  const dispatcher = {
    async dispatch(request: BrowserTransportDispatch): Promise<Uint8Array> {
      const execute = (0, eval)(`(${request.source})`) as (page: object) => Promise<string>;
      const inner = await execute({});
      return Buffer.from(`${JSON.stringify(inner)}\n`);
    },
    async close(): Promise<void> {
      closed = true;
    },
    async proveAbsent(): Promise<boolean> {
      return closed;
    },
  };
  const transport = new BrowserTransport("wf552-browser", dispatcher);
  const frames = await transport.runSegment(
    {
      segment: {
        schemaVersion: 1,
        kind: "run-code",
        segmentId: "segment-0001",
        scenarioId: "scenario",
        actionIds: ["a", "b", "c"],
        estimatedSourceBytes: 0,
      },
      actions: [
        { actionId: "a", source: "async () => ({ z: 2, a: 1 })" },
        { actionId: "b", source: "async () => true" },
        { actionId: "c", source: "async () => ({ ok: true })" },
      ],
    },
    expectation
  );
  expect(logicalSuccessBytes(frames[0]!).toString("utf8")).toBe('{"a":1,"z":2}\n');
  expect(transport.counters()).toEqual({
    clientProcesses: 1,
    segments: 1,
    frames: 3,
    fallbacks: 0,
    retries: 0,
  });
  await transport.close();
  expect(await transport.proveAbsent()).toBe(true);
});

test("browser transport retains a successful prefix and one closed terminal failure", async () => {
  const dispatcher = {
    async dispatch(request: BrowserTransportDispatch): Promise<Uint8Array> {
      const execute = (0, eval)(`(${request.source})`) as (page: object) => Promise<string>;
      return Buffer.from(`${JSON.stringify(await execute({}))}\n`);
    },
    async close(): Promise<void> {},
    async proveAbsent(): Promise<boolean> {
      return true;
    },
  };
  const transport = new BrowserTransport("wf552-failure", dispatcher);
  const frames = await transport.runSegment(
    {
      segment: {
        schemaVersion: 1,
        kind: "run-code",
        segmentId: "segment-0001",
        scenarioId: "scenario",
        actionIds: ["a", "b", "c"],
        estimatedSourceBytes: 0,
      },
      actions: [
        { actionId: "a", source: "async () => ({ ok: true })" },
        { actionId: "b", source: 'async () => { throw new Error("wf540_target_missing") }' },
        { actionId: "c", source: 'async () => { throw new Error("must_not_run") }' },
      ],
    },
    expectation
  );
  expect(frames.map(({ actionId, status }) => [actionId, status])).toEqual([
    ["a", "success"],
    ["b", "failure"],
  ]);
  expect(logicalFailureBytes(frames[1]!).toString("utf8")).toBe(
    "### Error\nError: wf540_target_missing\n"
  );
});
