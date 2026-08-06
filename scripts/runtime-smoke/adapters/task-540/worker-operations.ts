import { createHash } from "node:crypto";
import { assertExactKeys, isPlainObject } from "../../contracts";
import type { WorkerEntryInput, WorkerEntryOutput } from "../../workers/entry";
import { runWorkerEntry } from "../../workers/entry";
import {
  WorkerOperationRegistry,
  type WorkerRegistryHooks,
} from "../../workers/operation-registry";
import {
  WorkerProtocolError,
  assertPlainJson,
  assertPlainJsonObject,
  assertSha256,
  assertWorkerToken,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerOperationDefinition,
  type WorkerOperationDescriptor,
} from "../../workers/contracts";

export const TASK540_WORKER_PROFILE_IDS = [
  "schema-only",
  "database",
  "bootstrap-preflight",
  "user-identity-proof",
  "user-provisioning",
] as const;

export type Task540WorkerProfileId = (typeof TASK540_WORKER_PROFILE_IDS)[number];

export const TASK540_BATCH_OPERATION_IDS = [
  "task-540/baseline/database",
  "task-540/baseline/user-identity-proof",
  "task-540/cleanup/database",
  "task-540/cleanup/user-identity-proof",
] as const;

export type Task540BatchOperationId = (typeof TASK540_BATCH_OPERATION_IDS)[number];

export interface Task540BaselineItem extends PlainJsonObject {
  readonly logicalId: string;
  readonly operationId: string;
  readonly input: PlainJsonObject;
}

export interface Task540BaselineBatchInput extends PlainJsonObject {
  readonly items: readonly Task540BaselineItem[];
}

export interface Task540BaselineResult extends PlainJsonObject {
  readonly logicalId: string;
  readonly output: PlainJsonValue;
}

export interface Task540BaselineBatchOutput extends PlainJsonObject {
  readonly results: readonly Task540BaselineResult[];
  readonly statements: number;
  readonly rows: number;
}

export interface Task540CleanupItem extends PlainJsonObject {
  readonly logicalId: string;
  readonly resourceKey: string;
  readonly kind: string;
  readonly operation: "provenance" | "delete" | "absence";
  readonly identifier: PlainJsonValue;
  readonly ownershipSha256: string;
}

export interface Task540CleanupBatchInput extends PlainJsonObject {
  readonly wave: number;
  readonly items: readonly Task540CleanupItem[];
}

export interface Task540CleanupResult extends PlainJsonObject {
  readonly logicalId: string;
  readonly resourceKey: string;
  readonly operation: "provenance" | "delete" | "absence";
  readonly output: PlainJsonValue;
}

export interface Task540CleanupBatchOutput extends PlainJsonObject {
  readonly results: readonly Task540CleanupResult[];
  readonly statements: number;
  readonly rows: number;
}

export interface Task540HandlerPackArtifact extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly version: string;
  readonly sourceSha256: string;
}

export interface Task540WorkerHandlers {
  readonly artifact: Task540HandlerPackArtifact;
  runBaselineBatch(
    profileId: "database" | "user-identity-proof",
    input: Task540BaselineBatchInput
  ): Promise<Task540BaselineBatchOutput>;
  runCleanupBatch(
    profileId: "database" | "user-identity-proof",
    input: Task540CleanupBatchInput
  ): Promise<Task540CleanupBatchOutput>;
}

const MAX_BASELINE_ITEMS = 18;
const MAX_CLEANUP_ITEMS = 128;

export const TASK540_WORKER_ADAPTER_VERSION = 1;
export const TASK540_WORKER_ADAPTER_ARTIFACT_SHA256 = createHash("sha256")
  .update(
    JSON.stringify({
      version: TASK540_WORKER_ADAPTER_VERSION,
      operations: TASK540_BATCH_OPERATION_IDS,
      profiles: TASK540_WORKER_PROFILE_IDS,
      baselineInput: ["items", "logicalId", "operationId", "input"],
      baselineOutput: ["results", "logicalId", "output", "statements", "rows"],
      cleanupInput: [
        "wave",
        "items",
        "logicalId",
        "resourceKey",
        "kind",
        "operation",
        "identifier",
        "ownershipSha256",
      ],
      cleanupOutput: [
        "results",
        "logicalId",
        "resourceKey",
        "operation",
        "output",
        "statements",
        "rows",
      ],
      limits: { baseline: MAX_BASELINE_ITEMS, cleanup: MAX_CLEANUP_ITEMS },
    })
  )
  .digest("hex");

function validateHandlerPackArtifact(
  artifact: Task540HandlerPackArtifact
): Task540HandlerPackArtifact {
  if (!isPlainObject(artifact) || !Object.isFrozen(artifact)) {
    throw new WorkerProtocolError("TASK-540 handler pack artifact is absent");
  }
  assertExactKeys(
    artifact,
    ["schemaVersion", "version", "sourceSha256"],
    "TASK-540 handler pack artifact"
  );
  if (artifact.schemaVersion !== 1) {
    throw new WorkerProtocolError("TASK-540 handler pack artifact version drifted");
  }
  assertWorkerToken(artifact.version, "TASK-540 handler pack version");
  assertSha256(artifact.sourceSha256, "TASK-540 handler pack source digest");
  return artifact;
}

function descriptor(
  artifact: Task540HandlerPackArtifact,
  operationId: Task540BatchOperationId,
  profileId: "database" | "user-identity-proof",
  inputSchemaId: string,
  outputSchemaId: string,
  retryClass: "idempotent-read" | "mutation"
): WorkerOperationDescriptor {
  return Object.freeze({
    operationId,
    profileId,
    inputSchemaId,
    outputSchemaId,
    sourceSha256: createHash("sha256")
      .update(TASK540_WORKER_ADAPTER_ARTIFACT_SHA256)
      .update("\0")
      .update(artifact.sourceSha256)
      .update("\0")
      .update(artifact.version)
      .update("\0")
      .update(operationId)
      .digest("hex"),
    retryClass,
    maxInputBytes: 256 * 1024,
    maxOutputBytes: 256 * 1024,
  });
}

export function createTask540WorkerDescriptors(artifactInput: Task540HandlerPackArtifact) {
  const artifact = validateHandlerPackArtifact(artifactInput);
  return Object.freeze({
    baselineDatabase: descriptor(
      artifact,
      "task-540/baseline/database",
      "database",
      "task-540-baseline-batch-v1",
      "task-540-baseline-results-v1",
      "idempotent-read"
    ),
    baselineIdentity: descriptor(
      artifact,
      "task-540/baseline/user-identity-proof",
      "user-identity-proof",
      "task-540-baseline-batch-v1",
      "task-540-baseline-results-v1",
      "idempotent-read"
    ),
    cleanupDatabase: descriptor(
      artifact,
      "task-540/cleanup/database",
      "database",
      "task-540-cleanup-batch-v1",
      "task-540-cleanup-results-v1",
      "mutation"
    ),
    cleanupIdentity: descriptor(
      artifact,
      "task-540/cleanup/user-identity-proof",
      "user-identity-proof",
      "task-540-cleanup-batch-v1",
      "task-540-cleanup-results-v1",
      "mutation"
    ),
  });
}

function validateBaselineInput(value: unknown): Task540BaselineBatchInput {
  if (!isPlainObject(value)) throw new WorkerProtocolError("TASK-540 baseline batch is invalid");
  assertExactKeys(value, ["items"], "TASK-540 baseline batch");
  if (
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    value.items.length > MAX_BASELINE_ITEMS
  ) {
    throw new WorkerProtocolError("TASK-540 baseline batch size is invalid");
  }
  const logicalIds = new Set<string>();
  for (const item of value.items) {
    if (!isPlainObject(item)) throw new WorkerProtocolError("TASK-540 baseline item is invalid");
    assertExactKeys(item, ["logicalId", "operationId", "input"], "TASK-540 baseline item");
    assertWorkerToken(item.logicalId, "TASK-540 baseline logical ID");
    assertWorkerToken(item.operationId, "TASK-540 baseline operation ID");
    assertPlainJsonObject(item.input, "TASK-540 baseline operation input");
    if (logicalIds.has(item.logicalId)) {
      throw new WorkerProtocolError("TASK-540 baseline logical ID is duplicated");
    }
    logicalIds.add(item.logicalId);
  }
  return value as unknown as Task540BaselineBatchInput;
}

function validateBaselineOutput(value: unknown): Task540BaselineBatchOutput {
  if (!isPlainObject(value)) throw new WorkerProtocolError("TASK-540 baseline output is invalid");
  assertExactKeys(value, ["results", "statements", "rows"], "TASK-540 baseline output");
  if (
    !Array.isArray(value.results) ||
    value.results.length > MAX_BASELINE_ITEMS ||
    !Number.isSafeInteger(value.statements) ||
    (value.statements as number) <= 0 ||
    !Number.isSafeInteger(value.rows) ||
    (value.rows as number) < 0
  ) {
    throw new WorkerProtocolError("TASK-540 baseline output bounds are invalid");
  }
  const logicalIds = new Set<string>();
  for (const result of value.results) {
    if (!isPlainObject(result))
      throw new WorkerProtocolError("TASK-540 baseline result is invalid");
    assertExactKeys(result, ["logicalId", "output"], "TASK-540 baseline result");
    assertWorkerToken(result.logicalId, "TASK-540 baseline result ID");
    assertPlainJson(result.output, "TASK-540 baseline result output");
    if (logicalIds.has(result.logicalId)) {
      throw new WorkerProtocolError("TASK-540 baseline result ID is duplicated");
    }
    logicalIds.add(result.logicalId);
  }
  return value as unknown as Task540BaselineBatchOutput;
}

function validateCleanupInput(value: unknown): Task540CleanupBatchInput {
  if (!isPlainObject(value)) throw new WorkerProtocolError("TASK-540 cleanup batch is invalid");
  assertExactKeys(value, ["wave", "items"], "TASK-540 cleanup batch");
  if (
    !Number.isSafeInteger(value.wave) ||
    (value.wave as number) < 0 ||
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    value.items.length > MAX_CLEANUP_ITEMS
  ) {
    throw new WorkerProtocolError("TASK-540 cleanup batch bounds are invalid");
  }
  const resourceSlots = new Set<string>();
  const logicalIds = new Set<string>();
  for (const item of value.items) {
    if (!isPlainObject(item)) throw new WorkerProtocolError("TASK-540 cleanup item is invalid");
    assertExactKeys(
      item,
      ["logicalId", "resourceKey", "kind", "operation", "identifier", "ownershipSha256"],
      "TASK-540 cleanup item"
    );
    assertWorkerToken(item.logicalId, "TASK-540 cleanup logical ID");
    if (
      typeof item.resourceKey !== "string" ||
      item.resourceKey.length === 0 ||
      Buffer.byteLength(item.resourceKey) > 512 ||
      item.resourceKey.includes("\0")
    ) {
      throw new WorkerProtocolError("TASK-540 cleanup resource key is invalid");
    }
    assertWorkerToken(item.kind, "TASK-540 cleanup kind");
    if (!new Set(["provenance", "delete", "absence"]).has(item.operation as string)) {
      throw new WorkerProtocolError("TASK-540 cleanup operation is invalid");
    }
    assertPlainJson(item.identifier, "TASK-540 cleanup identifier");
    assertSha256(item.ownershipSha256, "TASK-540 cleanup ownership digest");
    const resourceSlot = `${item.resourceKey}\0${String(item.operation)}`;
    if (resourceSlots.has(resourceSlot) || logicalIds.has(item.logicalId)) {
      throw new WorkerProtocolError("TASK-540 cleanup identity is duplicated");
    }
    resourceSlots.add(resourceSlot);
    logicalIds.add(item.logicalId);
  }
  return value as unknown as Task540CleanupBatchInput;
}

function validateCleanupOutput(value: unknown): Task540CleanupBatchOutput {
  if (!isPlainObject(value)) throw new WorkerProtocolError("TASK-540 cleanup output is invalid");
  assertExactKeys(value, ["results", "statements", "rows"], "TASK-540 cleanup output");
  if (
    !Array.isArray(value.results) ||
    value.results.length > MAX_CLEANUP_ITEMS ||
    !Number.isSafeInteger(value.statements) ||
    (value.statements as number) <= 0 ||
    !Number.isSafeInteger(value.rows) ||
    (value.rows as number) < 0
  ) {
    throw new WorkerProtocolError("TASK-540 cleanup output bounds are invalid");
  }
  const resourceSlots = new Set<string>();
  for (const result of value.results) {
    if (!isPlainObject(result)) throw new WorkerProtocolError("TASK-540 cleanup result is invalid");
    assertExactKeys(
      result,
      ["logicalId", "resourceKey", "operation", "output"],
      "TASK-540 cleanup result"
    );
    assertWorkerToken(result.logicalId, "TASK-540 cleanup result ID");
    if (
      typeof result.resourceKey !== "string" ||
      !new Set(["provenance", "delete", "absence"]).has(result.operation as string)
    ) {
      throw new WorkerProtocolError("TASK-540 cleanup result drifted");
    }
    assertPlainJson(result.output, "TASK-540 cleanup result output");
    const resourceSlot = `${result.resourceKey}\0${String(result.operation)}`;
    if (resourceSlots.has(resourceSlot)) {
      throw new WorkerProtocolError("TASK-540 cleanup result is duplicated");
    }
    resourceSlots.add(resourceSlot);
  }
  return value as unknown as Task540CleanupBatchOutput;
}

function assertBaselineCorrelation(
  input: Task540BaselineBatchInput,
  output: Task540BaselineBatchOutput
): Task540BaselineBatchOutput {
  if (
    output.results.length !== input.items.length ||
    output.results.some((result, index) => result.logicalId !== input.items[index]?.logicalId)
  ) {
    throw new WorkerProtocolError("TASK-540 baseline result correlation drifted");
  }
  return output;
}

function assertCleanupCorrelation(
  input: Task540CleanupBatchInput,
  output: Task540CleanupBatchOutput
): Task540CleanupBatchOutput {
  if (
    output.results.length !== input.items.length ||
    output.results.some(
      (result, index) =>
        result.logicalId !== input.items[index]?.logicalId ||
        result.resourceKey !== input.items[index]?.resourceKey ||
        result.operation !== input.items[index]?.operation
    )
  ) {
    throw new WorkerProtocolError("TASK-540 cleanup result correlation drifted");
  }
  return output;
}

function baselineDefinition(
  descriptorValue: WorkerOperationDescriptor,
  handlers: Task540WorkerHandlers
): WorkerOperationDefinition {
  return {
    ...descriptorValue,
    validateInput: validateBaselineInput,
    validateOutput: validateBaselineOutput,
    async execute(input, context) {
      const profileId = context.profileId as "database" | "user-identity-proof";
      return assertBaselineCorrelation(
        input as Task540BaselineBatchInput,
        await handlers.runBaselineBatch(profileId, input as Task540BaselineBatchInput)
      );
    },
  };
}

function cleanupDefinition(
  descriptorValue: WorkerOperationDescriptor,
  handlers: Task540WorkerHandlers
): WorkerOperationDefinition {
  return {
    ...descriptorValue,
    validateInput: validateCleanupInput,
    validateOutput: validateCleanupOutput,
    async execute(input, context) {
      const profileId = context.profileId as "database" | "user-identity-proof";
      return assertCleanupCorrelation(
        input as Task540CleanupBatchInput,
        await handlers.runCleanupBatch(profileId, input as Task540CleanupBatchInput)
      );
    },
  };
}

export function createTask540WorkerOperationDefinitions(
  handlers: Task540WorkerHandlers
): readonly WorkerOperationDefinition[] {
  if (
    !isPlainObject(handlers.artifact) ||
    typeof handlers.runBaselineBatch !== "function" ||
    typeof handlers.runCleanupBatch !== "function"
  ) {
    throw new WorkerProtocolError("TASK-540 worker handlers are incomplete");
  }
  const descriptors = createTask540WorkerDescriptors(handlers.artifact);
  return Object.freeze([
    baselineDefinition(descriptors.baselineDatabase, handlers),
    baselineDefinition(descriptors.baselineIdentity, handlers),
    cleanupDefinition(descriptors.cleanupDatabase, handlers),
    cleanupDefinition(descriptors.cleanupIdentity, handlers),
  ]);
}

export function createTask540WorkerOperationRegistry(
  handlers: Task540WorkerHandlers,
  hooks: WorkerRegistryHooks = {}
): WorkerOperationRegistry {
  return new WorkerOperationRegistry(createTask540WorkerOperationDefinitions(handlers), hooks);
}

export async function runTask540WorkerEntry(options: {
  readonly profileId: Task540WorkerProfileId;
  readonly handlers: Task540WorkerHandlers;
  readonly hooks?: WorkerRegistryHooks;
  readonly input: WorkerEntryInput;
  readonly output: WorkerEntryOutput;
}): Promise<void> {
  await runWorkerEntry({
    profileId: options.profileId,
    registry: createTask540WorkerOperationRegistry(options.handlers, options.hooks),
    input: options.input,
    output: options.output,
  });
}
