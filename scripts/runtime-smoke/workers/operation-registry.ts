import { createHash } from "node:crypto";
import { assertExactKeys, isPlainObject } from "../contracts";
import {
  WORKER_PROTOCOL_VERSION,
  WorkerProtocolError,
  assertPlainJson,
  validateWorkerDescriptor,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerFailureFrame,
  type WorkerOperationDefinition,
  type WorkerOperationDescriptor,
  type WorkerRequestFrame,
  type WorkerResponseFrame,
} from "./contracts";

export interface WorkerRegistryHooks {
  readonly close?: () => Promise<void>;
  readonly proveAbsent?: () => Promise<boolean>;
}

export const SELF_TEST_WORKER_PROFILE_ID = "self-test";
export const SELF_TEST_WORKER_PROFILE_IDS = ["self-test", "self-test-a", "self-test-b"] as const;
export const SELF_TEST_ECHO_DESCRIPTOR: WorkerOperationDescriptor = Object.freeze({
  operationId: "runtime-smoke/echo",
  profileId: SELF_TEST_WORKER_PROFILE_ID,
  inputSchemaId: "echo-input-v1",
  outputSchemaId: "echo-output-v1",
  sourceSha256: createHash("sha256").update("runtime-smoke/echo-v1").digest("hex"),
  retryClass: "idempotent-read",
  maxInputBytes: 4096,
  maxOutputBytes: 4096,
});
export const SELF_TEST_MUTATION_DESCRIPTOR: WorkerOperationDescriptor = Object.freeze({
  operationId: "runtime-smoke/mutation",
  profileId: SELF_TEST_WORKER_PROFILE_ID,
  inputSchemaId: "mutation-input-v1",
  outputSchemaId: "mutation-output-v1",
  sourceSha256: createHash("sha256").update("runtime-smoke/mutation-v1").digest("hex"),
  retryClass: "mutation",
  maxInputBytes: 4096,
  maxOutputBytes: 4096,
});

export const SELF_TEST_PROFILE_DESCRIPTORS: Readonly<Record<"a" | "b", WorkerOperationDescriptor>> =
  Object.freeze(
    Object.fromEntries(
      (["a", "b"] as const).map((suffix) => [
        suffix,
        Object.freeze({
          operationId: `runtime-smoke/profile-${suffix}`,
          profileId: `self-test-${suffix}`,
          inputSchemaId: "empty-input-v1",
          outputSchemaId: "profile-output-v1",
          sourceSha256: createHash("sha256")
            .update(`runtime-smoke/profile-${suffix}-v1`)
            .digest("hex"),
          retryClass: "idempotent-read" as const,
          maxInputBytes: 4096,
          maxOutputBytes: 4096,
        }),
      ])
    ) as Record<"a" | "b", WorkerOperationDescriptor>
  );

export function createSelfTestWorkerRegistry(
  hooks: WorkerRegistryHooks = {}
): WorkerOperationRegistry {
  let closed = false;
  return new WorkerOperationRegistry(
    [
      {
        ...SELF_TEST_ECHO_DESCRIPTOR,
        validateInput(value): PlainJsonObject {
          if (!isPlainObject(value)) throw new WorkerProtocolError("echo input is invalid");
          assertExactKeys(value, ["value"], "echo input");
          assertPlainJson(value.value, "echo value");
          return value as PlainJsonObject;
        },
        validateOutput(value): PlainJsonValue {
          if (!isPlainObject(value)) throw new WorkerProtocolError("echo output is invalid");
          assertExactKeys(value, ["value"], "echo output");
          assertPlainJson(value.value, "echo value");
          return value as PlainJsonValue;
        },
        async execute(input): Promise<PlainJsonValue> {
          return Object.freeze({ value: input.value });
        },
      },
      {
        ...SELF_TEST_MUTATION_DESCRIPTOR,
        validateInput(value): PlainJsonObject {
          if (!isPlainObject(value)) throw new WorkerProtocolError("mutation input is invalid");
          assertExactKeys(value, ["mode"], "mutation input");
          if (value.mode !== "ok" && value.mode !== "lose-response") {
            throw new WorkerProtocolError("mutation mode is invalid");
          }
          return value as PlainJsonObject;
        },
        validateOutput(value): PlainJsonValue {
          if (!isPlainObject(value)) throw new WorkerProtocolError("mutation output is invalid");
          assertExactKeys(value, ["accepted"], "mutation output");
          if (value.accepted !== true) throw new WorkerProtocolError("mutation output drifted");
          return value as PlainJsonValue;
        },
        async execute(input): Promise<PlainJsonValue> {
          if (input.mode === "lose-response") process.exit(91);
          return Object.freeze({ accepted: true });
        },
      },
      ...(["a", "b"] as const).map((suffix): WorkerOperationDefinition => ({
        ...SELF_TEST_PROFILE_DESCRIPTORS[suffix],
        validateInput(value): PlainJsonObject {
          if (!isPlainObject(value)) throw new WorkerProtocolError("profile input is invalid");
          assertExactKeys(value, [], "profile input");
          return value as PlainJsonObject;
        },
        validateOutput(value): PlainJsonValue {
          if (!isPlainObject(value)) throw new WorkerProtocolError("profile output is invalid");
          assertExactKeys(value, ["profileId", "canaryA", "canaryB"], "profile output");
          if (
            value.profileId !== `self-test-${suffix}` ||
            typeof value.canaryA !== "boolean" ||
            typeof value.canaryB !== "boolean"
          ) {
            throw new WorkerProtocolError("profile output drifted");
          }
          return value as PlainJsonValue;
        },
        async execute(_input, context): Promise<PlainJsonValue> {
          return Object.freeze({
            profileId: context.profileId,
            canaryA: process.env.SMOKE_CANARY_A === "present",
            canaryB: process.env.SMOKE_CANARY_B === "present",
          });
        },
      })),
    ],
    {
      async close(): Promise<void> {
        await hooks.close?.();
        closed = true;
      },
      async proveAbsent(): Promise<boolean> {
        return closed && ((await hooks.proveAbsent?.()) ?? true);
      },
    }
  );
}

function sameDescriptor(
  definition: WorkerOperationDefinition,
  descriptor: WorkerOperationDescriptor
): boolean {
  return (
    definition.operationId === descriptor.operationId &&
    definition.profileId === descriptor.profileId &&
    definition.inputSchemaId === descriptor.inputSchemaId &&
    definition.outputSchemaId === descriptor.outputSchemaId &&
    definition.sourceSha256 === descriptor.sourceSha256 &&
    definition.retryClass === descriptor.retryClass
  );
}

export class WorkerOperationRegistry {
  readonly #definitions = new Map<string, WorkerOperationDefinition>();
  readonly #hooks: WorkerRegistryHooks;

  constructor(definitions: readonly WorkerOperationDefinition[], hooks: WorkerRegistryHooks = {}) {
    if (definitions.length === 0 || definitions.length > 512) {
      throw new WorkerProtocolError("worker operation registry has an invalid size");
    }
    for (const definition of definitions) {
      validateWorkerDescriptor(definition);
      if (
        typeof definition.validateInput !== "function" ||
        typeof definition.validateOutput !== "function" ||
        typeof definition.execute !== "function" ||
        this.#definitions.has(definition.operationId)
      ) {
        throw new WorkerProtocolError("worker operation registry is invalid");
      }
      this.#definitions.set(definition.operationId, Object.freeze(definition));
    }
    this.#hooks = Object.freeze(hooks);
  }

  ids(): readonly string[] {
    return Object.freeze([...this.#definitions.keys()].sort());
  }

  descriptors(): readonly WorkerOperationDescriptor[] {
    return Object.freeze(
      [...this.#definitions.values()]
        .sort((left, right) => left.operationId.localeCompare(right.operationId))
        .map((definition) =>
          Object.freeze({
            operationId: definition.operationId,
            profileId: definition.profileId,
            inputSchemaId: definition.inputSchemaId,
            outputSchemaId: definition.outputSchemaId,
            sourceSha256: definition.sourceSha256,
            retryClass: definition.retryClass,
            ...(definition.maxInputBytes === undefined
              ? {}
              : { maxInputBytes: definition.maxInputBytes }),
            ...(definition.maxOutputBytes === undefined
              ? {}
              : { maxOutputBytes: definition.maxOutputBytes }),
          })
        )
    );
  }

  require(operationId: string): WorkerOperationDefinition {
    const found = this.#definitions.get(operationId);
    if (found === undefined) throw new WorkerProtocolError("worker operation is not registered");
    return found;
  }

  validateDescriptor(descriptor: WorkerOperationDescriptor): WorkerOperationDefinition {
    validateWorkerDescriptor(descriptor);
    const definition = this.require(descriptor.operationId);
    if (!sameDescriptor(definition, descriptor)) {
      throw new WorkerProtocolError("worker operation descriptor drifted from its registry");
    }
    return definition;
  }

  validateRequest(
    profileId: string,
    request: WorkerRequestFrame
  ): {
    readonly definition: WorkerOperationDefinition;
    readonly input: PlainJsonObject;
  } {
    const definition = this.require(request.operationId);
    if (
      definition.profileId !== profileId ||
      definition.inputSchemaId !== request.inputSchemaId ||
      definition.sourceSha256 !== request.sourceSha256
    ) {
      throw new WorkerProtocolError("worker request authority does not match its registry");
    }
    const input = definition.validateInput(request.input);
    assertPlainJson(input, "validated worker input");
    return Object.freeze({ definition, input });
  }

  async execute(profileId: string, request: WorkerRequestFrame): Promise<WorkerResponseFrame> {
    const { definition, input } = this.validateRequest(profileId, request);
    let rawOutput: PlainJsonValue;
    try {
      rawOutput = await definition.execute(input, {
        profileId,
        requestId: request.requestId,
      });
    } catch (error) {
      if (error instanceof WorkerProtocolError) throw error;
      const failure: WorkerFailureFrame = Object.freeze({
        protocol: WORKER_PROTOCOL_VERSION,
        requestId: request.requestId,
        ok: false,
        code: "operation_failed",
      });
      return failure;
    }
    let output: PlainJsonValue;
    try {
      output = definition.validateOutput(rawOutput);
      assertPlainJson(output, "validated worker output");
    } catch (error) {
      if (error instanceof WorkerProtocolError) throw error;
      throw new WorkerProtocolError("worker handler output is invalid", { cause: error });
    }
    return Object.freeze({
      protocol: WORKER_PROTOCOL_VERSION,
      requestId: request.requestId,
      ok: true,
      output,
    });
  }

  async executeOneShot(
    descriptor: WorkerOperationDescriptor,
    input: PlainJsonObject
  ): Promise<PlainJsonValue> {
    const definition = this.validateDescriptor(descriptor);
    const validatedInput = definition.validateInput(input);
    const output = await definition.execute(validatedInput, {
      profileId: definition.profileId,
      requestId: 1,
    });
    return definition.validateOutput(output);
  }

  async close(): Promise<void> {
    await this.#hooks.close?.();
  }

  async proveAbsent(): Promise<boolean> {
    return (await this.#hooks.proveAbsent?.()) ?? true;
  }
}
