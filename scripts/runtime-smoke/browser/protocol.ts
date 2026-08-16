import { createHash } from "node:crypto";
import { SmokeError, assertExactKeys, isPlainObject } from "../contracts";
import type { PlainJsonValue } from "../workers/contracts";
import {
  BROWSER_PROTOCOL_VERSION,
  DEFAULT_BROWSER_FRAME_BYTES,
  MAX_BROWSER_FRAME_BYTES,
  type BrowserActionFrame,
  type BrowserFailureFrame,
  type BrowserFrameExpectation,
  type BrowserSuccessFrame,
} from "./contracts";

const decoder = new TextDecoder("utf-8", { fatal: true });
const TOKEN = /^[a-z0-9][a-z0-9._/-]{0,159}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const FAILURE =
  /^(?:(?:wf540_|task554_|task490_)[a-z0-9_]{1,64}|playwright_(?:action_timeout|modal_state|strict_mode)|browser_action_failed)$/u;

function fail(message: string, cause?: unknown): never {
  throw new SmokeError(
    "smoke_output_invalid",
    message,
    cause === undefined ? undefined : { cause }
  );
}

export function canonicalBrowserJson(value: PlainJsonValue): string {
  if (Array.isArray(value)) return `[${value.map(canonicalBrowserJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Readonly<Record<string, PlainJsonValue>>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalBrowserJson(object[key]!)}`)
      .join(",")}}`;
  }
  if (typeof value === "number" && !Number.isFinite(value)) fail("browser JSON is not finite");
  return JSON.stringify(value);
}

function assertPlainJson(value: unknown, depth = 0): asserts value is PlainJsonValue {
  if (depth > 16) fail("browser output nesting is too deep");
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    if (value.length > 4096) fail("browser output array is too large");
    for (const nested of value) assertPlainJson(nested, depth + 1);
    return;
  }
  if (!isPlainObject(value) || Object.keys(value).length > 4096) {
    fail("browser output is not a bounded plain JSON value");
  }
  for (const nested of Object.values(value)) assertPlainJson(nested, depth + 1);
}

function common(value: Record<string, unknown>): void {
  if (
    value.schemaVersion !== BROWSER_PROTOCOL_VERSION ||
    typeof value.runId !== "string" ||
    !TOKEN.test(value.runId) ||
    typeof value.manifestSha256 !== "string" ||
    !SHA256.test(value.manifestSha256) ||
    typeof value.scenarioId !== "string" ||
    !TOKEN.test(value.scenarioId) ||
    typeof value.segmentId !== "string" ||
    !TOKEN.test(value.segmentId) ||
    !Number.isSafeInteger(value.sequence) ||
    (value.sequence as number) <= 0 ||
    typeof value.actionId !== "string" ||
    !TOKEN.test(value.actionId) ||
    typeof value.terminal !== "boolean"
  ) {
    fail("browser frame identity is invalid");
  }
}

export function validateBrowserActionFrame(value: unknown): BrowserActionFrame {
  if (!isPlainObject(value)) fail("browser frame is not a plain object");
  common(value);
  if (value.status === "success") {
    assertExactKeys(
      value,
      [
        "schemaVersion",
        "runId",
        "manifestSha256",
        "scenarioId",
        "segmentId",
        "sequence",
        "actionId",
        "terminal",
        "status",
        "output",
        "outputSha256",
      ],
      "browser success frame"
    );
    assertPlainJson(value.output);
    if (
      typeof value.outputSha256 !== "string" ||
      !SHA256.test(value.outputSha256) ||
      createHash("sha256").update(canonicalBrowserJson(value.output)).digest("hex") !==
        value.outputSha256
    ) {
      fail("browser output digest is invalid");
    }
    return Object.freeze(value) as unknown as BrowserSuccessFrame;
  }
  if (value.status === "failure") {
    assertExactKeys(
      value,
      [
        "schemaVersion",
        "runId",
        "manifestSha256",
        "scenarioId",
        "segmentId",
        "sequence",
        "actionId",
        "terminal",
        "status",
        "failureCode",
      ],
      "browser failure frame"
    );
    if (typeof value.failureCode !== "string" || !FAILURE.test(value.failureCode)) {
      fail("browser failure code is invalid");
    }
    return Object.freeze(value) as unknown as BrowserFailureFrame;
  }
  return fail("browser frame status is invalid");
}

function assertMaximum(maximumBytes: number): void {
  if (
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes <= 0 ||
    maximumBytes > MAX_BROWSER_FRAME_BYTES
  ) {
    fail("browser frame byte bound is invalid");
  }
}

export function encodeBrowserFrame(
  frame: BrowserActionFrame,
  maximumBytes = DEFAULT_BROWSER_FRAME_BYTES
): Uint8Array {
  assertMaximum(maximumBytes);
  const validated = validateBrowserActionFrame(frame);
  const bytes = Buffer.from(`${canonicalBrowserJson(validated as unknown as PlainJsonValue)}\n`);
  if (bytes.byteLength > maximumBytes) fail("browser frame exceeds its byte bound");
  return bytes;
}

export function decodeBrowserFrameStream(
  bytes: Uint8Array,
  expectation: BrowserFrameExpectation,
  maximumBytes = DEFAULT_BROWSER_FRAME_BYTES
): readonly BrowserActionFrame[] {
  assertMaximum(maximumBytes);
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > maximumBytes * expectation.actionIds.length ||
    !bytes.includes(10) ||
    bytes.at(-1) !== 10 ||
    bytes.includes(0) ||
    bytes.includes(13) ||
    expectation.actionIds.length === 0 ||
    new Set(expectation.actionIds).size !== expectation.actionIds.length
  ) {
    fail("browser frame stream shape is invalid");
  }
  let text: string;
  try {
    text = decoder.decode(bytes);
  } catch (error) {
    return fail("browser frame stream is not UTF-8", error);
  }
  const lines = text.slice(0, -1).split("\n");
  if (lines.some((line) => Buffer.byteLength(line) + 1 > maximumBytes)) {
    fail("browser frame exceeds its byte bound");
  }
  const frames = lines.map((line) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      return fail("browser frame is not JSON", error);
    }
    const frame = validateBrowserActionFrame(parsed);
    if (canonicalBrowserJson(frame as unknown as PlainJsonValue) !== line) {
      fail("browser frame is not canonical JSON");
    }
    return frame;
  });
  let failureSeen = false;
  for (const [index, frame] of frames.entries()) {
    const expectedActionId = expectation.actionIds[index];
    if (
      failureSeen ||
      expectedActionId === undefined ||
      frame.runId !== expectation.runId ||
      frame.manifestSha256 !== expectation.manifestSha256 ||
      frame.scenarioId !== expectation.scenarioId ||
      frame.segmentId !== expectation.segmentId ||
      frame.sequence !== index + 1 ||
      frame.actionId !== expectedActionId ||
      frame.terminal !== (frame.status === "failure" || index === expectation.actionIds.length - 1)
    ) {
      fail("browser frame sequence or identity drifted");
    }
    failureSeen = frame.status === "failure";
  }
  if (!failureSeen && frames.length !== expectation.actionIds.length) {
    fail("browser frame stream is incomplete");
  }
  if (failureSeen && frames.at(-1)?.status !== "failure") {
    fail("browser failure is not terminal");
  }
  return Object.freeze(frames);
}

export function successFrame(input: {
  readonly expectation: BrowserFrameExpectation;
  readonly sequence: number;
  readonly output: PlainJsonValue;
}): BrowserSuccessFrame {
  const { expectation, sequence, output } = input;
  const actionId = expectation.actionIds[sequence - 1];
  if (actionId === undefined) fail("browser success sequence is outside the segment");
  return Object.freeze({
    schemaVersion: 1,
    runId: expectation.runId,
    manifestSha256: expectation.manifestSha256,
    scenarioId: expectation.scenarioId,
    segmentId: expectation.segmentId,
    sequence,
    actionId,
    terminal: sequence === expectation.actionIds.length,
    status: "success",
    output,
    outputSha256: createHash("sha256").update(canonicalBrowserJson(output)).digest("hex"),
  });
}
