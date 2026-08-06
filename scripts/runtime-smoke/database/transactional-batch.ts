import { WorkerProtocolError, assertPlainJson, type PlainJsonValue } from "../workers/contracts";
import type { BaselineBatchPlan, CleanupBatchPlan, CleanupBatchResource } from "./batch-contract";

export interface OwnedResourceRow {
  readonly resourceKey: string;
  readonly ownershipSha256: string;
}

export interface SetBasedCleanupAdapter<TTransaction> {
  transaction<T>(callback: (transaction: TTransaction) => Promise<T>): Promise<T>;
  readOwned(
    transaction: TTransaction,
    resources: readonly CleanupBatchResource[]
  ): Promise<readonly OwnedResourceRow[]>;
  deleteOwned(
    transaction: TTransaction,
    resources: readonly CleanupBatchResource[]
  ): Promise<readonly string[]>;
  proveAbsent(resourceKeys: readonly string[]): Promise<readonly string[]>;
}

export interface CleanupLogicalReceipt {
  readonly logicalId: string;
  readonly resourceKey: string;
  readonly operation: "provenance" | "delete" | "absence";
  readonly present: boolean;
  readonly affected: number;
  readonly absent: boolean;
}

export interface TransactionalCleanupResult {
  readonly batchId: string;
  readonly statementCount: 3;
  readonly rowCount: number;
  readonly receipts: readonly CleanupLogicalReceipt[];
}

export interface BaselineBatchAdapter {
  read(
    plan: BaselineBatchPlan
  ): Promise<readonly { readonly logicalId: string; readonly output: PlainJsonValue }[]>;
}

export interface BaselineBatchResult {
  readonly batchId: string;
  readonly statementCount: 1;
  readonly rowCount: number;
  readonly outputs: readonly { readonly logicalId: string; readonly output: PlainJsonValue }[];
}

function assertExactKeys(
  actual: readonly string[],
  expected: readonly string[],
  label: string
): void {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (
    left.length !== right.length ||
    left.some((key, index) => key !== right[index]) ||
    new Set(actual).size !== actual.length
  ) {
    throw new WorkerProtocolError(`${label} cardinality or identity drifted`);
  }
}

function validateOwnedRows(plan: CleanupBatchPlan, rows: readonly OwnedResourceRow[]): void {
  assertExactKeys(
    rows.map(({ resourceKey }) => resourceKey),
    plan.resources.map(({ resourceKey }) => resourceKey),
    "cleanup provenance"
  );
  const expected = new Map(
    plan.resources.map(({ resourceKey, ownershipSha256 }) => [resourceKey, ownershipSha256])
  );
  if (rows.some((row) => expected.get(row.resourceKey) !== row.ownershipSha256)) {
    throw new WorkerProtocolError("cleanup provenance belongs to a foreign owner");
  }
}

export function projectCleanupLogicalReceipts(
  plan: CleanupBatchPlan
): readonly CleanupLogicalReceipt[] {
  return Object.freeze(
    plan.resources.flatMap(({ logicalId, resourceKey }) => [
      Object.freeze({
        logicalId,
        resourceKey,
        operation: "provenance" as const,
        present: true,
        affected: 0,
        absent: false,
      }),
      Object.freeze({
        logicalId,
        resourceKey,
        operation: "delete" as const,
        present: true,
        affected: 1,
        absent: true,
      }),
      Object.freeze({
        logicalId,
        resourceKey,
        operation: "absence" as const,
        present: false,
        affected: 0,
        absent: true,
      }),
    ])
  );
}

export async function executeTransactionalCleanupBatch<TTransaction>(
  plan: CleanupBatchPlan,
  adapter: SetBasedCleanupAdapter<TTransaction>
): Promise<TransactionalCleanupResult> {
  const resourceKeys = plan.resources.map(({ resourceKey }) => resourceKey);
  await adapter.transaction(async (transaction) => {
    const ownedRows = await adapter.readOwned(transaction, plan.resources);
    validateOwnedRows(plan, ownedRows);
    const deleted = await adapter.deleteOwned(transaction, plan.resources);
    assertExactKeys(deleted, resourceKeys, "cleanup returning rows");
  });
  const absent = await adapter.proveAbsent(resourceKeys);
  assertExactKeys(absent, resourceKeys, "cleanup post-commit absence");
  return Object.freeze({
    batchId: plan.batchId,
    statementCount: 3,
    rowCount: plan.resources.length,
    receipts: projectCleanupLogicalReceipts(plan),
  });
}

export async function reconcileUncertainCleanupMutation(
  plan: CleanupBatchPlan,
  readCurrent: () => Promise<readonly OwnedResourceRow[]>
): Promise<"pre-state" | "post-state"> {
  const current = await readCurrent();
  if (current.length === 0) return "post-state";
  if (current.length === plan.resources.length) {
    validateOwnedRows(plan, current);
    return "pre-state";
  }
  throw new WorkerProtocolError("cleanup mutation outcome is partial or ambiguous");
}

export async function executeBaselineBatch(
  plan: BaselineBatchPlan,
  adapter: BaselineBatchAdapter
): Promise<BaselineBatchResult> {
  const rows = await adapter.read(plan);
  assertExactKeys(
    rows.map(({ logicalId }) => logicalId),
    plan.items.map(({ logicalId }) => logicalId),
    "baseline batch output"
  );
  const byId = new Map(rows.map((row) => [row.logicalId, row.output]));
  const outputs = plan.items.map(({ logicalId }) => {
    const output = byId.get(logicalId);
    if (output === undefined) throw new WorkerProtocolError("baseline output is absent");
    assertPlainJson(output, "baseline output");
    return Object.freeze({ logicalId, output });
  });
  return Object.freeze({
    batchId: plan.batchId,
    statementCount: 1,
    rowCount: outputs.length,
    outputs: Object.freeze(outputs),
  });
}
