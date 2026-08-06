import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import type { BaselineBatchItem } from "../../../scripts/runtime-smoke/database/batch-contract";
import {
  TASK540_BASELINE_LOGICAL_RECEIPTS,
  TASK540_CLEANUP_DB_OPERATIONS,
  assertTask540SeoBatchBudget,
  buildTask540BaselineDispatches,
  buildTask540CleanupDispatches,
  preserveTask540CanonicalCleanupReceipts,
  type Task540DbCleanupOperation,
} from "../../../scripts/runtime-smoke/adapters/task-540/cleanup-batches";
import {
  createTask540WorkerDescriptors,
  createTask540WorkerOperationRegistry,
  type Task540CleanupBatchOutput,
  type Task540WorkerHandlers,
} from "../../../scripts/runtime-smoke/adapters/task-540/worker-operations";
import { createTask540ProductionWorkerHandlers } from "../../../scripts/runtime-smoke/adapters/task-540/production-handlers";
import { TASK540_SOURCE_CATALOG } from "../../../scripts/runtime-smoke/adapters/task-540/source-catalog";
import type { Task540SourceExecutor } from "../../../scripts/runtime-smoke/adapters/task-540/source-executor";

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const runBaselineBatch: Task540WorkerHandlers["runBaselineBatch"] = async (_profileId, input) => {
  return {
    results: input.items.map(({ logicalId, input: operationInput }) => ({
      logicalId,
      output: { observed: operationInput.ordinal },
    })),
    statements: 1,
    rows: input.items.length,
  };
};
const runCleanupBatch: Task540WorkerHandlers["runCleanupBatch"] = async (_profileId, input) => {
  return {
    results: input.items.map(({ logicalId, resourceKey, operation }) => ({
      logicalId,
      resourceKey,
      operation,
      output: { batched: true },
    })),
    statements: 3,
    rows: input.items.length,
  };
};
const handlers = {
  artifact: Object.freeze({
    schemaVersion: 1 as const,
    version: "task-540-test-handlers-v1",
    sourceSha256: digest(`${runBaselineBatch.toString()}\n${runCleanupBatch.toString()}`),
  }),
  runBaselineBatch,
  runCleanupBatch,
} satisfies Task540WorkerHandlers;

test("TASK-540 partitions 18 logical baselines without joining secret profiles", async () => {
  const items: BaselineBatchItem[] = Array.from(
    { length: TASK540_BASELINE_LOGICAL_RECEIPTS },
    (_value, index) => ({
      logicalId: `baseline/item-${index}`,
      operationId: `response-lost/preflight/item-${index}`,
      profileId: index < 14 ? "database" : "user-identity-proof",
      input: { ordinal: index },
    })
  );
  const dispatches = buildTask540BaselineDispatches(items, handlers.artifact);
  expect(dispatches).toHaveLength(2);
  expect(dispatches.map(({ descriptor }) => descriptor.profileId)).toEqual([
    "database",
    "user-identity-proof",
  ]);
  expect(dispatches.reduce((sum, { input }) => sum + input.items.length, 0)).toBe(18);

  const registry = createTask540WorkerOperationRegistry(handlers);
  const outputs = await Promise.all(
    dispatches.map(({ descriptor, input }) => registry.executeOneShot(descriptor, input))
  );
  expect(
    outputs
      .map(
        (output) => (output as unknown as { readonly results: readonly unknown[] }).results.length
      )
      .reduce((sum, length) => sum + length, 0)
  ).toBe(18);
});

test("TASK-540 batches 32 DB operations while its outer loop preserves all 72 receipts", async () => {
  const operations: Task540DbCleanupOperation[] = [];
  const appendResource = (
    kind: string,
    resourceIndex: number,
    slots: readonly ("provenance" | "delete" | "absence")[]
  ): void => {
    const resourceKey = `${kind}:${resourceIndex}`;
    for (const operation of slots) {
      const ordinal = operations.length;
      operations.push({
        resourceKey,
        logicalId: `cleanup/db-${ordinal}`,
        kind,
        operation,
        profileId: "database",
        wave: 0,
        ordinal,
        identifier: [`00000000-0000-4000-8000-${String(resourceIndex).padStart(12, "0")}`],
        ownershipSha256: digest(`owner-${resourceKey}`),
      });
    }
  };
  for (let index = 0; index < 6; index += 1) {
    appendResource("seo-document-entry", index, ["provenance", "delete", "absence"]);
  }
  for (let index = 0; index < 2; index += 1) {
    appendResource(index === 0 ? "setting-user-a" : "setting-user-b", index, ["delete", "absence"]);
    appendResource(index === 0 ? "user-a" : "user-b", index + 2, ["delete", "absence"]);
  }
  appendResource("media-row-key", 4, ["provenance", "delete", "absence"]);
  appendResource("presentation-override", 5, ["provenance", "delete", "absence"]);
  expect(operations).toHaveLength(TASK540_CLEANUP_DB_OPERATIONS);

  const dispatches = buildTask540CleanupDispatches(operations, handlers.artifact);
  expect(dispatches).toHaveLength(2);
  const seoDispatch = dispatches.find(({ family }) => family === "seo");
  expect(seoDispatch).toBeDefined();
  assertTask540SeoBatchBudget(seoDispatch!, 3);
  expect(() => assertTask540SeoBatchBudget(seoDispatch!, 4)).toThrow("three-statement contract");
  const registry = createTask540WorkerOperationRegistry(handlers);
  const outputs = await Promise.all(
    dispatches.map(async ({ descriptor, input }) => registry.executeOneShot(descriptor, input))
  );
  const canonicalReceipts = [
    ...operations.map(({ logicalId }) => ({ logicalId, authority: "canonical" })),
    ...Array.from({ length: 40 }, (_value, index) => ({
      logicalId: `cleanup/node-${index}`,
      authority: "canonical",
    })),
  ];
  const preserved = preserveTask540CanonicalCleanupReceipts(
    canonicalReceipts,
    outputs as unknown as readonly Task540CleanupBatchOutput[],
    ({ logicalId }) => logicalId,
    (receipt) => ({ ...receipt, authority: "canonical+db" })
  );
  expect(preserved).toHaveLength(72);
  expect(preserved.filter(({ authority }) => authority === "canonical+db")).toHaveLength(32);
  expect(preserved.filter(({ authority }) => authority === "canonical")).toHaveLength(40);
});

test("TASK-540 worker seam rejects result reordering and incomplete handler registries", async () => {
  const items: BaselineBatchItem[] = Array.from({ length: 18 }, (_value, index) => ({
    logicalId: `baseline/item-${index}`,
    operationId: `response-lost/preflight/item-${index}`,
    profileId: index < 14 ? "database" : "user-identity-proof",
    input: { ordinal: index },
  }));
  const [dispatch] = buildTask540BaselineDispatches(items, handlers.artifact);
  const reordered = createTask540WorkerOperationRegistry({
    ...handlers,
    async runBaselineBatch(profileId, input) {
      const output = await handlers.runBaselineBatch(profileId, input);
      return { ...output, results: [...output.results].reverse() };
    },
  });
  await expect(reordered.executeOneShot(dispatch.descriptor, dispatch.input)).rejects.toThrow(
    "correlation drifted"
  );
  expect(() =>
    createTask540WorkerOperationRegistry({
      runBaselineBatch: handlers.runBaselineBatch,
      runCleanupBatch: null,
    } as unknown as Task540WorkerHandlers)
  ).toThrow("handlers are incomplete");

  const changedArtifact = Object.freeze({
    ...handlers.artifact,
    sourceSha256: digest("different-handler-source"),
  });
  expect(createTask540WorkerDescriptors(handlers.artifact).baselineDatabase.sourceSha256).not.toBe(
    createTask540WorkerDescriptors(changedArtifact).baselineDatabase.sourceSha256
  );
});

test("TASK-540 production baseline handler reduces 18 logical reads to two profile frames", async () => {
  const requests: string[] = [];
  const executor = {
    async execute(request: { readonly operationId: string }) {
      requests.push(request.operationId);
      return { candidates: [] };
    },
  } as unknown as Task540SourceExecutor;
  const productionHandlers = createTask540ProductionWorkerHandlers(executor);
  const items = TASK540_SOURCE_CATALOG.operationIds()
    .filter((operationId) => operationId.startsWith("response-lost/preflight/"))
    .map((operationId, index) => ({
      logicalId: `baseline/item-${index}`,
      operationId,
      profileId: TASK540_SOURCE_CATALOG.require(operationId).profileId,
      input: { ordinal: index },
    }));
  expect(items).toHaveLength(18);
  const dispatches = buildTask540BaselineDispatches(items, productionHandlers.artifact);
  expect(dispatches).toHaveLength(2);
  const registry = createTask540WorkerOperationRegistry(productionHandlers);
  const outputs = await Promise.all(
    dispatches.map(({ descriptor, input }) => registry.executeOneShot(descriptor, input))
  );
  expect(requests).toHaveLength(18);
  expect(
    outputs.map((output) => (output as { readonly results: readonly unknown[] }).results.length)
  ).toEqual([14, 4]);
});
