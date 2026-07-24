# TASK-551-06-L03: Maintenance Scheduling, Partition Readiness, and Recovery
# FileName: TASK-551-06-L03-Maintenance-Scheduling-Partition-Readiness-And-Recovery.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-06
**Priority:** Critical
**Category:** Database / Runtime / Reliability / Operations
**Estimated Effort:** Large
**Dependencies:** TASK-551-06-L02; parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

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
