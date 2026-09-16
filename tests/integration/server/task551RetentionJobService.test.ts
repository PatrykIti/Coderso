// TASK-551-06-L03 — retention job executor coverage (bun lane), in two
// registers:
//
// 1. Pure source guard (always runs; green under the airtight form): the
//    leaf-authored C1 source guard over
//    `core/services/maintenance/retentionJobService.ts` — the ONLY permitted
//    `core/db/client` imports are `withDedicatedDatabaseSession` /
//    `DATABASE_CLIENT_ERROR_CODES` plus the two `type`-only session types, so
//    no global `db` import (and no `realBatches`, no second advisory-lock seam)
//    is reachable from the job; the C1/A6 analytics invocation shape
//    (session-bound pruners, `maxBatchesPerRun: 1`, mandatory fourth
//    `options.dryRun` argument); and the local 19-family registry order
//    (module evaluation itself enforces it on import).
//
// 2. Real-database legs (contract L205-231, corrections C1/C2/C4/C6/C8/C9):
//    the two-replica serialization proof with `pg_backend_pid()`/`pg_locks`
//    instrumentation across the analytics family, the backend-kill recovery
//    proof, the closed C8 status mappings, family-failure independence, the
//    revision family-unit boundary (C2(b)), scheduled dry-run propagation, and
//    the direct-service dry-run that takes neither the scheduler session nor
//    its lock.
//
// Gate (landed `tests/unit/*` idiom): every database leg registers through
// `testIfDb = hasDb ? test : test.skip`, where `hasDb` requires a REAL
// routable `DATABASE_URL` — proven once by `select 1` AND by the production
// `assertMaintenanceSessionAffinity()` precondition that
// `withDedicatedDatabaseSession` enforces anyway. Under the airtight envelope
// (`DATABASE_URL=postgresql://127.0.0.1:1/none`) the probe fails, every
// database leg skips by name, and the run is skips-only with zero failures.
// The gate only controls EXECUTION; the assertions below are real.
//
// Fixture discipline: every leg seeds marker-scoped fixtures
// (`task551-06-l03:<run>:...`) and asserts only those rows. Every leg drives
// the production `runRetentionPlan` with an injected env in which ALL 19
// families are disabled except the ones the leg names, so no leg can sweep
// shared tables; batch shapes are pinned at `batchSize=1` (or 500 where only
// disabled L01 families could consume it).
//
// Owner-run preconditions: the fixture database needs pool headroom >= 4
// (default 10) for two reserved maintenance sessions plus the observer
// transaction, and the connecting role must be permitted to terminate
// backends (`pg_signal_backend`) for the kill leg.
//
// Known-sharp edge (deliberate, contract-pinned): the kill leg asserts the
// contracted C8(a) outcome — a backend terminated during an active
// transactional batch maps to `retention_lock_lost` ONLY. The landed service
// classifies session loss by exact
// `DATABASE_CLIENT_ERROR_CODES.dedicatedSessionLost` message equality (C3),
// so a driver that surfaces an admin termination as a raw driver error would
// misclassify it as `retention_family_failed`; if the owner run goes red on
// exactly that assertion, that is a Wave A implementation defect against the
// contract, not a fixture artifact.

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, test } from "bun:test";
import { like, sql } from "drizzle-orm";
import postgres, { type Sql } from "postgres";

import {
  assertMaintenanceSessionAffinity,
  db,
  probeDatabasePoolHealth,
} from "../../../core/db/client";
import {
  analyticsPageviews,
  analyticsSessions,
  pageRevisions,
  pages,
} from "../../../core/db/schema";
import {
  RETENTION_JOB_FAMILY_REGISTRY,
  RETENTION_JOB_LOCK_KEY,
  RETENTION_JOB_LOCK_NAMESPACE,
  runRetentionPlan,
  type RetentionJobSummary,
} from "../../../core/services/maintenance/retentionJobService";
import {
  RETENTION_FAMILY_ORDER,
  type RuntimeEnv,
} from "../../../core/services/maintenance/retentionPolicy";
import { REVISION_RETENTION_FAMILY_ORDER } from "../../../core/services/content/revisionRetentionService";
import {
  countExpiredPageviewsBatch,
  countExpiredSessionsBatch,
} from "../../../core/services/analytics/trafficRepository";
import { pruneExpiredTraffic } from "../../../core/services/analytics/trafficRetentionService";

// ---------------------------------------------------------------------------
// Owner-map gate: REAL routable DATABASE_URL + the production affinity
// precondition, per the landed tests/unit `testIfDb` idiom.
// ---------------------------------------------------------------------------

const canConnectToConfiguredDatabase = async (): Promise<boolean> => {
  try {
    await db.execute(sql`select 1`);
    await assertMaintenanceSessionAffinity();
    return true;
  } catch {
    return false;
  }
};

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnectToConfiguredDatabase());
const testIfDb = hasDb ? test : test.skip;

// ---------------------------------------------------------------------------
// Observation seam: a separate small client so catalog reads and row locks
// never contend with the job's reserved maintenance sessions.
// ---------------------------------------------------------------------------

const observer: Sql = postgres(
  String(process.env.DATABASE_URL ?? "postgresql://127.0.0.1:1/none"),
  {
    max: 3,
  }
);

type PidRow = { pid: number };
type CountRow = { n: number };

const advisoryPidNow = async (): Promise<number | null> => {
  const rows = (await observer`
    select l.pid as pid
    from pg_locks l
    where l.locktype = 'advisory' and l.granted
      and l.classid::text = ${String(RETENTION_JOB_LOCK_NAMESPACE)}
      and l.objid::text = ${String(RETENTION_JOB_LOCK_KEY)}
    limit 1
  `) as unknown as PidRow[];
  return rows[0]?.pid ?? null;
};

const advisoryHeld = async (): Promise<boolean> => (await advisoryPidNow()) !== null;

const waiterOnPid = async (pid: number): Promise<boolean> => {
  const rows = (await observer`
    select 1 as waiting from pg_locks where not granted and pid = ${pid} limit 1
  `) as unknown as CountRow[];
  return rows.length === 1;
};

const activeBackendCount = async (): Promise<number> => {
  const rows = (await observer`
    select count(*)::int as n from pg_stat_activity
    where datname = current_database() and state = 'active' and pid <> pg_backend_pid()
  `) as unknown as CountRow[];
  return rows[0]?.n ?? -1;
};

const deletedTupleCount = async (relname: string): Promise<number> => {
  const rows = (await observer`
    select coalesce((select n_tup_del::int from pg_stat_user_tables where relname = ${relname}), 0) as n
  `) as unknown as CountRow[];
  return rows[0]?.n ?? 0;
};

const pollUntil = async (probe: () => Promise<boolean>, label: string, budgetMs = 20_000) => {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    if (await probe()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`fixture_window_expired: ${label}`);
};

const terminateBackend = async (pid: number): Promise<void> => {
  await observer`
    select pg_terminate_backend(${pid}::int)
    where exists (select 1 from pg_stat_activity where pid = ${pid})
  `;
};

/** One reserved observer session, for observer-held advisory locks. */
const withObserverSession = async (run: (session: Sql) => Promise<void>): Promise<void> => {
  const session = await observer.reserve();
  try {
    await run(session);
  } finally {
    try {
      session.release();
    } catch {
      // Exactly-once release guard.
    }
  }
};

// ---------------------------------------------------------------------------
// Marker-scoped fixtures (analytics + one page with its revision history).
// ---------------------------------------------------------------------------

const MARK = "task551-06-l03";
const RUN_ID = randomUUID().slice(0, 8);
const daysAgo = (days: number): Date => new Date(Date.now() - days * 86_400_000);

type AnalyticsFixture = { readonly s1: string; readonly s2: string };

/**
 * Two expired sessions with distinct recency (s1 strictly older): s1 carries
 * the two oldest pageviews (p1a oldest), s2 one newer pageview. With
 * `batchSize=1` an apply run deletes p1a, then s1 (cascading p1b), and MUST
 * leave s2/p2 — the bounded-work assertion on every leg.
 */
const seedAnalyticsFixture = async (tag: string): Promise<AnalyticsFixture> => {
  const session = {
    visitorHash: `${MARK}:${RUN_ID}:${tag}`,
    sourceKind: "direct",
    deviceClass: "desktop",
    entryPath: `/${MARK}/${tag}`,
  };
  const inserted = await db
    .insert(analyticsSessions)
    .values([
      { ...session, startedAt: daysAgo(50), lastSeenAt: daysAgo(41) },
      { ...session, startedAt: daysAgo(49), lastSeenAt: daysAgo(40) },
    ])
    .returning({ id: analyticsSessions.id });
  const [s1, s2] = inserted;
  await db.insert(analyticsPageviews).values([
    {
      sessionId: s1!.id,
      path: `${MARK}:${RUN_ID}:${tag}:p`,
      sourceKind: "direct",
      deviceClass: "desktop",
      createdAt: daysAgo(41),
    },
    {
      sessionId: s1!.id,
      path: `${MARK}:${RUN_ID}:${tag}:p`,
      sourceKind: "direct",
      deviceClass: "desktop",
      createdAt: daysAgo(40),
    },
    {
      sessionId: s2!.id,
      path: `${MARK}:${RUN_ID}:${tag}:p`,
      sourceKind: "direct",
      deviceClass: "desktop",
      createdAt: daysAgo(39),
    },
  ]);
  return { s1: s1!.id, s2: s2!.id };
};

const analyticsSurvivorCounts = async (
  tag: string
): Promise<{ sessions: number; pageviews: number }> => {
  const sessions = (await observer`
    select count(*)::int as n from analytics_sessions
    where visitor_hash = ${`${MARK}:${RUN_ID}:${tag}`}
  `) as unknown as CountRow[];
  const pageviews = (await observer`
    select count(*)::int as n from analytics_pageviews
    where path = ${`${MARK}:${RUN_ID}:${tag}:p`}
  `) as unknown as CountRow[];
  return { sessions: sessions[0]?.n ?? -1, pageviews: pageviews[0]?.n ?? -1 };
};

/** One marker page carrying three aged autosave revisions (newest kept). */
const seedPageRevisionFixture = async (tag: string): Promise<string> => {
  const inserted = await db
    .insert(pages)
    .values({ slug: `${MARK}:${RUN_ID}:${tag}`, title: `${MARK} ${tag}`, currentData: {} })
    .returning({ id: pages.id });
  const pageId = inserted[0]!.id;
  await db.insert(pageRevisions).values(
    [1, 2, 3].map((version) => ({
      pageId,
      version,
      kind: "autosave",
      data: {},
      createdAt: daysAgo(60),
    }))
  );
  return pageId;
};

const pageRevisionVersions = async (pageId: string): Promise<number[]> => {
  const rows = (await observer`
    select version::int as v from page_revisions where page_id = ${pageId} order by version
  `) as unknown as { v: number }[];
  return rows.map((row) => row.v);
};

const cleanupFixtures = async (): Promise<void> => {
  await db.delete(pages).where(like(pages.slug, `${MARK}:${RUN_ID}:%`));
  await db
    .delete(analyticsSessions)
    .where(like(analyticsSessions.visitorHash, `${MARK}:${RUN_ID}:%`));
};

// ---------------------------------------------------------------------------
// Injected run inputs: closed env (everything disabled unless named) and a
// stepping clock for the deterministic C8 deadline mappings.
// ---------------------------------------------------------------------------

const L01_DISABLED_KEYS = [
  "RETENTION_ACCESS_LOGS_ENABLED",
  "RETENTION_AUDIT_LOGS_ENABLED",
  "RETENTION_EMAIL_DELIVERY_LOGS_ENABLED",
  "RETENTION_SEARCH_HISTORY_ENABLED",
  "RETENTION_INTEGRATION_REQUESTS_ENABLED",
  "RETENTION_PASSWORD_RESETS_ENABLED",
  "RETENTION_PREVIEW_TOKENS_ENABLED",
  "RETENTION_ASSISTANT_INGEST_RUNS_ENABLED",
  "RETENTION_ASSISTANT_ACTIONS_ENABLED",
  "RETENTION_ANALYTICS_ENABLED",
  "RETENTION_FORM_SUBMISSIONS_ENABLED",
  "RETENTION_WEBHOOK_DELIVERIES_ENABLED",
  "RETENTION_SESSIONS_ENABLED",
  "RETENTION_SOLUTION_KIT_RUNS_ENABLED",
] as const;

const REVISION_DISABLED_KEYS = [
  "RETENTION_PAGE_REVISIONS_ENABLED",
  "RETENTION_WIDGET_TEMPLATE_REVISIONS_ENABLED",
  "RETENTION_DETAIL_PAGE_REVISIONS_ENABLED",
  "RETENTION_ENTRY_REVISIONS_ENABLED",
  "RETENTION_POST_REVISIONS_ENABLED",
] as const;

const baseEnv = (overrides: Readonly<Record<string, string>> = {}): RuntimeEnv => ({
  ...Object.fromEntries(
    [...L01_DISABLED_KEYS, ...REVISION_DISABLED_KEYS].map((key) => [key, "false"])
  ),
  RETENTION_BATCH_SIZE: "1",
  RETENTION_MAX_BATCHES_PER_RUN: "1",
  ...overrides,
});

/** Real reads until `committedReads`, then a read far past the run deadline. */
const clockThatExpiresAfter = (committedReads: number, base: Date): { clock: () => Date } => {
  let reads = 0;
  return { clock: () => (reads++ < committedReads ? base : new Date(base.getTime() + 360_000)) };
};

// ---------------------------------------------------------------------------
// Register 1 — pure source guard (never gated).
// ---------------------------------------------------------------------------

const SERVICE_SOURCE = readFileSync(
  fileURLToPath(
    new URL("../../../core/services/maintenance/retentionJobService.ts", import.meta.url)
  ),
  "utf8"
);

/**
 * The negative source pins are CODE pins: the landed file's documentation
 * deliberately names the forbidden seams (`withDedicatedDatabaseAdvisoryLock`,
 * `realBatches`) to explain why it avoids them, so the guard strips comments
 * before asserting their absence from executable source.
 */
const SERVICE_CODE = SERVICE_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("retention job source guard (pure, always runs)", () => {
  test("the job never imports the global db client; the client seam is the dedicated session only (C1/C6)", () => {
    const clientImports = SERVICE_SOURCE.match(/from "(\.\.\/)+db\/client";/g) ?? [];
    expect(clientImports).toHaveLength(1);
    const importBlock = SERVICE_SOURCE.match(
      /import\s+\{([^}]+)\}\s+from\s+"(\.\.\/)+db\/client";/
    );
    expect(importBlock).not.toBeNull();
    const names = (importBlock?.[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    expect(names).toEqual([
      "DATABASE_CLIENT_ERROR_CODES",
      "withDedicatedDatabaseSession",
      "type DedicatedDatabaseSession",
      "type DedicatedDatabaseTransaction",
    ]);
    expect(SERVICE_CODE).not.toMatch(/import\s+db\s+from/);
    // C1: the forbidden global-pool default never appears in executable source.
    expect(SERVICE_CODE).not.toContain("realBatches");
    // C6: the hand-rolled one-session lock; no second-session advisory seam.
    expect(SERVICE_CODE).not.toContain("withDedicatedDatabaseAdvisoryLock");
    expect(SERVICE_CODE).not.toContain("assertMaintenanceSessionAffinity");
  });

  test("analytics runs session-bound with maxBatchesPerRun=1 and the mandatory dry-run options argument (C1/A6/C4)", () => {
    expect(SERVICE_SOURCE).toContain("trafficPrunersOver(executor)");
    expect(SERVICE_SOURCE).toContain("maxBatchesPerRun: 1");
    expect(SERVICE_SOURCE).toContain("{ dryRun: policy.dryRun }");
    // Exactly one blessed whole-family analytics entry point call site.
    expect(SERVICE_SOURCE.split("pruneExpiredTraffic(")).toHaveLength(2);
  });

  test("the local registry is the 19-family order: L01 then revision families (C3)", () => {
    expect([...RETENTION_FAMILY_ORDER, ...REVISION_RETENTION_FAMILY_ORDER]).toHaveLength(19);
    expect(RETENTION_JOB_FAMILY_REGISTRY.map((entry) => entry.family)).toEqual([
      ...RETENTION_FAMILY_ORDER,
      ...REVISION_RETENTION_FAMILY_ORDER,
    ]);
  });
});

// ---------------------------------------------------------------------------
// Register 2 — C8 status mappings (real DB, real dedicated sessions).
// ---------------------------------------------------------------------------

describe("retention job C8 status mappings on the fixture database", () => {
  testIfDb(
    "acquire-false maps to skipped_locked with no family SQL, and releases the session (C8c/C6)",
    async () => {
      await withObserverSession(async (session) => {
        const acquired = (await session`
          select pg_try_advisory_lock(${RETENTION_JOB_LOCK_NAMESPACE}::int, ${RETENTION_JOB_LOCK_KEY}::int) as acquired
        `) as unknown as { acquired: boolean }[];
        expect(acquired[0]?.acquired).toBe(true);
        expect(await advisoryHeld()).toBe(true);

        const job = await runRetentionPlan(new Date(), new AbortController().signal, {
          env: baseEnv(),
        });
        expect(job.status).toBe("skipped_locked");
        expect(job.code).toBeNull();
        expect(job.failedFamily).toBeNull();
        expect(job.dryRun).toBe(false);
        expect(job.families).toHaveLength(0);
        expect(job.batches).toBe(0);
        expect(job.deleted).toBe(0);

        const unlocked = (await session`
          select pg_advisory_unlock(${RETENTION_JOB_LOCK_NAMESPACE}::int, ${RETENTION_JOB_LOCK_KEY}::int) as unlocked
        `) as unknown as { unlocked: boolean }[];
        expect(unlocked[0]?.unlocked).toBe(true);
      });
      expect(await advisoryHeld()).toBe(false);
    },
    60_000
  );

  testIfDb(
    "signal.aborted wins over the co-occurring dedicated-session loss and publishes the lifecycle status aborted (C8b)",
    async () => {
      const controller = new AbortController();
      controller.abort();
      const job = await runRetentionPlan(new Date(), controller.signal, { env: baseEnv() });
      expect(job.status).toBe("aborted");
      expect(job.code).toBeNull();
      expect(job.failedFamily).toBeNull();
      expect(job.families).toHaveLength(0);
      // The aborted session lease was drained and released: no lock survives.
      expect(await advisoryHeld()).toBe(false);
    },
    60_000
  );

  testIfDb(
    "deadline exhaustion maps to retention_job_timeout with every family still gated to zero SQL (C8d)",
    async () => {
      const baseline = await activeBackendCount();
      const base = new Date();
      const { clock } = clockThatExpiresAfter(1, base);
      const job = await runRetentionPlan(base, new AbortController().signal, {
        env: baseEnv(),
        clock,
      });
      expect(job.status).toBe("retention_job_timeout");
      expect(job.code).toBe("retention_job_timeout");
      expect(job.failedFamily).toBeNull();
      // The loop died at the FIRST family-unit boundary: all 14 L01 families
      // were recorded disabled with zero SQL, no revision family was reached.
      expect(job.families.map((row) => row.family)).toEqual([...RETENTION_FAMILY_ORDER]);
      expect(
        job.families.every((row) => !row.enabled && row.batches === 0 && row.deleted === 0)
      ).toBe(true);
      expect(job.batches).toBe(0);
      expect(job.deleted).toBe(0);
      expect(await advisoryHeld()).toBe(false);
      expect(await activeBackendCount()).toBe(baseline);
    },
    60_000
  );
});

// ---------------------------------------------------------------------------
// Register 2 — the two-replica one-PID proof across the analytics family.
// ---------------------------------------------------------------------------

describe("two replicas against one database (contract L205-216, C1)", () => {
  testIfDb(
    "exactly one replica wins the lock, the loser reports skipped_locked, and the winning batch statements share the advisory lock's one backend PID",
    async () => {
      const tag = "tworeplica";
      const fixture = await seedAnalyticsFixture(tag);
      const baseline = await activeBackendCount();

      let winner: Promise<RetentionJobSummary> | null = null;
      let loserSummary: RetentionJobSummary | null = null;
      let winnerPidFirst = -1;
      let winnerPidAtWait = -1;

      await db.transaction(async (tx) => {
        // Freeze s1 so the winner's session-bound analytics session batch
        // blocks INSIDE its batch transaction on this observer's row lock.
        await tx.execute(
          sql`select id from analytics_sessions where id = ${fixture.s1} for update`
        );
        winner = runRetentionPlan(new Date(), new AbortController().signal, {
          env: baseEnv({ RETENTION_ANALYTICS_ENABLED: "true" }),
        });
        // Replica B ticks only once the lock is provably held by A.
        await pollUntil(async () => (await advisoryPidNow()) !== null, "winner lock acquire");
        winnerPidFirst = (await advisoryPidNow()) as number;
        const loser = runRetentionPlan(new Date(), new AbortController().signal, {
          env: baseEnv({ RETENTION_ANALYTICS_ENABLED: "true" }),
        });
        // The blocked batch DELETE surfaces as a waiter on the SAME pid that
        // holds the session advisory lock — the one-PID proof for lock
        // acquire, batch BEGIN, and the analytics pruner statement alike.
        await pollUntil(async () => waiterOnPid(winnerPidFirst), "winner batch waiter");
        winnerPidAtWait = (await advisoryPidNow()) as number;
        loserSummary = await loser;
      });

      const job = (await winner) as unknown as RetentionJobSummary;
      const loser = loserSummary as unknown as RetentionJobSummary;

      expect(winnerPidAtWait).toBe(winnerPidFirst);
      expect(loser.status).toBe("skipped_locked");
      expect(loser.code).toBeNull();
      expect(loser.families).toHaveLength(0);
      expect(job.status).toBe("completed");
      expect(job.code).toBeNull();
      // One bounded batch: pageview batch (p1a) + session batch (s1, cascading
      // p1b) — the s2/p2 remainder proves the per-run bound. The 18 other
      // families appear only as zero-SQL disabled ledger rows.
      expect(job.families.filter((row) => row.enabled).map((row) => row.family)).toEqual([
        "analytics",
      ]);
      expect(job.families.find((row) => row.family === "analytics")).toMatchObject({
        batches: 1,
        matched: 2,
        deleted: 2,
        dryRun: false,
      });
      expect(job.families.every((row) => row.family === "analytics" || !row.enabled)).toBe(true);
      expect(await analyticsSurvivorCounts(tag)).toEqual({ sessions: 1, pageviews: 1 });
      expect(await advisoryHeld()).toBe(false);
      expect(await activeBackendCount()).toBe(baseline);
      expect((await probeDatabasePoolHealth()).outcome).toBe("available");
    },
    60_000
  );
});

// ---------------------------------------------------------------------------
// Register 2 — backend kill during an active transactional batch.
// ---------------------------------------------------------------------------

describe("backend termination during an active batch (contract L210-216, C8a)", () => {
  testIfDb(
    "the batch rolls back, PostgreSQL releases the lock, the run returns retention_lock_lost ONLY, and the next tick succeeds",
    async () => {
      const tag = "kill";
      const fixture = await seedAnalyticsFixture(tag);
      const baseline = await activeBackendCount();

      let killedSummary: RetentionJobSummary | null = null;
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`select id from analytics_sessions where id = ${fixture.s1} for update`
        );
        const killed = runRetentionPlan(new Date(), new AbortController().signal, {
          env: baseEnv({ RETENTION_ANALYTICS_ENABLED: "true" }),
        });
        await pollUntil(async () => (await advisoryPidNow()) !== null, "winner lock acquire");
        const pid = (await advisoryPidNow()) as number;
        await pollUntil(async () => waiterOnPid(pid), "winner batch waiter");
        await terminateBackend(pid);
        killedSummary = await killed;
      });

      const job = killedSummary as unknown as RetentionJobSummary;
      // C8(a): lock loss maps to retention_lock_lost ONLY — never a family
      // failure — and the summary stays unpublished (no completed path).
      expect(job.status).toBe("retention_lock_lost");
      expect(job.code).toBe("retention_lock_lost");
      expect(job.failedFamily).toBeNull();
      // The active transactional batch rolled back: nothing was deleted.
      expect(await analyticsSurvivorCounts(tag)).toEqual({ sessions: 2, pageviews: 3 });
      // PostgreSQL released the session advisory lock with the backend.
      expect(await advisoryHeld()).toBe(false);

      // The second replica starts only after termination is observed, never
      // overlapping the dead batch: the next tick succeeds and finishes the
      // fixture within its bound.
      const nextTick = await runRetentionPlan(new Date(), new AbortController().signal, {
        env: baseEnv({ RETENTION_ANALYTICS_ENABLED: "true" }),
      });
      expect(nextTick.status).toBe("completed");
      expect(await analyticsSurvivorCounts(tag)).toEqual({ sessions: 1, pageviews: 1 });
      expect(await advisoryHeld()).toBe(false);
      expect(await activeBackendCount()).toBe(baseline);
    },
    90_000
  );
});

// ---------------------------------------------------------------------------
// Register 2 — family failure independence + revision family-unit boundary.
// ---------------------------------------------------------------------------

describe("batch and family-unit independence (contract L217-223, C2(b)/C9)", () => {
  testIfDb(
    "a later-family failure keeps the earlier committed analytics high-water mark, names the failing family, and skips the remaining families",
    async () => {
      const tag = "familyfail";
      const fixture = await seedAnalyticsFixture(tag);
      const baseline = await activeBackendCount();

      let summary: RetentionJobSummary | null = null;
      await db.transaction(async (tx) => {
        // The observer freezes the webhook table: the webhook family's first
        // bounded read blocks until the batch's own tx-scoped statement bound
        // fires, which fails exactly that family.
        await tx.execute(sql`lock table webhook_deliveries in access exclusive mode`);
        summary = await runRetentionPlan(new Date(), new AbortController().signal, {
          env: baseEnv({
            RETENTION_ANALYTICS_ENABLED: "true",
            RETENTION_WEBHOOK_DELIVERIES_ENABLED: "true",
          }),
        });
      });

      const job = summary as unknown as RetentionJobSummary;
      expect(job.status).toBe("retention_family_failed");
      expect(job.code).toBe("retention_family_failed");
      expect(job.failedFamily).toBe("webhook_deliveries");
      // The earlier family's committed batch survives in the ledger AND in the
      // database; the later families were never reached.
      const analyticsRow = job.families.find((row) => row.family === "analytics");
      expect(analyticsRow).toMatchObject({ batches: 1, matched: 2, deleted: 2, dryRun: false });
      const familyIds = job.families.map((row) => row.family);
      expect(familyIds).not.toContain("webhook_deliveries");
      expect(familyIds).not.toContain("sessions");
      expect(familyIds).not.toContain("solution_kit_runs");
      expect(familyIds).not.toContain("page");
      expect(familyIds).not.toContain("post");
      expect(job.batches).toBe(1);
      expect(job.deleted).toBe(2);
      expect(await analyticsSurvivorCounts(tag)).toEqual({ sessions: 1, pageviews: 1 });
      expect(await advisoryHeld()).toBe(false);
      expect(await activeBackendCount()).toBe(baseline);
    },
    90_000
  );

  testIfDb(
    "revision families commit at family-unit boundaries: the committed page unit survives a later boundary failure (C2(b))",
    async () => {
      const tag = "revunit";
      const pageId = await seedPageRevisionFixture(tag);
      const baseline = await activeBackendCount();
      const base = new Date();
      const { clock } = clockThatExpiresAfter(2, base);

      const job = await runRetentionPlan(base, new AbortController().signal, {
        env: baseEnv({
          RETENTION_BATCH_SIZE: "500",
          RETENTION_PAGE_REVISIONS_ENABLED: "true",
          RETENTION_PAGE_REVISIONS_MAX_AGE_DAYS: "30",
          RETENTION_PAGE_REVISIONS_KEEP_NEWEST_PER_PARENT: "1",
        }),
        clock,
      });

      // The widget_template family-unit boundary hit the deadline: timeout.
      expect(job.status).toBe("retention_job_timeout");
      expect(job.code).toBe("retention_job_timeout");
      expect(job.failedFamily).toBeNull();
      // The page family unit committed and kept its high-water mark; the four
      // later revision families were skipped without SQL.
      expect(job.families.find((row) => row.family === "page")).toMatchObject({ batches: 1 });
      const familyIds = job.families.map((row) => row.family);
      expect(familyIds).not.toContain("widget_template");
      expect(familyIds).not.toContain("detail_page");
      expect(familyIds).not.toContain("entry");
      expect(familyIds).not.toContain("post");
      // Durable effect of the committed unit: only the keep-newest floor row
      // survives on the fixture page.
      expect(await pageRevisionVersions(pageId)).toEqual([3]);
      expect(await advisoryHeld()).toBe(false);
      expect(await activeBackendCount()).toBe(baseline);
    },
    90_000
  );
});

// ---------------------------------------------------------------------------
// Register 2 — strict RETENTION_DRY_RUN propagation and the direct service.
// ---------------------------------------------------------------------------

describe("scheduled dry-run propagation and the direct service (contract L224-231)", () => {
  testIfDb(
    "scheduled dry-run still takes the lock path, reads each family boundedly, mutates zero rows, and a subsequent apply run deletes the same still-eligible candidates",
    async () => {
      const tag = "dryrun";
      await seedAnalyticsFixture(tag);
      const baseline = await activeBackendCount();
      const dryEnv = baseEnv({
        RETENTION_DRY_RUN: "true",
        RETENTION_ANALYTICS_ENABLED: "true",
        RETENTION_ACCESS_LOGS_ENABLED: "true",
        RETENTION_ACCESS_LOGS_DAYS: "7",
      });

      // (a) A scheduled dry-run attempts the scheduler advisory lock: with the
      // lock held elsewhere it can only report skipped_locked. The observer
      // balances its own lock before releasing the session.
      await withObserverSession(async (session) => {
        const held = (await session`
          select pg_try_advisory_lock(${RETENTION_JOB_LOCK_NAMESPACE}::int, ${RETENTION_JOB_LOCK_KEY}::int) as acquired
        `) as unknown as { acquired: boolean }[];
        expect(held[0]?.acquired).toBe(true);
        const blocked = await runRetentionPlan(new Date(), new AbortController().signal, {
          env: dryEnv,
        });
        expect(blocked.status).toBe("skipped_locked");
        expect(blocked.dryRun).toBe(true);
        const released = (await session`
          select pg_advisory_unlock(${RETENTION_JOB_LOCK_NAMESPACE}::int, ${RETENTION_JOB_LOCK_KEY}::int) as unlocked
        `) as unknown as { unlocked: boolean }[];
        expect(released[0]?.unlocked).toBe(true);
      });

      // (b) Unlocked, the dry-run completes via bounded reads only.
      const pageviewDeletesBefore = await deletedTupleCount("analytics_pageviews");
      const sessionDeletesBefore = await deletedTupleCount("analytics_sessions");
      const accessDeletesBefore = await deletedTupleCount("access_logs");
      const dryJob = await runRetentionPlan(new Date(), new AbortController().signal, {
        env: dryEnv,
      });
      expect(dryJob.status).toBe("completed");
      expect(dryJob.dryRun).toBe(true);
      expect(dryJob.deleted).toBe(0);
      expect(dryJob.families.find((row) => row.family === "analytics")).toMatchObject({
        batches: 1,
        deleted: 0,
        dryRun: true,
        matched: 2,
      });
      expect(dryJob.families.find((row) => row.family === "access_logs")).toMatchObject({
        batches: 1,
        deleted: 0,
        dryRun: true,
      });
      // Zero mutations anywhere: no DELETE reached any of the three tables.
      expect(await deletedTupleCount("analytics_pageviews")).toBe(pageviewDeletesBefore);
      expect(await deletedTupleCount("analytics_sessions")).toBe(sessionDeletesBefore);
      expect(await deletedTupleCount("access_logs")).toBe(accessDeletesBefore);
      expect(await analyticsSurvivorCounts(tag)).toEqual({ sessions: 2, pageviews: 3 });
      expect(await advisoryHeld()).toBe(false);

      // (c) The subsequent apply run re-reads the same candidates and deletes
      // exactly the bounded batch: p1a, then s1 (cascading p1b).
      const applyJob = await runRetentionPlan(new Date(), new AbortController().signal, {
        env: baseEnv({ RETENTION_ANALYTICS_ENABLED: "true" }),
      });
      expect(applyJob.status).toBe("completed");
      expect(applyJob.dryRun).toBe(false);
      expect(applyJob.families.find((row) => row.family === "analytics")).toMatchObject({
        batches: 1,
        matched: 2,
        deleted: 2,
      });
      expect(await analyticsSurvivorCounts(tag)).toEqual({ sessions: 1, pageviews: 1 });
      expect(await activeBackendCount()).toBe(baseline);
    },
    90_000
  );

  testIfDb(
    "a direct service dry-run uses no scheduler advisory lock and no scheduler session",
    async () => {
      const tag = "direct";
      await seedAnalyticsFixture(tag);
      const now = new Date();
      // The closures pin the fixture cutoff (the service's env-backed cutoff is
      // not injectable) and forward to the real bounded repository reads. The
      // delete closures must never run in a dry-run; if the service ever
      // misread the options argument they fail the leg loudly.
      const cutoff = new Date(now.getTime() - 30 * 86_400_000);
      const notInDryRun = (): Promise<number> => {
        throw new Error("direct_dry_run_invoked_a_delete");
      };

      let lockSightings = 0;
      const watcher = (async () => {
        for (let seen = 0; seen < 20; seen += 1) {
          if (await advisoryHeld()) lockSightings += 1;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      })();

      const direct = await pruneExpiredTraffic(
        now,
        {
          deleteOldestPageviewsBatch: notInDryRun,
          deleteOldestSessionsBatch: notInDryRun,
          countExpiredPageviews: () => countExpiredPageviewsBatch(cutoff, 100, db),
          countExpiredSessions: () => countExpiredSessionsBatch(cutoff, 100, db),
        },
        { batchSize: 100, maxBatchesPerRun: 1 },
        { dryRun: true }
      );
      await watcher;

      expect(direct.dryRun).toBe(true);
      expect(direct.pageviews).toBe(3);
      expect(direct.sessions).toBe(2);
      // The scheduler lock was never observed at any sampled instant.
      expect(lockSightings).toBe(0);
      expect(await analyticsSurvivorCounts(tag)).toEqual({ sessions: 2, pageviews: 3 });
    },
    60_000
  );
});

afterAll(async () => {
  if (!hasDb) return;
  await cleanupFixtures();
  await observer.end({ timeout: 2 });
});
