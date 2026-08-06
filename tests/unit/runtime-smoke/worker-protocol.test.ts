import { expect, test } from "bun:test";
import {
  WORKER_PROTOCOL_VERSION,
  type WorkerRequestFrame,
} from "../../../scripts/runtime-smoke/workers/contracts";
import {
  canonicalWorkerJson,
  createWorkerRequestDecoder,
  decodeWorkerRequestLine,
  encodeWorkerFrame,
} from "../../../scripts/runtime-smoke/workers/protocol";

const request: WorkerRequestFrame = Object.freeze({
  protocol: WORKER_PROTOCOL_VERSION,
  requestId: 1,
  operationId: "runtime-smoke/echo",
  inputSchemaId: "echo-input-v1",
  sourceSha256: "a".repeat(64),
  input: Object.freeze({ nested: Object.freeze({ z: 1, a: true }) }),
});

test("worker protocol emits canonical bounded NDJSON and accepts fragmented input", () => {
  const encoded = encodeWorkerFrame(request);
  const text = new TextDecoder().decode(encoded);
  expect(text).toBe(`${canonicalWorkerJson(request)}\n`);
  expect(text.indexOf('"input"')).toBeLessThan(text.indexOf('"operationId"'));
  expect(text.indexOf('"a"')).toBeLessThan(text.indexOf('"z"'));

  const decoder = createWorkerRequestDecoder();
  expect(decoder.push(encoded.subarray(0, 17))).toEqual([]);
  expect(decoder.push(encoded.subarray(17))).toEqual([request]);
  decoder.finish();
});

test("worker protocol rejects unknown fields, non-canonical JSON, invalid UTF-8, and bounds", () => {
  const unknown = Buffer.from(`${JSON.stringify({ ...request, unexpected: true })}\n`).subarray(
    0,
    -1
  );
  expect(() => decodeWorkerRequestLine(unknown)).toThrow("unknown or missing fields");

  const nonCanonical = Buffer.from(JSON.stringify(request));
  expect(() => decodeWorkerRequestLine(nonCanonical)).toThrow("not canonical JSON");
  expect(() => decodeWorkerRequestLine(Uint8Array.from([0xc3, 0x28]))).toThrow("valid UTF-8");
  expect(() => encodeWorkerFrame(request, 32)).toThrow("exceeds its byte bound");

  const decoder = createWorkerRequestDecoder(64);
  expect(() => decoder.push("x".repeat(65))).toThrow("exceeds its byte bound");
  const partial = createWorkerRequestDecoder();
  partial.push("{}");
  expect(() => partial.finish()).toThrow("partial frame");
});
