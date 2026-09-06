import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import type { AuditLogsRetentionExecutor } from "../../../core/services/audit/auditService";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map:
 * the exact-own child fixture map (`TASK551_FIXTURE_DATABASE_URL`, `_NAME`,
 * `_SENTINEL`) plus fixed OS keys, with no inherited environment. The map is
 * injected only by the owner, so its presence -- never its values -- decides
 * whether the real database may be dialed. Under the airtight local form no
 * key is set, so the real-database legs below skip by name instead of dialing
 * an ambient URL. Mirrors tests/vitest/database/boundedReadContract.test.ts.
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
type AuditServiceModule = typeof import("../../../core/services/audit/auditService");

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
let service: AuditServiceModule;
let db: ClientModule["db"];
let auditLogs: SchemaModule["auditLogs"];

const loadModules = async (): Promise<AuditServiceModule> => {
  if (service) return service;
  (globalThis as Record<string, unknown>)[DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY] = {
    databaseUrl: OWNER_FIXTURE_DATABASE_URL ?? MODULE_LOAD_SENTINEL_DATABASE_URL,
  };
  client = (await import("../../../core/db/client")) as ClientModule;
  const schema = (await import("../../../core/db/schema")) as SchemaModule;
  auditLogs = schema.auditLogs;
  db = client.db;
  service = (await import("../../../core/services/audit/auditService")) as AuditServiceModule;
  return service;
};

// Named gate: the real-database arms register through `test.skipIf` on the
// owner map above and skip by name when it is absent.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

const auditIds = new Set<string>();

afterAll(async () => {
  if (!service) return;
  if (auditIds.size > 0) {
    await db.delete(auditLogs).where(inArray(auditLogs.id, [...auditIds]));
  }
  client.setDatabaseClientRuntimeForTests(null);
});

async function insertAuditRowWithTimestamp(input: {
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}) {
  const id = randomUUID();
  await db.execute(sql`
    insert into audit_logs (id, actor_id, action, target_type, target_id, metadata, created_at)
    values (
      ${id}::uuid,
      null,
      ${input.action},
      ${input.targetType},
      ${input.targetId},
      ${JSON.stringify(input.metadata)}::jsonb,
      ${input.createdAt}::timestamp
    )
  `);
  auditIds.add(id);
  return id;
}

test("sanitizeMetadata strips sensitive keys", async () => {
  const { sanitizeMetadata } = await loadModules();
  const meta = sanitizeMetadata({
    token: "secret",
    password: "hidden",
    cookie: "session=secret",
    keep: "ok",
    authorization: "bearer",
    headers: {
      authorization: "Bearer sk-testsecret",
      accept: "application/json",
    },
  });

  expect(meta).toEqual({
    keep: "ok",
    headers: {
      accept: "application/json",
    },
  });
});

test("sanitizeMetadata redacts token-like values in nested structures", async () => {
  const { sanitizeMetadata } = await loadModules();
  const meta = sanitizeMetadata({
    provider: "openrouter",
    nested: {
      details: "Bearer sk-or-v1-abcdef1234567890",
      resend: "Authorization: Bearer re_superSecretValue123456",
    },
    list: ["ok", "eyJabc.def.ghi", "raw re_anotherSecretValue123456"],
  });

  expect(meta).toEqual({
    provider: "openrouter",
    nested: {
      details: "Bearer [REDACTED]",
      resend: "Authorization: Bearer [REDACTED]",
    },
    list: ["ok", "[REDACTED]", "raw [REDACTED]"],
  });
});

test("normalizeAuditLogQuery clamps limits, trims search, normalizes dates, and validates cursors", async () => {
  const { normalizeAuditLogQuery } = await loadModules();
  const normalized = normalizeAuditLogQuery({
    limit: "500",
    query: " auth ",
    category: "authentication",
    severity: "warning",
    from: "2026-06-01",
    to: "2026-06-02",
  });

  expect(normalized).toEqual({
    limit: 200,
    query: "auth",
    category: "authentication",
    severity: "warning",
    from: new Date("2026-06-01T00:00:00.000Z"),
    to: new Date("2026-06-02T23:59:59.999Z"),
  });
  expect(() => normalizeAuditLogQuery({ cursor: "not-a-valid-cursor" })).toThrow();
  expect(() => normalizeAuditLogQuery({ category: "unknown" })).toThrow(
    "Audit category is invalid."
  );
  expect(() => normalizeAuditLogQuery({ severity: "critical" })).toThrow(
    "Audit severity is invalid."
  );
});

test("audit classification derives category and severity from stored fields", async () => {
  await loadModules();
  const { resolveAuditCategory, resolveAuditSeverity } =
    await import("../../../core/services/audit/auditClassification");
  expect(resolveAuditCategory({ action: "auth.login", targetType: "session" })).toBe(
    "authentication"
  );
  expect(resolveAuditCategory({ action: "session.revoke", targetType: "session" })).toBe(
    "authentication"
  );
  expect(resolveAuditCategory({ action: "pages.publish", targetType: "page" })).toBe("content");
  expect(resolveAuditCategory({ action: "pages.publish", targetType: "PAGE" })).toBe("content");
  expect(resolveAuditCategory({ action: "auth.login", targetType: "PAGE" })).toBe("authentication");
  expect(resolveAuditCategory({ action: "settings.update", targetType: "settings" })).toBe(
    "system"
  );
  expect(resolveAuditSeverity({ action: "auth.denied" }, {})).toBe("warning");
  expect(resolveAuditSeverity({ action: "job.failed" }, {})).toBe("error");
  expect(resolveAuditSeverity({ action: "pages.publish" }, { severity: "info" })).toBe("info");
  expect(resolveAuditSeverity({ action: "auth.error.cleared" }, { severity: "info" })).toBe("info");
  expect(resolveAuditSeverity({ action: "auth.warn.ignored" }, { severity: "error" })).toBe(
    "error"
  );
});

testIfDb(
  "listAudit applies server-side filters before limit and returns keyset cursor",
  async () => {
    await loadModules();
    const { listAudit } = service;
    const token = `audit-query-${randomUUID()}`;
    const inserted = await db
      .insert(auditLogs)
      .values([
        {
          action: "auth.denied",
          targetType: "session",
          targetId: `${token}-newer`,
          actorId: null,
          metadata: { requestId: token },
          createdAt: new Date("2026-06-02T10:00:00.000Z"),
        },
        {
          action: "auth.denied",
          targetType: "session",
          targetId: `${token}-older`,
          actorId: null,
          metadata: { requestId: token },
          createdAt: new Date("2026-06-01T10:00:00.000Z"),
        },
        {
          action: "content.publish",
          targetType: "page",
          targetId: `${token}-content`,
          actorId: null,
          metadata: { requestId: token },
          createdAt: new Date("2026-06-03T10:00:00.000Z"),
        },
      ])
      .returning({ id: auditLogs.id });

    for (const row of inserted) auditIds.add(row.id);

    const firstPage = await listAudit({
      limit: 1,
      query: token,
      category: "authentication",
      severity: "warning",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-03T23:59:59.999Z",
    });

    expect(firstPage.items.map((item) => item.targetId)).toEqual([`${token}-newer`]);
    expect(firstPage.nextCursor).toBeTruthy();

    const { decodeAdminCursor } =
      await import("../../../core/services/admin/adminQueryConventions");
    expect(decodeAdminCursor(firstPage.nextCursor ?? "")).toMatchObject({
      createdAt: "2026-06-02T10:00:00.000000Z",
    });

    const secondPage = await listAudit({
      limit: 1,
      query: token,
      category: "authentication",
      severity: "warning",
      cursor: firstPage.nextCursor,
    });

    expect(secondPage.items.map((item) => item.targetId)).toEqual([`${token}-older`]);
    expect(secondPage.nextCursor).toBeNull();
  }
);

testIfDb("listAudit filters match the displayed category and severity classifier", async () => {
  await loadModules();
  const { listAudit } = service;
  const token = `audit-classification-${randomUUID()}`;
  const inserted = await db
    .insert(auditLogs)
    .values([
      {
        action: "session.revoke",
        targetType: "session",
        targetId: `${token}-auth-session`,
        actorId: null,
        metadata: { requestId: token },
        createdAt: new Date("2026-06-04T10:00:00.000Z"),
      },
      {
        action: "pages.publish",
        targetType: "PAGE",
        targetId: `${token}-content-page`,
        actorId: null,
        metadata: { requestId: token },
        createdAt: new Date("2026-06-04T09:00:00.000Z"),
      },
      {
        action: "auth.login",
        targetType: "PAGE",
        targetId: `${token}-auth-over-content`,
        actorId: null,
        metadata: { requestId: token },
        createdAt: new Date("2026-06-04T08:30:00.000Z"),
      },
      {
        action: "auth.error.cleared",
        targetType: "session",
        targetId: `${token}-explicit-info`,
        actorId: null,
        metadata: { requestId: token, severity: "info" },
        createdAt: new Date("2026-06-04T08:00:00.000Z"),
      },
      {
        action: "auth.warn.ignored",
        targetType: "session",
        targetId: `${token}-explicit-error`,
        actorId: null,
        metadata: { requestId: token, severity: "error" },
        createdAt: new Date("2026-06-04T07:00:00.000Z"),
      },
    ])
    .returning({ id: auditLogs.id });

  for (const row of inserted) auditIds.add(row.id);

  const authentication = await listAudit({ query: token, category: "authentication" });
  expect(authentication.items.map((item) => item.targetId)).toContain(`${token}-auth-session`);
  expect(authentication.items.map((item) => item.targetId)).toContain(`${token}-auth-over-content`);

  const content = await listAudit({ query: token, category: "content" });
  expect(content.items.map((item) => item.targetId)).toEqual([`${token}-content-page`]);

  const info = await listAudit({ query: token, severity: "info" });
  expect(info.items.map((item) => item.targetId)).toContain(`${token}-explicit-info`);
  expect(info.items.map((item) => item.targetId)).not.toContain(`${token}-explicit-error`);

  const error = await listAudit({ query: token, severity: "error" });
  expect(error.items.map((item) => item.targetId)).toContain(`${token}-explicit-error`);
  expect(error.items.map((item) => item.targetId)).not.toContain(`${token}-explicit-info`);
});

testIfDb("listAudit cursor preserves microsecond precision across page boundaries", async () => {
  await loadModules();
  const { listAudit } = service;
  const { decodeAdminCursor } = await import("../../../core/services/admin/adminQueryConventions");
  const token = `audit-micro-cursor-${randomUUID()}`;
  await insertAuditRowWithTimestamp({
    action: "settings.update",
    targetType: "settings",
    targetId: `${token}-newer`,
    metadata: { requestId: token },
    createdAt: "2026-06-05T10:00:00.123456Z",
  });
  await insertAuditRowWithTimestamp({
    action: "settings.update",
    targetType: "settings",
    targetId: `${token}-older-same-ms`,
    metadata: { requestId: token },
    createdAt: "2026-06-05T10:00:00.123123Z",
  });
  await insertAuditRowWithTimestamp({
    action: "settings.update",
    targetType: "settings",
    targetId: `${token}-older`,
    metadata: { requestId: token },
    createdAt: "2026-06-05T10:00:00.122999Z",
  });

  const firstPage = await listAudit({ limit: 1, query: token });

  expect(firstPage.items.map((item) => item.targetId)).toEqual([`${token}-newer`]);
  expect(decodeAdminCursor(firstPage.nextCursor ?? "")).toMatchObject({
    createdAt: "2026-06-05T10:00:00.123456Z",
  });

  const secondPage = await listAudit({ limit: 2, query: token, cursor: firstPage.nextCursor });

  expect(secondPage.items.map((item) => item.targetId)).toEqual([
    `${token}-older-same-ms`,
    `${token}-older`,
  ]);
  expect(secondPage.nextCursor).toBeNull();
});

// ---------------------------------------------------------------------------
// TASK-551-06-L01: the bounded `audit_logs` pruner, DB-free
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
const asExecutor = (stub: StubExecutor): AuditLogsRetentionExecutor =>
  stub as unknown as AuditLogsRetentionExecutor;

const policyFromEnv = (env: Record<string, string>) => {
  const { resolveAuditLogsRetentionPolicy } = service;
  return resolveAuditLogsRetentionPolicy(env);
};

test("audit_logs retention policy pins the family defaults and bounds", async () => {
  await loadModules();
  expect(policyFromEnv({})).toEqual({
    family: "audit_logs",
    enabled: true,
    dryRun: false,
    maxAgeDays: 365,
    batchSize: 500,
    maxBatchesPerRun: 10,
  });

  expect(policyFromEnv({ RETENTION_AUDIT_LOGS_MAX_AGE_DAYS: "30" }).maxAgeDays).toBe(30);
  expect(policyFromEnv({ RETENTION_AUDIT_LOGS_MAX_AGE_DAYS: "2555" }).maxAgeDays).toBe(2555);
  expect(policyFromEnv({ RETENTION_AUDIT_LOGS_ENABLED: "false" }).enabled).toBe(false);
  expect(policyFromEnv({ RETENTION_DRY_RUN: "true" }).dryRun).toBe(true);
  expect(policyFromEnv({ RETENTION_BATCH_SIZE: "1" }).batchSize).toBe(1);
  expect(policyFromEnv({ RETENTION_MAX_BATCHES_PER_RUN: "1" }).maxBatchesPerRun).toBe(1);

  const invalid = (env: Record<string, string>) =>
    expect(() => policyFromEnv(env)).toThrow("retention_policy_invalid");
  invalid({ RETENTION_AUDIT_LOGS_MAX_AGE_DAYS: "29" });
  invalid({ RETENTION_AUDIT_LOGS_MAX_AGE_DAYS: "2556" });
  invalid({ RETENTION_AUDIT_LOGS_MAX_AGE_DAYS: "365.0" });
  invalid({ RETENTION_AUDIT_LOGS_MAX_AGE_DAYS: "-365" });
  invalid({ RETENTION_AUDIT_LOGS_ENABLED: "False" });
  invalid({ RETENTION_AUDIT_LOGS_ENABLED: "0" });
  // The global dry-run is the sole dry-run source and is strict.
  invalid({ RETENTION_DRY_RUN: "" });
  invalid({ RETENTION_DRY_RUN: "TRUE" });
  // No family alias can rename a knob or override a global one.
  invalid({ RETENTION_AUDIT_LOGS_DAYS: "365" });
  invalid({ RETENTION_AUDIT_LOGS_DRY_RUN: "true" });
  invalid({ RETENTION_AUDIT_LOGS_BATCH_SIZE: "10" });
  invalid({ RETENTION_AUDIT_LOGS_MAX_BATCHES_PER_RUN: "2" });
  invalid({ RETENTION_BATCH_SIZE: "0" });
  invalid({ RETENTION_MAX_BATCHES_PER_RUN: "0" });
});

test("audit_logs retention run budget derives the bounded-batch arithmetic", async () => {
  await loadModules();
  const { auditLogsRetentionRunBudget } = service;
  expect(auditLogsRetentionRunBudget(policyFromEnv({}))).toEqual({
    family: "audit_logs",
    enabled: true,
    dryRun: false,
    batchBudget: 10,
    rowsPerBatch: 500,
    maxRows: 5_000,
  });

  const disabled = auditLogsRetentionRunBudget(
    policyFromEnv({ RETENTION_AUDIT_LOGS_ENABLED: "false" })
  );
  expect(disabled.batchBudget).toBe(0);
  expect(disabled.maxRows).toBe(0);

  const minimum = auditLogsRetentionRunBudget(
    policyFromEnv({ RETENTION_BATCH_SIZE: "1", RETENTION_MAX_BATCHES_PER_RUN: "1" })
  );
  expect(minimum.batchBudget).toBe(1);
  expect(minimum.rowsPerBatch).toBe(1);
  expect(minimum.maxRows).toBe(1);

  // A hand-built policy outside the family bounds is rejected before any
  // statement can run.
  const bogus = {
    family: "audit_logs",
    enabled: true,
    dryRun: false,
    maxAgeDays: 2556,
    batchSize: 500,
    maxBatchesPerRun: 10,
  } as const;
  expect(() =>
    auditLogsRetentionRunBudget(
      bogus as unknown as Parameters<typeof auditLogsRetentionRunBudget>[0]
    )
  ).toThrow("retention_policy_invalid");
});

test("audit_logs retention candidate query is cutoff-bounded, oldest-first, and batch-limited", async () => {
  const loaded = await loadModules();
  const { buildAuditLogsRetentionCandidateQuery } = loaded;
  const cutoff = new Date("2036-01-01T00:00:00.000Z");
  const compiled = buildAuditLogsRetentionCandidateQuery(db, cutoff, 500).toSQL();
  expect(compiled.sql).toBe(
    'select "id" from "audit_logs" where "audit_logs"."created_at" < $1 ' +
      'order by "audit_logs"."created_at" asc, "audit_logs"."id" asc limit $2'
  );
  // The cutoff binds as the strict `<` boundary, so the boundary row survives.
  expect(compiled.params).toEqual(["2036-01-01T00:00:00.000Z", 500]);

  // Apply mode takes the bounded row lock on the same candidate set.
  const locked = buildAuditLogsRetentionCandidateQuery(db, cutoff, 1)
    .for("update", { skipLocked: true })
    .toSQL();
  expect(locked.sql.endsWith("for update skip locked")).toBe(true);
});

test("audit_logs dry-run observes the bounded batch with zero locks and zero deletes", async () => {
  await loadModules();
  const { pruneAuditLogsBatch } = service;
  const policy = policyFromEnv({
    RETENTION_DRY_RUN: "true",
    RETENTION_BATCH_SIZE: "3",
    RETENTION_MAX_BATCHES_PER_RUN: "5",
  });
  const stub = makeRetentionExecutorStub((limit) => fullBatchIds(limit));
  const result = await pruneAuditLogsBatch(
    policy,
    new Date("2036-01-01T00:00:00.000Z"),
    asExecutor(stub)
  );

  expect(result).toEqual({
    family: "audit_logs",
    matched: 3,
    deleted: 0,
    dryRun: true,
  });
  expect(stub.probes).toEqual([{ limit: 3, locked: false }]);
  expect(stub.deletes).toHaveLength(0);
});

test("audit_logs apply mode locks and deletes exactly the bounded oldest batch", async () => {
  await loadModules();
  const { pruneAuditLogsBatch } = service;
  const policy = policyFromEnv({ RETENTION_BATCH_SIZE: "4", RETENTION_MAX_AGE_DAYS: "2555" });
  const stub = makeRetentionExecutorStub((limit) => fullBatchIds(limit));
  const result = await pruneAuditLogsBatch(
    policy,
    new Date("2036-01-01T00:00:00.000Z"),
    asExecutor(stub)
  );

  expect(result).toEqual({
    family: "audit_logs",
    matched: 4,
    deleted: 4,
    dryRun: false,
  });
  expect(stub.probes).toEqual([{ limit: 4, locked: true }]);
  expect(stub.deletes).toEqual([{ rows: 4 }]);
});

test("audit_logs run loop drains on a short batch without exceeding the budget", async () => {
  await loadModules();
  const { runAuditLogsRetention } = service;
  const stub = makeRetentionExecutorStub((limit, probe) =>
    probe < 1 ? fullBatchIds(limit) : [randomUUID()]
  );
  const summary = await runAuditLogsRetention(
    new Date("2036-01-01T00:00:00.000Z"),
    asExecutor(stub)
  );
  // One full default batch (500 rows) then a one-row batch drains.
  expect(summary).toEqual({
    family: "audit_logs",
    enabled: true,
    dryRun: false,
    batches: 2,
    matched: 501,
    deleted: 501,
  });
  expect(stub.probes).toHaveLength(2);
  expect(stub.probes.every((probe) => probe.limit === 500 && probe.locked)).toBe(true);
});

test("audit_logs run loop stops at the batch budget when every batch is full", async () => {
  await loadModules();
  const { runAuditLogsRetention } = service;
  const stub = makeRetentionExecutorStub((limit) => fullBatchIds(limit));
  const summary = await runAuditLogsRetention(
    new Date("2036-01-01T00:00:00.000Z"),
    asExecutor(stub)
  );
  expect(summary.batches).toBe(10);
  expect(summary.matched).toBe(5_000);
  expect(summary.deleted).toBe(5_000);
  expect(stub.probes).toHaveLength(10);
});

test("audit_logs apply run converges over driver-accurate delete counts and honors maxBatchesPerRun", async () => {
  await loadModules();
  const { runAuditLogsRetention } = service;
  const previousBatchSize = process.env.RETENTION_BATCH_SIZE;
  const previousMaxBatches = process.env.RETENTION_MAX_BATCHES_PER_RUN;
  // A depleting pool: each apply batch locks the oldest remaining candidates,
  // so the driver-accurate delete `count` falls 3, 3, 2 as the family drains.
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
    process.env.RETENTION_BATCH_SIZE = "3";
    process.env.RETENTION_MAX_BATCHES_PER_RUN = "10";
    // Convergence: the short third batch drains the family inside the budget.
    const depleting = depletingStubFor(8);
    const drained = await runAuditLogsRetention(
      new Date("2036-01-01T00:00:00.000Z"),
      asExecutor(depleting)
    );
    expect(drained).toEqual({
      family: "audit_logs",
      enabled: true,
      dryRun: false,
      batches: 3,
      matched: 8,
      deleted: 8,
    });
    expect(depleting.deletes).toEqual([{ rows: 3 }, { rows: 3 }, { rows: 2 }]);

    // Budget: with supply left over, the loop stops at maxBatchesPerRun.
    process.env.RETENTION_MAX_BATCHES_PER_RUN = "2";
    const capped = depletingStubFor(9);
    const budgeted = await runAuditLogsRetention(
      new Date("2036-01-01T00:00:00.000Z"),
      asExecutor(capped)
    );
    expect(budgeted).toEqual({
      family: "audit_logs",
      enabled: true,
      dryRun: false,
      batches: 2,
      matched: 6,
      deleted: 6,
    });
    expect(capped.deletes).toEqual([{ rows: 3 }, { rows: 3 }]);
  } finally {
    if (previousBatchSize === undefined) delete process.env.RETENTION_BATCH_SIZE;
    else process.env.RETENTION_BATCH_SIZE = previousBatchSize;
    if (previousMaxBatches === undefined) delete process.env.RETENTION_MAX_BATCHES_PER_RUN;
    else process.env.RETENTION_MAX_BATCHES_PER_RUN = previousMaxBatches;
  }
});

test("audit_logs dry-run drains on observed candidates and never deletes", async () => {
  await loadModules();
  const { runAuditLogsRetention } = service;
  const stub = makeRetentionExecutorStub((limit) => fullBatchIds(limit));
  const previous = process.env.RETENTION_DRY_RUN;
  process.env.RETENTION_DRY_RUN = "true";
  try {
    const summary = await runAuditLogsRetention(
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
  expect(stub.probes.length).toBe(10);
  expect(stub.probes.every((probe) => probe.locked === false)).toBe(true);
});

test("disabled audit_logs family runs zero statements", async () => {
  await loadModules();
  const { runAuditLogsRetention } = service;
  const stub = makeRetentionExecutorStub(() => {
    throw new Error("retention_stub_must_not_probe_disabled_family");
  });
  const previous = process.env.RETENTION_AUDIT_LOGS_ENABLED;
  process.env.RETENTION_AUDIT_LOGS_ENABLED = "false";
  try {
    const summary = await runAuditLogsRetention(
      new Date("2036-01-01T00:00:00.000Z"),
      asExecutor(stub)
    );
    expect(summary).toEqual({
      family: "audit_logs",
      enabled: false,
      dryRun: false,
      batches: 0,
      matched: 0,
      deleted: 0,
    });
  } finally {
    if (previous === undefined) delete process.env.RETENTION_AUDIT_LOGS_ENABLED;
    else process.env.RETENTION_AUDIT_LOGS_ENABLED = previous;
  }
  expect(stub.probes).toHaveLength(0);
  expect(stub.deletes).toHaveLength(0);
});
