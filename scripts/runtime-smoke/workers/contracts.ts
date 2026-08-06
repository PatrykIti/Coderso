import { SmokeError, assertExactKeys, isPlainObject } from "../contracts";

export const WORKER_PROTOCOL_VERSION = 1 as const;
export const DEFAULT_WORKER_FRAME_BYTES = 256 * 1024;
export const MAX_WORKER_FRAME_BYTES = 1024 * 1024;

export type PlainJsonScalar = null | boolean | number | string;
export type PlainJsonValue =
  PlainJsonScalar | readonly PlainJsonValue[] | { readonly [key: string]: PlainJsonValue };
export type PlainJsonObject = { readonly [key: string]: PlainJsonValue };

export const WORKER_ERROR_CODES = ["operation_failed", "output_invalid", "worker_closing"] as const;

export type WorkerErrorCode = (typeof WORKER_ERROR_CODES)[number];
export type WorkerRetryClass = "idempotent-read" | "mutation";

export interface WorkerRequestFrame {
  readonly protocol: typeof WORKER_PROTOCOL_VERSION;
  readonly requestId: number;
  readonly operationId: string;
  readonly inputSchemaId: string;
  readonly sourceSha256: string;
  readonly input: PlainJsonObject;
}

export interface WorkerSuccessFrame {
  readonly protocol: typeof WORKER_PROTOCOL_VERSION;
  readonly requestId: number;
  readonly ok: true;
  readonly output: PlainJsonValue;
}

export interface WorkerFailureFrame {
  readonly protocol: typeof WORKER_PROTOCOL_VERSION;
  readonly requestId: number;
  readonly ok: false;
  readonly code: WorkerErrorCode;
}

export type WorkerResponseFrame = WorkerSuccessFrame | WorkerFailureFrame;

export interface WorkerOperationDescriptor {
  readonly operationId: string;
  readonly profileId: string;
  readonly inputSchemaId: string;
  readonly outputSchemaId: string;
  readonly sourceSha256: string;
  readonly retryClass: WorkerRetryClass;
  readonly maxInputBytes?: number;
  readonly maxOutputBytes?: number;
}

export interface WorkerOperationContext {
  readonly profileId: string;
  readonly requestId: number;
}

export interface WorkerOperationDefinition<
  TInput extends PlainJsonObject = PlainJsonObject,
  TOutput extends PlainJsonValue = PlainJsonValue,
> extends WorkerOperationDescriptor {
  validateInput(value: unknown): TInput;
  validateOutput(value: unknown): TOutput;
  execute(input: TInput, context: WorkerOperationContext): Promise<TOutput>;
}

export interface WorkerPoolCounters {
  readonly starts: number;
  readonly requests: number;
  readonly reconnects: number;
  readonly databaseBatches: number;
  readonly statements: number;
  readonly rows: number;
}

export class WorkerProtocolError extends SmokeError {
  constructor(message: string, options?: ErrorOptions) {
    super("smoke_output_invalid", message, options);
    this.name = "WorkerProtocolError";
  }
}

export class WorkerDispatchError extends SmokeError {
  readonly dispatched: boolean;

  constructor(message: string, dispatched: boolean, options?: ErrorOptions) {
    super("smoke_process_failed", message, options);
    this.name = "WorkerDispatchError";
    this.dispatched = dispatched;
  }
}

export function assertWorkerToken(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9][a-z0-9./_-]{0,127}$/u.test(value) ||
    value.includes("..")
  ) {
    throw new WorkerProtocolError(`${label} is invalid`);
  }
}

export function assertSha256(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new WorkerProtocolError(`${label} is invalid`);
  }
}

export function assertPositiveRequestId(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new WorkerProtocolError("worker request ID is invalid");
  }
}

export function assertPlainJson(value: unknown, label: string): asserts value is PlainJsonValue {
  const stack: Array<{ readonly value: unknown; readonly depth: number }> = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    nodes += 1;
    if (nodes > 100_000 || current.depth > 64) {
      throw new WorkerProtocolError(`${label} exceeds JSON bounds`);
    }
    const nested = current.value;
    if (nested === null || typeof nested === "string" || typeof nested === "boolean") continue;
    if (typeof nested === "number") {
      if (!Number.isFinite(nested))
        throw new WorkerProtocolError(`${label} has a non-finite number`);
      continue;
    }
    if (Array.isArray(nested)) {
      if (nested.length > 10_000) throw new WorkerProtocolError(`${label} array is too large`);
      for (const child of nested) stack.push({ value: child, depth: current.depth + 1 });
      continue;
    }
    if (!isPlainObject(nested)) throw new WorkerProtocolError(`${label} is not plain JSON`);
    const entries = Object.entries(nested);
    if (entries.length > 10_000) throw new WorkerProtocolError(`${label} object is too large`);
    for (const [key, child] of entries) {
      if (key.includes("\0") || Buffer.byteLength(key) > 512) {
        throw new WorkerProtocolError(`${label} key is invalid`);
      }
      stack.push({ value: child, depth: current.depth + 1 });
    }
  }
}

export function assertPlainJsonObject(
  value: unknown,
  label: string
): asserts value is PlainJsonObject {
  if (!isPlainObject(value)) throw new WorkerProtocolError(`${label} must be an object`);
  assertPlainJson(value, label);
}

export function validateWorkerRequestShape(value: unknown): WorkerRequestFrame {
  if (!isPlainObject(value)) throw new WorkerProtocolError("worker request must be an object");
  assertExactKeys(
    value,
    ["protocol", "requestId", "operationId", "inputSchemaId", "sourceSha256", "input"],
    "worker request"
  );
  if (value.protocol !== WORKER_PROTOCOL_VERSION) {
    throw new WorkerProtocolError("worker protocol version is unsupported");
  }
  assertPositiveRequestId(value.requestId);
  assertWorkerToken(value.operationId, "worker operation ID");
  assertWorkerToken(value.inputSchemaId, "worker input schema ID");
  assertSha256(value.sourceSha256, "worker source digest");
  assertPlainJsonObject(value.input, "worker input");
  return value as unknown as WorkerRequestFrame;
}

export function validateWorkerResponseShape(value: unknown): WorkerResponseFrame {
  if (!isPlainObject(value)) throw new WorkerProtocolError("worker response must be an object");
  if (value.ok === true) {
    assertExactKeys(value, ["protocol", "requestId", "ok", "output"], "worker response");
    if (value.protocol !== WORKER_PROTOCOL_VERSION) {
      throw new WorkerProtocolError("worker protocol version is unsupported");
    }
    assertPositiveRequestId(value.requestId);
    assertPlainJson(value.output, "worker output");
    return value as unknown as WorkerSuccessFrame;
  }
  assertExactKeys(value, ["protocol", "requestId", "ok", "code"], "worker response");
  if (value.protocol !== WORKER_PROTOCOL_VERSION || value.ok !== false) {
    throw new WorkerProtocolError("worker failure response is invalid");
  }
  assertPositiveRequestId(value.requestId);
  if (!WORKER_ERROR_CODES.includes(value.code as WorkerErrorCode)) {
    throw new WorkerProtocolError("worker failure code is unknown");
  }
  return value as unknown as WorkerFailureFrame;
}

export function validateWorkerDescriptor(descriptor: WorkerOperationDescriptor): void {
  assertWorkerToken(descriptor.operationId, "worker operation ID");
  assertWorkerToken(descriptor.profileId, "worker profile ID");
  assertWorkerToken(descriptor.inputSchemaId, "worker input schema ID");
  assertWorkerToken(descriptor.outputSchemaId, "worker output schema ID");
  assertSha256(descriptor.sourceSha256, "worker source digest");
  if (!new Set<WorkerRetryClass>(["idempotent-read", "mutation"]).has(descriptor.retryClass)) {
    throw new WorkerProtocolError("worker retry class is invalid");
  }
  for (const [label, bound] of [
    ["input", descriptor.maxInputBytes],
    ["output", descriptor.maxOutputBytes],
  ] as const) {
    if (
      bound !== undefined &&
      (!Number.isSafeInteger(bound) || bound <= 0 || bound > MAX_WORKER_FRAME_BYTES)
    ) {
      throw new WorkerProtocolError(`worker ${label} bound is invalid`);
    }
  }
}
