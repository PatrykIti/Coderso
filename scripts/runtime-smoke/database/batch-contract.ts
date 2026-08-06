import {
  WorkerProtocolError,
  assertPlainJsonObject,
  assertWorkerToken,
  type PlainJsonObject,
  type PlainJsonValue,
} from "../workers/contracts";
import type { FixtureLedgerEntry, FrozenFixtureLedger } from "./fixture-ledger";

export const MAX_DATABASE_BATCH_ITEMS = 128;

export interface CleanupBatchResource {
  readonly resourceKey: string;
  readonly logicalId: string;
  readonly kind: string;
  readonly ordinal: number;
  readonly identifier: PlainJsonValue;
  readonly ownershipSha256: string;
}

export interface CleanupBatchPlan {
  readonly schemaVersion: 1;
  readonly batchId: string;
  readonly profileId: string;
  readonly wave: number;
  readonly resources: readonly CleanupBatchResource[];
}

export interface BaselineBatchItem {
  readonly logicalId: string;
  readonly operationId: string;
  readonly profileId: string;
  readonly input: PlainJsonObject;
}

export interface BaselineBatchPlan {
  readonly schemaVersion: 1;
  readonly batchId: string;
  readonly profileId: string;
  readonly items: readonly BaselineBatchItem[];
}

function projectResource(entry: FixtureLedgerEntry): CleanupBatchResource {
  return Object.freeze({
    resourceKey: entry.resourceKey,
    logicalId: entry.logicalId,
    kind: entry.kind,
    ordinal: entry.ordinal,
    identifier: entry.identifier,
    ownershipSha256: entry.ownershipSha256,
  });
}

export function buildCleanupBatchPlan(
  ledger: FrozenFixtureLedger,
  profileId: string,
  wave: number,
  maximumItems = MAX_DATABASE_BATCH_ITEMS
): CleanupBatchPlan {
  assertWorkerToken(profileId, "cleanup batch profile ID");
  if (
    ledger.schemaVersion !== 1 ||
    !Object.isFrozen(ledger) ||
    !Object.isFrozen(ledger.entries) ||
    !Number.isSafeInteger(wave) ||
    wave < 0 ||
    !Number.isSafeInteger(maximumItems) ||
    maximumItems <= 0 ||
    maximumItems > MAX_DATABASE_BATCH_ITEMS
  ) {
    throw new WorkerProtocolError("cleanup batch authority is invalid");
  }
  const resources = ledger.entries
    .filter((entry) => entry.profileId === profileId && entry.wave === wave)
    .sort((left, right) => left.ordinal - right.ordinal)
    .map(projectResource);
  if (resources.length === 0 || resources.length > maximumItems) {
    throw new WorkerProtocolError("cleanup batch size is invalid");
  }
  return Object.freeze({
    schemaVersion: 1,
    batchId: `cleanup/${profileId}/wave-${wave}`,
    profileId,
    wave,
    resources: Object.freeze(resources),
  });
}

export function buildBaselineBatchPlans(
  items: readonly BaselineBatchItem[],
  maximumItems = MAX_DATABASE_BATCH_ITEMS
): readonly BaselineBatchPlan[] {
  if (
    items.length === 0 ||
    items.length > MAX_DATABASE_BATCH_ITEMS ||
    !Number.isSafeInteger(maximumItems) ||
    maximumItems <= 0 ||
    maximumItems > MAX_DATABASE_BATCH_ITEMS
  ) {
    throw new WorkerProtocolError("baseline batch size is invalid");
  }
  const logicalIds = new Set<string>();
  const groups = new Map<string, BaselineBatchItem[]>();
  for (const item of items) {
    assertWorkerToken(item.logicalId, "baseline logical ID");
    assertWorkerToken(item.operationId, "baseline operation ID");
    assertWorkerToken(item.profileId, "baseline profile ID");
    assertPlainJsonObject(item.input, "baseline input");
    if (logicalIds.has(item.logicalId)) {
      throw new WorkerProtocolError("baseline logical ID is duplicated");
    }
    logicalIds.add(item.logicalId);
    const group = groups.get(item.profileId) ?? [];
    group.push(Object.freeze({ ...item, input: Object.freeze({ ...item.input }) }));
    groups.set(item.profileId, group);
  }
  const plans: BaselineBatchPlan[] = [];
  for (const [profileId, group] of groups) {
    if (group.length > maximumItems)
      throw new WorkerProtocolError("baseline profile batch is too large");
    plans.push(
      Object.freeze({
        schemaVersion: 1,
        batchId: `baseline/${profileId}`,
        profileId,
        items: Object.freeze(group),
      })
    );
  }
  return Object.freeze(plans);
}

export function projectBaselineOutputs(
  sourceOrder: readonly BaselineBatchItem[],
  outputs: ReadonlyMap<string, PlainJsonValue>
): readonly { readonly logicalId: string; readonly output: PlainJsonValue }[] {
  if (outputs.size !== sourceOrder.length) {
    throw new WorkerProtocolError("baseline output cardinality drifted");
  }
  return Object.freeze(
    sourceOrder.map(({ logicalId }) => {
      const output = outputs.get(logicalId);
      if (output === undefined) throw new WorkerProtocolError("baseline output is absent");
      return Object.freeze({ logicalId, output });
    })
  );
}
