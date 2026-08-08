import { createHash } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { WorkerProtocolError, type PlainJsonValue } from "../../workers/contracts";
import type { WorkerOperationContext } from "../../workers/contracts";
import { requireTask540OperationAlias } from "./operations/aliases";
import { createTask540TypedHandlers } from "./operations/handlers";
import { executeTask540TypedHandler, requireTask540TypedHandler } from "./operations/handlers";
import {
  validateTask540OperationInput,
  validateTask540OperationOutput,
  type Task540TypedHandler,
} from "./operations/contracts";
import type {
  Task540CleanupBatchInput,
  Task540CleanupBatchOutput,
  Task540CleanupItem,
  Task540CleanupResult,
  Task540WorkerHandlers,
} from "./worker-operations";
import { task540CleanupCardinality } from "./cleanup-cardinality";

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
        "cleanup:media-composite-stage-proof",
        "cleanup:override-already-reset-proof",
      ].join("\0")
    )
    .digest("hex"),
});

type CleanupOperation = Task540CleanupItem["operation"];

interface CleanupResource {
  readonly resourceKey: string;
  readonly kind: string;
  readonly identifier: readonly string[];
  readonly ownershipSha256: string;
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
      ownershipSha256: string;
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
        ownershipSha256: item.ownershipSha256,
        items: new Map([[item.operation, item]]),
      });
      continue;
    }
    if (
      current.kind !== item.kind ||
      JSON.stringify(current.identifier) !== JSON.stringify(identifier) ||
      current.ownershipSha256 !== item.ownershipSha256 ||
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
  // SEO rows are created only for scenarios that actually author SEO state.
  // Keep cleanup cardinality dynamic (1..6 here; zero skips this batch entirely).
  task540CleanupCardinality(resources.length);
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
  let beforeCount = 0;
  let deletedCount = 0;
  await db.transaction(async (transaction) => {
    const before = await transaction
      .select({ userId: userSettings.userId, key: userSettings.key })
      .from(userSettings)
      .where(or(...predicates));
    exactKeySet(
      before.map(({ userId, key }) => [userId, key].join("\0")),
      expected,
      "setting provenance"
    );
    beforeCount = before.length;
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
    statements: 3,
    rows: beforeCount + deletedCount,
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
  let beforeCount = 0;
  let deletedCount = 0;
  await db.transaction(async (transaction) => {
    const before = await transaction
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, ids));
    exactKeySet(
      before.map(({ id }) => id),
      ids,
      "user provenance"
    );
    beforeCount = before.length;
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
    statements: 3,
    rows: beforeCount + deletedCount,
  });
}

async function cleanupMedia(input: Task540CleanupBatchInput): Promise<Task540CleanupBatchOutput> {
  const operation = input.items[0]?.operation;
  if (operation === undefined || input.items.some((item) => item.operation !== operation)) {
    throw new WorkerProtocolError("TASK-540 media DB proof must contain one cleanup stage");
  }
  const resources = collectResources(input, new Set(["media-row-key"]), 2, [operation]);
  if (resources.length !== 1) {
    throw new WorkerProtocolError("TASK-540 media cleanup batch must own one row");
  }
  const [{ db }, { media }] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/schema"),
  ]);
  const [{ resourceKey, identifier }] = resources;
  const [mediaId, storageKey] = identifier;
  const rows = await db
    .select({ id: media.id, key: media.key, url: media.url })
    .from(media)
    .where(eq(media.id, mediaId!))
    .limit(2);
  if (operation === "provenance") {
    if (
      rows.length !== 1 ||
      rows[0]?.id !== mediaId ||
      rows[0]?.key !== storageKey ||
      rows[0]?.url !== `/media/${storageKey}`
    ) {
      throw new WorkerProtocolError("TASK-540 media provenance identity drifted");
    }
  } else if (rows.length !== 0) {
    throw new WorkerProtocolError("TASK-540 media post-API absence drifted");
  }
  const outputs = new Map<string, ReadonlyMap<CleanupOperation, PlainJsonValue>>([
    [
      resourceKey,
      new Map([
        [
          operation,
          {
            absent: operation !== "provenance",
            present: operation === "provenance",
            stage: operation,
          },
        ],
      ]),
    ],
  ]);
  return Object.freeze({
    results: orderedResults(input, outputs),
    statements: 1,
    rows: rows.length,
  });
}

async function cleanupAlreadyResetOverride(
  input: Task540CleanupBatchInput
): Promise<Task540CleanupBatchOutput> {
  const resources = collectResources(input, new Set(["presentation-override"]), 4, [
    "provenance",
    "delete",
    "absence",
  ]);
  if (resources.length !== 1) {
    throw new WorkerProtocolError("TASK-540 override cleanup batch must own one row");
  }
  const [{ db }, { customScreenEntryPresentationOverrides }] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/schema"),
  ]);
  const [{ resourceKey, identifier }] = resources;
  const [screenId, entryId, blockId, propPath] = identifier;
  const predicate = and(
    eq(customScreenEntryPresentationOverrides.screenId, screenId!),
    eq(customScreenEntryPresentationOverrides.entryId, entryId!),
    eq(customScreenEntryPresentationOverrides.blockId, blockId!),
    eq(customScreenEntryPresentationOverrides.propPath, propPath!)
  );
  await db.transaction(async (transaction) => {
    const present = await transaction
      .select({ screenId: customScreenEntryPresentationOverrides.screenId })
      .from(customScreenEntryPresentationOverrides)
      .where(predicate)
      .limit(2);
    if (present.length !== 0) {
      throw new WorkerProtocolError("TASK-540 already-reset override became present");
    }
  });
  const remaining = await db
    .select({ screenId: customScreenEntryPresentationOverrides.screenId })
    .from(customScreenEntryPresentationOverrides)
    .where(predicate)
    .limit(2);
  if (remaining.length !== 0) {
    throw new WorkerProtocolError("TASK-540 override absence proof drifted");
  }
  const absentOutput = Object.freeze({ absent: true, affected: 0, present: false });
  const outputs = new Map<string, ReadonlyMap<CleanupOperation, PlainJsonValue>>([
    [
      resourceKey,
      new Map([
        ["provenance", absentOutput],
        ["delete", absentOutput],
        ["absence", absentOutput],
      ]),
    ],
  ]);
  return Object.freeze({
    results: orderedResults(input, outputs),
    statements: 2,
    rows: 0,
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
  if (kinds.size === 1 && kinds.has("media-row-key")) return cleanupMedia(input);
  if (kinds.size === 1 && kinds.has("presentation-override")) {
    return cleanupAlreadyResetOverride(input);
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
  typedHandlers: ReadonlyMap<string, Task540TypedHandler> = createTask540TypedHandlers()
): Task540WorkerHandlers {
  const handlers: Task540WorkerHandlers = {
    artifact: TASK540_PRODUCTION_HANDLER_ARTIFACT,
    async runBaselineBatch(profileId, input) {
      const results = [];
      let rows = 0;
      for (const item of input.items) {
        const alias = requireTask540OperationAlias(item.operationId);
        if (alias.profileId !== profileId) {
          throw new WorkerProtocolError("TASK-540 baseline profile authority drifted");
        }
        const operationInput = validateTask540OperationInput(alias.inputSchemaId, item.input);
        const handler = requireTask540TypedHandler(typedHandlers, alias.handlerId);
        const context: WorkerOperationContext = Object.freeze({ profileId, requestId: 1 });
        const rawOutput = await executeTask540TypedHandler(handler, operationInput, context);
        const output = validateTask540OperationOutput(alias, operationInput, rawOutput);
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
