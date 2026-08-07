import { expect, test } from "bun:test";
import {
  compileTask540BrowserDispatchPlan,
  TASK_540_EXPECTED_BROWSER_TOTALS,
} from "../../../scripts/runtime-smoke/adapters/task-540/browser-segments";
import { createTask540BrowserExecutor } from "../../../scripts/runtime-smoke/adapters/task-540/browser-executor";
import { buildTask540NativePlan } from "../../../scripts/runtime-smoke/adapters/task-540/suite/composition/plan.mjs";
import type { Task540NativePlan } from "../../../scripts/runtime-smoke/adapters/task-540/suite/composition/contracts";
import {
  buildBatchRunCodeSource,
  materializedSourceBytes,
} from "../../../scripts/runtime-smoke/browser/action-frames";
import { MAX_BROWSER_RUN_CODE_ARG_BYTES } from "../../../scripts/runtime-smoke/browser/contracts";
import { splitMaterializedSegment } from "../../../scripts/runtime-smoke/browser/segment-compiler";
import { successFrame } from "../../../scripts/runtime-smoke/browser/protocol";

test("TASK-540 native manifest compiles to exact 47 batches plus 28 standalone dispatches", () => {
  const plan = buildTask540NativePlan({ nonce: "0123456789ab" }) as Task540NativePlan;
  const compiled = compileTask540BrowserDispatchPlan(plan);
  expect(compiled).toMatchObject({
    logicalBrowserActions: 420,
    runCodeActions: 392,
    runCodeBatches: 47,
    standaloneActions: 28,
    physicalDispatches: 75,
  });
  expect(TASK_540_EXPECTED_BROWSER_TOTALS).toEqual({
    actions: 496,
    browser: 420,
    runtime: 76,
    runCode: 392,
    runCodeBatchesBeforeSizeSplits: 47,
    standalone: 28,
    dispatchesBeforeSizeSplits: 75,
  });
  const runCode = compiled.dispatches.filter(({ kind }) => kind === "run-code");
  const countsByScenario = Object.fromEntries(
    [...new Set(runCode.map(({ scenarioId }) => scenarioId))].map((scenarioId) => [
      scenarioId,
      runCode
        .filter((dispatch) => dispatch.scenarioId === scenarioId)
        .map((dispatch) => (dispatch.kind === "run-code" ? dispatch.actionIds.length : 0)),
    ])
  );
  expect(countsByScenario).toEqual({
    setup: [3, 1, 1, 1],
    "button-image": [5, 23, 19, 5, 8, 3, 1, 6],
    "tabs-content": [7, 8, 6, 6, 13, 6],
    "tabs-keyboard-aria": [8, 20, 7],
    "space-selection": [22, 6],
    "dirty-guards": [7, 24, 8, 6],
    "related-retry-cache": [4, 14, 3, 10, 3, 9],
    "responsive-users": [36, 2, 4, 1, 13, 7, 6, 5, 15, 14, 6, 6],
    cleanup: [1, 3],
  });
  const browserIds = compiled.dispatches.flatMap((dispatch) =>
    dispatch.kind === "run-code" ? dispatch.actionIds : [dispatch.actionId]
  );
  expect(browserIds).toEqual(
    plan.actionManifest
      .filter(({ executable }) => executable.type !== "runtime-operation")
      .map(({ id }) => id)
  );

  const oversized = runCode.find(
    (dispatch) =>
      dispatch.kind === "run-code" && dispatch.actionIds[0] === "bi-006-bound-open-primary"
  );
  if (oversized?.kind !== "run-code") throw new Error("expected TASK-540 bi-006 segment");
  const materialized = oversized.actionIds.map((actionId) => ({
    actionId,
    source: `async () => ${JSON.stringify("x".repeat(20_000))}`,
  }));
  const partitions = splitMaterializedSegment(
    oversized,
    materializedSourceBytes(oversized, materialized)
  );
  expect(partitions.length).toBeGreaterThan(1);
  expect(partitions.flatMap(({ actionIds }) => actionIds)).toEqual(oversized.actionIds);
  let offset = 0;
  for (const partition of partitions) {
    const actions = materialized.slice(offset, offset + partition.actionIds.length);
    offset += partition.actionIds.length;
    const source = buildBatchRunCodeSource({
      expectation: {
        runId: "wf540-size-test",
        manifestSha256: "b".repeat(64),
        scenarioId: partition.scenarioId,
        segmentId: partition.segmentId,
        actionIds: partition.actionIds,
      },
      actions,
    });
    expect(Buffer.byteLength(source)).toBeLessThanOrEqual(MAX_BROWSER_RUN_CODE_ARG_BYTES);
  }
});

test("TASK-540 browser executor preserves logical order and proof ownership across size splits", async () => {
  const manifestSha256 = "a".repeat(64);
  const dispatchPlan = {
    schemaVersion: 1 as const,
    dispatches: [
      {
        schemaVersion: 1 as const,
        kind: "run-code" as const,
        segmentId: "segment-0001",
        scenarioId: "scenario",
        actionIds: ["a", "b", "c"],
        estimatedSourceBytes: 0,
      },
    ],
    logicalBrowserActions: 3,
    runCodeActions: 3,
    runCodeBatches: 1,
    standaloneActions: 0,
    physicalDispatches: 1,
  };
  const events: string[] = [];
  const proofBySegment = new Map<string, object>();
  const executor = createTask540BrowserExecutor({
    dispatchPlan,
    runId: "run-1",
    manifestSha256,
    async materializeSegment(segment) {
      return {
        segment,
        actions: segment.actionIds.map((actionId) => ({ actionId, source: "async () => true" })),
      };
    },
    splitMaterializedSegment(materialized) {
      return [
        {
          segment: {
            ...materialized.segment,
            segmentId: "segment-0001-part-01",
            actionIds: ["a", "b"],
          },
          actions: materialized.actions.slice(0, 2),
        },
        {
          segment: { ...materialized.segment, segmentId: "segment-0001-part-02", actionIds: ["c"] },
          actions: materialized.actions.slice(2),
        },
      ];
    },
    async dispatchSegment(materialized, expectation) {
      events.push(`dispatch:${materialized.segment.segmentId}`);
      const proof = {};
      proofBySegment.set(materialized.segment.segmentId, proof);
      return {
        frames: expectation.actionIds.map((_, index) =>
          successFrame({ expectation, sequence: index + 1, output: index + 1 })
        ),
        proof,
      };
    },
    async projectFrame(request, frame, proof) {
      const segmentId = request.actionId === "c" ? "segment-0001-part-02" : "segment-0001-part-01";
      expect(proof).toBe(proofBySegment.get(segmentId));
      events.push(`project:${request.actionId}:${segmentId}`);
      return frame.actionId;
    },
    async executeStandalone() {
      throw new Error("unexpected standalone action");
    },
  });
  for (const actionId of ["a", "b", "c"]) {
    expect(await executor.executePrepared({ actionId, executableType: "browser-run-code" })).toBe(
      actionId
    );
  }
  expect(events).toEqual([
    "dispatch:segment-0001-part-01",
    "dispatch:segment-0001-part-02",
    "project:a:segment-0001-part-01",
    "project:b:segment-0001-part-01",
    "project:c:segment-0001-part-02",
  ]);
  expect(() => executor.assertDrained()).not.toThrow();
});
