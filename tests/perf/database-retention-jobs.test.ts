/**
 * TASK-551-06-L03 retention-job budgets, edge parity, and statement accounting
 * (bun lane).
 *
 * From the landed L03 leaf's real exports this file proves the large-fixture
 * acceptance (contract :232-237, :278-282): total statements/deletes/time stay
 * within the configured family/run budgets, no statement shape is unbounded
 * (every candidate read carries `LIMIT <= 2,000` and every DELETE is the
 * `inArray` of exactly that bounded read), apply and dry-run select the SAME
 * bounded candidates with child-first order, dry-run mutates zero rows and
 * zero state, and the analytics family's statement accounting follows C4/A6
 * (candidate SELECT + bounded DELETE per pruner in apply; exactly one SELECT
 * per pruner in dry-run), counted through fixture instrumentation. Edge parity
 * runs against TASK-551-01-L02's literal values: the missing (disabled-by-
 * default) family counts, cutoff boundaries, anchors, the
 * `499/500/501/2,000/2,001` batch edges, and ten-batch convergence.
 *
 * Driver-free legs exercise the real bounded repository primitives and the
 * real `pruneExpiredTraffic` batch engine over recording fakes, so statement
 * counts are exact and no database is needed. The real-PostgreSQL legs run the
 * SAME production code paths against session-scoped TEMP tables shadowing the
 * driven table names (`analytics_pageviews`/`analytics_sessions`,
 * `assistant_doc_ingest_runs`): postgres resolves unqualified references to
 * the session's TEMP tables first, so the real primitives never touch the real
 * tables and every statement lands on fixture rows only.
 *
 * Execution contract (mirrors tests/perf/database-pool-telemetry.test.ts): the
 * one database binding is supplied only by TASK-551-11's owner-injected
 * `task551-db-test` map. The DB legs are gated on that map's PRESENCE plus a
 * real routability probe of the owner URL (the `testIfDb` idiom of
 * tests/unit/commerce/schema.test.ts), so under the airtight local form
 * (`env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null
 * test tests/perf/database-retention-jobs.test.ts`) they skip by name with
 * zero failures instead of dialing an ambient URL. No `.env` source is ever
 * loaded, no map value is read, and legs publish identifiers, integer counts,
 * timings and stable codes only -- fixture SQL, binds and URLs stay in memory.
 */
import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";

import {
  pruneExpiredTraffic,
  resolveRetentionDays,
  type TrafficBatchPruners,
} from "../../core/services/analytics/trafficRetentionService";
import {
  countExpiredPageviewsBatch,
  countExpiredSessionsBatch,
  deleteOldestPageviewsBatch,
  deleteOldestSessionsBatch,
  type Exec,
} from "../../core/services/analytics/trafficRepository";
import {
  pruneAssistantIngestRunsBatch,
  resolveAssistantIngestRunsRetentionPolicy,
} from "../../core/services/assistant/assistantRetentionService";
import { REVISION_RETENTION_FAMILY_ORDER } from "../../core/services/content/revisionRetentionService";
import {
  RETENTION_FAMILY_ORDER,
  computeRetentionCutoff,
  isEligibleForRetentionCutoff,
  loadRetentionPolicies,
  resolveRetentionBatchSize,
  resolveRetentionRuntimeOptions,
} from "../../core/services/maintenance/retentionPolicy";
import {
  RETENTION_JOB_FAMILY_REGISTRY,
  RETENTION_JOB_LOCK_KEY,
  RETENTION_JOB_LOCK_NAMESPACE,
  runRetentionPlan,
  type RetentionJobFamilyId,
} from "../../core/services/maintenance/retentionJobService";
import {
  RetentionSchedulerConfigError,
  parseRetentionSchedulerEnv,
} from "../../core/server/jobs/retentionScheduler";
import {
  TASK551_RETENTION_BATCH_PINS,
  TASK551_RETENTION_CLOCK_MS,
  TASK551_RETENTION_SCENARIOS,
  type ScaleProfile,
} from "./fixtures/task551DatabaseScale";

/**
 * Presence-only half of the gate: TASK-551-11's owner-injected `task551-db-test`
 * map (`TASK551_FIXTURE_DATABASE_URL`, `_NAME`, `_SENTINEL`). Only the map's
 * presence -- never its values -- may authorize dialing the real database.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

/**
 * Routability half of the gate (the `testIfDb` idiom): with the owner map
 * present, the owner URL must answer a real `select 1` before any DB leg may
 * run. Under the airtight local form the map is absent, so this probe never
 * dials anything and every DB leg skips.
 */
let OWNER_DATABASE_ROUTABLE = false;
if (OWNER_DB_TEST_MAP_PRESENT) {
  try {
    const { default: postgres } = await import("postgres");
    const probe = postgres(process.env.TASK551_FIXTURE_DATABASE_URL as string, {
      max: 1,
      connect_timeout: 5,
      idle_timeout: 5,
    });
    try {
      const rows = (await probe`select 1 as one`) as { one: number }[];
      OWNER_DATABASE_ROUTABLE = rows[0]?.one === 1;
    } finally {
      await probe.end({ timeout: 5 });
    }
  } catch {
    OWNER_DATABASE_ROUTABLE = false;
  }
}

/** Closed failure codes of this leaf; no driver detail, URL or statement text. */
const TEST_CODES = {
  noSqlMustNotRun: "task551_l03_no_sql_must_not_run",
  budgetInvalid: "retention_job_run_budget_invalid",
  policyInvalid: "retention_policy_invalid",
  batchFailed: "retention_batch_failed",
} as const;

/** The frozen TASK-551-01-L02 retention clock, pinned to its literal source. */
const FROZEN_NOW = new Date(TASK551_RETENTION_CLOCK_MS);
const FROZEN_CLOCK_ISO = FROZEN_NOW.toISOString();

/** The per-source run shape of the small-profile ingest scenario, as data. */
const INGEST_SOURCE_RUNS = 10;

type IngestPolicy = ReturnType<typeof resolveAssistantIngestRunsRetentionPolicy>;

/** The L01-typed ingest policy the DB legs drive, at the parsed 90-day default. */
const ingestPolicy = (overrides: Partial<IngestPolicy>): IngestPolicy => ({
  family: "assistant_ingest_runs",
  enabled: true,
  dryRun: false,
  maxAgeDays: 90,
  batchSize: 500,
  maxBatchesPerRun: 10,
  ...overrides,
});

/**
 * The analytics family's cutoff, replicated from the service's own private
 * arithmetic (`addDays(now, -resolveRetentionDays())`) so the fixture buckets
 * straddle the exact instant the production code will compare against,
 * whatever the ambient retention-day setting is when the owner runs.
 */
const trafficCutoffFor = (now: Date): Date => {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - resolveRetentionDays());
  return cutoff;
};

/** The [old, boundary, recent] ISO stamps around a cutoff (the bucket rule). */
const bucketsAround = (
  cutoff: Date
): Readonly<{ old: string; boundary: string; recent: string }> => ({
  old: new Date(cutoff.getTime() - 1).toISOString(),
  boundary: cutoff.toISOString(),
  recent: new Date(cutoff.getTime() + 1).toISOString(),
});

// ---------------------------------------------------------------------------
// The landed registry, budgets, and lock namespace (driver-free)
// ---------------------------------------------------------------------------

describe("retention job registry, budgets, and lock namespace", () => {
  /**
   * Correction C4's full family map, transcribed as data: family id ->
   * module#exported-function, in mandatory execution order.
   */
  const C4_FAMILY_SOURCES: readonly (readonly [RetentionJobFamilyId, string])[] = [
    ["access_logs", "core/services/access/accessLogService.ts#pruneAccessLogsBatch"],
    ["audit_logs", "core/services/audit/auditService.ts#pruneAuditLogsBatch"],
    [
      "email_delivery_logs",
      "core/services/email/emailDeliveryRetentionService.ts#pruneEmailDeliveryLogsBatch",
    ],
    [
      "search_history",
      "core/services/search/searchHistoryRetentionService.ts#pruneSearchHistoryBatch",
    ],
    [
      "integration_requests",
      "core/services/integrations/integrationRequestRetentionService.ts#pruneIntegrationRequestsBatch",
    ],
    [
      "password_resets",
      "core/services/auth/expiredAuthArtifactRetentionService.ts#pruneExpiredAuthArtifactsBatch",
    ],
    [
      "preview_tokens",
      "core/services/pages/previewTokenRetentionService.ts#prunePreviewTokensBatch",
    ],
    [
      "assistant_ingest_runs",
      "core/services/assistant/assistantRetentionService.ts#pruneAssistantIngestRunsBatch",
    ],
    [
      "assistant_actions",
      "core/services/assistant/assistantRetentionService.ts#pruneAssistantActionsBatch",
    ],
    ["analytics", "core/services/analytics/trafficRetentionService.ts#pruneExpiredTraffic"],
    [
      "form_submissions",
      "core/services/forms/submissionRetentionService.ts#pruneFormSubmissionsBatch",
    ],
    [
      "webhook_deliveries",
      "core/services/webhooks/webhookRetentionService.ts#pruneWebhookDeliveriesBatch",
    ],
    ["sessions", "core/services/auth/sessionRetentionService.ts#pruneSessionsBatch"],
    [
      "solution_kit_runs",
      "core/services/kits/solutionKitRetentionService.ts#pruneSolutionKitRunsBatch",
    ],
    ["page", "core/services/content/revisionRetentionService.ts#runRevisionFamilyRetention"],
    [
      "widget_template",
      "core/services/content/revisionRetentionService.ts#runRevisionFamilyRetention",
    ],
    ["detail_page", "core/services/content/revisionRetentionService.ts#runRevisionFamilyRetention"],
    ["entry", "core/services/content/revisionRetentionService.ts#runRevisionFamilyRetention"],
    ["post", "core/services/content/revisionRetentionService.ts#runRevisionFamilyRetention"],
  ];

  test("the leaf registry reproduces the C4 family map in mandatory execution order", () => {
    expect(RETENTION_JOB_FAMILY_REGISTRY.map((entry) => entry.family)).toEqual([
      ...RETENTION_FAMILY_ORDER,
      ...REVISION_RETENTION_FAMILY_ORDER,
    ]);
    expect(RETENTION_JOB_FAMILY_REGISTRY.map((entry) => [entry.family, entry.source])).toEqual(
      C4_FAMILY_SOURCES
    );
    expect(
      RETENTION_JOB_FAMILY_REGISTRY.filter((entry) => entry.kind === "l01-batch")
    ).toHaveLength(14);
    expect(
      RETENTION_JOB_FAMILY_REGISTRY.filter((entry) => entry.kind === "revision-unit")
    ).toHaveLength(5);
  });

  test("the session advisory-lock pair avoids every landed lock namespace", () => {
    expect([RETENTION_JOB_LOCK_NAMESPACE, RETENTION_JOB_LOCK_KEY]).toEqual([551_063, 3]);
    const landedPairs: readonly (readonly [number, number])[] = [
      [20260604, 400],
      [20260604, 403],
      [20260604, 482],
      [20260628, 484],
      [20260818, 571],
    ];
    for (const [namespace, key] of landedPairs) {
      expect([RETENTION_JOB_LOCK_NAMESPACE, RETENTION_JOB_LOCK_KEY]).not.toEqual([namespace, key]);
    }
    // The dedicated-session affinity probe's single key (classid 0) too.
    expect(RETENTION_JOB_LOCK_NAMESPACE).not.toBe(551_551_551);
  });

  test("a default run deletes at most the sum of explicit family budgets", () => {
    expect(resolveRetentionRuntimeOptions({})).toEqual({
      batchSize: 500,
      maxBatchesPerRun: 10,
      dryRun: false,
    });
    const policies = loadRetentionPolicies({});
    const familyBudgets = RETENTION_FAMILY_ORDER.map(
      (family) => policies[family].batchSize * policies[family].maxBatchesPerRun
    );
    expect(familyBudgets).toEqual(RETENTION_FAMILY_ORDER.map(() => 5_000));
    const enabled = RETENTION_FAMILY_ORDER.filter((family) => policies[family].enabled);
    expect(enabled).toHaveLength(12);
    expect(
      enabled.reduce(
        (total, family) => total + policies[family].batchSize * policies[family].maxBatchesPerRun,
        0
      )
    ).toBe(60_000);
    expect(RETENTION_FAMILY_ORDER.length * 5_000).toBe(70_000);
    // The two "missing" (disabled-by-default) families stay outside a default
    // run's budget, matching the fixture scenario flags.
    expect(RETENTION_FAMILY_ORDER.filter((family) => !policies[family].enabled)).toEqual([
      "form_submissions",
      "solution_kit_runs",
    ]);
    expect(TASK551_RETENTION_SCENARIOS.formRunsChildFirst.disabledByDefault).toBe(true);
    expect(TASK551_RETENTION_SCENARIOS.solutionKitChildFirst.disabledByDefault).toBe(true);
  });

  test("TASK-551-01-L02 literal values pin scenario counts, anchors and batch edges", () => {
    expect(TASK551_RETENTION_BATCH_PINS).toEqual({
      defaultBatch: 500,
      maxBatch: 2_000,
      edges: [499, 500, 501, 2_000, 2_001],
    });
    const scenarios = TASK551_RETENTION_SCENARIOS;
    const per = (value: { small: number; large: number }, profile: ScaleProfile): number =>
      value[profile];
    for (const profile of ["small", "large"] as const) {
      const small = profile === "small";
      expect(per(scenarios.passwordResetsExpired.eligible, profile)).toBe(small ? 3_000 : 60_000);
      expect(per(scenarios.previewTokensExpired.eligiblePerTable, profile)).toBe(
        small ? 1_500 : 30_000
      );
      expect(per(scenarios.assistantIngestOld.eligible, profile)).toBe(small ? 3_000 : 60_000);
      expect(per(scenarios.assistantIngestOld.anchors, profile)).toBe(small ? 100 : 1_000);
      expect(per(scenarios.formRunsChildFirst.childEligible, profile)).toBe(
        small ? 3_600 : 180_000
      );
      expect(per(scenarios.formRunsChildFirst.parentEligible, profile)).toBe(
        small ? 1_200 : 60_000
      );
      expect(per(scenarios.solutionKitChildFirst.runEligible, profile)).toBe(small ? 600 : 60_000);
      expect(per(scenarios.solutionKitChildFirst.itemEligible, profile)).toBe(
        small ? 3_000 : 300_000
      );
    }
    expect(scenarios.assistantIngestOld.sources.small).toBe(100);
    expect(scenarios.formRunsChildFirst.runsPerSubmission).toBe(3);
    expect(scenarios.solutionKitChildFirst.itemsPerRun).toBe(5);
    expect(scenarios.solutionKitChildFirst.anchorsPerKit).toBe(2);
  });

  test("cutoff boundaries retain the boundary row at the frozen clock", () => {
    expect(FROZEN_CLOCK_ISO).toBe("2036-01-01T00:00:00.000Z");
    const cutoff = computeRetentionCutoff(FROZEN_NOW, 0);
    expect(cutoff.toISOString()).toBe(FROZEN_CLOCK_ISO);
    expect(isEligibleForRetentionCutoff(new Date(cutoff.getTime() - 1), cutoff)).toBe(true);
    expect(isEligibleForRetentionCutoff(cutoff, cutoff)).toBe(false);
    expect(isEligibleForRetentionCutoff(new Date(cutoff.getTime() + 1), cutoff)).toBe(false);
    // The ingest family's cutoff the DB legs seed against (90-day default).
    const ingestCutoff = computeRetentionCutoff(
      FROZEN_NOW,
      resolveAssistantIngestRunsRetentionPolicy({}).maxAgeDays
    );
    expect(ingestCutoff.toISOString()).toBe("2035-10-03T00:00:00.000Z");
  });

  test("the run-budget envelope fails closed before any session work", async () => {
    expect(parseRetentionSchedulerEnv({})).toEqual({
      enabled: false,
      intervalMs: 86_400_000,
      initialJitterMs: 30_000,
      maxRunMs: 300_000,
    });
    expect(parseRetentionSchedulerEnv({ RETENTION_SCHEDULER_MAX_RUN_MS: "1000" }).maxRunMs).toBe(
      1_000
    );
    expect(parseRetentionSchedulerEnv({ RETENTION_SCHEDULER_MAX_RUN_MS: "3600000" }).maxRunMs).toBe(
      3_600_000
    );
    for (const rejected of ["999", "3600001", "1.5", "", "abc"]) {
      expect(() =>
        parseRetentionSchedulerEnv({ RETENTION_SCHEDULER_MAX_RUN_MS: rejected })
      ).toThrow(RetentionSchedulerConfigError);
    }
    // Cross-key law: maxRun < interval.
    expect(() =>
      parseRetentionSchedulerEnv({ RETENTION_SCHEDULER_MAX_RUN_MS: "86400000" })
    ).toThrow(RetentionSchedulerConfigError);
    expect(() => parseRetentionSchedulerEnv({ RETENTION_SCHEDULER_UNKNOWN_KEY: "1" })).toThrow(
      RetentionSchedulerConfigError
    );
    // The job service bounds deps.maxRunMs identically, BEFORE reserving the
    // dedicated session -- so these rejections dial nothing (airtight-safe).
    for (const invalid of [999, 3_600_001]) {
      await expect(
        runRetentionPlan(FROZEN_NOW, new AbortController().signal, { env: {}, maxRunMs: invalid })
      ).rejects.toThrow(TEST_CODES.budgetInvalid);
    }
  });
});

// ---------------------------------------------------------------------------
// C4/A6 statement accounting on the real bounded primitives (driver-free)
// ---------------------------------------------------------------------------

describe("C4/A6 statement accounting on the real bounded primitives", () => {
  /**
   * Driver-accurate recording executor for the traffic primitives: the
   * candidate read resolves to `agedIds` (after capturing its LIMIT), and each
   * delete resolves to the driver's `count` shape. The recorded statement
   * sequence is the C4/A6 accounting of exactly what the primitive issued.
   */
  const recordingExec = (
    agedIds: readonly number[]
  ): { exec: Exec; statements: string[]; limits: number[] } => {
    const statements: string[] = [];
    const limits: number[] = [];
    const readNode = () => {
      let limit = 0;
      const node: Record<string, unknown> = {
        from: () => node,
        where: () => node,
        orderBy: () => node,
        limit: (value: number) => {
          limit = value;
          return node;
        },
      };
      node.then = (
        onFulfilled: (rows: unknown) => unknown,
        onRejected: (error: unknown) => unknown
      ) => {
        statements.push("select");
        limits.push(limit);
        return Promise.resolve(agedIds.map((id) => ({ id }))).then(onFulfilled, onRejected);
      };
      return node;
    };
    const deleteNode = () => {
      const node: Record<string, unknown> = { where: () => node };
      node.then = (
        onFulfilled: (rows: unknown) => unknown,
        onRejected: (error: unknown) => unknown
      ) => {
        statements.push("delete");
        return Promise.resolve({ count: agedIds.length }).then(onFulfilled, onRejected);
      };
      return node;
    };
    return {
      exec: { select: () => readNode(), delete: () => deleteNode() } as unknown as Exec,
      statements,
      limits,
    };
  };

  test("an apply batch is one LIMIT-bounded candidate SELECT plus one bounded DELETE", async () => {
    const recording = recordingExec([11, 22, 33]);
    const deleted = await deleteOldestPageviewsBatch(FROZEN_NOW, 500, recording.exec);
    expect(deleted).toBe(3);
    expect(recording.statements).toEqual(["select", "delete"]);
    expect(recording.limits).toEqual([500]);
  });

  test("a drained primitive never issues a DELETE at all", async () => {
    for (const primitive of [
      (exec: Exec) => deleteOldestPageviewsBatch(FROZEN_NOW, 500, exec),
      (exec: Exec) => deleteOldestSessionsBatch(FROZEN_NOW, 500, exec),
    ]) {
      const recording = recordingExec([]);
      expect(await primitive(recording.exec)).toBe(0);
      expect(recording.statements).toEqual(["select"]);
      expect(recording.limits).toEqual([500]);
    }
  });

  test("the dry-run twins issue exactly one SELECT and zero DELETEs", async () => {
    const candidates = Array.from({ length: 500 }, (_, index) => index);
    for (const primitive of [
      (exec: Exec) => countExpiredPageviewsBatch(FROZEN_NOW, 500, exec),
      (exec: Exec) => countExpiredSessionsBatch(FROZEN_NOW, 500, exec),
    ]) {
      const recording = recordingExec(candidates);
      expect(await primitive(recording.exec)).toBe(500);
      expect(recording.statements).toEqual(["select"]);
      expect(recording.limits).toEqual([500]);
    }
  });

  test("the batch engine keeps child-first order, per-run bounds and the 2000 clamp", async () => {
    const recordingPruners = (): TrafficBatchPruners & { ops: string[]; limits: number[] } => {
      const ops: string[] = [];
      const limits: number[] = [];
      const record = (op: string, limit: number): number => {
        ops.push(op);
        limits.push(limit);
        return limit; // always a full batch, so the drain runs to its budget
      };
      return Object.assign(
        {
          deleteOldestPageviewsBatch: async (_cutoff: Date, limit: number) =>
            record("pageviews-delete", limit),
          deleteOldestSessionsBatch: async (_cutoff: Date, limit: number) =>
            record("sessions-delete", limit),
          countExpiredPageviews: async (_cutoff: Date, limit: number) =>
            record("pageviews-count", limit),
          countExpiredSessions: async (_cutoff: Date, limit: number) =>
            record("sessions-count", limit),
        },
        { ops, limits }
      );
    };

    // Apply: pageviews (child) drains fully before sessions (parent) starts,
    // and total deletes equal batchSize x maxBatchesPerRun exactly.
    const apply = recordingPruners();
    await expect(
      pruneExpiredTraffic(
        FROZEN_NOW,
        apply,
        { batchSize: 500, maxBatchesPerRun: 2 },
        { dryRun: false }
      )
    ).resolves.toEqual({ pageviews: 1_000, sessions: 1_000, dryRun: false });
    expect(apply.ops).toEqual([
      "pageviews-delete",
      "pageviews-delete",
      "sessions-delete",
      "sessions-delete",
    ]);
    expect(apply.limits).toEqual([500, 500, 500, 500]);
    // C4/A6: each apply batch above is candidate SELECT + bounded DELETE.
    expect(apply.ops.length * 2).toBe(8);

    // Dry-run: exactly one observation per pruner and zero delete statements.
    const dry = recordingPruners();
    await expect(
      pruneExpiredTraffic(
        FROZEN_NOW,
        dry,
        { batchSize: 500, maxBatchesPerRun: 10 },
        { dryRun: true }
      )
    ).resolves.toEqual({ pageviews: 500, sessions: 500, dryRun: true });
    expect(dry.ops).toEqual(["pageviews-count", "sessions-count"]);
    expect(dry.ops.filter((op) => op.endsWith("-delete"))).toEqual([]);

    // A hand-built oversized limit can still never over-read: the dry-run
    // candidate read is clamped at the hard cap (direct-caller defense), and
    // the policy owner rejects the same oversized batch before any run.
    const clamped = recordingPruners();
    await pruneExpiredTraffic(
      FROZEN_NOW,
      clamped,
      { batchSize: 5_000, maxBatchesPerRun: 1 },
      { dryRun: true }
    );
    expect(clamped.limits).toEqual([2_000, 2_000]);
    expect(clamped.ops).toEqual(["pageviews-count", "sessions-count"]);
    expect(() => resolveRetentionBatchSize({ RETENTION_BATCH_SIZE: "5000" })).toThrow(
      "batch_size_invalid"
    );
  });

  test("the ingest pruner validates batch edges before any SQL and rejects the 2001 sentinel", async () => {
    const hostileExec = {
      select: () => {
        throw new Error(TEST_CODES.noSqlMustNotRun);
      },
      delete: () => {
        throw new Error(TEST_CODES.noSqlMustNotRun);
      },
    } as unknown as Parameters<typeof pruneAssistantIngestRunsBatch>[2];
    for (const batchSize of TASK551_RETENTION_BATCH_PINS.edges) {
      const attempt = pruneAssistantIngestRunsBatch(
        ingestPolicy({ batchSize }),
        FROZEN_NOW,
        hostileExec
      );
      if (batchSize === 2_001) {
        // The corruption sentinel is never a batch size, rejected before SQL.
        await expect(attempt).rejects.toThrow(TEST_CODES.policyInvalid);
      } else {
        // 499/500/501/2000 normalize at the pruner seam and reach the candidate
        // read, where the hostile executor trips: the policy error path was NOT
        // taken (it rethrows verbatim), so the policy check passed first.
        await expect(attempt).rejects.toThrow(TEST_CODES.batchFailed);
      }
    }
    await expect(
      pruneAssistantIngestRunsBatch(ingestPolicy({ batchSize: 0 }), FROZEN_NOW, hostileExec)
    ).rejects.toThrow(TEST_CODES.policyInvalid);
  });
});

// ---------------------------------------------------------------------------
// Real-PostgreSQL legs (owner-injected task551-db-test map)
// ---------------------------------------------------------------------------

/** One owner-map connection, always closed, handing its TEMP session to `run`. */
const withOwnerSql = async (run: (sql: Sql) => Promise<void>): Promise<void> => {
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.TASK551_FIXTURE_DATABASE_URL!, { max: 1 });
  try {
    await run(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
};

/** First row of a `count(*)::int AS n` projection, or -1 when the row is gone. */
const countOf = async (statement: Promise<unknown>): Promise<number> => {
  const rows = (await statement) as { n: number }[];
  return rows[0]?.n ?? -1;
};

describe("large-fixture analytics budgets on real PostgreSQL (requires the owner-injected map)", () => {
  // Named gate: presence AND real routability of the owner URL. Under the
  // airtight local form both DB legs register through `test.skipIf` and skip
  // by name; the driver-free legs above keep running unchanged.
  const ownerMapTest = test.skipIf(!OWNER_DATABASE_ROUTABLE);

  type TrafficCounters = { ops: string[]; limits: number[]; deleted: number[] };
  const trafficCounters = (): TrafficCounters => ({ ops: [], limits: [], deleted: [] });

  /**
   * The C1/A6 shape the job registry itself builds: closures over the REAL
   * bounded repository primitives, all bound to ONE executor, instrumented so
   * every statement the family issues is counted.
   */
  const trafficPrunersOver = (executor: Exec, counters: TrafficCounters): TrafficBatchPruners =>
    Object.freeze({
      deleteOldestPageviewsBatch: async (cutoff, limit) => {
        counters.ops.push("pageviews-delete");
        counters.limits.push(limit);
        const removed = await deleteOldestPageviewsBatch(cutoff, limit, executor);
        counters.deleted.push(removed);
        return removed;
      },
      deleteOldestSessionsBatch: async (cutoff, limit) => {
        counters.ops.push("sessions-delete");
        counters.limits.push(limit);
        const removed = await deleteOldestSessionsBatch(cutoff, limit, executor);
        counters.deleted.push(removed);
        return removed;
      },
      countExpiredPageviews: async (cutoff, limit) => {
        counters.ops.push("pageviews-count");
        counters.limits.push(limit);
        return countExpiredPageviewsBatch(cutoff, limit, executor);
      },
      countExpiredSessions: async (cutoff, limit) => {
        counters.ops.push("sessions-count");
        counters.limits.push(limit);
        return countExpiredSessionsBatch(cutoff, limit, executor);
      },
    });

  /** C4/A6 accounting: 1 SELECT per op + 1 DELETE iff the op removed rows. */
  const countedStatements = (counters: TrafficCounters): number =>
    counters.ops.reduce(
      (total, op, index) =>
        total + 1 + (op.endsWith("-delete") && (counters.deleted[index] ?? 0) > 0 ? 1 : 0),
      0
    );

  /** TEMP shadow tables: FK cascade included, real tables never touched. */
  const createAnalyticsTempTables = async (sql: Sql): Promise<void> => {
    await sql`CREATE TEMP TABLE analytics_sessions (
      id bigserial PRIMARY KEY,
      last_seen_at timestamptz NOT NULL
    )`;
    await sql`CREATE TEMP TABLE analytics_pageviews (
      id bigserial PRIMARY KEY,
      session_id bigint REFERENCES analytics_sessions(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL
    )`;
  };

  type BucketIsos = Readonly<{ old: string; boundary: string; recent: string }>;

  /**
   * The large fixture: 5,000 independent old pageviews (the literal ten-batch
   * budget), 3 old sessions with 2 attached old pageviews each (the cascade
   * probe, seeded LAST so bigserial leaves them as the oldest-set remainder),
   * and the 1,000-row boundary/recent buckets that must survive every run.
   */
  const seedAnalyticsFixture = async (sql: Sql, buckets: BucketIsos): Promise<void> => {
    await sql`INSERT INTO analytics_sessions (last_seen_at)
      SELECT ${buckets.old}::timestamptz FROM generate_series(1, 3)`;
    await sql`INSERT INTO analytics_sessions (last_seen_at)
      SELECT ${buckets.recent}::timestamptz FROM generate_series(1, 40)`;
    await sql`INSERT INTO analytics_pageviews (session_id, created_at)
      SELECT NULL, ${buckets.old}::timestamptz FROM generate_series(1, 5000)`;
    await sql`INSERT INTO analytics_pageviews (session_id, created_at)
      SELECT s.id, ${buckets.old}::timestamptz FROM analytics_sessions s
      WHERE s.last_seen_at < ${buckets.boundary}::timestamptz`;
    await sql`INSERT INTO analytics_pageviews (created_at)
      SELECT ${buckets.boundary}::timestamptz FROM generate_series(1, 1000)`;
    await sql`INSERT INTO analytics_pageviews (created_at)
      SELECT ${buckets.recent}::timestamptz FROM generate_series(1, 1000)`;
  };

  /** The fixture's parity oracle: the dry-run's bounded candidate read. */
  const captureDryRunCandidates = async (sql: Sql, iso: string, limit: number): Promise<void> => {
    await sql`CREATE TEMP TABLE retention_job_dryrun_ids (id bigint PRIMARY KEY)`;
    await sql`INSERT INTO retention_job_dryrun_ids (id)
      SELECT id FROM analytics_pageviews
      WHERE created_at < ${iso}::timestamptz
      ORDER BY created_at ASC, id ASC
      LIMIT ${limit}::int`;
  };

  const dryRunCandidatesStillLive = async (sql: Sql): Promise<number> =>
    countOf(
      sql`SELECT count(*)::int AS n FROM retention_job_dryrun_ids d
        JOIN analytics_pageviews p ON p.id = d.id`
    );

  /** Pins the analytics window for the leg and restores the ambient value. */
  const withPinnedRetentionDays = async (run: () => Promise<void>): Promise<void> => {
    const previous = process.env.ANALYTICS_RETENTION_DAYS;
    process.env.ANALYTICS_RETENTION_DAYS = "365";
    try {
      await run();
    } finally {
      if (previous === undefined) delete process.env.ANALYTICS_RETENTION_DAYS;
      else process.env.ANALYTICS_RETENTION_DAYS = previous;
    }
  };

  ownerMapTest("dry-run observes the bounded candidates and mutates zero rows", async () => {
    await withOwnerSql(async (sql) => {
      await withPinnedRetentionDays(async () => {
        const buckets = bucketsAround(trafficCutoffFor(FROZEN_NOW));
        await createAnalyticsTempTables(sql);
        await seedAnalyticsFixture(sql, buckets);
        const counters = trafficCounters();
        const result = await pruneExpiredTraffic(
          FROZEN_NOW,
          trafficPrunersOver(drizzle(sql) as unknown as Exec, counters),
          { batchSize: 500, maxBatchesPerRun: 10 },
          { dryRun: true }
        );
        expect(result).toEqual({ pageviews: 500, sessions: 3, dryRun: true });
        // C4/A6: exactly ONE SELECT per pruner, zero DELETEs, LIMIT held.
        expect(counters.ops).toEqual(["pageviews-count", "sessions-count"]);
        expect(counters.limits).toEqual([500, 500]);
        expect(countedStatements(counters)).toBe(2);
        // Zero mutations: every seeded row (and session) is still there.
        expect(await countOf(sql`SELECT count(*)::int AS n FROM analytics_pageviews`)).toBe(7_006);
        expect(await countOf(sql`SELECT count(*)::int AS n FROM analytics_sessions`)).toBe(43);
      });
    });
  });

  ownerMapTest(
    "apply re-reads the dry-run's candidates inside the family budget, child-first",
    async () => {
      await withOwnerSql(async (sql) => {
        await withPinnedRetentionDays(async () => {
          const buckets = bucketsAround(trafficCutoffFor(FROZEN_NOW));
          await createAnalyticsTempTables(sql);
          await seedAnalyticsFixture(sql, buckets);
          const executor = drizzle(sql) as unknown as Exec;

          // (1) Dry-run phase: observe the bounded candidates, change nothing.
          await expect(
            pruneExpiredTraffic(
              FROZEN_NOW,
              trafficPrunersOver(executor, trafficCounters()),
              {
                batchSize: 500,
                maxBatchesPerRun: 10,
              },
              { dryRun: true }
            )
          ).resolves.toEqual({ pageviews: 500, sessions: 3, dryRun: true });
          await captureDryRunCandidates(sql, buckets.old, 500);
          expect(await countOf(sql`SELECT count(*)::int AS n FROM retention_job_dryrun_ids`)).toBe(
            500
          );

          // (2) Apply phase: the same bounded candidates are the first batch,
          // the whole run stays inside the 500x10 family budget, child-first.
          const counters = trafficCounters();
          const startedAtMs = Date.now();
          const result = await pruneExpiredTraffic(
            FROZEN_NOW,
            trafficPrunersOver(executor, counters),
            { batchSize: 500, maxBatchesPerRun: 10 },
            { dryRun: false }
          );
          const elapsedMs = Date.now() - startedAtMs;
          expect(result).toEqual({ pageviews: 5_000, sessions: 3, dryRun: false });
          expect(result.pageviews).toBe(500 * 10); // the family budget, never 5,006
          expect(result.pageviews + result.sessions).toBeLessThanOrEqual(2 * 5_000);
          expect(counters.ops).toEqual([
            ...Array.from({ length: 10 }, () => "pageviews-delete"),
            "sessions-delete",
          ]);
          expect(counters.deleted).toEqual([...Array.from({ length: 10 }, () => 500), 3]);
          for (const limit of counters.limits) expect(limit).toBeLessThanOrEqual(2_000);
          // C4/A6: 2 statements x 10 full pageview batches + 2 for the session batch.
          expect(countedStatements(counters)).toBe(21);
          expect(await dryRunCandidatesStillLive(sql)).toBe(0);
          // Boundary/recent buckets survive; the FK cascade swept the 6 attached.
          expect(
            await countOf(
              sql`SELECT count(*)::int AS n FROM analytics_pageviews
                WHERE created_at >= ${buckets.boundary}::timestamptz`
            )
          ).toBe(2_000);
          expect(
            await countOf(
              sql`SELECT count(*)::int AS n FROM analytics_pageviews
                WHERE created_at < ${buckets.boundary}::timestamptz`
            )
          ).toBe(0);
          expect(await countOf(sql`SELECT count(*)::int AS n FROM analytics_sessions`)).toBe(40);
          // Wall time stays inside the configured default run budget.
          expect(parseRetentionSchedulerEnv({}).maxRunMs).toBe(300_000);
          expect(elapsedMs).toBeLessThan(30_000);

          // (3) Convergence: the next run is one zero-row probe per pruner.
          const converged = trafficCounters();
          await expect(
            pruneExpiredTraffic(
              FROZEN_NOW,
              trafficPrunersOver(executor, converged),
              {
                batchSize: 500,
                maxBatchesPerRun: 10,
              },
              { dryRun: false }
            )
          ).resolves.toEqual({ pageviews: 0, sessions: 0, dryRun: false });
          expect(converged.ops).toEqual(["pageviews-delete", "sessions-delete"]);
          expect(converged.deleted).toEqual([0, 0]);
          expect(countedStatements(converged)).toBe(2);
        });
      });
    }
  );
});

describe("ingest-runs anchors and batch edges on real PostgreSQL (requires the owner-injected map)", () => {
  const ownerMapTest = test.skipIf(!OWNER_DATABASE_ROUTABLE);

  const createIngestTempTable = async (sql: Sql): Promise<void> => {
    await sql`CREATE TEMP TABLE assistant_doc_ingest_runs (
      id bigserial PRIMARY KEY,
      source_root text NOT NULL DEFAULT 'task551-src',
      status text NOT NULL,
      started_at timestamptz NOT NULL
    )`;
  };

  const ingestTotal = (sql: Sql): Promise<number> =>
    countOf(sql`SELECT count(*)::int AS n FROM assistant_doc_ingest_runs`);
  const ingestAged = (sql: Sql, iso: string): Promise<number> =>
    countOf(
      sql`SELECT count(*)::int AS n FROM assistant_doc_ingest_runs
        WHERE started_at < ${iso}::timestamptz`
    );
  const ingestRetained = (sql: Sql, iso: string): Promise<number> =>
    countOf(
      sql`SELECT count(*)::int AS n FROM assistant_doc_ingest_runs
        WHERE started_at >= ${iso}::timestamptz`
    );
  const ingestSuccesses = (sql: Sql): Promise<number> =>
    countOf(sql`SELECT count(*)::int AS n FROM assistant_doc_ingest_runs WHERE status = 'success'`);

  ownerMapTest("anchors survive, aged runs drain, and dry-run matches apply", async () => {
    await withOwnerSql(async (sql) => {
      const buckets = bucketsAround(computeRetentionCutoff(FROZEN_NOW, 90));
      await createIngestTempTable(sql);
      // The scenario's small-profile shape: 100 sources; per source 6 old
      // failed runs, 1 old superseded success, 2 boundary runs and the forced
      // recent success anchor -- 700 aged non-anchor candidates in total.
      await sql`INSERT INTO assistant_doc_ingest_runs (source_root, status, started_at)
        SELECT 'task551-src-' || s,
          CASE WHEN g IN (6, 9) THEN 'success' ELSE 'failed' END,
          CASE WHEN g <= 6 THEN ${buckets.old}::timestamptz
               WHEN g <= 8 THEN ${buckets.boundary}::timestamptz
               ELSE ${buckets.recent}::timestamptz END
        FROM generate_series(0, 99) AS s, generate_series(0, ${INGEST_SOURCE_RUNS - 1}) AS g`;
      expect(await ingestTotal(sql)).toBe(1_000);
      const executor = drizzle(sql);
      const policy = ingestPolicy({});

      // Dry-run: one bounded observation of the oldest 500 aged non-anchors.
      expect(
        await pruneAssistantIngestRunsBatch(ingestPolicy({ dryRun: true }), FROZEN_NOW, executor)
      ).toEqual({ family: "assistant_ingest_runs", matched: 500, deleted: 0, dryRun: true });
      expect(await ingestTotal(sql)).toBe(1_000);

      // Apply: the same bounded first batch, then the short drain batch.
      expect(await pruneAssistantIngestRunsBatch(policy, FROZEN_NOW, executor)).toEqual({
        family: "assistant_ingest_runs",
        matched: 500,
        deleted: 500,
        dryRun: false,
      });
      expect(await pruneAssistantIngestRunsBatch(policy, FROZEN_NOW, executor)).toEqual({
        family: "assistant_ingest_runs",
        matched: 200,
        deleted: 200,
        dryRun: false,
      });
      // Anchors (the scenario literal) and boundary runs survive; aged rows 0.
      expect(await ingestTotal(sql)).toBe(300);
      expect(await ingestSuccesses(sql)).toBe(
        TASK551_RETENTION_SCENARIOS.assistantIngestOld.anchors.small
      );
      expect(await ingestAged(sql, buckets.boundary)).toBe(0);
      expect(await ingestRetained(sql, buckets.boundary)).toBe(300);

      // Convergence: the next batch observes nothing.
      expect(await pruneAssistantIngestRunsBatch(policy, FROZEN_NOW, executor)).toEqual({
        family: "assistant_ingest_runs",
        matched: 0,
        deleted: 0,
        dryRun: false,
      });
    });
  });

  ownerMapTest("batch edges 499/500/501 bound one batch each at the frozen clock", async () => {
    await withOwnerSql(async (sql) => {
      const buckets = bucketsAround(computeRetentionCutoff(FROZEN_NOW, 90));
      await createIngestTempTable(sql);
      // The 2,001-row population: 1,200 aged candidates, 400 boundary, 401 recent.
      for (const [iso, count] of [
        [buckets.old, 1_200],
        [buckets.boundary, 400],
        [buckets.recent, 401],
      ] as const) {
        await sql`INSERT INTO assistant_doc_ingest_runs (source_root, status, started_at)
          SELECT 'task551-edge-src', 'failed', ${iso}::timestamptz
          FROM generate_series(1, ${count}::int)`;
      }
      expect(await ingestTotal(sql)).toBe(2_001);
      const executor = drizzle(sql);
      let remainingAged = 1_200;
      for (const edge of [499, 500, 501]) {
        const batch = await pruneAssistantIngestRunsBatch(
          ingestPolicy({ batchSize: edge }),
          FROZEN_NOW,
          executor
        );
        expect(batch.deleted).toBe(Math.min(edge, remainingAged));
        expect(batch.matched).toBe(batch.deleted);
        expect(batch.deleted).toBeLessThanOrEqual(edge);
        remainingAged -= batch.deleted;
      }
      expect(remainingAged).toBe(0);
      // A drained family probes zero at the 2,000 cap without over-reading.
      expect(
        await pruneAssistantIngestRunsBatch(
          ingestPolicy({ batchSize: 2_000 }),
          FROZEN_NOW,
          executor
        )
      ).toEqual({ family: "assistant_ingest_runs", matched: 0, deleted: 0, dryRun: false });
      // Boundary/recent buckets retained throughout.
      expect(await ingestRetained(sql, buckets.boundary)).toBe(801);
      expect(await ingestTotal(sql)).toBe(801);
    });
  });
});
