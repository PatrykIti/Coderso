// TASK-551-06-L01 — assistant execution + undo-manifest persistence is ONE transaction.
//
// `saveAssistantActionExecutionResult` wraps the idempotent execution write and
// the undo-manifest append in a single `db.transaction`, and a racing save that
// loses the idempotency insert must reject on the stored actor/plan identity
// instead of appending its undo items to another actor's execution. Airtight
// legs prove that boundary on stubbed transactions; real-DB legs dial the
// owner-injected fixture database only. No `.env` is ever sourced.
//
// Fixture safety: every idempotency key, plan id, action id and actor email is
// prefixed with this suite's unique marker, and cleanup deletes only those rows
// (undo items also cascade from their execution).

import { afterAll, describe, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import canonicalize from "canonicalize";

import type { AssistantActionExecutionSaveInput } from "../../../core/services/assistant/actionExecutionStore";
import type {
  AssistantActionExecuteResult,
  AssistantActionPlan,
} from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantUndoManifestItem } from "../../../core/services/assistant/actionUndoManifest";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map:
 * the exact-own child fixture map (`TASK551_FIXTURE_DATABASE_URL`, `_NAME`,
 * `_SENTINEL`) plus fixed OS keys, with no inherited environment. The map is
 * injected only by the owner, so its presence -- never its values -- decides
 * whether the real database may be dialed. Under the airtight local run no key
 * is set, so the real-DB legs skip by name instead of dialing an ambient URL.
 * Mirrors tests/perf/database-pool-telemetry.test.ts.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

/** The owner map is the only real-database source; nothing else is dialed. */
const OWNER_FIXTURE_DATABASE_URL = OWNER_DB_TEST_MAP_PRESENT
  ? (process.env.TASK551_FIXTURE_DATABASE_URL as string)
  : null;

type ClientModule = typeof import("../../../core/db/client");
type SchemaModule = typeof import("../../../core/db/schema");
type StoreModule = typeof import("../../../core/services/assistant/actionExecutionStore");

type DbTransaction = Parameters<Parameters<ClientModule["db"]["transaction"]>[0]>[0];
type ExecutionRow = SchemaModule["assistantActionExecutions"]["$inferSelect"];

/**
 * The database client binds its pools when the module evaluates, so the owner
 * override must exist before that import and the whole DB-touching graph is
 * therefore loaded lazily. Without the owner map the graph still has to
 * evaluate for the airtight legs, so the mandate's non-routable probe URL is
 * installed as a load-time sentinel: postgres.js connects lazily and every
 * dialing leg is gated behind `OWNER_DB_TEST_MAP_PRESENT`, so the sentinel is
 * never queried.
 */
const DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY = "task551DatabaseClientRuntimeOverrideForTests";
const MODULE_LOAD_SENTINEL_DATABASE_URL = "postgresql://127.0.0.1:1/none";

let client: ClientModule;
let db: ClientModule["db"];
let assistantActionExecutions: SchemaModule["assistantActionExecutions"];
let assistantActionUndoItems: SchemaModule["assistantActionUndoItems"];
let users: SchemaModule["users"];
let store: StoreModule;

const loadModules = async (): Promise<StoreModule> => {
  if (store) return store;
  (globalThis as Record<string, unknown>)[DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY] = {
    databaseUrl: OWNER_FIXTURE_DATABASE_URL ?? MODULE_LOAD_SENTINEL_DATABASE_URL,
  };
  client = (await import("../../../core/db/client")) as ClientModule;
  const schema = (await import("../../../core/db/schema")) as SchemaModule;
  assistantActionExecutions = schema.assistantActionExecutions;
  assistantActionUndoItems = schema.assistantActionUndoItems;
  users = schema.users;
  db = client.db;
  store = (await import("../../../core/services/assistant/actionExecutionStore")) as StoreModule;
  return store;
};

// Named gate: exactly the real-DB legs register through `test.skipIf` on the
// owner map above; every airtight leg runs against a stubbed transaction.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

const STORE_PATH = join(
  import.meta.dir,
  "../../../core/services/assistant/actionExecutionStore.ts"
);

/** Suite-scoped fixture marker: every persisted row carries it for cleanup. */
const SUITE = `task551-action-exec-store-${randomUUID()}`;
const executionKeys: string[] = [];
const undoActionIds: string[] = [];
const actorIds: string[] = [];

afterAll(async () => {
  if (!store || !OWNER_DB_TEST_MAP_PRESENT) return;
  // Undo items cascade from their execution; the explicit action-id sweep only
  // proves the zero-orphan claim, it never touches unowned rows.
  if (undoActionIds.length > 0) {
    await db
      .delete(assistantActionUndoItems)
      .where(inArray(assistantActionUndoItems.actionId, undoActionIds));
  }
  if (executionKeys.length > 0) {
    await db
      .delete(assistantActionExecutions)
      .where(inArray(assistantActionExecutions.idempotencyKey, executionKeys));
  }
  if (actorIds.length > 0) {
    await db.delete(users).where(inArray(users.id, actorIds));
  }
  client.setDatabaseClientRuntimeForTests(null);
});

// --- Fixture makers ---

const makePlan = (planId: string): AssistantActionPlan => ({
  id: planId,
  status: "ready",
  intentId: `${planId}-intent`,
  title: `Plan ${planId}`,
  answer: `Answer ${planId}`,
  summary: `Summary ${planId}`,
  confidence: 0.9,
  assumptions: [],
  questions: [],
  actions: [],
});

const makeExecuteResult = (planId: string): AssistantActionExecuteResult => {
  const plan = makePlan(planId);
  return {
    plan,
    preview: { plan, changes: [], warnings: [], readyToExecute: true },
    results: [],
    summary: { create: 0, update: 0, noop: 0, failed: 0 },
  };
};

const makeUndoItem = (actionId: string): AssistantUndoManifestItem => ({
  actionId,
  actionType: "setting.content-route.upsert",
  operation: "create",
  resourceType: "content_route",
  resourceId: randomUUID(),
  resourceKey: `route-${actionId}`,
  resourceLabel: `Route ${actionId}`,
  createdByAssistant: true,
  undoStrategy: "delete",
  status: "available",
  dependencyKeys: [],
  publicImpact: [],
  beforeSnapshot: null,
  afterSnapshot: { route: actionId },
  afterFingerprint: null,
  metadata: { suite: SUITE },
});

const makeSaveInput = (
  parts: Omit<AssistantActionExecutionSaveInput, "result"> & {
    result?: AssistantActionExecuteResult;
  }
): AssistantActionExecutionSaveInput => ({
  ...parts,
  result: parts.result ?? makeExecuteResult(parts.planId),
});

// The landed save contract types the actor as a plain `string`, so the
// anonymous-actor legs pass `""` on both sides of the identity comparison.
/** A persisted execution row projection, exactly as the driver would return it. */
const storedExecutionRow = (parts: {
  id: string;
  actorId: string | null;
  planId: string;
  planHash: string;
}): ExecutionRow =>
  ({
    id: parts.id,
    idempotencyKey: `${SUITE}:${parts.id}`,
    actorId: parts.actorId,
    planId: parts.planId,
    planHash: parts.planHash,
    result: makeExecuteResult(parts.planId),
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }) as unknown as ExecutionRow;

// --- Airtight transaction-boundary stub (driver-accurate) ---

/**
 * The exact postgres.js Result shape drizzle's postgres-js driver resolves an
 * insert without RETURNING to: the affected-row count lives on `count`, beside
 * `command`, `state`, `statement`, and `columns`. There is no `rowCount` field
 * — a stub that fed the node-postgres `rowCount` shape would silently agree
 * with a `rowCount`-reading production bug, so this is the only shape emitted.
 */
type PostgresJsInsertResult = string[] & {
  count: number;
  command: string;
  state: { status: string; pid: number; secret: number };
  statement: { name: string; sql: string; types: number[]; columns: unknown[] };
  columns: unknown[];
};

const postgresJsInsertResult = (count: number): PostgresJsInsertResult =>
  Object.assign([] as string[], {
    count,
    command: "INSERT",
    state: { status: "idle", pid: 0, secret: 0 },
    statement: { name: "", sql: "", types: [], columns: [] },
    columns: [],
  });

type PendingStatement = {
  table: "assistant_action_executions" | "assistant_action_undo_items";
  operation: "insert" | "select";
  valueCount: number;
  returning: boolean;
  conflictTarget: string;
};

type BoundaryStub = {
  transactions: number;
  committed: PendingStatement[];
  rolledBack: PendingStatement[];
  moduleLevelStatements: string[];
  undoExecutionIds: string[];
  executionInsertValues: Array<Record<string, unknown>>;
  transaction: (callback: (tx: DbTransaction) => Promise<unknown>) => Promise<unknown>;
};

type BoundaryStubOptions = {
  /** Row the executions INSERT ... RETURNING resolves to; absent = conflict. */
  executionsInsertRow?: ExecutionRow;
  /** Row the conflict-path executions SELECT resolves to. */
  selectReturnsRow?: ExecutionRow;
  /** Injects the failure between the execution and the undo inserts. */
  failUndoInsertWith?: Error;
  /** Rows the module-level lookup reader returns; absent = guarded. */
  lookupRows?: ExecutionRow[];
};

const columnLabel = (column: unknown): string => {
  const name = (column as { name?: unknown } | null | undefined)?.name;
  return typeof name === "string" ? name : "unknown_column";
};

const conflictTargetLabel = (target: unknown): string =>
  Array.isArray(target) ? target.map(columnLabel).join(",") : columnLabel(target);

const tableNameOf = (
  table: unknown
): "assistant_action_executions" | "assistant_action_undo_items" => {
  if (table === assistantActionExecutions) return "assistant_action_executions";
  if (table === assistantActionUndoItems) return "assistant_action_undo_items";
  // Fail closed on stub drift instead of silently accepting a new statement.
  throw new Error("assistant_action_store_stub_unknown_table");
};

const makeBoundaryStub = (options: BoundaryStubOptions): BoundaryStub => {
  const stub: BoundaryStub = {
    transactions: 0,
    committed: [],
    rolledBack: [],
    moduleLevelStatements: [],
    undoExecutionIds: [],
    executionInsertValues: [],
    transaction: async () => undefined,
  };

  const transaction = async (callback: (tx: DbTransaction) => Promise<unknown>) => {
    stub.transactions += 1;
    const pending: PendingStatement[] = [];
    const handle = {
      insert: (table: unknown) => {
        const tableLabel = tableNameOf(table);
        return {
          values: (values: Record<string, unknown> | ReadonlyArray<Record<string, unknown>>) => {
            // drizzle posts one row object for the execution, an array for the
            // manifest: normalize before counting or spreading.
            const posted = (Array.isArray(values) ? [...values] : [values]) as Array<
              Record<string, unknown>
            >;
            return {
              onConflictDoNothing: (conflict: { target: unknown }) => {
                const statement: PendingStatement = {
                  table: tableLabel,
                  operation: "insert",
                  valueCount: posted.length,
                  returning: false,
                  conflictTarget: conflictTargetLabel(conflict.target),
                };
                pending.push(statement);
                if (tableLabel === "assistant_action_undo_items") {
                  const first = posted[0] as { executionId?: unknown } | undefined;
                  stub.undoExecutionIds.push(
                    typeof first?.executionId === "string" ? first.executionId : "(none)"
                  );
                  if (options.failUndoInsertWith) return Promise.reject(options.failUndoInsertWith);
                  return Promise.resolve(postgresJsInsertResult(posted.length));
                }
                stub.executionInsertValues.push(...posted);
                const returned = options.executionsInsertRow ? [options.executionsInsertRow] : [];
                return Object.assign(Promise.resolve(returned), {
                  returning: () => {
                    // The chain asked for RETURNING; mark the recorded row.
                    statement.returning = true;
                    return Promise.resolve(returned);
                  },
                });
              },
            };
          },
        };
      },
      select: () => ({
        from: (table: unknown) => ({
          where: (_predicate: unknown) => {
            pending.push({
              table: tableNameOf(table),
              operation: "select",
              valueCount: 0,
              returning: true,
              conflictTarget: "none",
            });
            return Promise.resolve(options.selectReturnsRow ? [options.selectReturnsRow] : []);
          },
        }),
      }),
    };
    try {
      const outcome = await callback(handle as unknown as DbTransaction);
      // Driver commit boundary: statements survive only when the callback resolves.
      stub.committed.push(...pending);
      return outcome;
    } catch (error) {
      stub.rolledBack.push(...pending);
      throw error;
    }
  };
  stub.transaction = transaction;
  return stub;
};

/**
 * Patches the drizzle instance members the store can reach. Every save statement
 * must flow through the handle `db.transaction` hands its callback, so the
 * module-level builders become recording guards; only the replay lookup SELECT
 * (the one seam the store legitimately uses `db` for) may return stub rows, and
 * only when a leg asks for them. Each patch is reverted in `finally`, so the
 * real-DB legs always see the real prototype methods again.
 */
const runWithBoundaryStub = async <T>(
  options: BoundaryStubOptions,
  run: (stub: BoundaryStub) => Promise<T>
): Promise<T> => {
  const stub = makeBoundaryStub(options);
  const moduleGuard = (key: string) => () => {
    stub.moduleLevelStatements.push(key);
    throw new Error("assistant_action_store_module_level_statement");
  };
  const lookupSelect = () => ({
    from: (table: unknown) => ({
      where: (_predicate: unknown) => {
        stub.committed.push({
          table: tableNameOf(table),
          operation: "select",
          valueCount: 0,
          returning: true,
          conflictTarget: "none",
        });
        return Promise.resolve(options.lookupRows ?? []);
      },
    }),
  });
  const members: Record<string, unknown> = {
    transaction: stub.transaction,
    insert: moduleGuard("insert"),
    update: moduleGuard("update"),
    delete: moduleGuard("delete"),
    execute: moduleGuard("execute"),
    select: options.lookupRows ? () => lookupSelect() : moduleGuard("select"),
  };
  const host = db as unknown as Record<string, unknown>;
  const restores: Array<() => void> = [];
  for (const [key, value] of Object.entries(members)) {
    const hadOwn = Object.prototype.hasOwnProperty.call(host, key);
    const previous = host[key];
    host[key] = value;
    restores.push(() => {
      if (hadOwn) host[key] = previous;
      else delete host[key];
    });
  }
  try {
    return await run(stub);
  } finally {
    for (const restore of restores.reverse()) restore();
  }
};

// --- Fixture-scoped real-DB helpers (counted from returned rows, never rowCount) ---

const countExecutionsByKey = async (key: string): Promise<number> => {
  const rows = await db
    .select({ id: assistantActionExecutions.id })
    .from(assistantActionExecutions)
    .where(eq(assistantActionExecutions.idempotencyKey, key));
  return rows.length;
};

const undoRowsForActionIds = async (
  actionIds: readonly string[]
): Promise<Array<{ executionId: string; actionId: string }>> =>
  db
    .select({
      executionId: assistantActionUndoItems.executionId,
      actionId: assistantActionUndoItems.actionId,
    })
    .from(assistantActionUndoItems)
    .where(inArray(assistantActionUndoItems.actionId, [...actionIds]));

const createActor = async (): Promise<string> => {
  const [row] = await db
    .insert(users)
    .values({
      email: `${SUITE}-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Action Execution Store Fixture",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: users.id });
  actorIds.push(row!.id);
  return row!.id;
};

const suiteKey = (label: string): string => {
  const key = `${SUITE}:${label}:${randomUUID()}`;
  executionKeys.push(key);
  return key;
};

const suiteActionId = (label: string): string => {
  const actionId = `${SUITE}:${label}:${randomUUID()}`;
  undoActionIds.push(actionId);
  return actionId;
};

// --- Airtight legs: contract shape, refusal arms, transaction boundary ---

describe("task551 action execution store: contract shape", () => {
  test("hashAssistantActionPlan pins canonical JSON hashing and refuses an uncanonicalizable plan", async () => {
    const { hashAssistantActionPlan } = await loadModules();
    const plan = makePlan("plan-digest");
    const reordered = {
      actions: [],
      questions: [],
      assumptions: [],
      confidence: plan.confidence,
      summary: plan.summary,
      answer: plan.answer,
      title: plan.title,
      intentId: plan.intentId,
      status: plan.status,
      id: plan.id,
    } as AssistantActionPlan;

    const canonical = canonicalize(plan);
    if (!canonical) throw new Error("assistant_action_plan_invalid");
    const expected = createHash("sha256").update(canonical).digest("hex");
    expect(hashAssistantActionPlan(plan)).toBe(expected);
    // Key order never changes the digest: the canonical form sorts by code point.
    expect(hashAssistantActionPlan(reordered)).toBe(expected);
    expect(expected).toMatch(/^[0-9a-f]{64}$/);

    expect(() => hashAssistantActionPlan(undefined as unknown as AssistantActionPlan)).toThrow(
      "assistant_action_plan_invalid"
    );
  });

  test("withAssistantActionExecutionReplayMetadata pins the replay envelope", async () => {
    const { withAssistantActionExecutionReplayMetadata } = await loadModules();
    const result = makeExecuteResult("plan-envelope");
    expect(withAssistantActionExecutionReplayMetadata(result, false).idempotency).toEqual({
      replayed: false,
      scope: "actor_plan_hash",
    });
    expect(withAssistantActionExecutionReplayMetadata(result, true).idempotency).toEqual({
      replayed: true,
      scope: "actor_plan_hash",
    });
    // The source result is never mutated.
    expect(result.idempotency).toBeUndefined();
  });

  test("the save path wraps execution and undo persistence in exactly one transaction", async () => {
    const { saveAssistantActionExecutionResult, hashAssistantActionPlan } = await loadModules();
    // Structural pin: one wrap, so the two statements can never split.
    const source = readFileSync(STORE_PATH, "utf8");
    expect(source.split("db.transaction(").length - 1).toBe(1);

    const planId = "plan-wrap";
    const planHash = hashAssistantActionPlan(makePlan(planId));
    const executionRow = storedExecutionRow({ id: randomUUID(), actorId: "", planId, planHash });
    const actionIds = [suiteActionId("wrap-a"), suiteActionId("wrap-b")];

    await runWithBoundaryStub({ executionsInsertRow: executionRow }, async (stub) => {
      await saveAssistantActionExecutionResult(
        makeSaveInput({
          idempotencyKey: suiteKey("wrap"),
          actorId: "",
          planId,
          planHash,
          undoItems: actionIds.map(makeUndoItem),
        })
      );

      expect(stub.transactions).toBe(1);
      expect(stub.moduleLevelStatements).toEqual([]);
      expect(stub.committed.map((statement) => [statement.table, statement.operation])).toEqual([
        ["assistant_action_executions", "insert"],
        ["assistant_action_undo_items", "insert"],
      ]);
      // The manifest rides the same transaction and binds to the row the
      // execution INSERT returned, never to a second lookup.
      expect(stub.undoExecutionIds).toEqual([executionRow.id]);
      expect(stub.committed[0]).toMatchObject({
        conflictTarget: "idempotency_key",
        returning: true,
        valueCount: 1,
      });
      expect(stub.committed[1]).toMatchObject({
        conflictTarget: "execution_id,action_id,resource_type,resource_key",
        returning: false,
        valueCount: 2,
      });
    });
  });

  test("the persisted result projection is redacted and stamped replayed:false", async () => {
    const { saveAssistantActionExecutionResult, hashAssistantActionPlan } = await loadModules();
    const planId = "plan-projection";
    const planHash = hashAssistantActionPlan(makePlan(planId));
    const result = makeExecuteResult(planId);
    const leaky = {
      ...result,
      plan: { ...result.plan, apiKey: "sk-should-not-persist" },
    } as AssistantActionExecuteResult;

    const key = suiteKey("projection");
    await runWithBoundaryStub(
      {
        executionsInsertRow: storedExecutionRow({
          id: randomUUID(),
          actorId: "",
          planId,
          planHash,
        }),
      },
      async (stub) => {
        await saveAssistantActionExecutionResult(
          makeSaveInput({
            idempotencyKey: key,
            actorId: "",
            planId,
            planHash,
            result: leaky,
          })
        );
        const [values] = stub.executionInsertValues;
        const persisted = values?.result as AssistantActionExecuteResult;
        expect(persisted.idempotency).toEqual({ replayed: false, scope: "actor_plan_hash" });
        expect(JSON.stringify(values)).not.toContain("sk-should-not-persist");
        expect(JSON.stringify(values)).not.toContain("apiKey");
        expect(values?.idempotencyKey).toBe(key);
        expect(values?.planHash).toBe(planHash);
      }
    );
  });

  test("save without a manifest issues the execution insert only", async () => {
    const { saveAssistantActionExecutionResult, hashAssistantActionPlan } = await loadModules();
    const planId = "plan-no-manifest";
    const planHash = hashAssistantActionPlan(makePlan(planId));
    await runWithBoundaryStub(
      {
        executionsInsertRow: storedExecutionRow({
          id: randomUUID(),
          actorId: "",
          planId,
          planHash,
        }),
      },
      async (stub) => {
        await saveAssistantActionExecutionResult(
          makeSaveInput({
            idempotencyKey: suiteKey("no-manifest"),
            actorId: "",
            planId,
            planHash,
          })
        );
        expect(stub.transactions).toBe(1);
        expect(stub.committed).toHaveLength(1);
        expect(stub.committed[0]?.table).toBe("assistant_action_executions");
        expect(stub.undoExecutionIds).toEqual([]);
      }
    );
  });

  test("an exact replay loads the stored execution and appends the manifest in the same transaction", async () => {
    const { saveAssistantActionExecutionResult, hashAssistantActionPlan } = await loadModules();
    const planId = "plan-replay";
    const actorId = randomUUID();
    const planHash = hashAssistantActionPlan(makePlan(planId));
    const existing = storedExecutionRow({ id: randomUUID(), actorId, planId, planHash });
    const actionIds = [suiteActionId("replay-a")];

    await runWithBoundaryStub({ selectReturnsRow: existing }, async (stub) => {
      await saveAssistantActionExecutionResult(
        makeSaveInput({
          idempotencyKey: suiteKey("replay"),
          actorId,
          planId,
          planHash,
          undoItems: actionIds.map(makeUndoItem),
        })
      );
      expect(stub.committed.map((statement) => [statement.table, statement.operation])).toEqual([
        ["assistant_action_executions", "insert"],
        ["assistant_action_executions", "select"],
        ["assistant_action_undo_items", "insert"],
      ]);
      expect(stub.undoExecutionIds).toEqual([existing.id]);
    });
  });

  test("a different actor/plan identity on an existing key refuses before any undo row", async () => {
    const { saveAssistantActionExecutionResult, hashAssistantActionPlan } = await loadModules();
    const planId = "plan-conflict";
    const winnerHash = hashAssistantActionPlan(makePlan(planId));
    const otherHash = hashAssistantActionPlan(makePlan(`${planId}-other`));
    const winnerActorId = randomUUID();
    const storedByWinner = storedExecutionRow({
      id: randomUUID(),
      actorId: winnerActorId,
      planId,
      planHash: winnerHash,
    });
    const actionIds = [suiteActionId("conflict-a")];
    const mismatches = [
      // Same actor as the stored row, so only the plan hash breaks the identity.
      { label: "plan-hash", actorId: winnerActorId, planHash: otherHash },
      { label: "actor", actorId: randomUUID(), planHash: winnerHash },
    ];

    for (const mismatch of mismatches) {
      await runWithBoundaryStub({ selectReturnsRow: storedByWinner }, async (stub) => {
        await expect(
          saveAssistantActionExecutionResult(
            makeSaveInput({
              idempotencyKey: suiteKey(`conflict-${mismatch.label}`),
              actorId: mismatch.actorId,
              planId,
              planHash: mismatch.planHash,
              undoItems: actionIds.map(makeUndoItem),
            })
          )
        ).rejects.toThrow("assistant_action_idempotency_conflict");
        // Nothing commits, and the refused save never appends its manifest.
        expect(stub.committed).toEqual([]);
        expect(stub.undoExecutionIds).toEqual([]);
        expect(stub.rolledBack.map((statement) => statement.operation)).toEqual([
          "insert",
          "select",
        ]);
      });
    }
  });

  test("failure injected between the execution and undo inserts persists neither", async () => {
    const { saveAssistantActionExecutionResult, hashAssistantActionPlan } = await loadModules();
    const planId = "plan-rollback";
    const planHash = hashAssistantActionPlan(makePlan(planId));
    const actionIds = [suiteActionId("rollback-a"), suiteActionId("rollback-b")];

    await runWithBoundaryStub(
      {
        executionsInsertRow: storedExecutionRow({
          id: randomUUID(),
          actorId: "",
          planId,
          planHash,
        }),
        failUndoInsertWith: new Error("assistant_action_undo_insert_failed"),
      },
      async (stub) => {
        await expect(
          saveAssistantActionExecutionResult(
            makeSaveInput({
              idempotencyKey: suiteKey("rollback"),
              actorId: "",
              planId,
              planHash,
              undoItems: actionIds.map(makeUndoItem),
            })
          )
        ).rejects.toThrow("assistant_action_undo_insert_failed");
        expect(stub.committed).toEqual([]);
        expect(stub.rolledBack.map((statement) => statement.table)).toEqual([
          "assistant_action_executions",
          "assistant_action_undo_items",
        ]);
      }
    );
  });

  test("lookup replays the stored result and refuses a foreign identity", async () => {
    const { getAssistantActionExecutionByIdempotencyKey, hashAssistantActionPlan } =
      await loadModules();
    const planId = "plan-lookup";
    const actorId = randomUUID();
    const planHash = hashAssistantActionPlan(makePlan(planId));
    const stored = storedExecutionRow({ id: randomUUID(), actorId, planId, planHash });
    const key = suiteKey("lookup");

    await runWithBoundaryStub({ lookupRows: [stored] }, async () => {
      const replayed = await getAssistantActionExecutionByIdempotencyKey({
        idempotencyKey: key,
        actorId,
        planId,
        planHash,
      });
      expect(replayed).toMatchObject({
        idempotency: { replayed: true, scope: "actor_plan_hash" },
        plan: { id: planId },
      });

      await expect(
        getAssistantActionExecutionByIdempotencyKey({
          idempotencyKey: key,
          actorId: randomUUID(),
          planId,
          planHash,
        })
      ).rejects.toThrow("assistant_action_idempotency_conflict");
      await expect(
        getAssistantActionExecutionByIdempotencyKey({
          idempotencyKey: key,
          actorId,
          planId,
          planHash: hashAssistantActionPlan(makePlan(`${planId}-tampered`)),
        })
      ).rejects.toThrow("assistant_action_idempotency_conflict");
    });

    await runWithBoundaryStub({ lookupRows: [] }, async () => {
      await expect(
        getAssistantActionExecutionByIdempotencyKey({
          idempotencyKey: key,
          actorId,
          planId,
          planHash,
        })
      ).resolves.toBe(null);
    });
  });
});

// --- Real-DB legs: atomicity, refusal, and concurrency on the fixture database ---

describe("task551 action execution store on real PostgreSQL (requires the owner-injected task551-db-test map)", () => {
  testIfDb(
    "execution and undo manifest persist together and replay without duplicates",
    async () => {
      await loadModules();
      const actorId = await createActor();
      const planId = "plan-db-happy";
      const planHash = store.hashAssistantActionPlan(makePlan(planId));
      const key = suiteKey("db-happy");
      const actionIds = [suiteActionId("db-happy-a"), suiteActionId("db-happy-b")];

      await store.saveAssistantActionExecutionResult(
        makeSaveInput({
          idempotencyKey: key,
          actorId,
          planId,
          planHash,
          undoItems: actionIds.map(makeUndoItem),
        })
      );

      const [execution] = await db
        .select()
        .from(assistantActionExecutions)
        .where(eq(assistantActionExecutions.idempotencyKey, key));
      expect(execution).toBeDefined();
      expect(execution?.actorId).toBe(actorId);
      expect(execution?.planId).toBe(planId);
      expect(execution?.planHash).toBe(planHash);
      expect((execution?.result as AssistantActionExecuteResult).idempotency).toEqual({
        replayed: false,
        scope: "actor_plan_hash",
      });

      const manifest = await undoRowsForActionIds(actionIds);
      expect(manifest).toHaveLength(2);
      expect(manifest.every((row) => row.executionId === execution?.id)).toBe(true);

      // Exact replay: no second execution, no duplicated manifest, replayed:true.
      await store.saveAssistantActionExecutionResult(
        makeSaveInput({
          idempotencyKey: key,
          actorId,
          planId,
          planHash,
          undoItems: actionIds.map(makeUndoItem),
        })
      );
      expect(await countExecutionsByKey(key)).toBe(1);
      expect(await undoRowsForActionIds(actionIds)).toHaveLength(2);

      const replayed = await store.getAssistantActionExecutionByIdempotencyKey({
        idempotencyKey: key,
        actorId,
        planId,
        planHash,
      });
      expect(replayed?.idempotency).toEqual({ replayed: true, scope: "actor_plan_hash" });
    },
    120_000
  );

  testIfDb(
    "a foreign identity on the same key refuses and appends no undo row",
    async () => {
      await loadModules();
      const actorId = await createActor();
      const planId = "plan-db-conflict";
      const winnerHash = store.hashAssistantActionPlan(makePlan(planId));
      const rivalHash = store.hashAssistantActionPlan(makePlan(`${planId}-rival`));
      const key = suiteKey("db-conflict");
      const winnerActionIds = [suiteActionId("db-conflict-winner")];
      const attackerActionIds = [suiteActionId("db-conflict-attacker")];

      await store.saveAssistantActionExecutionResult(
        makeSaveInput({
          idempotencyKey: key,
          actorId,
          planId,
          planHash: winnerHash,
          undoItems: winnerActionIds.map(makeUndoItem),
        })
      );

      const attempts = await Promise.allSettled(
        [winnerHash, rivalHash].flatMap((planHash) => [
          store.saveAssistantActionExecutionResult(
            makeSaveInput({
              idempotencyKey: key,
              actorId: randomUUID(),
              planId,
              planHash,
              undoItems: attackerActionIds.map(makeUndoItem),
            })
          ),
          store.getAssistantActionExecutionByIdempotencyKey({
            idempotencyKey: key,
            actorId: randomUUID(),
            planId,
            planHash,
          }),
        ])
      );
      expect(attempts).toHaveLength(4);
      for (const attempt of attempts) {
        expect((attempt as PromiseRejectedResult).reason).toBeInstanceOf(Error);
        expect((attempt as PromiseRejectedResult).reason.message).toBe(
          "assistant_action_idempotency_conflict"
        );
      }
      expect(await countExecutionsByKey(key)).toBe(1);
      expect(await undoRowsForActionIds(attackerActionIds)).toEqual([]);
      expect(await undoRowsForActionIds(winnerActionIds)).toHaveLength(1);
    },
    120_000
  );

  testIfDb(
    "an undo-insert failure rolls the execution back with it",
    async () => {
      await loadModules();
      const actorId = await createActor();
      const planId = "plan-db-rollback";
      const planHash = store.hashAssistantActionPlan(makePlan(planId));
      const key = suiteKey("db-rollback");
      const actionIds = [suiteActionId("db-rollback-a"), suiteActionId("db-rollback-b")];
      // Failure injection between the two statements: the manifest's required
      // resource key is stripped at runtime, so only the second statement fails.
      const brokenManifest = actionIds.map((actionId) => ({
        ...makeUndoItem(actionId),
        resourceKey: null,
      })) as unknown as AssistantUndoManifestItem[];

      await expect(
        store.saveAssistantActionExecutionResult(
          makeSaveInput({
            idempotencyKey: key,
            actorId,
            planId,
            planHash,
            undoItems: brokenManifest,
          })
        )
      ).rejects.toThrow();
      expect(await countExecutionsByKey(key)).toBe(0);
      expect(await undoRowsForActionIds(actionIds)).toEqual([]);
    },
    120_000
  );

  testIfDb(
    "50 concurrent replay and conflict attempts leave one execution and a complete manifest",
    async () => {
      await loadModules();
      const actorId = await createActor();
      const planId = "plan-db-race";
      const winnerHash = store.hashAssistantActionPlan(makePlan(planId));
      const rivalHash = store.hashAssistantActionPlan(makePlan(`${planId}-rival`));
      const key = suiteKey("db-race");
      const winnerActionIds = [suiteActionId("db-race-a"), suiteActionId("db-race-b")];
      const attackerActionIds = [suiteActionId("db-race-attacker")];

      // The winner is seeded first so the raced identity is deterministic; the
      // 50 attempts then replay it or fight it under the same key.
      await store.saveAssistantActionExecutionResult(
        makeSaveInput({
          idempotencyKey: key,
          actorId,
          planId,
          planHash: winnerHash,
          undoItems: winnerActionIds.map(makeUndoItem),
        })
      );

      const replays = Array.from({ length: 40 }, () =>
        store.saveAssistantActionExecutionResult(
          makeSaveInput({
            idempotencyKey: key,
            actorId,
            planId,
            planHash: winnerHash,
            undoItems: winnerActionIds.map(makeUndoItem),
          })
        )
      );
      const conflicts = Array.from({ length: 10 }, () =>
        store.saveAssistantActionExecutionResult(
          makeSaveInput({
            idempotencyKey: key,
            actorId: randomUUID(),
            planId,
            planHash: rivalHash,
            undoItems: attackerActionIds.map(makeUndoItem),
          })
        )
      );
      const settled = await Promise.allSettled([...replays, ...conflicts]);
      expect(settled).toHaveLength(50);
      expect(settled.slice(0, 40).every((attempt) => attempt.status === "fulfilled")).toBe(true);
      expect(settled.slice(40).every((attempt) => attempt.status === "rejected")).toBe(true);
      for (const attempt of settled.slice(40)) {
        expect((attempt as PromiseRejectedResult).reason.message).toBe(
          "assistant_action_idempotency_conflict"
        );
      }

      expect(await countExecutionsByKey(key)).toBe(1);
      const [execution] = await db
        .select({ id: assistantActionExecutions.id })
        .from(assistantActionExecutions)
        .where(eq(assistantActionExecutions.idempotencyKey, key));
      const manifest = await undoRowsForActionIds([...winnerActionIds, ...attackerActionIds]);
      expect(manifest).toHaveLength(2);
      expect(manifest.every((row) => row.executionId === execution?.id)).toBe(true);
    },
    180_000
  );
});
