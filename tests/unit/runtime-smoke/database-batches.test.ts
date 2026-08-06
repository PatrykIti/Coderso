import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  buildBaselineBatchPlans,
  buildCleanupBatchPlan,
  type BaselineBatchItem,
} from "../../../scripts/runtime-smoke/database/batch-contract";
import {
  RunFixtureLedger,
  type FixtureLedgerEntry,
} from "../../../scripts/runtime-smoke/database/fixture-ledger";
import {
  executeBaselineBatch,
  executeTransactionalCleanupBatch,
  reconcileUncertainCleanupMutation,
  type OwnedResourceRow,
  type SetBasedCleanupAdapter,
} from "../../../scripts/runtime-smoke/database/transactional-batch";

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function entry(index: number, overrides: Partial<FixtureLedgerEntry> = {}): FixtureLedgerEntry {
  return {
    resourceKey: `resource:${index}`,
    logicalId: `logical/resource-${index}`,
    kind: "seo-document-entry",
    profileId: "database",
    wave: 0,
    ordinal: index,
    identifier: [`00000000-0000-4000-8000-${String(index).padStart(12, "0")}`],
    ownershipSha256: digest(`owner-${index}`),
    dependsOn: [],
    ...overrides,
  };
}

test("fixture ledger freezes exact identities and enforces foreign-key-safe delete waves", () => {
  const ledger = new RunFixtureLedger();
  ledger.append(entry(0, { resourceKey: "child", wave: 0, dependsOn: ["parent"] }));
  ledger.append(entry(1, { resourceKey: "parent", wave: 1 }));
  const frozen = ledger.freeze();
  expect(Object.isFrozen(frozen)).toBe(true);
  expect(Object.isFrozen(frozen.entries)).toBe(true);
  expect(() => ledger.append(entry(2))).toThrow("already frozen");
  expect(
    buildCleanupBatchPlan(frozen, "database", 0).resources.map(({ resourceKey }) => resourceKey)
  ).toEqual(["child"]);

  const unsafe = new RunFixtureLedger();
  unsafe.append(entry(0, { resourceKey: "child", wave: 1, dependsOn: ["parent"] }));
  unsafe.append(entry(1, { resourceKey: "parent", wave: 0 }));
  expect(() => unsafe.freeze()).toThrow("foreign-key safe");
});

test("one six-SEO transaction uses three statements and preserves 18 DB slot results", async () => {
  const ledger = new RunFixtureLedger();
  for (let index = 0; index < 6; index += 1) ledger.append(entry(index));
  const plan = buildCleanupBatchPlan(ledger.freeze(), "database", 0);
  let state = new Map(
    plan.resources.map((resource) => [resource.resourceKey, resource.ownershipSha256])
  );
  let transactionCommits = 0;
  const adapter: SetBasedCleanupAdapter<Map<string, string>> = {
    async transaction(callback) {
      const transaction = new Map(state);
      const result = await callback(transaction);
      state = transaction;
      transactionCommits += 1;
      return result;
    },
    async readOwned(transaction, resources) {
      return resources.flatMap(({ resourceKey }) => {
        const ownershipSha256 = transaction.get(resourceKey);
        return ownershipSha256 === undefined ? [] : [{ resourceKey, ownershipSha256 }];
      });
    },
    async deleteOwned(transaction, resources) {
      return resources.flatMap(({ resourceKey }) =>
        transaction.delete(resourceKey) ? [resourceKey] : []
      );
    },
    async proveAbsent(resourceKeys) {
      return resourceKeys.filter((resourceKey) => !state.has(resourceKey));
    },
  };

  const result = await executeTransactionalCleanupBatch(plan, adapter);
  expect(transactionCommits).toBe(1);
  expect(result.statementCount).toBe(3);
  expect(result.rowCount).toBe(6);
  expect(result.receipts).toHaveLength(18);
  expect(result.receipts.slice(0, 3).map(({ operation }) => operation)).toEqual([
    "provenance",
    "delete",
    "absence",
  ]);
  expect(state.size).toBe(0);
});

test("foreign ownership rolls back and uncertain mutations accept only exact pre/post state", async () => {
  const ledger = new RunFixtureLedger();
  for (let index = 0; index < 3; index += 1) ledger.append(entry(index));
  const plan = buildCleanupBatchPlan(ledger.freeze(), "database", 0);
  const state = new Map(
    plan.resources.map((resource) => [resource.resourceKey, resource.ownershipSha256])
  );
  let deleteCalls = 0;
  let absenceCalls = 0;
  const adapter: SetBasedCleanupAdapter<Map<string, string>> = {
    async transaction(callback) {
      return callback(new Map(state));
    },
    async readOwned(_transaction, resources) {
      return resources.map(({ resourceKey, ownershipSha256 }, index) => ({
        resourceKey,
        ownershipSha256: index === 1 ? digest("foreign") : ownershipSha256,
      }));
    },
    async deleteOwned() {
      deleteCalls += 1;
      return [];
    },
    async proveAbsent() {
      absenceCalls += 1;
      return [];
    },
  };
  await expect(executeTransactionalCleanupBatch(plan, adapter)).rejects.toThrow("foreign owner");
  expect(deleteCalls).toBe(0);
  expect(absenceCalls).toBe(0);

  const preState: readonly OwnedResourceRow[] = plan.resources.map(
    ({ resourceKey, ownershipSha256 }) => ({ resourceKey, ownershipSha256 })
  );
  expect(await reconcileUncertainCleanupMutation(plan, async () => preState)).toBe("pre-state");
  expect(await reconcileUncertainCleanupMutation(plan, async () => [])).toBe("post-state");
  await expect(
    reconcileUncertainCleanupMutation(plan, async () => preState.slice(0, 1))
  ).rejects.toThrow("partial or ambiguous");
});

test("18 baselines execute in one bounded profile batch and project source order", async () => {
  const items: BaselineBatchItem[] = Array.from({ length: 18 }, (_value, index) => ({
    logicalId: `baseline/item-${index}`,
    operationId: `response-lost/preflight/item-${index}`,
    profileId: "database",
    input: { ordinal: index },
  }));
  const plans = buildBaselineBatchPlans(items);
  expect(plans).toHaveLength(1);
  const result = await executeBaselineBatch(plans[0], {
    async read(plan) {
      return [...plan.items]
        .reverse()
        .map(({ logicalId, input }) => ({ logicalId, output: { observed: input.ordinal } }));
    },
  });
  expect(result.statementCount).toBe(1);
  expect(result.outputs).toHaveLength(18);
  expect(result.outputs.map(({ logicalId }) => logicalId)).toEqual(
    items.map(({ logicalId }) => logicalId)
  );
});
