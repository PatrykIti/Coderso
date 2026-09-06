import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { AccessLogsRetentionExecutor } from "../../../core/services/access/accessLogService";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map:
 * the exact-own child fixture map (`TASK551_FIXTURE_DATABASE_URL`, `_NAME`,
 * `_SENTINEL`) plus fixed OS keys, with no inherited environment. The map is
 * injected only by the owner, so its presence -- never its values -- decides
 * whether the real database may be dialed. Under the airtight local form no
 * key is set, so the real-database legs below skip by name instead of dialing
 * an ambient URL. Mirrors tests/perf/database-pool-telemetry.test.ts.
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
type AccessLogServiceModule = typeof import("../../../core/services/access/accessLogService");

/**
 * The database client binds its pools when the module evaluates, so the owner
 * override must exist before that import and the whole DB-touching graph is
 * therefore loaded lazily. Without the owner map the graph still has to
 * evaluate for the DB-free legs, so the mandate's non-routable probe URL is
 * installed as a load-time sentinel: postgres.js connects lazily and every
 * dialing leg is gated behind `OWNER_DB_TEST_MAP_PRESENT`, so the sentinel is
 * never queried.
 */
const DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY = "task551DatabaseClientRuntimeOverrideForTests";
const MODULE_LOAD_SENTINEL_DATABASE_URL = "postgresql://127.0.0.1:1/none";

let client: ClientModule;
let service: AccessLogServiceModule;
let db: ClientModule["db"];
let accessLogs: SchemaModule["accessLogs"];
let sessions: SchemaModule["sessions"];
let users: SchemaModule["users"];

const loadModules = async (): Promise<AccessLogServiceModule> => {
  if (service) return service;
  (globalThis as Record<string, unknown>)[DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY] = {
    databaseUrl: OWNER_FIXTURE_DATABASE_URL ?? MODULE_LOAD_SENTINEL_DATABASE_URL,
  };
  client = (await import("../../../core/db/client")) as ClientModule;
  const schema = (await import("../../../core/db/schema")) as SchemaModule;
  accessLogs = schema.accessLogs;
  sessions = schema.sessions;
  users = schema.users;
  db = client.db;
  service =
    (await import("../../../core/services/access/accessLogService")) as AccessLogServiceModule;
  return service;
};

// Named gate: the real-database arms register through `test.skipIf` on the
// owner map above and skip when it is absent.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

let userId: string | undefined;
let logIds: string[] = [];
let sessionIds: string[] = [];

afterAll(async () => {
  if (!service) return;
  if (logIds.length > 0) {
    await db.delete(accessLogs).where(inArray(accessLogs.id, logIds));
  }
  if (sessionIds.length > 0) {
    await db.delete(sessions).where(inArray(sessions.id, sessionIds));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
  client.setDatabaseClientRuntimeForTests(null);
});

test("normalizeAccessLogQuery clamps, trims, validates dates, methods, IP, and cursors", async () => {
  const { normalizeAccessLogQuery } = await loadModules();
  const { encodeAdminCursor } = await import("../../../core/services/admin/adminQueryConventions");
  const cursor = encodeAdminCursor({
    createdAt: "2026-06-01T12:00:00.000Z",
    id: "access-1",
  });
  const query = normalizeAccessLogQuery({
    limit: "500",
    status: "failed",
    query: "  login  ",
    userId: " user-1 ",
    method: "post",
    ip: " 127.0.0.1 ",
    from: "2026-06-01",
    to: "2026-06-02",
    cursor,
  });

  expect(query).toMatchObject({
    limit: 200,
    status: "failed",
    query: "login",
    userId: "user-1",
    method: "POST",
    ip: "127.0.0.1",
    cursor,
  });
  expect(query.from?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  expect(query.to?.toISOString()).toBe("2026-06-02T23:59:59.999Z");

  expect(() => normalizeAccessLogQuery({ method: "TRACE" })).toThrow();
  expect(() =>
    normalizeAccessLogQuery({
      from: "2026-06-03T00:00:00.000Z",
      to: "2026-06-02T00:00:00.000Z",
    })
  ).toThrow();
  expect(() => normalizeAccessLogQuery({ cursor: "not-a-cursor" })).toThrow();
});

test("resolveAccessLogMatchContext explains hidden-field matches without values", async () => {
  const { resolveAccessLogMatchContext } = await loadModules();
  expect(
    resolveAccessLogMatchContext("ada@example.com", {
      path: "/admin/pages",
      ip: "127.0.0.1",
      userName: "Ada Lovelace",
      userEmail: "ada@example.com",
    })
  ).toEqual({ field: "email", label: "Matched user email" });
  expect(
    resolveAccessLogMatchContext("pages", {
      path: "/admin/pages",
      ip: "127.0.0.1",
      userName: "Ada Lovelace",
      userEmail: "ada@example.com",
    })
  ).toEqual({ field: "path", label: "Matched request path" });
});

test("resolveAccessLogSessionContext classifies availability and permissions", async () => {
  const { resolveAccessLogSessionContext } = await loadModules();
  const now = new Date("2026-06-01T12:00:00.000Z");
  expect(
    resolveAccessLogSessionContext(
      {
        status: 401,
        userId: null,
        sessionId: null,
        sessionFound: false,
        sessionExpiresAt: null,
        sessionRevokedAt: null,
      },
      { now }
    )
  ).toMatchObject({
    state: "none",
    reason: "failed_attempt",
    view: { enabled: false },
    revoke: { enabled: false },
  });

  const viewable = resolveAccessLogSessionContext(
    {
      status: 200,
      userId: "user-1",
      sessionId: "session-1",
      sessionFound: true,
      sessionExpiresAt: new Date("2026-06-01T13:00:00.000Z"),
      sessionRevokedAt: null,
    },
    { now, canViewSession: true, canRevokeSession: true }
  );
  expect(viewable).toMatchObject({
    state: "active",
    sessionId: "session-1",
    userId: "user-1",
    expiresAt: new Date("2026-06-01T13:00:00.000Z"),
    view: { enabled: true },
    revoke: { enabled: true },
  });

  expect(
    resolveAccessLogSessionContext(
      {
        status: 200,
        userId: "user-1",
        sessionId: "session-1",
        sessionFound: true,
        sessionExpiresAt: new Date("2026-06-01T13:00:00.000Z"),
        sessionRevokedAt: null,
      },
      { now, currentSessionId: "session-1", canViewSession: true, canRevokeSession: true }
    )
  ).toMatchObject({
    state: "current",
    sessionId: "session-1",
    view: { enabled: true },
    revoke: { enabled: false },
  });

  const restricted = resolveAccessLogSessionContext(
    {
      status: 200,
      userId: "user-1",
      sessionId: "session-1",
      sessionFound: true,
      sessionExpiresAt: new Date("2026-06-01T13:00:00.000Z"),
      sessionRevokedAt: null,
    },
    { now, currentSessionId: "session-1", canViewSession: false, canRevokeSession: false }
  );
  expect(restricted).toMatchObject({
    state: "current",
    view: { enabled: false },
    revoke: { enabled: false },
  });
  expect("sessionId" in restricted).toBe(false);
  expect("userId" in restricted).toBe(false);
  expect("current" in restricted).toBe(false);
  expect("expiresAt" in restricted).toBe(false);
  expect("revokedAt" in restricted).toBe(false);
});

testIfDb("logAccess creates entries and listAccessLogs filters", async () => {
  await loadModules();
  const { logAccess, listAccessLogs } = service;
  const [user] = await db
    .insert(users)
    .values({
      email: `access-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Access User",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  userId = user.id;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      tokenHash: `access-session-${randomUUID()}`,
      ip: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Macintosh)",
      expiresAt,
    })
    .returning({ id: sessions.id });
  sessionIds.push(session.id);

  const first = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    ip: "127.0.0.1",
    userId: user.id,
    sessionId: session.id,
  });

  const second = await logAccess({
    method: "POST",
    path: "/admin/api/auth/login",
    status: 401,
    ip: "127.0.0.2",
    userAgent: "Mozilla/5.0 (Macintosh)",
    userId: user.id,
  });

  logIds = [first.id, second.id];

  const all = await listAccessLogs(
    { limit: 10, userId: user.id },
    { canViewSession: true, canRevokeSession: true }
  );
  expect(all.items.length).toBeGreaterThanOrEqual(2);
  const sessionLog = all.items.find((row) => row.id === first.id);
  expect(sessionLog?.session).toMatchObject({
    state: "active",
    sessionId: session.id,
    view: { enabled: true },
    revoke: { enabled: true },
  });

  const failedOnly = await listAccessLogs({ limit: 10, status: "failed" });
  expect(failedOnly.items.every((row) => row.status >= 400)).toBe(true);

  const queryMatch = await listAccessLogs({ limit: 10, query: "auth" });
  expect(queryMatch.items.some((row) => row.path.includes("auth"))).toBe(true);

  const firstPage = await listAccessLogs({ limit: 1, userId: user.id });
  expect(firstPage.items).toHaveLength(1);
  expect(firstPage.nextCursor).toBeTruthy();

  const secondPage = await listAccessLogs({
    limit: 1,
    userId: user.id,
    cursor: firstPage.nextCursor,
  });
  expect(secondPage.items).toHaveLength(1);
  expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id);
  expect(secondPage.nextCursor).toBeNull();
});

testIfDb("revokeAccessLogSession resolves session from access log and guards state", async () => {
  await loadModules();
  const { logAccess, revokeAccessLogSession, AccessLogDomainError } = service;
  const [user] = await db
    .insert(users)
    .values({
      email: `access-revoke-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Access Revoke User",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const previousUserId = userId;
  userId = user.id;
  if (previousUserId) {
    await db.delete(users).where(eq(users.id, previousUserId));
  }

  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 60 * 60 * 1000);
  const insertedSessions = await db
    .insert(sessions)
    .values([
      {
        userId: user.id,
        tokenHash: `active-${randomUUID()}`,
        expiresAt: future,
      },
      {
        userId: user.id,
        tokenHash: `current-${randomUUID()}`,
        expiresAt: future,
      },
      {
        userId: user.id,
        tokenHash: `expired-${randomUUID()}`,
        expiresAt: past,
      },
    ])
    .returning({ id: sessions.id });
  sessionIds.push(...insertedSessions.map((row) => row.id));

  const activeLog = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    userId: user.id,
    sessionId: insertedSessions[0].id,
  });
  const currentLog = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    userId: user.id,
    sessionId: insertedSessions[1].id,
  });
  const expiredLog = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    userId: user.id,
    sessionId: insertedSessions[2].id,
  });
  const historicalLog = await logAccess({
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    userId: user.id,
  });
  logIds.push(activeLog.id, currentLog.id, expiredLog.id, historicalLog.id);

  const revoked = await revokeAccessLogSession({
    accessLogId: activeLog.id,
    currentSessionId: insertedSessions[1].id,
    reason: "admin_manual_revoke",
  });
  expect(revoked).toMatchObject({
    ok: true,
    accessLogId: activeLog.id,
    revokedSessionRef: insertedSessions[0].id,
    sessionState: "revoked",
    alreadyRevoked: false,
  });

  const idempotent = await revokeAccessLogSession({
    accessLogId: activeLog.id,
    currentSessionId: insertedSessions[1].id,
    reason: "admin_manual_revoke",
  });
  expect(idempotent.alreadyRevoked).toBe(true);

  await expect(
    revokeAccessLogSession({
      accessLogId: currentLog.id,
      currentSessionId: insertedSessions[1].id,
      reason: "admin_manual_revoke",
    })
  ).rejects.toMatchObject({ code: "access_log_current_session_revoke_blocked" });

  await expect(
    revokeAccessLogSession({
      accessLogId: expiredLog.id,
      currentSessionId: insertedSessions[1].id,
      reason: "admin_manual_revoke",
    })
  ).rejects.toMatchObject({ code: "access_log_session_expired" });

  await expect(
    revokeAccessLogSession({
      accessLogId: historicalLog.id,
      currentSessionId: insertedSessions[1].id,
      reason: "admin_manual_revoke",
    })
  ).rejects.toMatchObject({ code: "access_log_session_not_found" });

  await expect(
    revokeAccessLogSession({
      accessLogId: activeLog.id,
      currentSessionId: insertedSessions[1].id,
      reason: "invalid" as "admin_manual_revoke",
    })
  ).rejects.toBeInstanceOf(AccessLogDomainError);
});

// ---------------------------------------------------------------------------
// TASK-551-06-L01: the bounded `access_logs` pruner, DB-free
//
// These legs never dial a database. Policy bounds and the bounded-batch
// arithmetic run against the real resolvers, ordering/cutoff/limit pin the real
// compiled SQL, and the batch/run loops run against a recording stub executor
// that fails the test if a mode ever issues a statement it must not.
// ---------------------------------------------------------------------------

type StubProbe = { limit: number; locked: boolean };
type StubExecutor = ReturnType<typeof makeRetentionExecutorStub>;

/**
 * The exact postgres.js Result shape drizzle's postgres-js driver resolves a
 * DELETE to: the affected-row count lives on `count`, beside `command`,
 * `state`, `statement`, and `columns`. There is no `rowCount` field — a stub
 * that fed the node-postgres `rowCount` shape would silently agree with a
 * `rowCount`-reading production bug, so this is the only shape the stubs
 * return.
 */
type PostgresJsDeleteResult = string[] & {
  count: number;
  command: string;
  state: { status: string; pid: number; secret: number };
  statement: { name: string; sql: string; types: number[]; columns: unknown[] };
  columns: unknown[];
};

const postgresJsDeleteResult = (count: number): PostgresJsDeleteResult =>
  Object.assign([] as string[], {
    count,
    command: "DELETE",
    state: { status: "idle", pid: 0, secret: 0 },
    statement: { name: "", sql: "", types: [], columns: [] },
    columns: [],
  });

/**
 * Minimal `select`/`delete` executor stub shaped exactly like the capability
 * the pruner uses. It records every candidate probe (limit + row lock) and
 * every delete, and fails any statement outside that vocabulary.
 */
const makeRetentionExecutorStub = (
  rowsForProbe: (limit: number, probe: number) => readonly string[]
) => {
  const probes: StubProbe[] = [];
  const deletes: { rows: number }[] = [];
  let pendingRows: readonly string[] = [];
  let probeCount = 0;

  const executor = {
    probes,
    deletes,
    select: () => {
      const probe: StubProbe = { limit: 0, locked: false };
      const query = {
        from: () => query,
        where: () => query,
        orderBy: () => query,
        limit: (count: number) => {
          probe.limit = count;
          probes.push(probe);
          probeCount += 1;
          return query;
        },
        for: () => {
          probe.locked = true;
          return query;
        },
        then: (
          onFulfilled: (value: readonly string[]) => unknown,
          onRejected: (reason: unknown) => unknown
        ) =>
          Promise.resolve(rowsForProbe(probe.limit, probeCount - 1))
            .then((rows) => {
              pendingRows = rows;
              return rows;
            })
            .then(onFulfilled, onRejected),
      };
      return query;
    },
    delete: () => ({
      where: () => {
        const rows = pendingRows.length;
        pendingRows = [];
        deletes.push({ rows });
        return Promise.resolve(postgresJsDeleteResult(rows));
      },
    }),
  };
  return executor;
};

const fullBatchIds = (limit: number) => Array.from({ length: limit }, () => randomUUID());

/** The stub only implements the pruner's executor capability, so say so once. */
const asExecutor = (stub: StubExecutor): AccessLogsRetentionExecutor =>
  stub as unknown as AccessLogsRetentionExecutor;

const policyFromEnv = (env: Record<string, string>) => {
  const { resolveAccessLogsRetentionPolicy } = service;
  return resolveAccessLogsRetentionPolicy(env);
};

test("access_logs retention policy pins the family defaults and bounds", async () => {
  await loadModules();
  expect(policyFromEnv({})).toEqual({
    family: "access_logs",
    enabled: true,
    dryRun: false,
    maxAgeDays: 90,
    batchSize: 500,
    maxBatchesPerRun: 10,
  });

  expect(policyFromEnv({ RETENTION_ACCESS_LOGS_MAX_AGE_DAYS: "7" }).maxAgeDays).toBe(7);
  expect(policyFromEnv({ RETENTION_ACCESS_LOGS_MAX_AGE_DAYS: "365" }).maxAgeDays).toBe(365);
  expect(policyFromEnv({ RETENTION_ACCESS_LOGS_ENABLED: "false" }).enabled).toBe(false);
  expect(policyFromEnv({ RETENTION_DRY_RUN: "true" }).dryRun).toBe(true);
  expect(policyFromEnv({ RETENTION_BATCH_SIZE: "2000" }).batchSize).toBe(2000);
  expect(policyFromEnv({ RETENTION_MAX_BATCHES_PER_RUN: "100" }).maxBatchesPerRun).toBe(100);

  const invalid = (env: Record<string, string>) =>
    expect(() => policyFromEnv(env)).toThrow("retention_policy_invalid");
  invalid({ RETENTION_ACCESS_LOGS_MAX_AGE_DAYS: "6" });
  invalid({ RETENTION_ACCESS_LOGS_MAX_AGE_DAYS: "366" });
  invalid({ RETENTION_ACCESS_LOGS_MAX_AGE_DAYS: "90.5" });
  invalid({ RETENTION_ACCESS_LOGS_MAX_AGE_DAYS: " 90" });
  invalid({ RETENTION_ACCESS_LOGS_MAX_AGE_DAYS: "" });
  invalid({ RETENTION_ACCESS_LOGS_ENABLED: "TRUE" });
  invalid({ RETENTION_ACCESS_LOGS_ENABLED: "1" });
  // The global dry-run is the sole dry-run source and is strict.
  invalid({ RETENTION_DRY_RUN: "True" });
  invalid({ RETENTION_DRY_RUN: "1" });
  invalid({ RETENTION_DRY_RUN: "false " });
  // No family alias can rename a knob or override a global one.
  invalid({ RETENTION_ACCESS_LOGS_DAYS: "90" });
  invalid({ RETENTION_ACCESS_LOGS_DRY_RUN: "true" });
  invalid({ RETENTION_ACCESS_LOGS_BATCH_SIZE: "10" });
  invalid({ RETENTION_ACCESS_LOGS_MAX_BATCHES_PER_RUN: "2" });
  invalid({ RETENTION_BATCH_SIZE: "2001" });
  invalid({ RETENTION_MAX_BATCHES_PER_RUN: "101" });
});

test("access_logs retention run budget derives the bounded-batch arithmetic", async () => {
  await loadModules();
  const { accessLogsRetentionRunBudget } = service;
  expect(accessLogsRetentionRunBudget(policyFromEnv({}))).toEqual({
    family: "access_logs",
    enabled: true,
    dryRun: false,
    batchBudget: 10,
    rowsPerBatch: 500,
    maxRows: 5_000,
  });

  const disabled = accessLogsRetentionRunBudget(
    policyFromEnv({ RETENTION_ACCESS_LOGS_ENABLED: "false" })
  );
  expect(disabled.batchBudget).toBe(0);
  expect(disabled.maxRows).toBe(0);

  const maximum = accessLogsRetentionRunBudget(
    policyFromEnv({ RETENTION_BATCH_SIZE: "2000", RETENTION_MAX_BATCHES_PER_RUN: "100" })
  );
  expect(maximum.batchBudget).toBe(100);
  expect(maximum.rowsPerBatch).toBe(2000);
  expect(maximum.maxRows).toBe(200_000);

  // A hand-built policy outside the family bounds is rejected before any
  // statement can run.
  const bogus = {
    family: "access_logs",
    enabled: true,
    dryRun: false,
    maxAgeDays: 6,
    batchSize: 500,
    maxBatchesPerRun: 10,
  } as const;
  expect(() =>
    accessLogsRetentionRunBudget(
      bogus as unknown as Parameters<typeof accessLogsRetentionRunBudget>[0]
    )
  ).toThrow("retention_policy_invalid");
});

test("access_logs retention candidate query is cutoff-bounded, oldest-first, and batch-limited", async () => {
  const loaded = await loadModules();
  const { buildAccessLogsRetentionCandidateQuery } = loaded;
  const cutoff = new Date("2036-01-01T00:00:00.000Z");
  const compiled = buildAccessLogsRetentionCandidateQuery(db, cutoff, 500).toSQL();
  expect(compiled.sql).toBe(
    'select "id" from "access_logs" where "access_logs"."created_at" < $1 ' +
      'order by "access_logs"."created_at" asc, "access_logs"."id" asc limit $2'
  );
  // The cutoff binds as the strict `<` boundary, so the boundary row survives.
  expect(compiled.params).toEqual(["2036-01-01T00:00:00.000Z", 500]);

  // Apply mode takes the bounded row lock on the same candidate set.
  const locked = buildAccessLogsRetentionCandidateQuery(db, cutoff, 1)
    .for("update", { skipLocked: true })
    .toSQL();
  expect(locked.sql.endsWith("for update skip locked")).toBe(true);
});

test("access_logs dry-run observes the bounded batch with zero locks and zero deletes", async () => {
  await loadModules();
  const { pruneAccessLogsBatch } = service;
  const policy = policyFromEnv({
    RETENTION_DRY_RUN: "true",
    RETENTION_BATCH_SIZE: "3",
    RETENTION_MAX_BATCHES_PER_RUN: "5",
  });
  const stub = makeRetentionExecutorStub((limit) => fullBatchIds(limit));
  const result = await pruneAccessLogsBatch(
    policy,
    new Date("2036-01-01T00:00:00.000Z"),
    asExecutor(stub)
  );

  expect(result).toEqual({
    family: "access_logs",
    matched: 3,
    deleted: 0,
    dryRun: true,
  });
  expect(stub.probes).toEqual([{ limit: 3, locked: false }]);
  expect(stub.deletes).toHaveLength(0);
});

test("access_logs apply mode locks and deletes exactly the bounded oldest batch", async () => {
  await loadModules();
  const { pruneAccessLogsBatch } = service;
  const policy = policyFromEnv({ RETENTION_BATCH_SIZE: "4", RETENTION_MAX_AGE_DAYS: "30" });
  const stub = makeRetentionExecutorStub((limit) => fullBatchIds(limit));
  const result = await pruneAccessLogsBatch(
    policy,
    new Date("2036-01-01T00:00:00.000Z"),
    asExecutor(stub)
  );

  expect(result).toEqual({
    family: "access_logs",
    matched: 4,
    deleted: 4,
    dryRun: false,
  });
  // One probe, limited to the batch size, locked for delete.
  expect(stub.probes).toEqual([{ limit: 4, locked: true }]);
  expect(stub.deletes).toEqual([{ rows: 4 }]);
});

test("access_logs short batch reports the partial batch and stops probing", async () => {
  await loadModules();
  const { pruneAccessLogsBatch } = service;
  const policy = policyFromEnv({ RETENTION_BATCH_SIZE: "2", RETENTION_MAX_BATCHES_PER_RUN: "10" });
  const stub = makeRetentionExecutorStub(() => [randomUUID()]);
  const result = await pruneAccessLogsBatch(
    policy,
    new Date("2036-01-01T00:00:00.000Z"),
    asExecutor(stub)
  );
  expect(result).toEqual({
    family: "access_logs",
    matched: 1,
    deleted: 1,
    dryRun: false,
  });
  // The candidate probe is still bounded by the configured batch size.
  expect(stub.probes).toEqual([{ limit: 2, locked: true }]);
});

test("access_logs run loop drains on a short batch without exceeding the budget", async () => {
  await loadModules();
  const { runAccessLogsRetention } = service;
  const stub = makeRetentionExecutorStub((limit, probe) =>
    probe < 2 ? fullBatchIds(limit) : [randomUUID()]
  );
  const summary = await runAccessLogsRetention(
    new Date("2036-01-01T00:00:00.000Z"),
    asExecutor(stub)
  );
  // Two full default batches (500 rows each) then a one-row batch drains.
  expect(summary).toEqual({
    family: "access_logs",
    enabled: true,
    dryRun: false,
    batches: 3,
    matched: 1_001,
    deleted: 1_001,
  });
  expect(stub.probes).toHaveLength(3);
  expect(stub.probes.every((probe) => probe.limit === 500 && probe.locked)).toBe(true);
});

test("access_logs run loop stops at the batch budget when every batch is full", async () => {
  await loadModules();
  const { runAccessLogsRetention } = service;
  const stub = makeRetentionExecutorStub((limit) => fullBatchIds(limit));
  const summary = await runAccessLogsRetention(
    new Date("2036-01-01T00:00:00.000Z"),
    asExecutor(stub)
  );
  expect(summary.batches).toBe(10);
  expect(summary.matched).toBe(5_000);
  expect(summary.deleted).toBe(5_000);
  expect(stub.probes).toHaveLength(10);
});

test("access_logs apply run converges over driver-accurate delete counts and honors maxBatchesPerRun", async () => {
  await loadModules();
  const { runAccessLogsRetention } = service;
  const previousBatchSize = process.env.RETENTION_BATCH_SIZE;
  const previousMaxBatches = process.env.RETENTION_MAX_BATCHES_PER_RUN;
  // A depleting pool: each apply batch locks the oldest remaining candidates,
  // so the driver-accurate delete `count` falls 2, 2, 1 as the family drains.
  // Because the stub results carry only the postgres.js `count` field, this
  // convergence can only be observed by a run loop that reads `count`.
  const depletingStubFor = (supply: number) => {
    let remaining = supply;
    return makeRetentionExecutorStub((limit) => {
      const batch = Array.from({ length: Math.min(limit, remaining) }, () => randomUUID());
      remaining -= batch.length;
      return batch;
    });
  };
  try {
    process.env.RETENTION_BATCH_SIZE = "2";
    process.env.RETENTION_MAX_BATCHES_PER_RUN = "10";
    // Convergence: the short third batch drains the family inside the budget.
    const depleting = depletingStubFor(5);
    const drained = await runAccessLogsRetention(
      new Date("2036-01-01T00:00:00.000Z"),
      asExecutor(depleting)
    );
    expect(drained).toEqual({
      family: "access_logs",
      enabled: true,
      dryRun: false,
      batches: 3,
      matched: 5,
      deleted: 5,
    });
    expect(depleting.deletes).toEqual([{ rows: 2 }, { rows: 2 }, { rows: 1 }]);

    // Budget: with supply left over, the loop stops at maxBatchesPerRun.
    process.env.RETENTION_MAX_BATCHES_PER_RUN = "3";
    const capped = depletingStubFor(7);
    const budgeted = await runAccessLogsRetention(
      new Date("2036-01-01T00:00:00.000Z"),
      asExecutor(capped)
    );
    expect(budgeted).toEqual({
      family: "access_logs",
      enabled: true,
      dryRun: false,
      batches: 3,
      matched: 6,
      deleted: 6,
    });
    expect(capped.deletes).toEqual([{ rows: 2 }, { rows: 2 }, { rows: 2 }]);
  } finally {
    if (previousBatchSize === undefined) delete process.env.RETENTION_BATCH_SIZE;
    else process.env.RETENTION_BATCH_SIZE = previousBatchSize;
    if (previousMaxBatches === undefined) delete process.env.RETENTION_MAX_BATCHES_PER_RUN;
    else process.env.RETENTION_MAX_BATCHES_PER_RUN = previousMaxBatches;
  }
});

test("access_logs dry-run drains on observed candidates and never deletes", async () => {
  await loadModules();
  const { runAccessLogsRetention } = service;
  const stub = makeRetentionExecutorStub((limit) => fullBatchIds(limit));
  const previous = process.env.RETENTION_DRY_RUN;
  process.env.RETENTION_DRY_RUN = "true";
  try {
    const summary = await runAccessLogsRetention(
      new Date("2036-01-01T00:00:00.000Z"),
      asExecutor(stub)
    );
    expect(summary.dryRun).toBe(true);
    expect(summary.deleted).toBe(0);
    expect(summary.matched).toBe(summary.batches * 500);
  } finally {
    if (previous === undefined) delete process.env.RETENTION_DRY_RUN;
    else process.env.RETENTION_DRY_RUN = previous;
  }
  expect(stub.deletes).toHaveLength(0);
  // Dry-run never takes the destructive row lock.
  expect(stub.probes.length).toBe(10);
  expect(stub.probes.every((probe) => probe.locked === false)).toBe(true);
});

test("disabled access_logs family runs zero statements", async () => {
  await loadModules();
  const { runAccessLogsRetention } = service;
  const stub = makeRetentionExecutorStub(() => {
    throw new Error("retention_stub_must_not_probe_disabled_family");
  });
  const previous = process.env.RETENTION_ACCESS_LOGS_ENABLED;
  process.env.RETENTION_ACCESS_LOGS_ENABLED = "false";
  try {
    const summary = await runAccessLogsRetention(
      new Date("2036-01-01T00:00:00.000Z"),
      asExecutor(stub)
    );
    expect(summary).toEqual({
      family: "access_logs",
      enabled: false,
      dryRun: false,
      batches: 0,
      matched: 0,
      deleted: 0,
    });
  } finally {
    if (previous === undefined) delete process.env.RETENTION_ACCESS_LOGS_ENABLED;
    else process.env.RETENTION_ACCESS_LOGS_ENABLED = previous;
  }
  expect(stub.probes).toHaveLength(0);
  expect(stub.deletes).toHaveLength(0);
});
