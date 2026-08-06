import { createHash } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { WorkerProtocolError, type PlainJsonValue } from "../../workers/contracts";
import type { Task540SourceProfileId } from "./source-catalog";
import { TASK540_SOURCE_CATALOG } from "./source-catalog";
import type { Task540SourceExecutor } from "./source-executor";
import type {
  Task540CleanupBatchInput,
  Task540CleanupBatchOutput,
  Task540CleanupItem,
  Task540CleanupResult,
  Task540WorkerHandlers,
} from "./worker-operations";

const HANDLER_VERSION = "task-540-production-batches-v1";

export const TASK540_PRODUCTION_HANDLER_ARTIFACT = Object.freeze({
  schemaVersion: 1 as const,
  version: HANDLER_VERSION,
  sourceSha256: createHash("sha256")
    .update(
      [
        HANDLER_VERSION,
        "baseline:catalog-exact-sequential-sources",
        "cleanup:seo-pca-transaction",
        "cleanup:setting-da-transaction",
        "cleanup:user-da-transaction",
      ].join("\0")
    )
    .digest("hex"),
});

type CleanupOperation = Task540CleanupItem["operation"];

interface CleanupResource {
  readonly resourceKey: string;
  readonly kind: string;
  readonly identifier: readonly string[];
  readonly items: ReadonlyMap<CleanupOperation, Task540CleanupItem>;
}

function exactStringIdentifier(item: Task540CleanupItem, arity: number): readonly string[] {
  if (
    !Array.isArray(item.identifier) ||
    item.identifier.length !== arity ||
    item.identifier.some((value) => typeof value !== "string" || value.length === 0)
  ) {
    throw new WorkerProtocolError("TASK-540 cleanup identifier shape drifted");
  }
  return item.identifier as readonly string[];
}

function collectResources(
  input: Task540CleanupBatchInput,
  expectedKinds: ReadonlySet<string>,
  identifierArity: number,
  operations: readonly CleanupOperation[]
): readonly CleanupResource[] {
  const expectedOperations = new Set(operations);
  const mutable = new Map<
    string,
    {
      kind: string;
      identifier: readonly string[];
      items: Map<CleanupOperation, Task540CleanupItem>;
    }
  >();
  for (const item of input.items) {
    if (!expectedKinds.has(item.kind) || !expectedOperations.has(item.operation)) {
      throw new WorkerProtocolError("TASK-540 cleanup batch family drifted");
    }
    const identifier = exactStringIdentifier(item, identifierArity);
    const current = mutable.get(item.resourceKey);
    if (current === undefined) {
      mutable.set(item.resourceKey, {
        kind: item.kind,
        identifier,
        items: new Map([[item.operation, item]]),
      });
      continue;
    }
    if (
      current.kind !== item.kind ||
      JSON.stringify(current.identifier) !== JSON.stringify(identifier) ||
      current.items.has(item.operation)
    ) {
      throw new WorkerProtocolError("TASK-540 cleanup resource identity drifted");
    }
    current.items.set(item.operation, item);
  }
  const resources = [...mutable.entries()].map(([resourceKey, resource]) => {
    if (
      resource.items.size !== operations.length ||
      operations.some((operation) => !resource.items.has(operation))
    ) {
      throw new WorkerProtocolError("TASK-540 cleanup resource slots are incomplete");
    }
    return Object.freeze({ resourceKey, ...resource, items: resource.items });
  });
  if (resources.length === 0 || resources.length * operations.length !== input.items.length) {
    throw new WorkerProtocolError("TASK-540 cleanup batch cardinality drifted");
  }
  return Object.freeze(resources);
}

function resultFor(item: Task540CleanupItem, output: PlainJsonValue): Task540CleanupResult {
  return Object.freeze({
    logicalId: item.logicalId,
    resourceKey: item.resourceKey,
    operation: item.operation,
    output,
  });
}

function orderedResults(
  input: Task540CleanupBatchInput,
  outputs: ReadonlyMap<string, ReadonlyMap<CleanupOperation, PlainJsonValue>>
): readonly Task540CleanupResult[] {
  return Object.freeze(
    input.items.map((item) => {
      const output = outputs.get(item.resourceKey)?.get(item.operation);
      if (output === undefined) {
        throw new WorkerProtocolError("TASK-540 cleanup batch output is incomplete");
      }
      return resultFor(item, output);
    })
  );
}

function exactKeySet(actual: readonly string[], expected: readonly string[], label: string): void {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (
    left.length !== right.length ||
    new Set(left).size !== left.length ||
    left.some((value, index) => value !== right[index])
  ) {
    throw new WorkerProtocolError(`TASK-540 ${label} row identity drifted`);
  }
}

async function cleanupSeo(input: Task540CleanupBatchInput): Promise<Task540CleanupBatchOutput> {
  const resources = collectResources(input, new Set(["seo-document-entry"]), 3, [
    "provenance",
    "delete",
    "absence",
  ]);
  if (resources.length !== 6) {
    throw new WorkerProtocolError("TASK-540 SEO cleanup batch must own six rows");
  }
  const [{ db }, { seoDocuments }] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/schema"),
  ]);
  const expected = resources.map(({ identifier }) => identifier.join("\0"));
  const ids = resources.map(({ identifier }) => identifier[0]!);
  let beforeCount = 0;
  let deletedCount = 0;
  await db.transaction(async (transaction) => {
    const before = await transaction
      .select({
        id: seoDocuments.id,
        targetType: seoDocuments.targetType,
        targetId: seoDocuments.targetId,
      })
      .from(seoDocuments)
      .where(inArray(seoDocuments.id, ids));
    exactKeySet(
      before.map(({ id, targetType, targetId }) => [id, targetType, targetId].join("\0")),
      expected,
      "SEO provenance"
    );
    beforeCount = before.length;
    const predicates = resources.map(({ identifier: [id, targetType, targetId] }) =>
      and(
        eq(seoDocuments.id, id!),
        eq(seoDocuments.targetType, targetType!),
        eq(seoDocuments.targetId, targetId!)
      )
    );
    const deleted = await transaction
      .delete(seoDocuments)
      .where(or(...predicates))
      .returning({
        id: seoDocuments.id,
        targetType: seoDocuments.targetType,
        targetId: seoDocuments.targetId,
      });
    exactKeySet(
      deleted.map(({ id, targetType, targetId }) => [id, targetType, targetId].join("\0")),
      expected,
      "SEO delete"
    );
    deletedCount = deleted.length;
  });
  const remaining = await db
    .select({ id: seoDocuments.id })
    .from(seoDocuments)
    .where(inArray(seoDocuments.id, ids));
  if (remaining.length !== 0) {
    throw new WorkerProtocolError("TASK-540 SEO post-commit absence drifted");
  }
  const outputs = new Map<string, ReadonlyMap<CleanupOperation, PlainJsonValue>>();
  for (const { resourceKey } of resources) {
    outputs.set(
      resourceKey,
      new Map([
        ["provenance", { absent: false, affected: 0, present: true }],
        ["delete", { absent: true, affected: 1, present: true }],
        ["absence", { absent: true, affected: 0, present: false }],
      ])
    );
  }
  return Object.freeze({
    results: orderedResults(input, outputs),
    statements: 3,
    rows: beforeCount + deletedCount,
  });
}

async function cleanupSettings(
  input: Task540CleanupBatchInput
): Promise<Task540CleanupBatchOutput> {
  const resources = collectResources(input, new Set(["setting-user-a", "setting-user-b"]), 2, [
    "delete",
    "absence",
  ]);
  if (resources.length !== 2) {
    throw new WorkerProtocolError("TASK-540 setting cleanup batch must own two rows");
  }
  const [{ db }, { userSettings }] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/schema"),
  ]);
  const expected = resources.map(({ identifier }) => identifier.join("\0"));
  const predicates = resources.map(({ identifier: [userId, key] }) =>
    and(eq(userSettings.userId, userId!), eq(userSettings.key, key!))
  );
  let deletedCount = 0;
  await db.transaction(async (transaction) => {
    const deleted = await transaction
      .delete(userSettings)
      .where(or(...predicates))
      .returning({ userId: userSettings.userId, key: userSettings.key });
    exactKeySet(
      deleted.map(({ userId, key }) => [userId, key].join("\0")),
      expected,
      "setting delete"
    );
    deletedCount = deleted.length;
  });
  const remaining = await db
    .select({ userId: userSettings.userId, key: userSettings.key })
    .from(userSettings)
    .where(or(...predicates));
  if (remaining.length !== 0) {
    throw new WorkerProtocolError("TASK-540 setting post-commit absence drifted");
  }
  const outputs = new Map<string, ReadonlyMap<CleanupOperation, PlainJsonValue>>();
  for (const { resourceKey } of resources) {
    outputs.set(
      resourceKey,
      new Map([
        ["delete", { absent: true, affected: 1, present: true }],
        ["absence", { absent: true, affected: 0, present: false }],
      ])
    );
  }
  return Object.freeze({
    results: orderedResults(input, outputs),
    statements: 2,
    rows: deletedCount,
  });
}

async function cleanupUsers(input: Task540CleanupBatchInput): Promise<Task540CleanupBatchOutput> {
  const resources = collectResources(input, new Set(["user-a", "user-b"]), 1, [
    "delete",
    "absence",
  ]);
  if (resources.length !== 2) {
    throw new WorkerProtocolError("TASK-540 user cleanup batch must own two rows");
  }
  const [{ db }, { users }] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/schema"),
  ]);
  const ids = resources.map(({ identifier }) => identifier[0]!);
  let deletedCount = 0;
  await db.transaction(async (transaction) => {
    const deleted = await transaction
      .delete(users)
      .where(inArray(users.id, ids))
      .returning({ id: users.id });
    exactKeySet(
      deleted.map(({ id }) => id),
      ids,
      "user delete"
    );
    deletedCount = deleted.length;
  });
  const remaining = await db.select({ id: users.id }).from(users).where(inArray(users.id, ids));
  if (remaining.length !== 0) {
    throw new WorkerProtocolError("TASK-540 user post-commit absence drifted");
  }
  const outputs = new Map<string, ReadonlyMap<CleanupOperation, PlainJsonValue>>();
  for (const { resourceKey } of resources) {
    outputs.set(
      resourceKey,
      new Map([
        ["delete", { absent: true, affected: 1, present: true }],
        ["absence", { absent: true, affected: 0, present: false }],
      ])
    );
  }
  return Object.freeze({
    results: orderedResults(input, outputs),
    statements: 2,
    rows: deletedCount,
  });
}

async function runCleanupBatch(
  profileId: "database" | "user-identity-proof",
  input: Task540CleanupBatchInput
): Promise<Task540CleanupBatchOutput> {
  if (profileId !== "database") {
    throw new WorkerProtocolError("TASK-540 cleanup batch profile is not supported");
  }
  const kinds = new Set(input.items.map(({ kind }) => kind));
  if (kinds.size === 1 && kinds.has("seo-document-entry")) return cleanupSeo(input);
  if ([...kinds].every((kind) => kind === "setting-user-a" || kind === "setting-user-b")) {
    return cleanupSettings(input);
  }
  if ([...kinds].every((kind) => kind === "user-a" || kind === "user-b")) {
    return cleanupUsers(input);
  }
  throw new WorkerProtocolError("TASK-540 cleanup batch family is unsupported");
}

function observedCandidateRows(output: PlainJsonValue): number {
  if (
    output === null ||
    Array.isArray(output) ||
    typeof output !== "object" ||
    !Array.isArray((output as Readonly<Record<string, PlainJsonValue>>).candidates)
  ) {
    throw new WorkerProtocolError("TASK-540 baseline candidate output drifted");
  }
  return (
    (output as Readonly<Record<string, PlainJsonValue>>).candidates as readonly PlainJsonValue[]
  ).length;
}

export function createTask540ProductionWorkerHandlers(
  executor: Task540SourceExecutor
): Task540WorkerHandlers {
  const handlers: Task540WorkerHandlers = {
    artifact: TASK540_PRODUCTION_HANDLER_ARTIFACT,
    async runBaselineBatch(profileId, input) {
      const results = [];
      let rows = 0;
      for (const item of input.items) {
        const entry = TASK540_SOURCE_CATALOG.require(
          item.operationId,
          profileId as Task540SourceProfileId
        );
        const output = await executor.execute({
          operationId: item.operationId,
          profileId: profileId as Task540SourceProfileId,
          sourceSha256: entry.sourceSha256,
          input: item.input,
        });
        rows += observedCandidateRows(output);
        results.push(Object.freeze({ logicalId: item.logicalId, output }));
      }
      return Object.freeze({
        results: Object.freeze(results),
        statements: input.items.length,
        rows,
      });
    },
    runCleanupBatch,
  };
  return Object.freeze(handlers);
}
