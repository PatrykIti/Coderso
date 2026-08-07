import { isPlainObject, SmokeError } from "../../../../contracts";
import type { PlainJsonValue } from "../../../../workers/contracts";
import type { Task540NativeAction, Task540NativePlan } from "./contracts";

function captureObject(value: PlainJsonValue): Readonly<Record<string, PlainJsonValue>> | null {
  if (!isPlainObject(value)) return null;
  const candidate = value.captureBindings;
  return isPlainObject(candidate) ? (candidate as Readonly<Record<string, PlainJsonValue>>) : null;
}

function captureCandidate(output: PlainJsonValue, name: string): unknown {
  const declared = captureObject(output)?.[name];
  if (declared !== undefined) return declared;
  if (!isPlainObject(output)) return undefined;
  if (name.endsWith(".id")) {
    return typeof output.id === "string" ? output.id : output.userId;
  }
  if (name === "media.resolved-url") {
    return output.resolvedUrl ?? output.url;
  }
  if (name === "media.storage-key") {
    return output.storageKey ?? output.key;
  }
  return undefined;
}

export class Task540ExecutionMemory {
  readonly #plan: Task540NativePlan;
  readonly #captures = new Map<string, string>();
  readonly #priorOutputs = new Map<string, PlainJsonValue>();
  readonly #variables = new Map<string, PlainJsonValue>();
  readonly #privateProjections = new Map<string, PlainJsonValue>();
  #csrfHeaderName: string | null = null;
  #authRatePolicy: Readonly<Record<string, PlainJsonValue>> | null = null;

  constructor(plan: Task540NativePlan) {
    this.#plan = plan;
  }

  get captures(): ReadonlyMap<string, string> {
    return this.#captures;
  }

  get priorOutputs(): ReadonlyMap<string, PlainJsonValue> {
    return this.#priorOutputs;
  }

  get variables(): ReadonlyMap<string, PlainJsonValue> {
    return this.#variables;
  }

  runtimeConfig(): {
    readonly csrfHeaderName: string;
    readonly authRatePolicy: Readonly<Record<string, PlainJsonValue>>;
  } {
    if (this.#csrfHeaderName === null || this.#authRatePolicy === null) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 browser runtime config is absent");
    }
    return Object.freeze({
      csrfHeaderName: this.#csrfHeaderName,
      authRatePolicy: this.#authRatePolicy,
    });
  }

  setRuntimeConfig(input: {
    readonly csrfHeaderName: string;
    readonly authRatePolicy: Readonly<Record<string, PlainJsonValue>>;
  }): void {
    if (
      this.#csrfHeaderName !== null ||
      this.#authRatePolicy !== null ||
      typeof input.csrfHeaderName !== "string" ||
      !/^[a-z0-9][a-z0-9-]{0,127}$/u.test(input.csrfHeaderName) ||
      !isPlainObject(input.authRatePolicy)
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 browser runtime config drifted");
    }
    this.#csrfHeaderName = input.csrfHeaderName;
    this.#authRatePolicy = Object.freeze({ ...input.authRatePolicy });
  }

  privateProjection(id: string): PlainJsonValue {
    const value = this.#privateProjections.get(id);
    if (value === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 private projection is absent");
    }
    return value;
  }

  record(action: Task540NativeAction, output: PlainJsonValue): void {
    if (this.#priorOutputs.has(action.id)) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 output was recorded twice");
    }
    const declared = [
      ...(this.#plan.fixtureCaptureBindings[action.id] ?? []),
      ...(this.#plan.runtimeCaptureBindings[action.id] ?? []),
    ];
    for (const name of declared) {
      const value = captureCandidate(output, name);
      if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.length > 2_048 ||
        value.includes("\0") ||
        this.#captures.has(name)
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 declared capture is invalid");
      }
      this.#captures.set(name, value);
    }
    this.#priorOutputs.set(action.id, output);
    const outputContract = this.#plan.registries.outputs[action.outputSchemaId];
    if (outputContract === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 output contract is absent");
    }
    if (outputContract.rememberAs !== null) {
      if (this.#variables.has(outputContract.rememberAs)) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 variable was assigned twice");
      }
      this.#variables.set(outputContract.rememberAs, output);
    }
    const privateContract = this.#plan.registries.privateProjectionBindings;
    if (privateContract.producerActionIds.includes(action.id)) {
      if (
        action.outputSchemaId !== privateContract.outputSchemaId ||
        this.#privateProjections.has(privateContract.authorityId)
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 private projection drifted");
      }
      this.#privateProjections.set(privateContract.authorityId, output);
    }
  }
}
