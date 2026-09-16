# TASK-551-06-L03: Maintenance Scheduling, Partition Readiness, and Recovery
# FileName: TASK-551-06-L03-Maintenance-Scheduling-Partition-Readiness-And-Recovery.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-06
**Priority:** Critical
**Category:** Database / Runtime / Reliability / Operations
**Estimated Effort:** Large
**Dependencies:** TASK-551-06-L02; parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Run all retention families off the request path through one environment-gated
maintenance scheduler. Serialize work across replicas with a PostgreSQL
session-level advisory lock held on a dedicated connection, enforce per-run
time/work budgets, expose sanitized
recovery telemetry, and report when table size/churn justifies a future
partition migration. This leaf does not create partitions.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Production/tooling:** `core/services/maintenance/retentionJobService.ts`,
`core/services/maintenance/partitionReadinessService.ts`,
`core/server/jobs/retentionScheduler.ts`, and
`scripts/task-551-partition-readiness.ts`.

**Tests:** `tests/vitest/maintenance/partitionReadinessService.test.ts`,
`tests/integration/runtime/retentionScheduler.test.ts`,
`tests/integration/server/task551RetentionJobService.test.ts`,
`tests/perf/database-retention-jobs.test.ts`, and
`tests/perf/database-partition-readiness.test.ts`.

No other path may be edited. The parent gate makes TASK-511 terminal by default
or supplies the only accepted fresh exact serialized handoff; its
`core/server/jobs/backupScheduler.ts` and `core/services/backups/**` remain
forbidden. L01/L02 services are consumers/read-only. `httpServer.ts`, DB client,
schema/migrations, cache, TASK-493/TASK-517/TASK-518, task/changelog/workflow
files are forbidden. `core/server/dockerStart.ts`, `core/server/prod.ts`, and
all HTTP/development composition files are also forbidden. TASK-551-08-L03 is
their sole later composition writer and consumes this leaf's exported factory.

## Implementation Pseudocode

```ts
async function runRetentionPlan(
  now: Date,
  signal: AbortSignal,
  deps: JobDeps,
): Promise<JobSummary> {
  return withDedicatedDatabaseSession(async session => {
    const locked = await session.execute(TRY_RETENTION_LOCK, signal);
    if (!locked) return { status: "skipped_locked", families: [] };
    try {
      const deadline = deps.clock.now() + deps.config.maxRunMs;
      const summary = createUnpublishedJobSummary();
      for (const family of RETENTION_FAMILY_REGISTRY) {
        for (const batch of boundedFamilyBatches(family, deadline, signal)) {
          throwIfAbortedOrPastDeadline(signal, deadline);
          await session.assertAlive(signal);
          const result = await session.transaction({
            signal,
            statementTimeoutMs: RETENTION_STATEMENT_TIMEOUT_MS,
            run: (tx) => runOneRetentionBatch(family, batch, tx, signal),
          });
          summary.addCommittedBatch(result); // local only; not yet published
        }
      }
      await session.assertAlive(signal);
      await session.execute(RELEASE_RETENTION_LOCK, signal);
      return summary.publish();
    } catch (error) {
      if (signal.aborted || isDedicatedSessionLoss(error)) {
        await session.cancelActiveAndRollback("retention_lock_lost");
        throw new Error("retention_lock_lost"); // summary stays unpublished
      }
      throw error;
    } finally {
      await bestEffortReleaseRetentionLockOnSameSession(session);
    }
  });
}

async function startRetentionScheduler(deps: SchedulerDeps): Promise<SchedulerController> {
  // Parse/validate first. When disabled, return without calling the affinity
  // seam or reserving a connection. When enabled, await the L02-owned
  // assertMaintenanceSessionAffinity() before installing a timer or allowing
  // lifecycle startup to complete. A transaction-pooled main channel without a
  // separately configured live-proven direct/session maintenance channel fails
  // database_maintenance_session_unavailable before HTTP traffic. Then enforce
  // no overlapping local ticks, unref timer, catch/redact, initial jitter,
  // fixed bounded interval, and graceful stop-and-drain/test reset.
}

export function createRetentionSchedulerLifecycleParticipant(
  deps: SchedulerDeps
): RuntimeLifecycleParticipant {
  // Return fixed { id: "retention-scheduler", phase: "worker" }.
  // Each run receives the participant-owned AbortController.signal. close first
  // stops ticks and aborts, then invokes the active dedicated-session cancel
  // hook and confirms rollback/connection termination before awaiting the run.
  // The complete close settles in <= 4,500 ms. This registers nothing itself.
}

async function inspectPartitionReadiness(db: Db): Promise<PartitionReadinessReport> {
  // Allowlisted catalogs/tables only: size/live/dead rows, oldest/newest,
  // delete churn and projected growth; classify observe|plan, never execute DDL.
}
```

`core/db/client.ts` supplies exactly `DedicatedDatabaseSession`,
`DedicatedDatabaseTransaction`, `assertMaintenanceSessionAffinity()`, and
`withDedicatedDatabaseSession<T>(run)` from TASK-551-02-L02; this leaf must not
invent a second reserve/release helper or call the global `db` from the
retention job. When scheduling is enabled, participant start awaits the
affinity assertion before creating its timer or returning. Thus
`DB_PGBOUNCER_MODE=transaction` with `DB_MAINTENANCE_MODE=primary`, a declared
transaction-pooled maintenance URL, PID drift, or a verifier that can re-enter
the owner lock fails startup as `database_maintenance_session_unavailable`.
Direct PostgreSQL and PgBouncer session-pooling maintenance URLs must pass.
`off + primary + DB_POOL_MAX=1` is valid while this scheduler is disabled, but
enabled scheduler startup fails before timer/listen because the two-session
probe cannot run. For explicit `direct|session`, L02 has already started the
same lifecycle-scoped probe; this assertion awaits/reuses its settled success
rather than acquiring two more sessions or probing twice.
Advisory-lock acquire/verify/
release and **every** family batch transaction execute through the one session
handle and therefore the same PostgreSQL backend PID. A family pruner receives
only the session-bound transaction handle; passing the global client is a type
and source-guard failure. TASK-551-08-L03 alone calls
`registerRuntimeLifecycleParticipant(createRetentionSchedulerLifecycleParticipant(deps))`
from the shared HTTP composition consumed by both already-owned TASK-551-02
entrypoints, alongside the existing
`startBackupScheduler`/`stopBackupScheduler` adapter and cursor/cache startup.
The fixed participant ID is `retention-scheduler`, phase is `worker`, startup is
awaited after database/cache. Close stops new ticks, aborts the run signal,
cancels active SQL, and confirms rollback or termination within 4,500 ms before
cache/Redis/DB close. The configured run may last up to one hour only while its
session is healthy and the signal is live; shutdown never leaves detached work.
This leaf edits no composition or backup source,
registers nothing by itself, and installs no signal handler. Disabled/test
environments do not schedule. Exact variables are `RETENTION_SCHEDULER_ENABLED` (default false),
`RETENTION_SCHEDULER_INTERVAL_MS` (86,400,000; `60,000..604,800,000`),
`RETENTION_SCHEDULER_INITIAL_JITTER_MS` (30,000; `0..300,000` and no greater
than interval), and `RETENTION_SCHEDULER_MAX_RUN_MS` (300,000;
`1,000..3,600,000` and less than interval). Explicit malformed/out-of-range
values fail startup; TASK-551-10 owns `.env.example`. A failure records the last
successful high-water mark/counts and retries on the next tick; it never marks
partial progress as a full success. Errors are `retention_job_locked`,
`retention_lock_lost`, `retention_job_timeout`, `retention_family_failed`, and
`partition_readiness_unavailable`.

L01 is the sole parser and type owner for `RETENTION_DRY_RUN`: absent is false,
only exact lowercase `true|false` is valid, and global true dominates all
families because no scheduler, CLI, or per-family override exists. L03 consumes
the required typed `RetentionPolicy.dryRun` and never reads the environment key
again. A dry-run still takes the replica advisory lock, respects family/run
deadlines and `LIMIT <= 2,000`, and reports bounded matched counts, but issues
zero `DELETE`/`UPDATE`, destructive row locks, cache/outbox publications, or
persisted high-water updates. It records only an in-memory, sanitized
`dry_run_completed` job summary; a later apply run re-evaluates candidates.
This advisory lock belongs only to scheduled invocation: a direct L01/L02
service dry-run neither reserves this scheduler session nor acquires this lock.

## Partition Decision Contract

The allowlisted report covers access/audit logs, assistant executions/undo,
analytics sessions/pageviews, form submissions/action runs, webhook deliveries,
sessions, and revision tables. `plan` requires an evidence-backed threshold such
as sustained multi-million rows or multi-GB size plus measurable prune/vacuum
pressure and a viable partition key/FK/unique-index design. Output recommends a
separate task with online migration, dual-write/backfill validation, rollback,
backup/restore, and retention integration; it executes zero CREATE/ATTACH/
DETACH/DROP/TRUNCATE statements.

## Testing Requirements

- Fake-clock scheduler covers disabled/enabled, startup jitter, interval,
  non-overlapping local ticks, unref/stop, synchronous/async failure, and
  sanitized logs. Disabled mode at `off + primary + DB_POOL_MAX=1` performs no
  affinity probe/reservation and starts ordinary runtime successfully. Enabled
  mode with that same capacity awaits the probe and fails before timer/listen.
  Enabled mode otherwise awaits
  it before any timer/listener traffic; direct and session-pooled channels pass,
  while transaction-primary, transaction-pooled maintenance, PID drift, lock
  re-entry, missing URL, and outage fail startup with the exact stable code and
  zero timer/job activity. A dedicated-mode fixture proves DB startup plus
  scheduler startup execute one physical affinity probe total.
- Lifecycle integration imports only `registerRuntimeLifecycleParticipant`,
  the runtime lifecycle type/API, and this leaf's factory. It proves the factory
  returns fixed ID/phase, registers nothing itself, has awaited/idempotent start
  and close, gives each run one `AbortSignal`, and on close stops ticks → aborts
  → cancels active SQL → confirms rollback/backend termination → settles within
  4,500 ms. Only then may cache/database close. A hung query and shutdown during
  commit publish no job summary and leave no active query, transaction, timer,
  lease, or detached promise; any batches committed before shutdown retain their
  independently committed high-water semantics.
- Two independent scheduler instances against one DB tick simultaneously;
  both reserve exactly one dedicated session and attempt the advisory lock;
  exactly one obtains the lock and runs while the other reports
  `skipped_locked`, and both release their reserved session exactly once.
  Instrument `pg_backend_pid()` and prove lock acquire, liveness probes, every
  batch `BEGIN`/query/commit, and unlock use the winner's one PID; a source guard
  rejects global `db` access. Kill that backend during an active transactional
  batch: PostgreSQL first rolls back the batch and releases the session lock,
  the winner returns only `retention_lock_lost` with no published summary, and
  the second replica starts only after termination is observed. It never sees
  or overlaps a partly running first-replica batch. The next tick succeeds and
  pool active count returns to baseline.
- Inject family failure and deadline exhaustion; committed batch semantics,
  high-water marks, remaining families, and retry are deterministic.
- Prove each completed batch commits independently, there is no outer
  all-family transaction, and a later-family failure does not roll back an
  earlier committed high-water mark. Those short transactions all use the
  lock-owning session; maximum healthy run duration does not authorize work
  after abort, lock loss, or the 4,500 ms shutdown drain.
- Pin strict `RETENTION_DRY_RUN` propagation from the L01 policy object. In
  scheduled dry-run, the winning replica reserves one dedicated session and
  acquires exactly one scheduler advisory lock before every registered family
  executes only its bounded eligibility read. Zero mutations, destructive row
  locks, publications, or high-water writes occur; matched counts are sanitized,
  deadlines still stop work, and a subsequent apply run re-reads and deletes the
  same still-eligible fixture rows. A direct-service dry-run fixture proves it
  uses no scheduler session/advisory lock.
- Large fixtures prove total statements/deletes/time stay within configured
  family/run budgets; no request path invokes the job. The scheduled plan runs
  L01/L02 against TASK-551-01-L02's literal missing-family counts, cutoff
  boundaries, anchors, `499/500/501/2,000/2,001` batch edges, and ten-batch
  convergence. Apply and dry-run select the same bounded candidates; apply keeps
  child-first order, while dry-run mutates zero rows/high-water/cache/outbox state.
- Partition service/tool tests reject arbitrary table/SQL/output paths, sanitize
  catalog evidence, classify below/above thresholds, and assert a SQL guard with
  zero partition/destructive statements.

## Security Contract

- Internal runtime/tooling only; no HTTP endpoint, auth, RBAC, CSRF, rate-limit,
  nonce/HMAC, or CAPTCHA changes.
- Environment/server configuration only; never browser settings. Table registry,
  advisory lock, SQL, and output location are compile-time allowlisted.
- Metrics/logs/report contain family/table identifiers, aggregate counts/sizes,
  timings, status, and redacted errors only—never row samples, PII, content,
  SQL binds, URLs, credentials, tokens, hashes, or secrets.
- Invalid scheduler configuration fails before traffic. A later scheduled job
  failure is contained, cannot disable public anti-abuse, auth/session checks,
  backups, or request handling, and is retried on the next eligible tick.

## Validation Commands

- `bunx vitest run tests/vitest/maintenance/partitionReadinessService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/retentionScheduler.test.ts tests/integration/server/task551RetentionJobService.test.ts tests/perf/database-retention-jobs.test.ts tests/perf/database-partition-readiness.test.ts`
- `set -a && source .env && set +a && bun scripts/task-551-partition-readiness.ts --check`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`
- `bun run scan:security`

## Documentation Updates Required

No shared docs. Give TASK-551-10-L02 the complete env/default table, exact
participant/dedicated-session handoff, scheduler runbook, lock/outage/retry/
recovery steps, metrics, and partition decision report.

## Quantified Acceptance

- Two replicas produce exactly one active job per tick; local overlapping ticks
  are zero, both reserve a dedicated session and attempt the lock, exactly one
  obtains it and runs, both release the session exactly once, pool use returns
  to baseline, and lock release/recovery succeeds on the next eligible tick.
- A run deletes at most the sum of explicit family budgets, respects the maximum
  runtime within one in-flight batch, and issues no unbounded DELETE.
- Advisory lock and 100% of batch transactions use one backend PID. Lock loss
  rolls back the active batch before another replica can acquire and maps only
  to `retention_lock_lost`; no partial result is published.
- Every enabled scheduler has passed L02's live session-affinity gate before
  traffic. No configuration using transaction pooling for the lock-owning
  channel can start maintenance, even if ordinary request traffic uses
  PgBouncer transaction pooling safely.
- A disabled scheduler does not narrow ordinary DB configuration: primary
  `pool=1` starts with zero affinity work. Enabling it on that configuration
  fails before listen, while an explicitly configured dedicated channel reuses
  its single DB-start probe.
- Shutdown cancels a hung query/transaction and confirms rollback or backend
  termination within 4,500 ms. The one-hour configured ceiling applies only to
  a healthy running process and produces no detached maintenance work.
- A scheduled dry-run acquires exactly one replica advisory lock, executes
  bounded indexed reads for every eligible family, and performs exactly zero
  `DELETE`/`UPDATE`, destructive row lock, cache/outbox mutation, or persisted
  progress; direct service dry-run has no scheduler lock. Strict invalid boolean
  syntax fails before lifecycle startup.
- Scheduler failure leaks zero sensitive values and never prevents server start,
  backup scheduling, auth, or public anti-abuse.
- Readiness inspection executes only allowlisted catalog/aggregate reads and
  exactly zero partition/destructive statements; every `plan` result includes a
  separate-task/online-migration/rollback recommendation.

## Workflow Dispatch Envelope

The finite `forbiddenPaths` list captures named current ownership conflicts.
The closed `allowlist` rejects every omitted path, including the broad foreign
categories described in the file-ownership contract.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-06-L03",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-06"
  },
  "allowlist": [
    "core/services/maintenance/retentionJobService.ts",
    "core/services/maintenance/partitionReadinessService.ts",
    "core/server/jobs/retentionScheduler.ts",
    "scripts/task-551-partition-readiness.ts",
    "tests/vitest/maintenance/partitionReadinessService.test.ts",
    "tests/integration/runtime/retentionScheduler.test.ts",
    "tests/integration/server/task551RetentionJobService.test.ts",
    "tests/perf/database-retention-jobs.test.ts",
    "tests/perf/database-partition-readiness.test.ts"
  ],
  "forbiddenPaths": [
    "core/db/client.ts",
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json",
    "core/server/jobs/backupScheduler.ts",
    "core/server/httpServer.ts",
    "core/server/dockerStart.ts",
    "core/server/prod.ts",
    "core/server/dev.ts",
    "core/services/backups/backupScheduler.ts",
    "_docs/_workflows/task-551-implement.mjs"
  ],
  "dependencies": ["TASK-551-06-L02:single"],
  "commands": [
    {
      "id": "partition-readiness-vitest",
      "lane": "vitest",
      "environmentProfile": "none",
      "argv": ["bunx", "vitest", "run", "tests/vitest/maintenance/partitionReadinessService.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/maintenance/partitionReadinessService.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "scheduler-and-database-tests",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/runtime/retentionScheduler.test.ts", "tests/integration/server/task551RetentionJobService.test.ts", "tests/perf/database-retention-jobs.test.ts", "tests/perf/database-partition-readiness.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/runtime/retentionScheduler.test.ts", "tests/integration/server/task551RetentionJobService.test.ts", "tests/perf/database-retention-jobs.test.ts", "tests/perf/database-partition-readiness.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "partition-readiness-check",
      "lane": "cli",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-partition-readiness.ts", "--check"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "coderso-gate",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "gates:coderso"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "performance-gate",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "gates:coderso:perf"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "security-scan",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "scan:security"],
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-06-L02:single"],
      "commandIds": ["partition-readiness-vitest", "scheduler-and-database-tests", "partition-readiness-check", "core-lint-types", "core-lint", "coderso-gate", "performance-gate", "security-scan"]
    }
  ]
}
```

### Dated Contract Corrections — 2026-09-16 (FAZA 0 dispositions; append-only)

#### C1 — Analytics family stays one-PID; session-bound TrafficBatchPruners are mandatory

`retentionJobService.ts` MUST construct and inject `TrafficBatchPruners` closures bound to the ONE
session-held connection whenever it invokes the analytics family pruner; calling `pruneExpiredTraffic`
with the default pruners (`realBatches`, core/services/analytics/trafficRetentionService.ts:81-99) is
FORBIDDEN — the defaults execute on the global pool and silently break the one-backend-PID acceptance.
A leaf-authored source-guard test MUST assert `core/services/maintenance/retentionJobService.ts` never
imports the global `db` client (no `db` import from `core/db/client`), and the two-replica PID-proof
test MUST cover the analytics family.

#### C2 — One L03-local documented adapter bridges the type seam

Exactly ONE L03-local, documented adapter in `retentionJobService.ts` bridges the session-held
postgres connection to the drizzle-shaped pruner executors (the `Pick<typeof db, ...>` surfaces of
the L01/L02 pruners — L02's `RevisionRetentionExecutor`,
core/services/content/revisionRetentionService.ts:428). Precedent:
`core/server/startupMigrations.ts:123` (drizzle over a raw client). The adapter lives ONLY in the
allowlisted file; casts are documented inline. It MUST preserve: (a) per-batch transaction boundaries
for the 14 L01 families (each batch = one `session.transaction`, committed independently); (b) for
EACH of the 5 revision families, ONE `session.transaction` per family unit, whose executor is built
as `drizzle(tx as unknown as Sql)` under a documented inline cast and handed to L02's frozen
`runRevisionFamilyRetention` (core/services/content/revisionRetentionService.ts:607) — all of it on
the SAME backend PID.

The (b) shape SUPERSEDES the prior "autocommit-per-batch semantics for the 5 revision families ...
matching L02's own default-executor (global `db`, autocommit) semantics" wording, which is
UNOBTAINABLE: `DedicatedDatabaseSession` (core/db/client.ts:329-344) never releases a raw handle;
the only drizzle-bridgeable handle is the `TransactionSql` inside `session.transaction`
(client.ts:318, :419-437), `drizzle()` rejects a `TransactionSql` without a cast, and capturing the
underlying `ReservedSql` instead would violate client.ts:321-327's "Consumers receive no retained
handle" invariant. The base contract's per-batch-commit acceptance (contract lines 219-223) is
thereby SCOPED to the 14 L01 families; the 5 revision families commit at family-unit boundaries
instead — consistent with C4's family-unit interleave rule, still on the lock-owning session with no
outer all-family transaction, so a later-family failure never rolls back an earlier committed family
unit.

Round-3 pin of the exact revision call shape:

```
runRevisionFamilyRetention(family, drizzleOverTx, {
  policy: { enabled, dryRun, batchSize, maxBatchesPerRun, maxAgeDays, keepNewestPerParent, now },
})
```

`RevisionRetentionRunOptions` (revisionRetentionService.ts:585) has NO top-level `now`; `now` lives
inside the policy input (`RevisionRetentionPolicyInput`, revisionRetentionService.ts:203-216). The
normalizer still parses the environment even when a typed policy is passed (typed keys win, absent
keys fall back to the strict family env keys; revisionRetentionService.ts:608, :308-319) — frozen
L02 semantics, not to be altered in L03.

Adapter note (`solution_kit_runs`): `SolutionKitRetentionExecutor` includes `transaction`
(core/services/kits/solutionKitRetentionService.ts:150) and `pruneSolutionKitRunsBatch` opens
`exec.transaction` there (:865), but drizzle's `PostgresJsSession.transaction` calls
`this.client.begin`, which is ABSENT on a `TransactionSql` (runtime TypeError). The adapter MUST shim
it: `transaction: async (cb) => cb(drizzleOverTx)` — the pruner's atomic unit reuses the outer
session transaction; never call drizzle's own `.transaction` on a `TransactionSql`-backed instance.
That shim is illustrative, NOT compile-ready verbatim: its callback argument needs a documented
inline cast (drizzle's `PostgresJsDatabase` and `PgTransaction<...>` are not mutually assignable in
either direction), same discipline as every other cast in the adapter.

#### C3 — Local RETENTION_JOB_FAMILY_REGISTRY and local isDedicatedSessionLoss

`retentionJobService.ts` owns a LOCAL `RETENTION_JOB_FAMILY_REGISTRY` composing the 14 L01 families
driven through their exported batch-level pruners (`pruneXxxBatch`) plus the 5 revision families
(page, detail_page, entry, post, widget_template) driven through L02's frozen
`runRevisionFamilyRetention`. No shared `RETENTION_FAMILY_REGISTRY` export is created.
`isDedicatedSessionLoss(error)` is implemented locally: error-message equality against
`DATABASE_CLIENT_ERROR_CODES.dedicatedSessionLost` imported read-only from `core/db/client.ts:36-40`.
`RETENTION_STATEMENT_TIMEOUT_MS` and `RETENTION_CANCEL_DRAIN_DEADLINE_MS` are imported read-only from
`core/db/databaseLifecycle.ts:30-31`, never redefined.

#### C4 — Batch loop drives batch-level entries only; checks at batch/family-unit boundaries

The batch loop drives ONLY batch-level/whole-family exported functions, and ONLY the two blessed
whole-family entries named below. What never runs on the request path of the job: any entry point
invoked WITHOUT an injected session-bound executor (i.e. on global-pool defaults — C1's
`realBatches` included), and any all-registry drain. The two blessed whole-family entries are
`runRevisionFamilyRetention` (L02's frozen surface — ONE `session.transaction` per family unit, per
C2(b)) and `pruneExpiredTraffic` (session-pruner-bound, invoked per the analytics shape below).

FULL 14-family mapping (family id -> exported function -> module):

| family | exported function | module |
| --- | --- | --- |
| `access_logs` | `pruneAccessLogsBatch` | core/services/access/accessLogService.ts:878 |
| `audit_logs` | `pruneAuditLogsBatch` | core/services/audit/auditService.ts:556 |
| `email_delivery_logs` | `pruneEmailDeliveryLogsBatch` | core/services/email/emailDeliveryRetentionService.ts:236 |
| `search_history` | `pruneSearchHistoryBatch(policy, tx, now)` | core/services/search/searchHistoryRetentionService.ts:70 |
| `integration_requests` | `pruneIntegrationRequestsBatch` | core/services/integrations/integrationRequestRetentionService.ts:236 |
| `password_resets` | `pruneExpiredAuthArtifactsBatch` | core/services/auth/expiredAuthArtifactRetentionService.ts:235 |
| `preview_tokens` | `prunePreviewTokensBatch` | core/services/pages/previewTokenRetentionService.ts:295 |
| `assistant_ingest_runs` | `pruneAssistantIngestRunsBatch` | core/services/assistant/assistantRetentionService.ts:343 |
| `assistant_actions` | `pruneAssistantActionsBatch` | core/services/assistant/assistantRetentionService.ts:583 |
| `analytics` | `pruneExpiredTraffic` | core/services/analytics/trafficRetentionService.ts:97 |
| `form_submissions` | `pruneFormSubmissionsBatch` | core/services/forms/submissionRetentionService.ts:348 |
| `webhook_deliveries` | `pruneWebhookDeliveriesBatch` | core/services/webhooks/webhookRetentionService.ts:246 |
| `sessions` | `pruneSessionsBatch` | core/services/auth/sessionRetentionService.ts:284 |
| `solution_kit_runs` | `pruneSolutionKitRunsBatch` | core/services/kits/solutionKitRetentionService.ts:857 |

The `password_resets` -> `pruneExpiredAuthArtifactsBatch` pairing is pinned deliberately
(non-obvious: the expired-auth-artifact exporter owns that family); `solution_kit_runs` needs the C2
`transaction` shim.

Round-3 typing disposition for the `search_history` row: its `DbTransaction`
(searchHistoryRetentionService.ts:30, a drizzle `PgTransaction` derived from the global `db`) does
NOT match `DedicatedDatabaseTransaction` (core/db/client.ts:318, raw `TransactionSql`), so any prior
"no cast" expectation for this row is withdrawn. The family takes the SAME drizzle-over-tx bridge as
the other L01 families plus a documented inline cast; pin the local shape as a locally re-declared
`PgTransaction` type built from the schema (or an equivalent documented cast) at the adapter's
bridge seam — never by widening the service's imported type.

Analytics per-batch invocation shape: `pruneExpiredTraffic` drains internally (`drainBatches`,
core/services/analytics/trafficRetentionService.ts:125-138), so the job calls it ONCE PER BATCH with
the FULL shape `pruneExpiredTraffic(now, boundClosures, { batchSize, maxBatchesPerRun: 1 },
{ dryRun: policy.dryRun })` inside a FRESH `session.transaction`, re-binding the
`TrafficBatchPruners` closures to that batch's tx; the closures forward to the real bounded
`trafficRepository` primitives (they accept `exec: Exec`,
core/services/analytics/trafficRepository.ts:119-121/:140-142/:182-184/:196-198), passing
`drizzle(tx)` as exec — no SQL re-authoring in the allowlisted file. The FOURTH argument is
mandatory: without the options object the service defaults to APPLY mode (the
`options.dryRun === true` gate, trafficRetentionService.ts:103), so a scheduled dry-run would
silently DELETE analytics rows. The L03 registry gates EVERY family (analytics included) on the L01
typed policy's `enabled` BEFORE issuing any batch — the analytics service has NO internal enabled
gate. Statement accounting per analytics batch invocation: up to TWO bounded statements per pruner
in apply mode (the LIMIT-bounded candidate SELECT plus the bounded inArray DELETE;
`deleteOldestSessionsBatch`'s DELETE additionally cascades pageviews server-side via the
`analytics_pageviews.session_id` FK, trafficRepository.ts:152-153) and exactly ONE SELECT in dry-run
— PID-proof and statement-budget tests count accordingly. Deadline/abort checks interleave
at batch boundaries (14 L01 families) and at family-unit boundaries (5 revision families, internally
bounded by L02's `maxBatchesPerRun`, core/services/content/revisionRetentionService.ts:212).

Shutdown containment (supersedes the prior "shutdown cancels active SQL through the session handle"
clause): the session's `query.cancel()` tracking reaches ONLY `session.execute` statements
(client.ts:350-380 tracks `activeQuery` there alone); in-transaction batch SQL issued via
`drizzle(tx)` is invisible to it, so a hung batch query would stall the rollback. The session-level
bound is `config.statementTimeoutMs` from `DB_STATEMENT_TIMEOUT_MS` (default 15,000 ms; bounded
100..120,000; core/db/databaseConfig.ts:293-299) applied to EVERY session via
`boundedStartupConnectionParams` (core/db/client.ts:71-89) — NOT 4,000 ms. The 4,000 ms containment
therefore moves INTO the transaction: EVERY `session.transaction` run callback FIRST issues the
tx-scoped bound as its first statement — `select set_config('statement_timeout', $1, true)` with the
imported `RETENTION_STATEMENT_TIMEOUT_MS` (4,000 ms; core/db/databaseLifecycle.ts:31) rendered as
its string value — before any pruner/adapter statement (the third argument `true` makes it
transaction-local; it reverts at commit/rollback; `SET LOCAL` syntax does not accept bind
parameters, hence `set_config`). Result: hung in-transaction SQL self-terminates at 4,000 ms < the
4,500 ms drain (`RETENTION_CANCEL_DRAIN_DEADLINE_MS`, core/db/databaseLifecycle.ts:30), so
participant close confirms rollback or connection termination within the drain. Statements issued
OUTSIDE transactions (advisory-lock ops, liveness probes via `session.execute`) keep the session-level
bound and are non-hanging by construction (`pg_try_advisory_lock` never blocks; probes are trivial
`SELECT`s). The hung-query test fixture MUST build on this `set_config` mechanism (e.g. a
`pg_sleep`-style statement), NOT on `query.cancel()` and NOT on the session-level 15 s default.

#### C5 — Scheduler env parser is self-contained; never run the L01 env sweep

The scheduler's strict env parser is self-contained in `core/server/jobs/retentionScheduler.ts`; it
MUST NOT call L01's `assertNoUnsupportedRetentionEnvKeys` over `process.env`
(core/services/maintenance/retentionPolicy.ts:732) — the sweep would reject the scheduler's own
`RETENTION_SCHEDULER_*` keys, absent from `SUPPORTED_RETENTION_ENV_KEYS` (retentionPolicy.ts:713).
Reconciliation note for TASK-551-10-L02: if the sweep is ever promoted to startup, the four scheduler
keys MUST join `SUPPORTED_RETENTION_ENV_KEYS`.

#### C6 — Hand-rolled lock is the intentional sole-owner exception; publish precedes unlock

EXPLICIT DISPOSITION: the retention lock is hand-rolled per the pseudocode (`pg_try_advisory_lock` /
`pg_advisory_unlock` via `session.execute` on the ONE dedicated session), because
`withDedicatedDatabaseAdvisoryLock` reserves a SECOND dedicated session (core/db/client.ts:538-546),
which would split lock ownership from batch PIDs and violate the one-PID acceptance. This correction
AMENDS the 02-L02 clause (TASK-551-02-L02, line 422 — the sole-public-owner clause governing "a
consumer that must hold a PostgreSQL session advisory lock across multiple transactions and non-DB
work", which the retention job literally is) FOR THIS CONSUMER ONLY: the retention job's lock MUST
share the batch session's PID, hand-rolled like the landed precedents at
core/server/jobs/backupScheduler.ts:92 and core/server/jobs/submissionExportScheduler.ts:92. The
amendment licenses nothing else — every other advisory-lock consumer keeps
`withDedicatedDatabaseAdvisoryLock`. The pseudocode above is superseded by this correction in the
following detail: the job summary is
published BEFORE unlock — `run()` publishes, then the lock is released on the same session;
best-effort final release in `finally` is expected to no-op/unlock-false after a real lock loss.
`pg_try_advisory_lock` returning false maps to job status `skipped_locked` (not an error).

Round-3 lock-key pinning: the retention lock's namespace/key pair is a compile-time allowlisted
constant chosen by this leaf; it MUST avoid collision with every landed session advisory-lock key
(inventory: startup migrations 20260604/400, startup assistant docs 20260604/403, backup scheduler
20260628/484, submission-export scheduler 20260818/571, dedicated-session affinity probe 551551551).
The scheduler test asserts uniqueness of the chosen pair against that inventory, and the leaf receipt
records the chosen pair.

#### C7 — Tx-scoped set_config bound governs in-transaction SQL; per-batch statementTimeoutMs stays dropped

The landed `DedicatedDatabaseSession.transaction` deliberately voids `input.statementTimeoutMs`
(core/db/client.ts:428 — "Session-level startup bound already applies"); the BINDING statement bound
for in-transaction batch SQL is the tx-scoped `set_config` bound that EVERY run callback issues as
its first statement (C4's shutdown containment), NOT the session-level default — the session-level
`statement_timeout` only backstops the non-transaction statements (advisory-lock ops, liveness
probes). The pseudocode above is superseded by this correction in the following detail: the
per-batch timeout KNOB is dropped. Callers still pass the REQUIRED `statementTimeoutMs` field
(client.ts:336 public type, :425 impl), populated from the imported `RETENTION_STATEMENT_TIMEOUT_MS`,
for type compliance only; the value is voided at client.ts:428 and carries no per-batch behavior.
Batch `run()` implementations MUST NOT rely on per-batch timeout control;
`RETENTION_STATEMENT_TIMEOUT_MS` (core/db/databaseLifecycle.ts:31) is consumed as the value bound
into the run callback's first `select set_config('statement_timeout', $1, true)` statement — never
as a per-batch knob via the voided input field.

#### C8 — Abort is a lifecycle status, not a member of the failure-code set

(a) `retention_lock_lost` is produced ONLY by real lock ownership loss — the post-acquire ownership
verification (or mid-run loss detection) shows the session no longer owns the lock; the summary stays
unpublished. (b) Graceful-shutdown abort (participant close aborts the run signal) is a lifecycle
outcome, NOT a failure: the summary stays unpublished and sanitized telemetry records job status
`aborted` — a status, not a member of the closed failure-code set (the closed five-code set classifies
failures only). (c) `retention_job_locked` is produced by post-acquire lock-ownership verification
failure (acquire ambiguous / PID drift / verifier re-entry), summary unpublished; a plain `false` from
`pg_try_advisory_lock` maps to `skipped_locked`. (d) `retention_job_timeout`, `retention_family_failed`,
and `partition_readiness_unavailable` keep their prose meanings.

Precedence rule: IF `signal.aborted`, classify the run as status `aborted` REGARDLESS of any
co-occurring dedicated-session-loss error — a graceful abort makes `session.execute` throw
`dedicated_database_session_lost` (core/db/client.ts:395-400/:402-417), so abort is checked FIRST;
only a session loss WITHOUT abort, or a failed `pg_locks` ownership re-check, maps to
`retention_lock_lost`. The pseudocode catch block above is superseded by (a)/(b).

#### C9 — LOW dispositions recorded for the implementer

1. Per-file target <= 950 lines (hard cap 1,000; 06-L02 discipline).
2. Prose Validation Commands `bunx vitest` / `source .env` forms are superseded by the envelope plus
   the spine's airtight law: vitest runs =
   `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run <files>`;
   bun runs = builtin test runner under the same envelope; never `.env` sourcing.
3. `gates:coderso` / `gates:coderso:perf` / `scan:security` remain owner-routed (02-L03 disposition).
4. `bunLaneManifest` red is expected to deepen (pinned 454 vs golden +4 new lane files); regen stays
   01-L01 final-only.
5. The leaf receipt MUST carry an `inventoryDebt` note quantifying new DML/call-site rows from
   `retentionJobService.ts` + `partitionReadinessService.ts` (scanner core-only: the CLI script adds
   zero rows).
6. The `forbiddenPaths` entry `core/services/backups/backupScheduler.ts` is known-phantom
   (`core/server/jobs/backupScheduler.ts` is the live file); retained as defense-in-depth.

#### C10 — CLI facade shape and exit taxonomy (post-implementation audit, 2026-09-16)

Post-audit (three read-only lenses) found the landed facade required a `classification` key on each
report row while the service emits `status` (partitionReadinessService.ts report row type), making
the contracted `--check` success exits unreachable, and mapped the service's typed failure onto the
wrapper code with a slug-truncated reason. Binding dispositions (implemented in-leaf, this
correction records them):

1. Row shape: `readClassifiedTables` accepts the service's emitted row shape (key `status`), projects
   validated rows onto the facade's internal `{table, classification}` shape, and pins every
   `row.table` to the exported `PARTITION_READINESS_TABLE_IDS` frozen set — registry/schema drift
   fails closed at the facade.
2. Exit taxonomy: code `partition_readiness_unavailable`, exit 3, covers BOTH the service's typed
   `PartitionReadinessError` AND the facade's own shape-guard refusal; `reason` relays the stable
   reason token WHOLE (e.g. `catalog_read_failed`, `partition_readiness_report_invalid`) — never
   truncated. Code `partition_readiness_unexpected`, exit 4, is reserved for genuinely untyped
   failures only. Envelope exits: 0 all-observe, 2 any-plan, 3 unavailable, 4 unexpected, 1 argv.
3. The contract's closed five-code maintenance failure vocabulary is UNCHANGED; the CLI envelope
   taxonomy sits outside it (envelope concern), so no closed-set extension is made.

#### C11 — Scheduler budget handoff and failure telemetry (post-implementation audit, 2026-09-16)

1. `RETENTION_SCHEDULER_MAX_RUN_MS` is functional, not validation-only: the scheduler's default
   binding is `createDefaultRunRetentionPlan(config.maxRunMs)` — an adapter from the object-shaped
   injected-runner contract `(input: { now, signal })` to the job's canonical positional
   `runRetentionPlan(now, signal, { maxRunMs })`. The configured per-run ceiling therefore reaches
   the job's `resolveRunBudgetMs`; the job's internal 300,000 default applies only to the
   unscheduled/direct path. The injected-runner contract itself is unchanged.
2. Sanitized scheduler telemetry includes `failedFamily` (through the same token sanitizer) on
   `retention_family_failed` summaries, per the Security Contract's allowance for family
   identifiers.
3. Provenance: the post-audit found the parsed budget was never forwarded (dead knob) and
   `failedFamily` was dropped from the projection; both repaired in-leaf with a pinning leg that
   starts the scheduler WITHOUT an injected runner and asserts the real job service completes
   through the default binding.
