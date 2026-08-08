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
import { TASK540_OPERATION_ALIASES } from "../../../scripts/runtime-smoke/adapters/task-540/operations/aliases";
import { createTask540TypedHandlers } from "../../../scripts/runtime-smoke/adapters/task-540/operations/handlers";
import type {
  Task540InputSchemaId,
  Task540TypedHandler,
} from "../../../scripts/runtime-smoke/adapters/task-540/operations/contracts";
import type { PlainJsonObject } from "../../../scripts/runtime-smoke/workers/contracts";

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
    slots: readonly ("provenance" | "delete" | "absence")[],
    identifier: readonly string[]
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
        identifier,
        ownershipSha256: digest(`owner-${resourceKey}`),
      });
    }
  };
  for (let index = 0; index < 6; index += 1) {
    appendResource(
      "seo-document-entry",
      index,
      ["provenance", "delete", "absence"],
      [
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        "entry",
        `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      ]
    );
  }
  for (let index = 0; index < 2; index += 1) {
    const settingUserId = `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    const userId = `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    appendResource(
      index === 0 ? "setting-user-a" : "setting-user-b",
      index,
      ["delete", "absence"],
      [settingUserId, "customScreens.entry.preferences"]
    );
    appendResource(index === 0 ? "user-a" : "user-b", index + 2, ["delete", "absence"], [userId]);
  }
  const mediaId = "40000000-0000-4000-8000-000000000004";
  appendResource(
    "media-row-key",
    4,
    ["provenance", "delete", "absence"],
    [mediaId, `2026/08/${mediaId}.png`]
  );
  appendResource(
    "presentation-override",
    5,
    ["provenance", "delete", "absence"],
    [
      "50000000-0000-4000-8000-000000000005",
      "60000000-0000-4000-8000-000000000005",
      "block-5",
      "mediaAssetId",
    ]
  );
  expect(operations).toHaveLength(TASK540_CLEANUP_DB_OPERATIONS);

  const dispatches = buildTask540CleanupDispatches(operations, handlers.artifact);
  expect(dispatches).toHaveLength(7);
  expect(dispatches.map(({ family }) => family)).toEqual([
    "media",
    "media",
    "media",
    "override",
    "seo",
    "setting",
    "user",
  ]);
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

  for (const seoResources of [0, 2]) {
    const dynamicOperations = operations.filter(
      ({ kind, resourceKey }) =>
        kind !== "seo-document-entry" || Number(resourceKey.split(":").at(-1)) < seoResources
    );
    const dynamicDispatches = buildTask540CleanupDispatches(dynamicOperations, handlers.artifact);
    expect(dynamicDispatches.filter(({ family }) => family === "seo")).toHaveLength(
      seoResources === 0 ? 0 : 1
    );
    const dynamicOutputs = await Promise.all(
      dynamicDispatches.map(async ({ descriptor, input }) =>
        registry.executeOneShot(descriptor, input)
      )
    );
    const dynamicReceipts = [
      ...dynamicOperations.map(({ logicalId }) => ({ logicalId, authority: "canonical" })),
      ...Array.from({ length: 40 }, (_value, index) => ({
        logicalId: `cleanup/dynamic-${seoResources}-node-${index}`,
        authority: "canonical",
      })),
    ];
    const dynamicPreserved = preserveTask540CanonicalCleanupReceipts(
      dynamicReceipts,
      dynamicOutputs as unknown as readonly Task540CleanupBatchOutput[],
      ({ logicalId }) => logicalId,
      (receipt) => ({ ...receipt, authority: "canonical+db" })
    );
    expect(dynamicPreserved).toHaveLength(54 + seoResources * 3);
    expect(dynamicPreserved.filter(({ authority }) => authority === "canonical+db")).toHaveLength(
      14 + seoResources * 3
    );
  }

  const foreignSlot = operations.map((operation, index) =>
    index === 1 ? { ...operation, ownershipSha256: digest("foreign-owner") } : operation
  );
  expect(() => buildTask540CleanupDispatches(foreignSlot, handlers.artifact)).toThrow(
    "ownership or slot authority drifted"
  );
  const duplicateSlot = operations.map((operation, index) =>
    index === 2 ? { ...operation, operation: "delete" as const } : operation
  );
  expect(() => buildTask540CleanupDispatches(duplicateSlot, handlers.artifact)).toThrow(
    "ownership or slot authority drifted"
  );
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
  const calls: string[] = [];
  const typedHandlers = new Map(createTask540TypedHandlers());
  for (const [handlerId, handler] of typedHandlers) {
    typedHandlers.set(
      handlerId,
      Object.freeze({
        ...handler,
        async execute(): Promise<{
          readonly candidates: readonly never[];
          readonly overflow: false;
        }> {
          calls.push(handlerId);
          return Object.freeze({ candidates: Object.freeze([]), overflow: false });
        },
      }) satisfies Task540TypedHandler
    );
  }
  const productionHandlers = createTask540ProductionWorkerHandlers(typedHandlers);
  const inputForSchema = (schemaId: Task540InputSchemaId, index: number): PlainJsonObject => {
    switch (schemaId) {
      case "email-input-v1":
        return { email: `task-540-${index}@example.com` };
      case "slug-input-v1":
        return { slug: `task-540-${index}` };
      case "entry-preflight-input-v1":
        return { entrySlug: `entry-${index}`, typeSlug: `type-${index}` };
      case "media-natural-input-v1":
        return { mimeType: "image/png", originalName: `task-${index}.png`, size: 64 };
      case "screen-preflight-input-v1":
        return { contentTypeSlug: `type-${index}`, name: `Task ${index}` };
      case "override-preflight-input-v1":
        return {
          blockId: `block-${index}`,
          contentTypeSlug: `type-${index}`,
          entrySlug: `entry-${index}`,
          propPath: "mediaAssetId",
          screenName: `Screen ${index}`,
        };
      default:
        throw new Error(`unexpected baseline schema: ${schemaId}`);
    }
  };
  const items = TASK540_OPERATION_ALIASES.filter(({ operationId }) =>
    operationId.startsWith("response-lost/preflight/")
  ).map((row, index) => ({
    logicalId: `baseline/item-${index}`,
    operationId: row.operationId,
    profileId: row.profileId,
    input: inputForSchema(row.inputSchemaId, index),
  }));
  expect(items).toHaveLength(18);
  const dispatches = buildTask540BaselineDispatches(items, productionHandlers.artifact);
  expect(dispatches).toHaveLength(2);
  const registry = createTask540WorkerOperationRegistry(productionHandlers);
  const outputs = await Promise.all(
    dispatches.map(({ descriptor, input }) => registry.executeOneShot(descriptor, input))
  );
  expect(calls).toHaveLength(18);
  expect(
    outputs.map((output) => (output as { readonly results: readonly unknown[] }).results.length)
  ).toEqual([14, 4]);
});
