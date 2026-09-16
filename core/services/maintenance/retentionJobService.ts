// TASK-551-06-L03: the one-session retention job executor.
//
// Runs the whole 19-family retention plan off the request path on ONE
// dedicated (connection-affine) maintenance session: one session-scoped
// advisory lock acquired on that same session (replica serialization), the 14
// L01 batch families drained through bounded, independently committed batch
// transactions, the 5 L02 revision families drained one family-unit
// transaction each, and a sanitized, publish-once job summary.
//
// Contract dispositions baked into this file (dated contract corrections
// C1-C10 win wherever they speak):
// - C1/A6  analytics runs through session-bound `TrafficBatchPruners` closures
//   forwarding to the real bounded repository primitives — never the service's
//   global-pool defaults — one bounded batch per invocation (`maxBatchesPerRun:
//   1`) with the mandatory fourth `options` argument, so a scheduled dry-run
//   can never silently delete.
// - C2     exactly ONE local documented adapter (`drizzleOverTransaction`)
//   bridges the session-held `TransactionSql` to the drizzle-shaped pruner
//   executors; solution_kit_runs gets the identity `transaction` shim; the
//   search_history handle gets one documented cast at the seam.
// - C3/C4  this leaf owns its local `RETENTION_JOB_FAMILY_REGISTRY` (19 rows)
//   and its local `isDedicatedSessionLoss`; only batch-level exported pruners
//   plus the two blessed whole-family entries (`runRevisionFamilyRetention`,
//   session-bound `pruneExpiredTraffic`) run here; every family is gated on
//   its typed policy `enabled` BEFORE any SQL; abort/deadline checks interleave
//   at batch and family-unit boundaries.
// - C5     this module never reads `RETENTION_SCHEDULER_*` or re-runs the L01
//   unsupported-key sweep; the typed per-run budget arrives via deps.
// - C6     the lock is hand-rolled (`pg_try_advisory_lock`/`pg_advisory_unlock`
//   through `session.execute`) so lock ownership and every batch share one
//   backend PID — the documented sole-owner exception to
//   `withDedicatedDatabaseAdvisoryLock` (a second session). The summary is
//   published BEFORE unlock; the final best-effort release in `finally`
//   no-ops/unlock-false after a real lock loss.
// - C7     the per-batch `statementTimeoutMs` field is passed for type
//   compliance only (voided at core/db/client.ts:428). The BINDING bound for
//   in-transaction SQL is the tx-local `set_config('statement_timeout', ...,
//   true)` issued as the FIRST statement of every run callback, so a hung batch
//   query self-terminates at 4,000 ms, inside the 4,500 ms shutdown drain.
// - C8     abort is a lifecycle status checked FIRST (a graceful abort surfaces
//   as `dedicated_database_session_lost` from `session.execute`); only a
//   session loss without abort (or a failed post-acquire ownership recheck)
//   maps to `retention_lock_lost`; acquire-ambiguous ownership failure maps to
//   `retention_job_locked`; a plain lock-acquire `false` maps to
//   `skipped_locked`.
// - C9     a failure keeps the committed high-water marks of earlier batches
//   and never marks partial progress as a full success.
//
// Security: the registry, lock key pair, and every SQL statement here are
// compile-time allowlisted. Summaries carry family identifiers, aggregate
// counts, timings, and the closed status set only — never row samples, PII,
// content, SQL binds, URLs, credentials, tokens, hashes, or secrets. Raw
// driver errors are never embedded in a summary; only the closed codes are.

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PendingQuery, ReservedSql, Sql } from "postgres";

import {
  countExpiredPageviewsBatch,
  countExpiredSessionsBatch,
  deleteOldestPageviewsBatch,
  deleteOldestSessionsBatch,
} from "../analytics/trafficRepository";
import {
  pruneExpiredTraffic,
  type TrafficBatchPruners,
} from "../analytics/trafficRetentionService";
import {
  pruneAssistantActionsBatch,
  pruneAssistantIngestRunsBatch,
} from "../assistant/assistantRetentionService";
import { pruneExpiredAuthArtifactsBatch } from "../auth/expiredAuthArtifactRetentionService";
import { pruneSessionsBatch } from "../auth/sessionRetentionService";
import {
  normalizeRevisionRetentionPolicy,
  REVISION_RETENTION_FAMILY_ORDER,
  runRevisionFamilyRetention,
  type RevisionRetentionPolicy,
} from "../content/revisionRetentionService";
import type { RevisionFamily } from "../database/revisionAllocation";
import { pruneEmailDeliveryLogsBatch } from "../email/emailDeliveryRetentionService";
import { pruneFormSubmissionsBatch } from "../forms/submissionRetentionService";
import { pruneIntegrationRequestsBatch } from "../integrations/integrationRequestRetentionService";
import {
  pruneSolutionKitRunsBatch,
  type SolutionKitRetentionBatchResult,
  type SolutionKitRetentionExecutor,
} from "../kits/solutionKitRetentionService";
import {
  DATABASE_CLIENT_ERROR_CODES,
  withDedicatedDatabaseSession,
  type DedicatedDatabaseSession,
  type DedicatedDatabaseTransaction,
} from "../../db/client";
import {
  RETENTION_CANCEL_DRAIN_DEADLINE_MS,
  RETENTION_STATEMENT_TIMEOUT_MS,
} from "../../db/databaseLifecycle";
import * as schema from "../../db/schema";
import { prunePreviewTokensBatch } from "../pages/previewTokenRetentionService";
import { pruneSearchHistoryBatch } from "../search/searchHistoryRetentionService";
import {
  loadRetentionPolicies,
  resolveRetentionRuntimeOptions,
  RETENTION_FAMILY_ORDER,
  type RetentionFamily,
  type RetentionPolicy,
  type RuntimeEnv,
} from "./retentionPolicy";
import { pruneWebhookDeliveriesBatch } from "../webhooks/webhookRetentionService";
import { pruneAuditLogsBatch } from "../audit/auditService";
import { pruneAccessLogsBatch } from "../access/accessLogService";

// ---------------------------------------------------------------------------
// Codes, statuses, and local failures
// ---------------------------------------------------------------------------

/**
 * The closed job failure-code set (contract lines 156-158), C8-scoped: abort
 * is a lifecycle status, not a member. `partition_readiness_unavailable`
 * belongs to the sibling partition-readiness service and is never produced
 * here.
 */
export type RetentionJobFailureCode =
  | "retention_job_locked"
  | "retention_lock_lost"
  | "retention_job_timeout"
  | "retention_family_failed";

/** Lifecycle statuses (`completed` / `skipped_locked` / `aborted`) + failures. */
export type RetentionJobStatus =
  "completed" | "skipped_locked" | "aborted" | RetentionJobFailureCode;

const RETENTION_JOB_FAILURE_STATUSES: ReadonlySet<string> = new Set<string>([
  "retention_job_locked",
  "retention_lock_lost",
  "retention_job_timeout",
  "retention_family_failed",
]);

/**
 * Classified boundary failures (C8): a boundary error reaching the catch block
 * AFTER the abort-first check is per-run deadline exhaustion. The abort member
 * never escapes as a failure code — the `signal.aborted` precedence intercepts
 * it and publishes the lifecycle status `aborted`.
 */
class RetentionJobBoundaryError extends Error {
  static readonly deadline = "retention_job_timeout";
  static readonly aborted = "retention_job_aborted";

  constructor(code: string) {
    super(code);
    this.name = "RetentionJobBoundaryError";
  }
}

/**
 * C3: the session-loss detector is leaf-local by disposition — exact message
 * equality against the client's stable code, never a substring or a driver
 * heuristics read.
 */
const isDedicatedSessionLoss = (error: unknown): boolean =>
  error instanceof Error && error.message === DATABASE_CLIENT_ERROR_CODES.dedicatedSessionLost;

// ---------------------------------------------------------------------------
// Advisory lock (C6) — hand-rolled on the ONE dedicated session
// ---------------------------------------------------------------------------

/**
 * The retention job's session advisory lock, in the two-int4 key form used by
 * the landed precedents (`backupScheduler.ts:92`, `startupMigrations.ts`).
 *
 * Pair derivation: TASK-551-06-L03 -> 551063 / 3. Collision inventory checked
 * at authoring time against every landed session advisory lock: startup
 * migrations 20260604/400, startup assistant docs 20260604/403, first-run
 * admin 20260604/482, backup scheduler 20260628/484, submission-export
 * scheduler 20260818/571, CMS writer fence 548/0, legacy kit locks 547/0, and
 * the dedicated-session affinity probe's single key 551551551 (which lives in
 * classid 0). No landed lock shares this namespace, so no packed single-key
 * form collides either.
 */
export const RETENTION_JOB_LOCK_NAMESPACE = 551063;
export const RETENTION_JOB_LOCK_KEY = 3;

type LockProbeRow = Readonly<{ acquired: boolean }>;
type LockOwnerRow = Readonly<{ pid: number }>;
type UnlockProbeRow = Readonly<{ unlocked: boolean }>;

/** Session-scoped non-blocking acquire; `false` maps to `skipped_locked`. */
const acquireRetentionLockStatement = (sql: ReservedSql): PendingQuery<[LockProbeRow]> =>
  sql<
    [LockProbeRow]
  >`select pg_try_advisory_lock(${RETENTION_JOB_LOCK_NAMESPACE}, ${RETENTION_JOB_LOCK_KEY}) as acquired`;

/**
 * Post-acquire ownership recheck (C8(c)): the lock row must still be granted
 * to THIS session's live backend (`pg_locks` joined to `pg_stat_activity`).
 * Key halves are compared as text so the probe is insensitive to the catalog's
 * `oid`/`bigint` rendering of `classid`/`objid`.
 */
const retentionLockOwnershipStatement = (sql: ReservedSql): PendingQuery<[LockOwnerRow]> =>
  sql<[LockOwnerRow]>`
    select l.pid as pid
    from pg_locks l
    join pg_stat_activity a on a.pid = l.pid
    where l.locktype = 'advisory'
      and l.granted
      and l.pid = pg_backend_pid()
      and l.classid::text = ${String(RETENTION_JOB_LOCK_NAMESPACE)}
      and l.objid::text = ${String(RETENTION_JOB_LOCK_KEY)}
    limit 1
  `;

const releaseRetentionLockStatement = (sql: ReservedSql): PendingQuery<[UnlockProbeRow]> =>
  sql<
    [UnlockProbeRow]
  >`select pg_advisory_unlock(${RETENTION_JOB_LOCK_NAMESPACE}, ${RETENTION_JOB_LOCK_KEY}) as unlocked`;

const tryAcquireRetentionLock = async (
  session: DedicatedDatabaseSession,
  signal: AbortSignal
): Promise<boolean> => {
  const rows = await session.execute(acquireRetentionLockStatement, signal);
  return rows[0]?.acquired === true;
};

const verifyRetentionLockOwnership = async (
  session: DedicatedDatabaseSession,
  signal: AbortSignal
): Promise<boolean> => {
  const rows = await session.execute(retentionLockOwnershipStatement, signal);
  return rows.length === 1;
};

/**
 * Best-effort release on the SAME session (C6). Expected to no-op/unlock-false
 * after a real lock loss, and to fail quietly after an abort (the abort makes
 * `session.execute` surface the lost-session code); a session-scoped lock dies
 * with its backend either way. Never masks the run outcome.
 */
const releaseRetentionLockQuietly = async (
  session: DedicatedDatabaseSession,
  signal: AbortSignal
): Promise<void> => {
  try {
    await session.execute(releaseRetentionLockStatement, signal);
  } catch {
    // Contained: see above. The dedicated-session lease drain releases the
    // physical session exactly once on every path.
  }
};

/**
 * Contained rollback/drain after an abort or a real lock loss. Reason id is
 * the client's own `retention_lock_lost` cancel reason (client.ts:316).
 */
const drainSessionQuietly = async (session: DedicatedDatabaseSession): Promise<void> => {
  try {
    await session.cancelActiveAndRollback("retention_lock_lost");
  } catch {
    // The drain's own contract already confirms rollback or termination.
  }
};

// ---------------------------------------------------------------------------
// The one documented adapter (C2) and the family executors built on it
// ---------------------------------------------------------------------------

/** The tx-backed drizzle executor handed to every pruner. */
type RetentionJobExecutor = PostgresJsDatabase<typeof schema>;

/**
 * THE one L03-local adapter (C2). `DedicatedDatabaseSession` never releases its
 * raw handle (core/db/client.ts:321-327 — "Consumers receive no retained
 * handle"), so the only bridgeable surface is the `TransactionSql` handed to a
 * `session.transaction` callback (client.ts:318). drizzle() declares a plain
 * `Sql` client, hence the single documented cast (precedent:
 * core/server/startupMigrations.ts:122, drizzle over a raw client). Every
 * statement the bridged instance issues still executes on the SAME lock-owning
 * backend PID.
 */
const drizzleOverTransaction = (tx: DedicatedDatabaseTransaction): RetentionJobExecutor =>
  drizzle(tx as unknown as Sql, { schema });

/**
 * The search-history service's own drizzle transaction shape, re-declared
 * locally at the adapter seam (C4 round-3 pin) — never widened in the service.
 * Its `DbTransaction` derives from the global `db`, which cannot match the
 * session's raw `TransactionSql`, so the drizzle-over-tx bridge is cast once
 * by the registry row below.
 */
type SearchHistoryTransactionHandle = Parameters<
  Parameters<RetentionJobExecutor["transaction"]>[0]
>[0];

/**
 * C10/C4: FIRST statement of every `session.transaction` run callback. The
 * tx-scoped bound (third argument `true` = transaction-local; reverts at
 * commit/rollback) makes hung in-transaction batch SQL self-terminate at
 * 4,000 ms, strictly inside the 4,500 ms shutdown drain. `SET LOCAL` syntax
 * cannot take bind parameters, hence `set_config`. The session-level default
 * (client.ts:71-89) keeps backstopping only the non-transaction statements.
 */
const setTransactionStatementTimeout = async (tx: DedicatedDatabaseTransaction): Promise<void> => {
  await tx`select set_config('statement_timeout', ${String(RETENTION_STATEMENT_TIMEOUT_MS)}, true)`;
};

/** C1: session-bound closures over the real bounded repository primitives. */
const trafficPrunersOver = (executor: RetentionJobExecutor): TrafficBatchPruners =>
  Object.freeze({
    deleteOldestPageviewsBatch: (cutoff, limit) =>
      deleteOldestPageviewsBatch(cutoff, limit, executor),
    deleteOldestSessionsBatch: (cutoff, limit) =>
      deleteOldestSessionsBatch(cutoff, limit, executor),
    countExpiredPageviews: (cutoff, limit) => countExpiredPageviewsBatch(cutoff, limit, executor),
    countExpiredSessions: (cutoff, limit) => countExpiredSessionsBatch(cutoff, limit, executor),
  });

/**
 * Forwards an overloaded drizzle prototype method with the real instance as
 * receiver (its `select`/`delete` are prototype methods, invisible to object
 * spread), re-typed once at the shim seam.
 */
const forwardMember = <M>(method: M, executor: RetentionJobExecutor): M =>
  ((...callArgs: unknown[]) =>
    (method as (this: unknown, ...args: unknown[]) => unknown).apply(
      executor,
      callArgs
    )) as unknown as M;

/**
 * C2/A5 shim for `solution_kit_runs`: the pruner opens `exec.transaction`
 * internally, but drizzle's own `.transaction` calls `client.begin`, which does
 * not exist on a `TransactionSql`-backed instance (runtime TypeError). The shim
 * reuses the OUTER session transaction for the pruner's atomic unit; its
 * callback argument needs the documented cast (drizzle's `PostgresJsDatabase`
 * and `PgTransaction` are not mutually assignable in either direction).
 */
const solutionKitExecutorOver = (executor: RetentionJobExecutor): SolutionKitRetentionExecutor =>
  Object.freeze({
    select: forwardMember(executor.select, executor),
    delete: forwardMember(executor.delete, executor),
    transaction: (async (run: (tx: never) => Promise<unknown>) =>
      run(executor as unknown as never)) as unknown as SolutionKitRetentionExecutor["transaction"],
  });

/** Literal-family view of one L01 policy, for the per-family pruner types. */
const familyPolicy = <F extends RetentionFamily>(
  family: F,
  policy: RetentionPolicy
): RetentionPolicy & Readonly<{ family: F }> => Object.freeze({ ...policy, family });

// ---------------------------------------------------------------------------
// RETENTION_JOB_FAMILY_REGISTRY (C3/C4) — leaf-local, 19 rows
// ---------------------------------------------------------------------------

/** Family ids: the 14 L01 policy families + the 5 L02 revision families. */
export type RetentionJobFamilyId = RetentionFamily | RevisionFamily;

/** Uniform per-batch accounting every L01 pruner is reduced to. */
type L01BatchDelta = Readonly<{ matched: number; deleted: number }>;

/** One committed L02 revision family unit's accounting. */
type FamilyUnitDelta = Readonly<{ batches: number } & L01BatchDelta>;

type L01BatchInput = Readonly<{
  policy: RetentionPolicy;
  now: Date;
  /** The batch's own session-bound transaction handle (one batch = one commit). */
  tx: DedicatedDatabaseTransaction;
  /** The C2 adapter output: drizzle over `tx`, same backend PID. */
  executor: RetentionJobExecutor;
}>;

type L01BatchRunner = (input: L01BatchInput) => Promise<L01BatchDelta>;

/** The canonical short-batch drain rule (the family services' own loop rule). */
type DrainRule = (policy: RetentionPolicy, delta: L01BatchDelta) => boolean;

const defaultDrained: DrainRule = (policy, delta) =>
  policy.dryRun ? delta.matched < policy.batchSize : delta.deleted < policy.batchSize;

type RetentionJobFamilyEntry =
  | Readonly<{
      kind: "l01-batch";
      family: RetentionFamily;
      /** C4 table documentation: module#exported-function (no dynamic import). */
      source: string;
      runBatch: L01BatchRunner;
      /** Defaults to the canonical short-batch drain rule. */
      drained?: DrainRule;
    }>
  | Readonly<{
      kind: "revision-unit";
      family: RevisionFamily;
      source: string;
    }>;

/**
 * The leaf-local 19-family registry, in mandatory execution order:
 * `RETENTION_FAMILY_ORDER` then `REVISION_RETENTION_FAMILY_ORDER`. Only
 * batch-level exported pruners plus the two blessed whole-family entries
 * appear here; nothing that could fall back to global-pool defaults is
 * reachable from this file.
 */
export const RETENTION_JOB_FAMILY_REGISTRY: readonly RetentionJobFamilyEntry[] = Object.freeze([
  {
    kind: "l01-batch",
    family: "access_logs",
    source: "core/services/access/accessLogService.ts#pruneAccessLogsBatch",
    runBatch: ({ policy, now, executor }) =>
      pruneAccessLogsBatch(familyPolicy("access_logs", policy), now, executor),
  },
  {
    kind: "l01-batch",
    family: "audit_logs",
    source: "core/services/audit/auditService.ts#pruneAuditLogsBatch",
    runBatch: ({ policy, now, executor }) =>
      pruneAuditLogsBatch(familyPolicy("audit_logs", policy), now, executor),
  },
  {
    kind: "l01-batch",
    family: "email_delivery_logs",
    source: "core/services/email/emailDeliveryRetentionService.ts#pruneEmailDeliveryLogsBatch",
    runBatch: ({ policy, now, executor }) =>
      pruneEmailDeliveryLogsBatch(familyPolicy("email_delivery_logs", policy), now, executor),
  },
  {
    kind: "l01-batch",
    family: "search_history",
    source: "core/services/search/searchHistoryRetentionService.ts#pruneSearchHistoryBatch",
    // A2: the service takes the L01 policy type directly plus its own drizzle
    // transaction handle — the C2 bridge cast once at this seam (C4 round-3).
    runBatch: ({ policy, now, executor }) =>
      pruneSearchHistoryBatch(policy, executor as unknown as SearchHistoryTransactionHandle, now),
  },
  {
    kind: "l01-batch",
    family: "integration_requests",
    source:
      "core/services/integrations/integrationRequestRetentionService.ts#pruneIntegrationRequestsBatch",
    runBatch: ({ policy, now, executor }) =>
      pruneIntegrationRequestsBatch(familyPolicy("integration_requests", policy), now, executor),
  },
  {
    // Deliberate pairing (C4): the expired-auth-artifact exporter owns this
    // family; there is no password_resets-named pruner.
    kind: "l01-batch",
    family: "password_resets",
    source:
      "core/services/auth/expiredAuthArtifactRetentionService.ts#pruneExpiredAuthArtifactsBatch",
    runBatch: ({ policy, now, executor }) =>
      pruneExpiredAuthArtifactsBatch(familyPolicy("password_resets", policy), now, executor),
  },
  {
    kind: "l01-batch",
    family: "preview_tokens",
    source: "core/services/pages/previewTokenRetentionService.ts#prunePreviewTokensBatch",
    runBatch: ({ policy, now, executor }) =>
      prunePreviewTokensBatch(familyPolicy("preview_tokens", policy), now, executor),
  },
  {
    kind: "l01-batch",
    family: "assistant_ingest_runs",
    source: "core/services/assistant/assistantRetentionService.ts#pruneAssistantIngestRunsBatch",
    runBatch: ({ policy, now, executor }) =>
      pruneAssistantIngestRunsBatch(familyPolicy("assistant_ingest_runs", policy), now, executor),
  },
  {
    kind: "l01-batch",
    family: "assistant_actions",
    source: "core/services/assistant/assistantRetentionService.ts#pruneAssistantActionsBatch",
    runBatch: ({ policy, now, executor }) =>
      pruneAssistantActionsBatch(familyPolicy("assistant_actions", policy), now, executor),
  },
  {
    kind: "l01-batch",
    family: "analytics",
    source: "core/services/analytics/trafficRetentionService.ts#pruneExpiredTraffic",
    // C1/A6: session-bound pruners are MANDATORY — the service defaults run on
    // the global pool and would break the one-PID acceptance. `maxBatchesPerRun:
    // 1` makes one invocation exactly one bounded batch (the plan loop owns the
    // family budget), and the FOURTH argument is mandatory: without it the
    // service defaults to APPLY mode and a scheduled dry-run would delete.
    runBatch: async ({ policy, now, executor }) => {
      const result = await pruneExpiredTraffic(
        now,
        trafficPrunersOver(executor),
        Object.freeze({ batchSize: policy.batchSize, maxBatchesPerRun: 1 }),
        Object.freeze({ dryRun: policy.dryRun })
      );
      const rows = result.pageviews + result.sessions;
      return Object.freeze({ matched: rows, deleted: result.dryRun ? 0 : rows });
    },
    // Apply mode keeps the canonical short-batch rule; dry-run never advances
    // the candidate set, so exactly one observation per run (the service's own
    // rule) — never a repeated identical re-count.
    drained: (policy) => policy.dryRun,
  },
  {
    kind: "l01-batch",
    family: "form_submissions",
    source: "core/services/forms/submissionRetentionService.ts#pruneFormSubmissionsBatch",
    runBatch: ({ policy, now, executor }) =>
      pruneFormSubmissionsBatch(familyPolicy("form_submissions", policy), now, executor),
  },
  {
    kind: "l01-batch",
    family: "webhook_deliveries",
    source: "core/services/webhooks/webhookRetentionService.ts#pruneWebhookDeliveriesBatch",
    runBatch: ({ policy, now, executor }) =>
      pruneWebhookDeliveriesBatch(familyPolicy("webhook_deliveries", policy), now, executor),
  },
  {
    kind: "l01-batch",
    family: "sessions",
    source: "core/services/auth/sessionRetentionService.ts#pruneSessionsBatch",
    runBatch: ({ policy, now, executor }) =>
      pruneSessionsBatch(familyPolicy("sessions", policy), now, executor),
  },
  {
    kind: "l01-batch",
    family: "solution_kit_runs",
    source: "core/services/kits/solutionKitRetentionService.ts#pruneSolutionKitRunsBatch",
    runBatch: async ({ policy, now, executor }) => {
      const result: SolutionKitRetentionBatchResult = await pruneSolutionKitRunsBatch(
        familyPolicy("solution_kit_runs", policy),
        now,
        solutionKitExecutorOver(executor)
      );
      // The family reports candidates/units/rows rather than matched/deleted;
      // the job ledger keeps its uniform aggregate shape.
      return Object.freeze({ matched: result.candidates, deleted: result.rows });
    },
  },
  {
    kind: "revision-unit",
    family: "page",
    source: "core/services/content/revisionRetentionService.ts#runRevisionFamilyRetention",
  },
  {
    kind: "revision-unit",
    family: "widget_template",
    source: "core/services/content/revisionRetentionService.ts#runRevisionFamilyRetention",
  },
  {
    kind: "revision-unit",
    family: "detail_page",
    source: "core/services/content/revisionRetentionService.ts#runRevisionFamilyRetention",
  },
  {
    kind: "revision-unit",
    family: "entry",
    source: "core/services/content/revisionRetentionService.ts#runRevisionFamilyRetention",
  },
  {
    kind: "revision-unit",
    family: "post",
    source: "core/services/content/revisionRetentionService.ts#runRevisionFamilyRetention",
  },
]);

// Registry integrity, validated once at module evaluation (append-heavy
// registry discipline): the 19 rows must reproduce RETENTION_FAMILY_ORDER then
// REVISION_RETENTION_FAMILY_ORDER exactly, with no duplicate family.
const registeredFamilyIds = RETENTION_JOB_FAMILY_REGISTRY.map((entry) => entry.family);
const expectedFamilyOrder: readonly RetentionJobFamilyId[] = [
  ...RETENTION_FAMILY_ORDER,
  ...REVISION_RETENTION_FAMILY_ORDER,
];
if (
  registeredFamilyIds.length !== expectedFamilyOrder.length ||
  registeredFamilyIds.some((family, index) => family !== expectedFamilyOrder[index]) ||
  new Set(registeredFamilyIds).size !== registeredFamilyIds.length
) {
  throw new Error("retention_job_registry_order_invalid");
}

// C4 containment pin: the tx-scoped statement bound must self-terminate hung
// in-transaction batch SQL strictly inside the shutdown drain. Both constants
// are imported read-only (databaseLifecycle.ts:30-31), never redefined here.
if (RETENTION_STATEMENT_TIMEOUT_MS >= RETENTION_CANCEL_DRAIN_DEADLINE_MS) {
  throw new Error("retention_statement_timeout_exceeds_shutdown_drain");
}

// ---------------------------------------------------------------------------
// Deps, summary, and the local (unpublished-until-publish) ledger
// ---------------------------------------------------------------------------

export type RetentionJobDeps = Readonly<{
  /** Injected environment (defaults to `process.env`), parsed once via L01. */
  env?: RuntimeEnv;
  /** Clock for elapsed/deadline reads (defaults to `new Date()`). */
  clock?: () => Date;
  /**
   * Per-run wall budget in milliseconds, passed in by the scheduler from its
   * own parsed `RETENTION_SCHEDULER_MAX_RUN_MS` (C5: this module never reads
   * that key). Defensively bounded to the scheduler's own envelope; fail
   * closed, never clamped.
   */
  maxRunMs?: number;
}>;

const DEFAULT_MAX_RUN_MS = 300_000;
const MIN_RUN_MS = 1_000;
const MAX_RUN_MS = 3_600_000;

const resolveRunBudgetMs = (value: number | undefined): number => {
  const candidate = value ?? DEFAULT_MAX_RUN_MS;
  if (!Number.isSafeInteger(candidate) || candidate < MIN_RUN_MS || candidate > MAX_RUN_MS) {
    throw new Error("retention_job_run_budget_invalid");
  }
  return candidate;
};

export type RetentionJobFamilySummary = Readonly<{
  family: RetentionJobFamilyId;
  enabled: boolean;
  dryRun: boolean;
  batches: number;
  matched: number;
  deleted: number;
}>;

export type RetentionJobSummary = Readonly<{
  status: RetentionJobStatus;
  /** The failure code on a failure status; `null` on a lifecycle status. */
  code: RetentionJobFailureCode | null;
  /** Present only for `retention_family_failed`. */
  failedFamily: string | null;
  families: readonly RetentionJobFamilySummary[];
  batches: number;
  matched: number;
  deleted: number;
  dryRun: boolean;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
}>;

type RetentionJobLedger = Readonly<{
  recordDisabled: (family: RetentionJobFamilyId, dryRun: boolean) => void;
  addCommittedBatch: (family: RetentionJobFamilyId, dryRun: boolean, delta: L01BatchDelta) => void;
  addFamilyUnit: (family: RetentionJobFamilyId, dryRun: boolean, unit: FamilyUnitDelta) => void;
  publish: (
    status: RetentionJobStatus,
    endedAt: Date,
    failedFamily?: RetentionJobFamilyId
  ) => RetentionJobSummary;
}>;

/** The ledger's in-flight row: the published summary shape, held mutable; frozen at publish. */
type MutableFamilyRow = {
  -readonly [K in keyof RetentionJobFamilySummary]: RetentionJobFamilySummary[K];
};

/**
 * Local-only accounting: nothing escapes until `publish` freezes the summary,
 * so a failed or aborted run never publishes partial work as success (C9) and
 * the earlier committed high-water marks still travel with the failure code.
 */
const createJobLedger = (startedAt: Date, dryRun: boolean): RetentionJobLedger => {
  const families: MutableFamilyRow[] = [];
  const rowFor = (family: RetentionJobFamilyId, familyDryRun: boolean): MutableFamilyRow => {
    const existing = families.find((row) => row.family === family);
    if (existing) return existing;
    const fresh: MutableFamilyRow = {
      family,
      enabled: true,
      dryRun: familyDryRun,
      batches: 0,
      matched: 0,
      deleted: 0,
    };
    families.push(fresh);
    return fresh;
  };
  const addTo = (row: MutableFamilyRow, batches: number, matched: number, deleted: number) => {
    row.batches += batches;
    row.matched += matched;
    row.deleted += deleted;
  };
  return Object.freeze({
    recordDisabled: (family, familyDryRun) => {
      families.push(
        Object.freeze({
          family,
          enabled: false,
          dryRun: familyDryRun,
          batches: 0,
          matched: 0,
          deleted: 0,
        })
      );
    },
    addCommittedBatch: (family, familyDryRun, delta) => {
      addTo(rowFor(family, familyDryRun), 1, delta.matched, delta.deleted);
    },
    addFamilyUnit: (family, familyDryRun, unit) => {
      addTo(rowFor(family, familyDryRun), unit.batches, unit.matched, unit.deleted);
    },
    publish: (status, endedAt, failedFamily) =>
      Object.freeze({
        status,
        code: RETENTION_JOB_FAILURE_STATUSES.has(status)
          ? (status as RetentionJobFailureCode)
          : null,
        failedFamily: failedFamily ?? null,
        families: Object.freeze(families.map((row) => Object.freeze({ ...row }))),
        batches: families.reduce((total, row) => total + row.batches, 0),
        matched: families.reduce((total, row) => total + row.matched, 0),
        deleted: families.reduce((total, row) => total + row.deleted, 0),
        dryRun,
        startedAt,
        endedAt,
        durationMs: Math.max(0, endedAt.getTime() - startedAt.getTime()),
      }),
  });
};

const throwIfAbortedOrPastDeadline = (
  signal: AbortSignal,
  deadlineMs: number,
  clock: () => Date
): void => {
  // Abort wins over deadline when both fire in the same boundary window (C8).
  if (signal.aborted || clock().getTime() >= deadlineMs)
    throw new RetentionJobBoundaryError(
      signal.aborted ? RetentionJobBoundaryError.aborted : RetentionJobBoundaryError.deadline
    );
};

// ---------------------------------------------------------------------------
// Per-family execution
// ---------------------------------------------------------------------------

type L01FamilyPlanInput = Readonly<{
  session: DedicatedDatabaseSession;
  signal: AbortSignal;
  entry: Extract<RetentionJobFamilyEntry, { kind: "l01-batch" }>;
  policy: RetentionPolicy;
  now: Date;
  deadlineMs: number;
  clock: () => Date;
  ledger: RetentionJobLedger;
}>;

/**
 * One L01 family: up to `policy.maxBatchesPerRun` batches of at most
 * `policy.batchSize` rows, each batch its own committed session transaction on
 * the lock-owning session. Every batch boundary re-checks abort/deadline and
 * session liveness (C4); a committed batch is recorded before the next one
 * starts, so a later failure keeps the earlier high-water marks.
 */
const runL01FamilyBatches = async (input: L01FamilyPlanInput): Promise<void> => {
  const { session, signal, entry, policy, now, deadlineMs, clock, ledger } = input;
  for (let batches = 0; batches < policy.maxBatchesPerRun; batches += 1) {
    throwIfAbortedOrPastDeadline(signal, deadlineMs, clock);
    await session.assertAlive(signal);
    const delta = await session.transaction({
      signal,
      // C7: required by the public type, deliberately voided by the session
      // (client.ts:428); the binding bound is the tx-local set_config below.
      statementTimeoutMs: RETENTION_STATEMENT_TIMEOUT_MS,
      run: async (tx: DedicatedDatabaseTransaction) => {
        await setTransactionStatementTimeout(tx);
        return entry.runBatch({
          policy,
          now,
          tx,
          executor: drizzleOverTransaction(tx),
        });
      },
    });
    ledger.addCommittedBatch(entry.family, policy.dryRun, delta);
    const drained = entry.drained ?? defaultDrained;
    if (drained(policy, delta)) break;
  }
};

type RevisionFamilyPlanInput = Readonly<{
  session: DedicatedDatabaseSession;
  signal: AbortSignal;
  family: RevisionFamily;
  now: Date;
  env: RuntimeEnv;
  globalKnobs: Readonly<{ batchSize: number; maxBatchesPerRun: number; dryRun: boolean }>;
  deadlineMs: number;
  clock: () => Date;
  ledger: RetentionJobLedger;
}>;

/**
 * One revision family unit (C2(b)): L02's frozen leaf-local normalizer resolves
 * the family's own strict env keys while L01's typed global knobs win for the
 * shared shape (`dryRun` stays the single L01-parsed source — never re-read
 * here), and `now` rides INSIDE the policy input (A4). Disabled families are
 * skipped without SQL — not even the family-unit transaction is opened; dry-run
 * is L02's single bounded candidate read.
 */
const runRevisionFamilyUnit = async (input: RevisionFamilyPlanInput): Promise<void> => {
  const { session, signal, family, now, env, globalKnobs, deadlineMs, clock, ledger } = input;
  throwIfAbortedOrPastDeadline(signal, deadlineMs, clock);
  const policy: RevisionRetentionPolicy = normalizeRevisionRetentionPolicy(
    family,
    Object.freeze({
      now,
      dryRun: globalKnobs.dryRun,
      batchSize: globalKnobs.batchSize,
      maxBatchesPerRun: globalKnobs.maxBatchesPerRun,
    }),
    env
  );
  if (!policy.enabled) {
    ledger.recordDisabled(family, policy.dryRun);
    return;
  }
  await session.assertAlive(signal);
  const result = await session.transaction({
    signal,
    statementTimeoutMs: RETENTION_STATEMENT_TIMEOUT_MS, // C7: voided; see setTransactionStatementTimeout.
    run: async (tx: DedicatedDatabaseTransaction) => {
      await setTransactionStatementTimeout(tx);
      // The normalized policy re-feeds as input (idempotent round-trip,
      // revisionRetentionService.ts:332-334).
      return runRevisionFamilyRetention(family, drizzleOverTransaction(tx), { policy });
    },
  });
  ledger.addFamilyUnit(family, policy.dryRun, result);
};

// ---------------------------------------------------------------------------
// The whole-job entry point
// ---------------------------------------------------------------------------

/**
 * Run the retention plan on one dedicated session, serialized across replicas
 * by the session advisory lock. Returns the sanitized job summary; the summary
 * is only ever published on the `completed` path (C6: publish BEFORE unlock) —
 * every other path returns the unpublished ledger shape carrying the closed
 * status code and the counts of whatever batches had already committed.
 *
 * Never called from the request path: the scheduler leaf (TASK-551-06-L03's
 * `core/server/jobs/retentionScheduler.ts`) is the sole production caller and
 * owns gating, jitter, cadence, and redacted logging.
 */
export async function runRetentionPlan(
  now: Date,
  signal: AbortSignal,
  deps: RetentionJobDeps = {}
): Promise<RetentionJobSummary> {
  const clock = deps.clock ?? (() => new Date());
  const env = deps.env ?? process.env;
  const policies = loadRetentionPolicies(env);
  const globalKnobs = resolveRetentionRuntimeOptions(env);
  const startedAt = clock();
  const deadlineMs = startedAt.getTime() + resolveRunBudgetMs(deps.maxRunMs);

  return withDedicatedDatabaseSession(async (session: DedicatedDatabaseSession) => {
    const ledger = createJobLedger(startedAt, globalKnobs.dryRun);
    // Family id of the unit in flight, for the C8 failure classification.
    let activeFamily: RetentionJobFamilyId | null = null;
    try {
      if (!(await tryAcquireRetentionLock(session, signal))) {
        // Another replica owns the plan; not an error (C6).
        return ledger.publish("skipped_locked", clock());
      }
      const ownershipVerified = await verifyRetentionLockOwnership(session, signal);
      if (!ownershipVerified) {
        // C8(c): acquire-ambiguous / PID drift / verifier re-entry.
        await drainSessionQuietly(session);
        return ledger.publish(signal.aborted ? "aborted" : "retention_job_locked", clock());
      }
      for (const entry of RETENTION_JOB_FAMILY_REGISTRY) {
        if (entry.kind === "revision-unit") {
          activeFamily = entry.family;
          await runRevisionFamilyUnit({
            session,
            signal,
            family: entry.family,
            now,
            env,
            globalKnobs,
            deadlineMs,
            clock,
            ledger,
          });
          continue;
        }
        const policy = policies[entry.family];
        if (!policy.enabled) {
          // C3/A3 gate: zero SQL for a disabled family — analytics included,
          // its pruner has no internal enabled gate.
          ledger.recordDisabled(entry.family, policy.dryRun);
          continue;
        }
        activeFamily = entry.family;
        await runL01FamilyBatches({
          session,
          signal,
          entry,
          policy,
          now,
          deadlineMs,
          clock,
          ledger,
        });
      }
      activeFamily = null;
      throwIfAbortedOrPastDeadline(signal, deadlineMs, clock);
      await session.assertAlive(signal);
      // C6: publish BEFORE unlock — the summary exists once the last committed
      // family unit is durable, then the lock is released on the same session.
      const published = ledger.publish("completed", clock());
      await releaseRetentionLockQuietly(session, signal);
      return published;
    } catch (error) {
      // C8 precedence: abort FIRST, regardless of any co-occurring
      // dedicated-session loss.
      if (signal.aborted) {
        await drainSessionQuietly(session);
        return ledger.publish("aborted", clock());
      }
      if (isDedicatedSessionLoss(error)) {
        // C8(a): real ownership loss with no abort. The backend already rolled
        // back the active batch and released the lock; confirm containment.
        await drainSessionQuietly(session);
        return ledger.publish("retention_lock_lost", clock());
      }
      if (error instanceof RetentionJobBoundaryError) {
        // Abort precedence ran above, so this is per-run deadline exhaustion.
        return ledger.publish("retention_job_timeout", clock());
      }
      if (activeFamily !== null) {
        // Contract lines 154-158: the failing family's code, the remaining
        // families skipped for this run, earlier committed batches kept.
        return ledger.publish("retention_family_failed", clock(), activeFamily);
      }
      throw error;
    } finally {
      // C6: best-effort final release on the same session; expected to
      // no-op/unlock-false after a real lock loss and to fail quietly after an
      // abort.
      await releaseRetentionLockQuietly(session, signal);
    }
  });
}
