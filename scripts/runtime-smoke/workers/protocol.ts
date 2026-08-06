import {
  DEFAULT_WORKER_FRAME_BYTES,
  MAX_WORKER_FRAME_BYTES,
  WorkerProtocolError,
  type PlainJsonValue,
  type WorkerRequestFrame,
  type WorkerResponseFrame,
  validateWorkerRequestShape,
  validateWorkerResponseShape,
} from "./contracts";

const utf8 = new TextDecoder("utf-8", { fatal: true });

function canonicalize(value: PlainJsonValue): PlainJsonValue {
  if (Array.isArray(value)) return value.map((nested) => canonicalize(nested)) as PlainJsonValue;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }
  return value;
}

export function canonicalWorkerJson(
  value: PlainJsonValue | WorkerRequestFrame | WorkerResponseFrame
): string {
  return JSON.stringify(canonicalize(value as unknown as PlainJsonValue));
}

function assertFrameBound(maximumBytes: number): void {
  if (
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes <= 0 ||
    maximumBytes > MAX_WORKER_FRAME_BYTES
  ) {
    throw new WorkerProtocolError("worker frame bound is invalid");
  }
}

export function encodeWorkerFrame(
  frame: WorkerRequestFrame | WorkerResponseFrame,
  maximumBytes = DEFAULT_WORKER_FRAME_BYTES
): Uint8Array {
  assertFrameBound(maximumBytes);
  const bytes = Buffer.from(`${canonicalWorkerJson(frame)}\n`);
  if (bytes.byteLength > maximumBytes) {
    throw new WorkerProtocolError("worker frame exceeds its byte bound");
  }
  return bytes;
}

function decodeCanonicalLine<T>(
  line: Uint8Array,
  validator: (value: unknown) => T,
  maximumBytes: number
): T {
  assertFrameBound(maximumBytes);
  if (line.byteLength === 0 || line.byteLength + 1 > maximumBytes) {
    throw new WorkerProtocolError("worker frame has an invalid size");
  }
  let text: string;
  try {
    text = utf8.decode(line);
  } catch (error) {
    throw new WorkerProtocolError("worker frame is not valid UTF-8", { cause: error });
  }
  if (text.includes("\0") || text.includes("\r") || text.includes("\n")) {
    throw new WorkerProtocolError("worker frame contains a forbidden delimiter");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new WorkerProtocolError("worker frame is not JSON", { cause: error });
  }
  const validated = validator(parsed);
  if (canonicalWorkerJson(validated as PlainJsonValue) !== text) {
    throw new WorkerProtocolError("worker frame is not canonical JSON");
  }
  return validated;
}

export function decodeWorkerRequestLine(
  line: Uint8Array,
  maximumBytes = DEFAULT_WORKER_FRAME_BYTES
): WorkerRequestFrame {
  return decodeCanonicalLine(line, validateWorkerRequestShape, maximumBytes);
}

export function decodeWorkerResponseLine(
  line: Uint8Array,
  maximumBytes = DEFAULT_WORKER_FRAME_BYTES
): WorkerResponseFrame {
  return decodeCanonicalLine(line, validateWorkerResponseShape, maximumBytes);
}

export class NdjsonFrameDecoder<T> {
  readonly #maximumBytes: number;
  readonly #decode: (line: Uint8Array, maximumBytes: number) => T;
  #buffer = Buffer.alloc(0);

  constructor(
    decode: (line: Uint8Array, maximumBytes: number) => T,
    maximumBytes = DEFAULT_WORKER_FRAME_BYTES
  ) {
    assertFrameBound(maximumBytes);
    this.#maximumBytes = maximumBytes;
    this.#decode = decode;
  }

  push(chunk: Uint8Array | string): readonly T[] {
    const bytes = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk);
    if (bytes.includes(0) || bytes.includes(13)) {
      throw new WorkerProtocolError("worker stream contains a forbidden byte");
    }
    this.#buffer = Buffer.concat([this.#buffer, bytes]);
    if (this.#buffer.byteLength > this.#maximumBytes && !this.#buffer.includes(10)) {
      throw new WorkerProtocolError("worker frame exceeds its byte bound");
    }
    const frames: T[] = [];
    for (;;) {
      const newline = this.#buffer.indexOf(10);
      if (newline < 0) break;
      if (newline + 1 > this.#maximumBytes) {
        throw new WorkerProtocolError("worker frame exceeds its byte bound");
      }
      const line = this.#buffer.subarray(0, newline);
      this.#buffer = this.#buffer.subarray(newline + 1);
      frames.push(this.#decode(line, this.#maximumBytes));
    }
    if (this.#buffer.byteLength > this.#maximumBytes) {
      throw new WorkerProtocolError("worker frame exceeds its byte bound");
    }
    return Object.freeze(frames);
  }

  finish(): void {
    if (this.#buffer.byteLength !== 0) {
      throw new WorkerProtocolError("worker stream ended with a partial frame");
    }
  }
}

export function createWorkerRequestDecoder(
  maximumBytes = DEFAULT_WORKER_FRAME_BYTES
): NdjsonFrameDecoder<WorkerRequestFrame> {
  return new NdjsonFrameDecoder(decodeWorkerRequestLine, maximumBytes);
}

export function createWorkerResponseDecoder(
  maximumBytes = DEFAULT_WORKER_FRAME_BYTES
): NdjsonFrameDecoder<WorkerResponseFrame> {
  return new NdjsonFrameDecoder(decodeWorkerResponseLine, maximumBytes);
}
