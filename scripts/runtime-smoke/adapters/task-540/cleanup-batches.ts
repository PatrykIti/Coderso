import type { BaselineBatchItem, BaselineBatchPlan } from "../../database/batch-contract";
import { buildBaselineBatchPlans } from "../../database/batch-contract";
import { WorkerProtocolError } from "../../workers/contracts";
import type { WorkerOperationDescriptor } from "../../workers/contracts";
import {
  createTask540WorkerDescriptors,
  type Task540BaselineBatchInput,
  type Task540CleanupBatchInput,
  type Task540CleanupBatchOutput,
  type Task540CleanupItem,
  type Task540CleanupResult,
  type Task540HandlerPackArtifact,
} from "./worker-operations";

export const TASK540_BASELINE_LOGICAL_RECEIPTS = 18;
export const TASK540_CLEANUP_DB_OPERATIONS = 32;
export const TASK540_CLEANUP_LOGICAL_RECEIPTS = 72;

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
  readonly family: "seo" | "other";
  readonly input: Task540CleanupBatchInput;
}

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

function cleanupCategory(kind: string): "seo" | "setting" | "user" | "media" | "override" {
  if (kind === "seo-document-entry") return "seo";
  if (kind === "setting-user-a" || kind === "setting-user-b") return "setting";
  if (kind === "user-a" || kind === "user-b") return "user";
  if (kind === "media-row-key") return "media";
  if (kind === "presentation-override") return "override";
  throw new WorkerProtocolError("TASK-540 cleanup operation is not DB-batchable");
}

export function buildTask540CleanupDispatches(
  operations: readonly Task540DbCleanupOperation[],
  artifact: Task540HandlerPackArtifact
): readonly Task540CleanupDispatch[] {
  if (operations.length !== TASK540_CLEANUP_DB_OPERATIONS) {
    throw new WorkerProtocolError("TASK-540 DB cleanup operation cardinality drifted");
  }
  const logicalIds = new Set<string>();
  const ordinals = new Set<number>();
  const categoryCounts = { seo: 0, setting: 0, user: 0, media: 0, override: 0 };
  const groups = new Map<string, Task540DbCleanupOperation[]>();
  for (const operation of operations) {
    if (
      !["database", "user-identity-proof"].includes(operation.profileId) ||
      logicalIds.has(operation.logicalId) ||
      ordinals.has(operation.ordinal) ||
      !Number.isSafeInteger(operation.ordinal) ||
      operation.ordinal < 0 ||
      operation.ordinal >= TASK540_CLEANUP_LOGICAL_RECEIPTS ||
      !Number.isSafeInteger(operation.wave) ||
      operation.wave < 0
    ) {
      throw new WorkerProtocolError("TASK-540 DB cleanup operation identity drifted");
    }
    logicalIds.add(operation.logicalId);
    ordinals.add(operation.ordinal);
    const category = cleanupCategory(operation.kind);
    categoryCounts[category] += 1;
    const family = category === "seo" ? "seo" : "other";
    const groupKey = `${operation.profileId}\0${operation.wave}\0${family}`;
    const group = groups.get(groupKey) ?? [];
    group.push(operation);
    groups.set(groupKey, group);
  }
  if (
    categoryCounts.seo !== 18 ||
    categoryCounts.setting !== 4 ||
    categoryCounts.user !== 4 ||
    categoryCounts.media !== 3 ||
    categoryCounts.override !== 3
  ) {
    throw new WorkerProtocolError("TASK-540 DB cleanup category coverage drifted");
  }
  const dispatches: Task540CleanupDispatch[] = [];
  const descriptors = createTask540WorkerDescriptors(artifact);
  for (const [key, unsorted] of groups) {
    const [profileId, rawWave, family] = key.split("\0") as [
      "database" | "user-identity-proof",
      string,
      "seo" | "other",
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
  if (seoDispatches.length !== 1 || seoDispatches[0]?.input.items.length !== 18) {
    throw new WorkerProtocolError("TASK-540 six-SEO batch was split");
  }
  return Object.freeze(
    dispatches.sort(
      (left, right) =>
        left.wave - right.wave ||
        left.profileId.localeCompare(right.profileId) ||
        left.family.localeCompare(right.family)
    )
  );
}

export function preserveTask540CanonicalCleanupReceipts<T>(
  canonicalReceipts: readonly T[],
  outputs: readonly Task540CleanupBatchOutput[],
  logicalIdForReceipt: (receipt: T) => string,
  mergeDbResult: (receipt: T, result: Task540CleanupResult) => T
): readonly T[] {
  if (canonicalReceipts.length !== TASK540_CLEANUP_LOGICAL_RECEIPTS) {
    throw new WorkerProtocolError("TASK-540 canonical cleanup receipt cardinality drifted");
  }
  const results = outputs.flatMap(({ results: batchResults }) => batchResults);
  if (results.length !== TASK540_CLEANUP_DB_OPERATIONS) {
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
  if (merged !== TASK540_CLEANUP_DB_OPERATIONS || byLogicalId.size !== 0) {
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
    dispatch.input.items.length !== 18 ||
    resourceKeys.size !== 6 ||
    ["provenance", "delete", "absence"].some(
      (operation) => operations.filter((candidate) => candidate === operation).length !== 6
    ) ||
    !Number.isSafeInteger(statementCount) ||
    statementCount <= 0 ||
    statementCount > 3
  ) {
    throw new WorkerProtocolError("TASK-540 six-SEO cleanup exceeded its three-statement contract");
  }
}
