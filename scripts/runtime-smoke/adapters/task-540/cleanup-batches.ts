import type { BaselineBatchItem, BaselineBatchPlan } from "../../database/batch-contract";
import { buildBaselineBatchPlans } from "../../database/batch-contract";
import {
  WorkerProtocolError,
  assertPlainJson,
  assertSha256,
  assertWorkerToken,
} from "../../workers/contracts";
import type { WorkerOperationDescriptor } from "../../workers/contracts";
import { validateTask540OperationInput, type Task540InputSchemaId } from "./operations/contracts";
import {
  createTask540WorkerDescriptors,
  type Task540BaselineBatchInput,
  type Task540CleanupBatchInput,
  type Task540CleanupBatchOutput,
  type Task540CleanupItem,
  type Task540CleanupResult,
  type Task540HandlerPackArtifact,
} from "./worker-operations";
import {
  TASK540_CLEANUP_DB_BASE_OPERATIONS,
  TASK540_CLEANUP_DB_OPERATIONS,
  TASK540_CLEANUP_LOGICAL_BASE_RECEIPTS,
  TASK540_CLEANUP_LOGICAL_RECEIPTS,
  TASK540_CLEANUP_SEO_MAX_RESOURCES,
  isTask540CleanupLogicalReceiptCount,
  task540CleanupCardinality,
} from "./cleanup-cardinality";

export {
  TASK540_CLEANUP_DB_BASE_OPERATIONS,
  TASK540_CLEANUP_DB_OPERATIONS,
  TASK540_CLEANUP_LOGICAL_BASE_RECEIPTS,
  TASK540_CLEANUP_LOGICAL_RECEIPTS,
  TASK540_CLEANUP_SEO_MAX_RESOURCES,
  isTask540CleanupLogicalReceiptCount,
  task540CleanupCardinality,
} from "./cleanup-cardinality";

export const TASK540_BASELINE_LOGICAL_RECEIPTS = 18;

export interface Task540BaselineDispatch {
  readonly descriptor: WorkerOperationDescriptor;
  readonly input: Task540BaselineBatchInput;
}

export interface Task540DbCleanupOperation extends Task540CleanupItem {
  readonly profileId: "database" | "user-identity-proof";
  readonly wave: number;
  readonly ordinal: number;
}

export interface Task540CleanupDispatch {
  readonly descriptor: WorkerOperationDescriptor;
  readonly profileId: "database" | "user-identity-proof";
  readonly wave: number;
  readonly family: Task540CleanupFamily;
  readonly input: Task540CleanupBatchInput;
}

export type Task540CleanupFamily = "seo" | "setting" | "user" | "media" | "override";

const CLEANUP_FAMILY_CONTRACTS: Readonly<
  Record<
    Task540CleanupFamily,
    Readonly<{
      arity: number;
      kinds: ReadonlySet<string>;
      operations: ReadonlySet<Task540CleanupItem["operation"]>;
      resources: number;
    }>
  >
> = Object.freeze({
  seo: Object.freeze({
    arity: 3,
    kinds: new Set(["seo-document-entry"]),
    operations: new Set<Task540CleanupItem["operation"]>(["provenance", "delete", "absence"]),
    resources: 6,
  }),
  setting: Object.freeze({
    arity: 2,
    kinds: new Set(["setting-user-a", "setting-user-b"]),
    operations: new Set<Task540CleanupItem["operation"]>(["delete", "absence"]),
    resources: 2,
  }),
  user: Object.freeze({
    arity: 1,
    kinds: new Set(["user-a", "user-b"]),
    operations: new Set<Task540CleanupItem["operation"]>(["delete", "absence"]),
    resources: 2,
  }),
  media: Object.freeze({
    arity: 2,
    kinds: new Set(["media-row-key"]),
    operations: new Set<Task540CleanupItem["operation"]>(["provenance", "delete", "absence"]),
    resources: 1,
  }),
  override: Object.freeze({
    arity: 4,
    kinds: new Set(["presentation-override"]),
    operations: new Set<Task540CleanupItem["operation"]>(["provenance", "delete", "absence"]),
    resources: 1,
  }),
});

function baselineDescriptor(
  plan: BaselineBatchPlan,
  descriptors: ReturnType<typeof createTask540WorkerDescriptors>
) {
  if (plan.profileId === "database") return descriptors.baselineDatabase;
  if (plan.profileId === "user-identity-proof") return descriptors.baselineIdentity;
  throw new WorkerProtocolError("TASK-540 baseline profile is not batchable");
}

export function buildTask540BaselineDispatches(
  items: readonly BaselineBatchItem[],
  artifact: Task540HandlerPackArtifact
): readonly Task540BaselineDispatch[] {
  if (items.length !== TASK540_BASELINE_LOGICAL_RECEIPTS) {
    throw new WorkerProtocolError("TASK-540 baseline receipt cardinality drifted");
  }
  const plans = buildBaselineBatchPlans(items, TASK540_BASELINE_LOGICAL_RECEIPTS);
  if (
    plans.length !== 2 ||
    plans.some((plan) => !["database", "user-identity-proof"].includes(plan.profileId))
  ) {
    throw new WorkerProtocolError("TASK-540 baseline profile partition drifted");
  }
  const descriptors = createTask540WorkerDescriptors(artifact);
  return Object.freeze(
    plans.map((plan) =>
      Object.freeze({
        descriptor: baselineDescriptor(plan, descriptors),
        input: Object.freeze({
          items: Object.freeze(
            plan.items.map(({ logicalId, operationId, input }) =>
              Object.freeze({ logicalId, operationId, input })
            )
          ),
        }) as Task540BaselineBatchInput,
      })
    )
  );
}

function cleanupCategory(kind: string): Task540CleanupFamily {
  if (kind === "seo-document-entry") return "seo";
  if (kind === "setting-user-a" || kind === "setting-user-b") return "setting";
  if (kind === "user-a" || kind === "user-b") return "user";
  if (kind === "media-row-key") return "media";
  if (kind === "presentation-override") return "override";
  throw new WorkerProtocolError("TASK-540 cleanup operation is not DB-batchable");
}

function assertCleanupResourceKey(value: string): void {
  if (
    value.length === 0 ||
    Buffer.byteLength(value) > 512 ||
    value.includes("\0") ||
    value.includes("\r") ||
    value.includes("\n")
  ) {
    throw new WorkerProtocolError("TASK-540 cleanup resource key is invalid");
  }
}

function assertCleanupFamilyAuthority(operations: readonly Task540DbCleanupOperation[]): void {
  const schemaByFamily: Readonly<Record<Task540CleanupFamily, Task540InputSchemaId>> = {
    seo: "identifier-seo-entry-input-v1",
    setting: "identifier-setting-input-v1",
    user: "identifier-uuid-input-v1",
    media: "identifier-media-input-v1",
    override: "identifier-override-input-v1",
  };
  const byResource = new Map<string, Task540DbCleanupOperation[]>();
  for (const operation of operations) {
    const family = cleanupCategory(operation.kind);
    const contract = CLEANUP_FAMILY_CONTRACTS[family];
    if (
      !contract.kinds.has(operation.kind) ||
      !contract.operations.has(operation.operation) ||
      !Array.isArray(operation.identifier) ||
      operation.identifier.length !== contract.arity ||
      operation.identifier.some(
        (value) =>
          typeof value !== "string" ||
          value.length === 0 ||
          Buffer.byteLength(value) > 4096 ||
          value.includes("\0")
      )
    ) {
      throw new WorkerProtocolError("TASK-540 cleanup resource authority drifted");
    }
    assertCleanupResourceKey(operation.resourceKey);
    assertSha256(operation.ownershipSha256, "TASK-540 cleanup ownership digest");
    assertPlainJson(operation.identifier, "TASK-540 cleanup identifier");
    validateTask540OperationInput(schemaByFamily[family], {
      identifier: operation.identifier,
    });
    const group = byResource.get(operation.resourceKey) ?? [];
    group.push(operation);
    byResource.set(operation.resourceKey, group);
  }

  for (const family of Object.keys(CLEANUP_FAMILY_CONTRACTS) as Task540CleanupFamily[]) {
    const contract = CLEANUP_FAMILY_CONTRACTS[family];
    const resources = [...byResource.values()].filter(
      ([operation]) => operation !== undefined && cleanupCategory(operation.kind) === family
    );
    if (
      family === "seo"
        ? resources.length > TASK540_CLEANUP_SEO_MAX_RESOURCES
        : resources.length !== contract.resources
    ) {
      throw new WorkerProtocolError("TASK-540 cleanup resource cardinality drifted");
    }
    const identifiers = new Set<string>();
    for (const resource of resources) {
      const first = resource[0]!;
      const identifier = JSON.stringify(first.identifier);
      const slots = new Set(resource.map(({ operation }) => operation));
      if (
        resource.length !== contract.operations.size ||
        slots.size !== contract.operations.size ||
        [...contract.operations].some((operation) => !slots.has(operation)) ||
        resource.some(
          (operation) =>
            operation.kind !== first.kind ||
            JSON.stringify(operation.identifier) !== identifier ||
            operation.ownershipSha256 !== first.ownershipSha256
        ) ||
        identifiers.has(identifier) ||
        (family !== "media" && new Set(resource.map(({ wave }) => wave)).size !== 1)
      ) {
        throw new WorkerProtocolError("TASK-540 cleanup ownership or slot authority drifted");
      }
      identifiers.add(identifier);
    }
    if (
      (family === "setting" &&
        !["setting-user-a", "setting-user-b"].every((kind) =>
          resources.some(([operation]) => operation?.kind === kind)
        )) ||
      (family === "user" &&
        !["user-a", "user-b"].every((kind) =>
          resources.some(([operation]) => operation?.kind === kind)
        ))
    ) {
      throw new WorkerProtocolError("TASK-540 cleanup paired resource authority drifted");
    }
  }
}

export function buildTask540CleanupDispatches(
  operations: readonly Task540DbCleanupOperation[],
  artifact: Task540HandlerPackArtifact
): readonly Task540CleanupDispatch[] {
  if (
    operations.length < TASK540_CLEANUP_DB_BASE_OPERATIONS ||
    operations.length > TASK540_CLEANUP_DB_OPERATIONS ||
    (operations.length - TASK540_CLEANUP_DB_BASE_OPERATIONS) % 3 !== 0
  ) {
    throw new WorkerProtocolError("TASK-540 DB cleanup operation cardinality drifted");
  }
  const cardinality = task540CleanupCardinality(
    (operations.length - TASK540_CLEANUP_DB_BASE_OPERATIONS) / 3
  );
  const logicalIds = new Set<string>();
  const ordinals = new Set<number>();
  const categoryCounts = { seo: 0, setting: 0, user: 0, media: 0, override: 0 };
  const groups = new Map<string, Task540DbCleanupOperation[]>();
  for (const operation of operations) {
    if (
      operation.profileId !== "database" ||
      logicalIds.has(operation.logicalId) ||
      ordinals.has(operation.ordinal) ||
      !Number.isSafeInteger(operation.ordinal) ||
      operation.ordinal < 0 ||
      operation.ordinal >= cardinality.logicalReceipts ||
      !Number.isSafeInteger(operation.wave) ||
      operation.wave < 0
    ) {
      throw new WorkerProtocolError("TASK-540 DB cleanup operation identity drifted");
    }
    assertWorkerToken(operation.logicalId, "TASK-540 cleanup logical ID");
    logicalIds.add(operation.logicalId);
    ordinals.add(operation.ordinal);
    const category = cleanupCategory(operation.kind);
    categoryCounts[category] += 1;
    const mediaSlot = category === "media" ? operation.operation : "combined";
    const groupKey = `${operation.profileId}\0${operation.wave}\0${category}\0${mediaSlot}`;
    const group = groups.get(groupKey) ?? [];
    group.push(operation);
    groups.set(groupKey, group);
  }
  if (
    categoryCounts.seo !== cardinality.seoResources * 3 ||
    categoryCounts.setting !== 4 ||
    categoryCounts.user !== 4 ||
    categoryCounts.media !== 3 ||
    categoryCounts.override !== 3
  ) {
    throw new WorkerProtocolError("TASK-540 DB cleanup category coverage drifted");
  }
  assertCleanupFamilyAuthority(operations);
  const dispatches: Task540CleanupDispatch[] = [];
  const descriptors = createTask540WorkerDescriptors(artifact);
  for (const [key, unsorted] of groups) {
    const [profileId, rawWave, family] = key.split("\0") as [
      "database" | "user-identity-proof",
      string,
      Task540CleanupFamily,
    ];
    const wave = Number(rawWave);
    const items = unsorted
      .sort((left, right) => left.ordinal - right.ordinal)
      .map(({ logicalId, resourceKey, kind, operation, identifier, ownershipSha256 }) =>
        Object.freeze({
          logicalId,
          resourceKey,
          kind,
          operation,
          identifier,
          ownershipSha256,
        })
      );
    dispatches.push(
      Object.freeze({
        descriptor:
          profileId === "database" ? descriptors.cleanupDatabase : descriptors.cleanupIdentity,
        profileId,
        wave,
        family,
        input: Object.freeze({ wave, items: Object.freeze(items) }) as Task540CleanupBatchInput,
      })
    );
  }
  const seoDispatches = dispatches.filter(({ family }) => family === "seo");
  if (
    cardinality.seoResources === 0
      ? seoDispatches.length !== 0
      : seoDispatches.length !== 1 ||
        seoDispatches[0]?.input.items.length !== cardinality.seoResources * 3
  ) {
    throw new WorkerProtocolError("TASK-540 bounded SEO batch was split");
  }
  return Object.freeze(
    dispatches.sort(
      (left, right) =>
        left.wave - right.wave ||
        left.profileId.localeCompare(right.profileId) ||
        left.family.localeCompare(right.family) ||
        ["provenance", "delete", "absence"].indexOf(left.input.items[0]!.operation) -
          ["provenance", "delete", "absence"].indexOf(right.input.items[0]!.operation)
    )
  );
}

export function preserveTask540CanonicalCleanupReceipts<T>(
  canonicalReceipts: readonly T[],
  outputs: readonly Task540CleanupBatchOutput[],
  logicalIdForReceipt: (receipt: T) => string,
  mergeDbResult: (receipt: T, result: Task540CleanupResult) => T
): readonly T[] {
  if (!isTask540CleanupLogicalReceiptCount(canonicalReceipts.length)) {
    throw new WorkerProtocolError("TASK-540 canonical cleanup receipt cardinality drifted");
  }
  const cardinality = task540CleanupCardinality(
    (canonicalReceipts.length - TASK540_CLEANUP_LOGICAL_BASE_RECEIPTS) / 3
  );
  const results = outputs.flatMap(({ results: batchResults }) => batchResults);
  if (results.length !== cardinality.dbOperations) {
    throw new WorkerProtocolError("TASK-540 DB cleanup result cardinality drifted");
  }
  const byLogicalId = new Map<string, Task540CleanupResult>();
  for (const result of results) {
    if (byLogicalId.has(result.logicalId)) {
      throw new WorkerProtocolError("TASK-540 DB cleanup result is duplicated");
    }
    byLogicalId.set(result.logicalId, result);
  }
  let merged = 0;
  const projected = canonicalReceipts.map((receipt) => {
    const logicalId = logicalIdForReceipt(receipt);
    const result = byLogicalId.get(logicalId);
    if (result === undefined) return receipt;
    byLogicalId.delete(logicalId);
    merged += 1;
    return mergeDbResult(receipt, result);
  });
  if (merged !== cardinality.dbOperations || byLogicalId.size !== 0) {
    throw new WorkerProtocolError("TASK-540 DB results do not match canonical cleanup receipts");
  }
  return Object.freeze(projected);
}

export function assertTask540SeoBatchBudget(
  dispatch: Task540CleanupDispatch,
  statementCount: number
): void {
  if (dispatch.family !== "seo") return;
  const resourceKeys = new Set(dispatch.input.items.map(({ resourceKey }) => resourceKey));
  const operations = dispatch.input.items.map(({ operation }) => operation);
  if (
    resourceKeys.size < 1 ||
    resourceKeys.size > TASK540_CLEANUP_SEO_MAX_RESOURCES ||
    dispatch.input.items.length !== resourceKeys.size * 3 ||
    ["provenance", "delete", "absence"].some(
      (operation) =>
        operations.filter((candidate) => candidate === operation).length !== resourceKeys.size
    ) ||
    !Number.isSafeInteger(statementCount) ||
    statementCount <= 0 ||
    statementCount > 3
  ) {
    throw new WorkerProtocolError(
      "TASK-540 bounded SEO cleanup exceeded its three-statement contract"
    );
  }
}
