import { createHash } from "node:crypto";
import { SmokeError } from "../contracts";
import type { PlainJsonValue } from "../workers/contracts";
import type {
  BrowserActionFrame,
  BrowserFrameExpectation,
  BrowserRunCodeDispatch,
  MaterializedBrowserAction,
} from "./contracts";
import { MAX_BROWSER_BATCH_WRAPPER_BYTES, MAX_BROWSER_RUN_CODE_ARG_BYTES } from "./contracts";
import { canonicalBrowserJson, decodeBrowserFrameStream } from "./protocol";

function safeLiteral(value: string): string {
  return JSON.stringify(value)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

export function buildBatchRunCodeSource(input: {
  readonly expectation: BrowserFrameExpectation;
  readonly actions: readonly MaterializedBrowserAction[];
}): string {
  const { expectation, actions } = input;
  if (
    actions.length === 0 ||
    actions.length !== expectation.actionIds.length ||
    actions.some(
      ({ actionId, source }, index) =>
        actionId !== expectation.actionIds[index] ||
        typeof source !== "string" ||
        source.length === 0 ||
        source.includes("\0")
    )
  ) {
    throw new SmokeError("smoke_output_invalid", "browser batch source ownership drifted");
  }
  const entries = actions
    .map(({ actionId, source }) => `[${safeLiteral(actionId)},(${source})]`)
    .join(",");
  const source = `async (page) => {
    const __name = (target) => target;
    const actions = [${entries}];
    const canonicalize = (value, ancestors = new WeakSet()) => {
      if (value === null || typeof value === "string" || typeof value === "boolean") return value;
      if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("wf540_nonfinite_output");
        return value;
      }
      if (typeof value !== "object" || ancestors.has(value)) throw new Error("wf540_nonjson_output");
      ancestors.add(value);
      try {
        if (Array.isArray(value)) return value.map((item) => canonicalize(item, ancestors));
        const output = {};
        for (const key of Object.keys(value).sort()) output[key] = canonicalize(value[key], ancestors);
        return output;
      } finally {
        ancestors.delete(value);
      }
    };
    const canonicalJson = (value) => JSON.stringify(canonicalize(value));
    const projectFailure = (error) => {
      const message = typeof error?.message === "string" ? error.message : "";
      const harness = /(?:wf540_|task554_)[a-z0-9_]{1,64}/u.exec(message);
      if (harness) return harness[0];
      if (message.includes("Timeout") && message.includes("exceeded")) return "playwright_action_timeout";
      if (message.includes("does not handle the modal state")) return "playwright_modal_state";
      if (message.includes("strict mode violation")) return "playwright_strict_mode";
      return "browser_action_failed";
      return "browser_action_failed";
    };
    const rows = [];
    for (let index = 0; index < actions.length; index += 1) {
      const [actionId, execute] = actions[index];
      try {
        const output = canonicalize(await execute(page));
        rows.push({ actionId, output, sequence: index + 1, status: "success" });
      } catch (error) {
        rows.push({ actionId, failureCode: projectFailure(error), sequence: index + 1, status: "failure" });
        break;
      }
    }
    return rows.map((row) => canonicalJson(row)).join("\\n") + "\\n";
  }`;
  const actionSourceBytes = actions.reduce(
    (sum, { source: item }) => sum + Buffer.byteLength(item),
    0
  );
  const sourceBytes = Buffer.byteLength(source);
  if (
    sourceBytes > actionSourceBytes + MAX_BROWSER_BATCH_WRAPPER_BYTES ||
    sourceBytes > MAX_BROWSER_RUN_CODE_ARG_BYTES
  ) {
    throw new SmokeError("smoke_output_invalid", "browser batch wrapper exceeded its bound");
  }
  return source;
}

interface RawBatchRow {
  readonly actionId: string;
  readonly sequence: number;
  readonly status: "success" | "failure";
  readonly output?: PlainJsonValue;
  readonly failureCode?: string;
}

function decodeOuterString(stdout: Uint8Array): string {
  let outer: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(stdout);
    if (!text.endsWith("\n") || text.slice(0, -1).includes("\n")) throw new Error("shape");
    outer = JSON.parse(text.slice(0, -1));
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "browser batch output is malformed", {
      cause: error,
    });
  }
  if (typeof outer !== "string" || outer.includes("\0") || outer.includes("\r")) {
    throw new SmokeError("smoke_output_invalid", "browser batch output is not framed text");
  }
  return outer;
}

export function decodePlaywrightBatchOutput(
  stdout: Uint8Array,
  expectation: BrowserFrameExpectation
): readonly BrowserActionFrame[] {
  const inner = decodeOuterString(stdout);
  if (!inner.endsWith("\n")) {
    throw new SmokeError("smoke_output_invalid", "browser batch output is partial");
  }
  const rows = inner
    .slice(0, -1)
    .split("\n")
    .map((line): RawBatchRow => {
      try {
        return JSON.parse(line) as RawBatchRow;
      } catch (error) {
        throw new SmokeError("smoke_output_invalid", "browser batch row is malformed", {
          cause: error,
        });
      }
    });
  const wire = rows.map((row, index) => {
    const base = {
      schemaVersion: 1,
      runId: expectation.runId,
      manifestSha256: expectation.manifestSha256,
      scenarioId: expectation.scenarioId,
      segmentId: expectation.segmentId,
      sequence: row.sequence,
      actionId: row.actionId,
      terminal: row.status === "failure" || index === expectation.actionIds.length - 1,
      status: row.status,
    };
    if (row.status === "failure") return { ...base, failureCode: row.failureCode };
    const outputJson = canonicalBrowserJson(row.output as PlainJsonValue);
    return {
      ...base,
      output: row.output,
      outputSha256: createHash("sha256").update(outputJson).digest("hex"),
    };
  });
  return decodeBrowserFrameStream(
    Buffer.from(
      `${wire.map((frame) => canonicalBrowserJson(frame as PlainJsonValue)).join("\n")}\n`
    ),
    expectation
  );
}

export function logicalSuccessBytes(frame: BrowserActionFrame): Buffer {
  if (frame.status !== "success") {
    throw new SmokeError("smoke_output_invalid", "browser frame is not successful");
  }
  const body = canonicalBrowserJson(frame.output);
  if (createHash("sha256").update(body).digest("hex") !== frame.outputSha256) {
    throw new SmokeError("smoke_output_invalid", "browser frame digest drifted");
  }
  return Buffer.from(`${body}\n`);
}

export function logicalFailureBytes(frame: BrowserActionFrame): Buffer {
  if (frame.status !== "failure") {
    throw new SmokeError("smoke_output_invalid", "browser frame is not a failure");
  }
  return Buffer.from(`### Error\nError: ${frame.failureCode}\n`);
}

export function materializedSourceBytes(
  segment: BrowserRunCodeDispatch,
  actions: readonly MaterializedBrowserAction[]
): ReadonlyMap<string, number> {
  if (
    segment.actionIds.length !== actions.length ||
    actions.some(({ actionId }, index) => actionId !== segment.actionIds[index])
  ) {
    throw new SmokeError("smoke_output_invalid", "browser materialization order drifted");
  }
  return new Map(actions.map(({ actionId, source }) => [actionId, Buffer.byteLength(source)]));
}
