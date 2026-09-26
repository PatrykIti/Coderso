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
    "tests/perf/database-partition-readiness.test.ts",
    "tests/perf/database-partition-readiness-catalog.test.ts",
    "tests/integration/runtime/retentionScheduler-real-db.test.ts", "core/services/maintenance/preRetentionVacuumPlan.ts", "core/services/maintenance/preRetentionVacuum.ts", "tests/vitest/maintenance/preRetentionVacuumPlan.test.ts", "tests/integration/runtime/preRetentionVacuum.test.ts"
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
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/maintenance/partitionReadinessService.test.ts", "tests/vitest/maintenance/preRetentionVacuumPlan.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/maintenance/partitionReadinessService.test.ts", "tests/vitest/maintenance/preRetentionVacuumPlan.test.ts"],
        "minimum": 2
      }
    },
    {
      "id": "retention-scheduler-test",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/runtime/retentionScheduler.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/runtime/retentionScheduler.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "retention-scheduler-real-db-test",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/runtime/retentionScheduler-real-db.test.ts", "tests/integration/runtime/preRetentionVacuum.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/runtime/retentionScheduler-real-db.test.ts", "tests/integration/runtime/preRetentionVacuum.test.ts"],
        "minimum": 2
      }
    },
    {
      "id": "retention-job-service-test",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/server/task551RetentionJobService.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/task551RetentionJobService.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "retention-jobs-perf-test",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/database-retention-jobs.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-retention-jobs.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "partition-readiness-perf-test",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/database-partition-readiness.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-partition-readiness.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "partition-readiness-catalog-test",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/database-partition-readiness-catalog.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-partition-readiness-catalog.test.ts"],
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
      "commandIds": ["partition-readiness-vitest", "retention-scheduler-test", "retention-scheduler-real-db-test", "retention-job-service-test", "retention-jobs-perf-test", "partition-readiness-perf-test", "partition-readiness-catalog-test", "partition-readiness-check", "core-lint-types", "core-lint", "coderso-gate", "performance-gate", "security-scan"]
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

## Dated Contract Corrections — 2026-09-25 (06-L02 R7 G1 mirror: page-family whole-family floor; append-only)

Append-only mirror of TASK-551-06-L02 "R7 amendments (round 2, 2026-09-25)" item **G1** (orchestrator
decision, HIGH). Every anchor below was grounded on 2026-09-25 at HEAD `9c5b6666` plus the
uncommitted R6 edits, BEFORE the 06-L02 R7 source edit landed, so line numbers are pre-R7 and
pre-change. `**Status:**`, `**Changelog:**`, the Workflow Dispatch Envelope and every production
contract of this leaf stay unchanged; the only binding change is one test re-baseline in a file this
leaf already owns.

### D1 — Upstream decision this correction mirrors

06-L02 G1 adds the exported pure helper `resolveWholeFamilyRetentionPolicy(policy)` to
`core/services/content/revisionRetentionService.ts` and applies it inside `runRevisionFamilyRetention`
(pre-R7 `:612`), the single entry this leaf's `runRevisionFamilyUnit` funnels through
(`core/services/maintenance/retentionJobService.ts:804-813` normalizes, `:826` re-feeds the policy).
For the `page` family ONLY, every whole-family pass uses the effective floor
`max(policy.keepNewestPerParent, MAX_PAGE_REVISION_RETENTION)` with `MAX_PAGE_REVISION_RETENTION = 100`
(`core/services/pages/revisionRetention.ts:6`), whatever the source of the raw value (default, env key
or typed input). The request path (`pruneRevisionsTx` -> `pruneParentRevisions`) keeps the per-page
value; the other four revision families are unchanged. C2's pinned call shape and the frozen
normalizer semantics (C2 round-3 pin) are unchanged: the scheduler still passes the RAW normalized
policy and the floor is resolved inside L02's entry, so `retentionJobService.ts` needs NO edit.

Consequence here: the `revunit` leg of `tests/integration/server/task551RetentionJobService.test.ts`
(`:654-692`) runs the page family through the real job (env `:664-669`) with
`RETENTION_PAGE_REVISIONS_KEEP_NEWEST_PER_PARENT: "1"` (`:668`). Under G1 the effective floor is 100,
the three seeded rows are all held, nothing is deleted, and the leg would observe `[1, 2, 3]`.

### D2 — Superseded expectations (quoted)

In `tests/integration/server/task551RetentionJobService.test.ts` (pre-change line numbers):

- `:261` — `/** One marker page carrying three aged autosave revisions (newest kept). */`
- `:268-276` — `await db.insert(pageRevisions).values(` /
  `[1, 2, 3].map((version) => ({ pageId, version, kind: "autosave", data: {}, createdAt: daysAgo(60) }))`
  (three aged autosaves, versions 1..3, 60 days old).
- `:685-686` — `// Durable effect of the committed unit: only the keep-newest floor row` /
  `// survives on the fixture page.`
- `:687` — `expect(await pageRevisionVersions(pageId)).toEqual([3]);`

Each is read as replaced by D3.

### D3 — Binding test change (single file, already allowlisted)

Owner file: `tests/integration/server/task551RetentionJobService.test.ts` (envelope allowlist, this
file `:326`). No other file changes.

1. Import the Bun-free constant beside the existing `REVISION_RETENTION_FAMILY_ORDER` import (`:84`),
   so the pin follows the constant (`revisionRetention.ts` has zero imports and no Bun/DB coupling):

   ```ts
   import { MAX_PAGE_REVISION_RETENTION } from "../../../core/services/pages/revisionRetention";
   ```

2. `seedPageRevisionFixture` (`:261-278`) seeds `MAX_PAGE_REVISION_RETENTION + 3` (= 103) aged autosave
   rows, versions `1..103`, all `createdAt: daysAgo(60)`:

   ```ts
   /**
    * One marker page carrying `MAX_PAGE_REVISION_RETENTION + 3` aged autosave
    * revisions (v1..v103): the effective page whole-family floor keeps the
    * newest `MAX_PAGE_REVISION_RETENTION`, so exactly the three oldest are
    * eligible.
    */
   const seedPageRevisionFixture = async (tag: string): Promise<string> => {
     // ...page insert unchanged...
     await db.insert(pageRevisions).values(
       Array.from({ length: MAX_PAGE_REVISION_RETENTION + 3 }, (_, index) => ({
         pageId,
         version: index + 1,
         kind: "autosave",
         data: {},
         createdAt: daysAgo(60),
       }))
     );
     return pageId;
   };
   ```

3. The `revunit` leg's survivor assertion (`:687`) and its comment (`:685-686`) become:

   ```ts
   // Durable effect of the committed unit: the effective page floor
   // (MAX_PAGE_REVISION_RETENTION) holds v4..v103; exactly v1..v3 were deleted.
   expect(await pageRevisionVersions(pageId)).toEqual(
     Array.from({ length: MAX_PAGE_REVISION_RETENTION }, (_, index) => index + 4)
   );
   ```

   Every other assertion of the leg stays byte-identical: the env (`:664-669`, including
   `RETENTION_BATCH_SIZE: "500"` and `KEEP_NEWEST_PER_PARENT: "1"`), `retention_job_timeout` status
   and code (`:674-675`), `failedFamily` null (`:676`), `toMatchObject({ batches: 1 })` on the page row
   (`:679`), the four skipped families (`:680-684`), the lock and backend checks (`:688-689`), and the
   test title.

Why the timeout assertions stay valid (verified against the landed source):

- Clock reads are independent of the row count. `clockThatExpiresAfter(2, base)` serves read 1 to
  `startedAt` (`retentionJobService.ts:856`) and read 2 to the page unit's boundary check (`:803`);
  disabled L01 families read no clock. Read 3, at the `widget_template` unit boundary
  (`REVISION_RETENTION_FAMILY_ORDER`, `revisionRetentionService.ts:113-119`), is past the deadline ->
  `retention_job_timeout`, with the committed page unit kept.
- One batch. `RETENTION_MAX_BATCHES_PER_RUN: "1"` (`baseEnv`, `:324-331`) reaches the page policy as the
  typed global knob (`retentionJobService.ts:806-811`); `drainRetentionBatches`
  (`revisionRetentionService.ts:551-571`) stops at `maxBatchesPerRun`, so the page row records
  `batches: 1`. The single batch is `LIMIT 500` (`RETENTION_BATCH_SIZE: "500"`), which covers the
  three eligible marker rows.
- Exactly the three oldest. The keep-newest probe (`keepNewestFloorProbe`,
  `revisionRetentionService.ts:443-449`) makes a row a candidate only when its parent owns at least
  `keepNewest` strictly newer `(version, id)` rows; under the effective 100, v1..v3 each have >= 100
  newer rows and v4 has 99, so the candidates are exactly v1..v3. All rows are 60 days old against a
  30-day cutoff (`RETENTION_PAGE_REVISIONS_MAX_AGE_DAYS: "30"`) and no `publish` row exists, so the
  published-anchor probe excludes nothing. Survivors are v4..v103.
- The new assertion FAILS without G1 (raw keep 1 would leave only `[103]`), so it proves the floor on
  the scheduled path end to end.
- `matched`/`deleted` are deliberately NOT pinned on the page row: the family pass is whole-family on
  the shared `page_revisions` table, so those counts include any non-marker collateral; the
  marker-scoped survivor list is the exact proof. The same collateral could also consume the 500-row
  batch before the 60-day marker rows (`createdAt ASC, id ASC`), which is why the 06-L02 G4
  precondition below applies to the owner-map run.
- Cleanup is unchanged: `cleanupFixtures` deletes the marker page and `page_revisions.page_id` is
  `onDelete: "cascade"` (`core/db/tables/pages.ts:93-95`), so the 100 survivors go with it.

### D4 — Every other page-family expectation in this leaf's test files

Grep over the four envelope test files for `page_revisions`, `pageRevisions`, `PAGE_REVISIONS`,
`"page"`, `revision` and `keepNewest` (2026-09-25):

- `task551RetentionJobService.test.ts` `revunit` leg (`:654-692`) — CHANGED per D3 (`:687` -> v4..v103).
- `task551RetentionJobService.test.ts` source-guard registry leg (`:392-398`, pure) — unaffected: family
  order only, no retention arithmetic.
- `task551RetentionJobService.test.ts` C8 deadline leg (`:453-478`) — unaffected: every family is
  disabled and the loop dies at the first family boundary; no revision family is reached.
- `task551RetentionJobService.test.ts` `familyfail` leg (`:610-652`, `:643`
  `not.toContain("page")`) — unaffected: the page family is disabled in its env and the run stops at
  `webhook_deliveries` before any revision unit.
- `task551RetentionJobService.test.ts` two-replica, kill, dry-run and direct-service legs — unaffected:
  analytics/access-log families only; `REVISION_DISABLED_KEYS` (`:316-322`) disables every revision
  family.
- `tests/perf/database-retention-jobs.test.ts` C4 registry/source map (`:225-249`) — unaffected: pins
  family ids, the `runRevisionFamilyRetention` source string and the 5 `revision-unit` entries, none
  of which G1 changes (the helper is applied inside that entry).
- `tests/perf/database-retention-jobs.test.ts` default-run budget leg (`:267-295`) and every other leg
  — unaffected: L01 policies (`loadRetentionPolicies`) and L01 primitives only; no page policy or page
  run.
- `tests/integration/runtime/retentionScheduler.test.ts` (`:291-305`
  `RETENTION_FAMILY_TOKENS` incl. `PAGE_REVISIONS`, and every real-job leg, e.g. `:554`, `:901-935`)
  — unaffected: all 19 families disabled under global dry-run (`ALL_FAMILIES_DISABLED_DRY_ENV`);
  assertions are `batches === 0 && deleted === 0` and family counts.
- `tests/perf/database-partition-readiness.test.ts` (`:348` `"page_revisions"` in the table-id list)
  — unaffected: catalog/aggregate readiness reads; no retention policy is involved.

### D5 — Line budget

`tests/integration/server/task551RetentionJobService.test.ts` is 829 lines pre-change; D3 adds about
+8 net (one import, the longer doc comment, the multi-line survivor assertion). It stays under the
C9.1 soft target (950) and the 1,000-line hard cap. This task file stays exempt-by-type (docs).

### D6 — Land order, gates and receipt

Land order: 06-L02 R7 code (G1 helper in `revisionRetentionService.ts`) -> this D3 test change -> the
gates below. The D3 assertion is red against pre-R7 source by design. 06-L02 R7 gates 1-2 also list
this test file, so their owner-map run requires D3 to have landed as well (06-L02 G1 "Collateral").

Gates, in order (the envelope's `scheduler-and-database-tests` command, `:356-364`, in the two exact
forms of 06-L02 R6 B2):

1. Airtight form (DB legs skip):
   `cd /home/coder/project/Coderso-551 && env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/runtime/retentionScheduler.test.ts tests/integration/server/task551RetentionJobService.test.ts tests/perf/database-retention-jobs.test.ts tests/perf/database-partition-readiness.test.ts`.
2. Closed owner-map form on `DATABASE_URL3` (database `coderso02`), after the 06-L02 G4 read-only
   zero-collateral precondition count for (now, 30 days, keep 1) — the `revunit` leg is whole-family
   and cannot be scoped to marker parents through the production entry, so that recorded count of 0
   is its guard:
   `env -i PATH=… HOME=… DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_NAME=coderso02 TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel> bun --env-file=/dev/null test <the same four files>`,
   with the `revunit` leg executed (not skipped).
3. `./node_modules/.bin/eslint --max-warnings=0 tests/integration/server/task551RetentionJobService.test.ts`.
4. `bun --cwd core lint:types`, run by the orchestrator between phases.

The Workflow Dispatch Envelope stays byte-identical: the test file is already in the closed
`allowlist` (`:326`) and in the `scheduler-and-database-tests` argv and discovery paths (`:359`,
`:362`); no path, command or occurrence is added. Receipt: the orchestrator appends a dated addendum
to `_docs/_workflows/_smoke/task-551/impl-06-l03.json` (final bytes, line count and sha256 of the
test file, the G4 precondition count, and the results of gates 1-3). This task file records the
contract only.

## Dated Contract Corrections — 2026-09-25 (re-open R1: first real DB execution; append-only)

Append-only re-open after the first real execution of this leaf's DB legs on `DATABASE_URL3`
(database `coderso02`: journal `0081`, 89 online indexes, no foreign rows). Every anchor below was
grounded on 2026-09-25 against HEAD `9c5b6666` plus the uncommitted 06-L02 R6/R7 edits and the 06-L03
G1 re-seed. Line numbers are that working tree's and may drift. `**Status:**`, `**Changelog:**` and
the Workflow Dispatch Envelope stay byte-identical. Where an R1 item quotes an earlier sentence of this
file or a test/source line, the R1 item wins and the quoted text is read as replaced.

### R1-0 — Scope and envelope check (no envelope change)

Every file R1 edits is already in the closed `allowlist`:
`core/services/maintenance/retentionJobService.ts` (`:320`),
`core/services/maintenance/partitionReadinessService.ts` (`:321`),
`tests/vitest/maintenance/partitionReadinessService.test.ts` (`:324`),
`tests/integration/runtime/retentionScheduler.test.ts` (`:325`),
`tests/integration/server/task551RetentionJobService.test.ts` (`:326`),
`tests/perf/database-retention-jobs.test.ts` (`:327`) and
`tests/perf/database-partition-readiness.test.ts` (`:328`). The four Bun files are in the
`scheduler-and-database-tests` argv and discovery paths (`:359`, `:362`). No path, command or
occurrence is added. `core/db/client.ts` stays in `forbiddenPaths` (`:331`); R1-c consumes its fix
from the 02-L02 re-open and does not edit it here.

Line counts before R1: `partitionReadinessService.ts` 610, `retentionJobService.ts` 947,
`tests/vitest/maintenance/partitionReadinessService.test.ts` 914,
`tests/perf/database-partition-readiness.test.ts` 991, `tests/perf/database-retention-jobs.test.ts`
950, `tests/integration/runtime/retentionScheduler.test.ts` 998,
`tests/integration/server/task551RetentionJobService.test.ts` 837. The partition-readiness and
scheduler test files are within 9 and 2 lines of the 1,000-line hard cap. R1-a3 and R1-c4 below carry
an explicit stop rule for that.

### R1-a — PRODUCT: the aggregate cutoff bind throws on every real database

Defect. `readAggregate` (`partitionReadinessService.ts:412-429`) binds a raw `Date`:

> `count(*) filter (where ${spec.timeColumn} >= ${cutoff}) as recent_rows` (`:419`)

`drizzle-orm@0.45.2` `construct()` (`node_modules/drizzle-orm/postgres-js/driver.js:15-22`) replaces the
timestamp parsers AND serializers (`1184`, `1114`, … at `:17-20`) with a pass-through on every client it
wraps. postgres.js 3.4.9 then hands the `Date` object itself to the wire encoder. It throws
`TypeError` `ERR_INVALID_ARG_TYPE`, which has no SQLSTATE. The catch (`:424-426`) reduces it to
`partition_readiness_unavailable` / `aggregate_read_failed`. This fails three real-catalog legs of
`tests/perf/database-partition-readiness.test.ts`: whole catalog (`:881-898`), single table
`sessions` (`:900-911`) and the CLI relay (`:918-958`, where `:920` `expect(result.stderr).toBe("")`
sees the failure line).

Test gap that hid it. The Vitest recorder normalizes the bind before any assertion sees it
(`tests/vitest/maintenance/partitionReadinessService.test.ts:152-162`):

> "The cutoff bind arrives as a real Date instance; recording normalizes it to its ISO text so every
> assertion below compares values, never driver wrappers." (`:154-156`), with
> `param instanceof Date ? param.toISOString() : param` (`:159`).

Grounding correction to the diagnosis. The diagnosis proposed `${cutoff.toISOString()}::timestamptz`.
All 15 registry time columns are `timestamp` WITHOUT time zone. This was checked on 2026-09-25 through
`PARTITION_READINESS_TABLE_REGISTRY` (`:192-219`): every `timeColumn.getSQLType()` is `timestamp`
and `withTimezone` is `false`. Comparing a `timestamp` column with a `timestamptz` value makes
PostgreSQL convert the column through the session `TimeZone`. The result would then depend on server
configuration. The repo's own convention for these columns is drizzle's `mapToDriverValue`
(`toISOString()`, `node_modules/drizzle-orm/pg-core/columns/timestamp.js:34-36`), which PostgreSQL
reads as a UTC wall-clock `timestamp` and ignores the `Z`. The binding fix is therefore:

```ts
count(*) filter (where ${spec.timeColumn} >= ${cutoff.toISOString()}::timestamp) as recent_rows
```

The cast stays inside the same `sql` template, so the SQL-guard counts (`database-partition-readiness.test.ts:463-464`:
4 `sql`` templates, 2 `select` templates) are unchanged. No other bind in the service carries a `Date`.

Tests (R1-a):

1. Vitest `renderQuery` (`:152-162`) records params VERBATIM. Its `Date` normalization and the quoted
   comment are removed. A new pure assertion in the aggregate-target leg (`:848-870`) pins, for every
   aggregate call, `typeof call.params[0] === "string"`, the value `CUTOFF_DEFAULT`, and
   `call.text` containing `::timestamp`. A pure registry leg asserts that every
   `PARTITION_READINESS_TABLE_REGISTRY[i].timeColumn.withTimezone === false`. A future `timestamptz`
   column then fails closed and forces a deliberate cast decision. The existing
   `toEqual(...)` cutoff pins (`:660-662`, `:667`, `:869`, `:912`) stay byte-identical and now
   prove the raw bind.
2. The three real-catalog legs above must pass on `coderso02`. That is the defect's end-to-end proof.

### R1-a2 — PRODUCT: lifecycle timestamps are always null on a real database

Defect. `toTimestamp` (`partitionReadinessService.ts:358-360`) accepts only a `Date`:

> `return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;` (`:359`)

Under drizzle's pass-through parsers, `drizzle.execute` returns `timestamp`/`timestamptz` columns as
PostgreSQL text. So `oldestAt`/`newestAt` (`:451-452`, `min`/`max` over the `timestamp` column,
e.g. `2026-09-16 09:00:00.123456` with no offset) and `lastVacuumAt`/`lastAutovacuumAt`
(`:461-462`, `pg_stat_user_tables` `timestamptz`, e.g. `2026-09-16 09:00:00.123456+00`) are always
`null` on a real database. `expectSanitizedTableEntry` (`database-partition-readiness.test.ts:276-317`)
accepts `null` at `:302-308` (`isIsoTimestampOrNull`), so it hides the defect.

Binding fix. The mandate's plain `Date.parse` is refined for two verified reasons. First, Bun parses
offset-less text as LOCAL time: under `TZ=Europe/Warsaw`, `2026-09-16 09:00:00.123456` became
`07:00:00.123Z`. Second, Bun's `Date.parse` rejects PostgreSQL's hour-only offset `+00` in ISO form.
It is also lenient: `"1"` parses to `2001-01-01`. The helper is therefore shape-guarded and
TZ-independent:

```ts
// PostgreSQL text timestamps: `YYYY-MM-DD[ T]HH:MM:SS[.ffffff][Z|±HH[[:]MM]]`.
const PG_TIMESTAMP_TEXT =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?)(?:(Z)|([+-]\d{2})(?::?(\d{2}))?)?$/;

function toTimestamp(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value !== "string") return null;
  const match = PG_TIMESTAMP_TEXT.exec(value);
  if (match === null) return null; // hostile/unparsable text never propagates
  // No offset = `timestamp without time zone` = UTC wall clock (drizzle's own
  // convention, pg-core/columns/timestamp.js:31); ±HH is normalized to ±HH:MM.
  const offset = match[4] === undefined ? "Z" : `${match[4]}:${match[5] ?? "00"}`;
  const parsed = Date.parse(`${match[1]}T${match[2]}${offset}`);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}
```

The output is always a re-rendered `toISOString()` value and never the input text, so the Security
Contract's no-row-content rule holds. `infinity`, URLs and injection text all yield `null`. This was
verified in Bun under `TZ=Europe/Warsaw` for `2026-09-16 09:00:00.123456`, `… +00`, `… .5+05:30`,
`… -0330` and `…T09:00:00.000Z`.

Superseded Vitest expectations (hostile leg `:372-398`, fixtures `:225-251`). The hostile aggregate
row's `oldest_at: "2026-09-16T09:00:00.000Z"` (`:245`) and the hostile catalog row's
`last_vacuum_at: "2026-09-16T00:00:00.000Z"` (`:235`) are well-formed timestamps, so:

> `expect(evidence.oldestAt).toBeNull();` (`:392`) -> `.toBe("2026-09-16T09:00:00.000Z")`
> `expect(evidence.lastVacuumAt).toBeNull();` (`:394`) -> `.toBe("2026-09-16T00:00:00.000Z")`

`:393` `newestAt` stays `null` (invalid `Date`) and `:395` `lastAutovacuumAt` stays `null` (URL
text). This is an intended contract change, not a weakening: the leak leg (`:400-428`) still asserts
that no hostile token reaches the serialized report. One new pure leg pins the PostgreSQL text forms
listed above, including offset-less-as-UTC under an explicitly different `process.env.TZ` (restored in
`finally`), and `null` for `"1"`, `"infinity"`, a URL and `"25; drop table users"`.

### R1-a3 — TEST: a non-vacuous real-catalog timestamp assertion

`coderso02` holds no foreign rows, so "some table has rows" cannot be assumed. The whole-catalog leg
(`database-partition-readiness.test.ts:881-898`) seeds one marker `access_logs` row (FK-free
required columns `method`, `path`, `status`; `core/db/tables/observability.ts:39-55`). The row has a
per-run marker `path` and `created_at = <now − 60 s>` written as `'<iso>'::timestamp`. The leg then
asserts, for the `access_logs` entry,
`Date.parse(oldestAt ?? "") <= Date.parse(seededAt)` and
`Date.parse(newestAt ?? "") >= Date.parse(seededAt)`. `NaN` fails both, so `null` cannot pass. In
`finally` the leg deletes exactly `where path = <marker>`. Seeding goes through the leg's own
owner-map client, for example by widening `withOwnerExecutor` (`:865-878`) to pass `(executor, client)`.
The service still only reads. The SQL guard scans the service and CLI sources only (`:117`, `:123`,
`:447-458`), so a test-side insert/delete does not trip it.

Stop rule. This adds about 11-13 lines to a 991-line file. If the file would exceed 1,000 lines, the
implementer STOPS and reports a blocker. It does not trim comments or assertions, and it does not
create a new file. The orchestrator then records a dated envelope amendment for a cohesive split
(proposed: move the real-catalog `describe` `:880-991` with `runCheckCli`/`withOwnerExecutor` into
`tests/perf/database-partition-readiness-catalog.test.ts`, added to `allowlist` and to the
`scheduler-and-database-tests` argv/discovery paths). This file does not pre-authorize that path.

### R1-b — TEST: `tests/perf/database-retention-jobs.test.ts` fixture and budget defects

1. (b1) `seedAnalyticsFixture` (`:667-681`). Its comment promises "3 old sessions with 2 attached old
   pageviews each" (`:663`), but the insert attaches ONE pageview per session:

   > `SELECT s.id, ${buckets.old}::timestamptz FROM analytics_sessions s` /
   > `WHERE s.last_seen_at < ${buckets.boundary}::timestamptz` (`:674-676`)

   The dry-run leg therefore counts 7,003 against `toBe(7_006)` (`:730`). Fix:
   `… FROM analytics_sessions s CROSS JOIN generate_series(1, 2) WHERE s.last_seen_at < …`. After the
   fix, the apply leg still deletes exactly 5,000 pageviews: all old rows share `buckets.old`, and the
   5,000 independent rows own the lowest ids under `(created_at, id)` (`trafficRepository.ts`
   `orderBy(asc(createdAt), asc(id))`). The FK cascade then removes the 6 attached rows, and `:793-797`
   (`< boundary` = 0) holds.
2. (b2) `captureDryRunCandidates(sql, iso, limit)` (`:684-691`) filters `created_at < ${iso}`, but it
   is called with the old bucket:

   > `await captureDryRunCandidates(sql, buckets.old, 500);` (`:758`)

   Every old row equals `buckets.old` (`bucketsAround`, `:163-169`: `old = cutoff − 1 ms`), so the
   capture is empty and `:759-761` (`toBe(500)`) fails. Fix: pass `buckets.boundary`
   (`= cutoff`). That is the production predicate `created_at < cutoff` with the same
   `(created_at, id)` order and `LIMIT 500`.
3. (b3) The accounting comment (`:783`) sums to 2 × 10 + 2 = 22 (`countedStatements`, `:638-644`: one
   per op, plus one per DELETE that removed rows; the session batch removes 3). The assertion
   disagrees:

   > `expect(countedStatements(counters)).toBe(21);` (`:784`) -> `.toBe(22)`
4. (b4) The DB legs have no per-test timeout, so Bun's 5 s default applies. The apply leg took 5.6 s on
   the remote host, and remote round trips cost about 1.2-1.8 s per transaction. The four owner-map
   legs `:711`, `:736`, `:853` and `:908` take the repo convention third argument `60_000`
   (precedent `tests/unit/kits/fullSiteAdapterAtomicity.test.ts:707`). The apply leg's in-test wall-time
   budget `expect(elapsedMs).toBeLessThan(30_000)` (`:802`) stays byte-identical. The same `60_000`
   applies to the DB-touching real-catalog legs of `database-partition-readiness.test.ts` (`:881`,
   `:900`, `:918`, `:960`). `:983` exits before any database contact. Written as `}, 60_000);`, these
   add zero lines on single-line titles.

### R1-c — PRODUCT/SEAM: the drizzle-over-transaction bridge cannot construct

Defect. The adapter is:

> `drizzle(tx as unknown as Sql, { schema });` (`retentionJobService.ts:282-283`, used at `:771` and
> `:826`)

drizzle's `construct()` reads and mutates `client.options.parsers` and `client.options.serializers`
(`driver.js:18-22`). In postgres.js 3.4.9 (`node_modules/postgres/src/index.js`), `options`, `begin`
and `reserve` are attached only to the top-level pool (`:67-84`, `options` `:76`, `begin` `:79`).
Every `Sql(handler)` (`:86-104`, which adds only `types/typed/unsafe/notify/array/json/file`) returned
by `reserve()` (`:203-225`, `Sql(handler)` `:219`) or created inside `begin` (`:252`) has NO `options`
and NO `begin`. The adapter therefore throws before any family SQL runs. The same shape breaks the
02-L02-owned client: `runAffinityProbe` calls `owner.begin` (`core/db/client.ts:226`, `:235`), and
`DedicatedDatabaseSession.transaction` calls `reserved.begin` (`:429`), both on a `ReservedSql`. The
`ReservedSql` types wrongly inherit `begin`.

Superseded C2 sentences (quoted):

- "whose executor is built as `drizzle(tx as unknown as Sql)` under a documented inline cast and handed
  to L02's frozen `runRevisionFamilyRetention`" — replaced by the construction below. The per-family-unit
  transaction boundary and the one-PID rule are unchanged.
- "the only drizzle-bridgeable handle is the `TransactionSql` inside `session.transaction`
  (client.ts:318, :419-437), `drizzle()` rejects a `TransactionSql` without a cast" — the in-transaction
  handle is whatever the 02-L02 re-open's `session.transaction` provides, and it is drizzle-bridgeable
  only once the owning pool's `options` is attached.
- G1-mirror D1 "so `retentionJobService.ts` needs NO edit" is scoped to G1 only. R1-c edits it.

Binding fix (consumer side, this leaf):

1. `drizzleOverTransaction(tx)` builds `drizzle(<02-L02 helper>(tx), { schema })`. The helper is
   exported by `core/db/client.ts` from the 02-L02 re-open, which pins its name and signature. It
   returns the session's in-transaction handle with the OWNING maintenance pool's live `options`
   object attached: the same reference, not a copy. drizzle's pass-through parsers/serializers then
   reach the connection exactly as they do for the global `db`. In `primary` mode
   (`maintenanceSqlClient === sqlClient`, `client.ts:101-113`) that object is already patched by
   `db = drizzle(sqlClient)` (`:91`). This parity is required because the L01/L02 pruners were proven
   against the global `db`'s pass-through configuration. A copy would leave native `Date`
   parsing/serialization in `direct|session` mode and diverge from it. One documented inline cast is
   kept only if the helper's return type is not assignable to drizzle's client parameter.
2. Side effect, recorded and accepted. In `direct|session` mode the maintenance pool's timestamp
   parsers become pass-through. Every raw `session.execute` read in this leaf
   (`retentionJobService.ts:223`, `:231`, `:246`: `acquired`/ownership/`unlocked`) returns booleans or
   integers only, so nothing here decodes a timestamp through the raw path.
3. Source guard (extends the C1 guard in `task551RetentionJobService.test.ts`):
   `retentionJobService.ts` does not reference `.options`, `maintenanceSqlClient` or
   `reserve(`. The options attachment exists only behind the 02-L02 helper.

Dependency and land order: **02-L02 re-open code** (fixes `client.ts:226`, `:235`, `:429`, whose
`begin` does not exist on a `ReservedSql`, and exports the options-attaching helper) -> **06-L03 R1
code** (R1-a, R1-a2, R1-b, R1-c, R1-c4) -> the gates in R1-e. R1-c is red until the 02-L02 re-open lands.

### R1-c4 — TEST: fake reserved sessions model a surface real sessions lack

The fake reserved handle carries `begin`:

> `begin: async (run: (tx: unknown) => Promise<unknown>): Promise<unknown> => run(tag),`
> (`tests/integration/runtime/retentionScheduler.test.ts:212`, inside `fakeReserved` `:206-216`)

A real `reserve()` result has no `begin` and no `options` (R1-c). The fake is replaced by one that
models the real surface: the tagged template, and ONLY the extra members the fixed 02-L02 client
actually invokes on a reserved handle (for example `unsafe`, if its explicit `begin`/`commit`/`rollback`
statements use it). Explicit transaction statements reach the scripted `respond(text)`. The fake has
no `begin` and no `options` property, and one assertion pins that absence
(`"begin" in reserved === false`, `"options" in reserved === false`). The same defect in
`tests/integration/server/task551DatabaseLifecycle.test.ts:369`, `:398`, `:617` belongs to 02-L02.
It is recorded here as a HANDOFF to the 02-L02 re-open and is not edited by this leaf.

Stop rule. The scheduler test is at 998 lines, so the replacement must be net ≤ +2 lines. Otherwise the
implementer STOPS and reports a blocker for an envelope-amended cohesive split (for example the fake
pool/timer fixtures into a sibling fixture module). No such path is pre-authorized here.

### R1-c5 — The DB legs of `task551RetentionJobService.test.ts` were vacuously green

The `hasDb` gate (`:98-108`) awaits `assertMaintenanceSessionAffinity()` (`:101`). That reaches
`runAffinityProbe` -> `owner.begin` (`client.ts:226`), which throws (R1-c), so `hasDb` is `false` and
ALL 9 `testIfDb` legs (`:412`, `:443`, `:459`, `:492`, `:563`, `:616`, `:660`, `:708`, `:786`) skip. Any
earlier "100% green" result for this file on a real database was vacuous. From R1 on, the owner-map run
of this file requires 0 fail AND 0 skip. A skipped leg is a failed gate, never a pass. The gate is not
weakened: the affinity precondition stays, and it passes because the client is fixed.

### R1-d — KNOWN LIMITATION: sparse aged revision range at 100k (deferred with evidence)

Evidence: 06-L02 R8-2 and the receipt
`_docs/_workflows/_smoke/task-551/audit-evidence/06-l02-r7-explain-receipt.json` (`coderso02`,
`budgetVerdict` `{ pass: false, breaches: ["sparse_large"] }`). The whole-family page candidate read
(`selectCandidateIds`, `core/services/content/revisionRetentionService.ts:485-507`) walks every aged
row in `(created_at, id)` order with one correlated keep-newest probe per row. At 1,000 × 100 sparse
aged rows it is cancelled at the 15 s statement timeout (34.05 s at 120 s). The 10k sparse case takes
3.86 s against this leaf's tx-local 4,000 ms bound (`RETENTION_STATEMENT_TIMEOUT_MS`,
`retentionJobService.ts:305`), a margin of about 0.14 s.

Current behavior (landed, verified). A cancel inside the candidate read becomes
`REVISION_RETENTION_BATCH_FAILED` (`revisionRetentionService.ts:548-551`). This leaf maps it to
`retention_family_failed` for the active family (`retentionJobService.ts:934-938`). Earlier committed
units are kept, the lock is released (`:939-944`), nothing retries inside the run, and the next tick
retries. That satisfies R8-2 mitigation 3. Consequence: the revision units run
`page, widget_template, detail_page, entry, post` (`REVISION_RETENTION_FAMILY_ORDER`, `:115-121`)
after the 14 L01 rows. A page family that times out on every tick therefore starves the four later
revision families.

Deferral. R8-2 mitigations 1-2 (a keyset scan window over `page_revisions_retention_idx` with a
persisted per-family `(created_at, id)` high-water mark, and/or a bounded parent semi-join) change the
candidate SQL. That SQL is owned by `revisionRetentionService.ts`, which is 06-L02-owned and read-only
here per "L01/L02 services are consumers/read-only". A persisted high-water mark would also need
schema, which is forbidden here. Neither can land inside this leaf's allowlist. The limitation is
DEFERRED to a new TASK-551-06 leaf that the orchestrator allocates as the next free number (proposed
`TASK-551-06-L04` "Bounded Revision Candidate Examination"). It is NOT deferred to `TASK-9999`: it has
performance and reliability impact, so it is ineligible. That leaf's acceptance and test shape, for
the record:

- Acceptance: one candidate-read statement examines at most a fixed scan window (≤ 2,000 index
  entries) whatever the aged-range size. At the 100k sparse shape, each batch completes in < 5 s wall
  time and < 4,000 ms statement time with no Seq Scan. The high-water mark advances monotonically and
  restarts once the aged range is exhausted. Dry-run and apply select identical windows. A
  statement-timeout cancel is still one bounded `retention_batch_failed` with no in-run retry.
- Test shape: a marker-scoped 1,000 × 100 sparse `page_revisions` fixture (keep 100, 0 eligible)
  plus a 100 × 1,000 dense control, on the owner map with per-test timeout `360_000`. The fixture
  asserts per-batch latency < 5 s, rows examined ≤ window, and a sanitized EXPLAIN receipt with no
  Seq Scan. Cleanup deletes only the marker parents (`page_revisions.page_id` cascade).

R1 adds no test or source for R1-d in this leaf.

### R1-e — Gates, line budget and receipt

In order, after the land order in R1-c:

1. Vitest, airtight:
   `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/maintenance/partitionReadinessService.test.ts`.
2. `scheduler-and-database-tests` (`:356-364`), airtight form (DB legs skip):
   `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/runtime/retentionScheduler.test.ts tests/integration/server/task551RetentionJobService.test.ts tests/perf/database-retention-jobs.test.ts tests/perf/database-partition-readiness.test.ts`.
3. The same four files in the closed owner-map form on `DATABASE_URL3` (`coderso02`). This amends
   G1-mirror D6 gate 2 by adding `DB_LOCK_TIMEOUT_MS=15000`:
   `env -i PATH=… HOME=… DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_NAME=coderso02 TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel> DB_LOCK_TIMEOUT_MS=15000 bun --env-file=/dev/null test <the same four files>`.
   Pass means 0 fail across all four files AND 0 skip in
   `tests/integration/server/task551RetentionJobService.test.ts` (R1-c5). The 06-L02 G4 zero-collateral
   precondition from D6 still applies to the `revunit` leg.
4. `partition-readiness-check` (`:366-371`) on the same closed map: exit 0 or 2 with empty stderr.
5. `./node_modules/.bin/eslint --max-warnings=0` on every touched file, then `bun --cwd core lint:types`
   run by the orchestrator between phases.
6. `wc -l` on every touched file. Each must be ≤ 1,000 (C9.1 soft target 950). Record the before
   counts from R1-0 against the after counts. The R1-a3 and R1-c4 stop rules apply.

Receipt: the orchestrator appends a dated R1 addendum to
`_docs/_workflows/_smoke/task-551/impl-06-l03.json`. It holds the final bytes, line count and sha256
of every touched file; the gate 1-6 results with per-file pass/fail/skip counts; the G4 precondition
count; the 02-L02 re-open reference it landed on; and the R1-d deferral target. This task file records
the contract only.

### R1 amendments (2026-09-25, orchestrator decisions)

Append-only. These are orchestrator decisions on the R1 re-open above. Anchors were grounded on
2026-09-25 against HEAD `9c5b6666` plus the uncommitted working tree, before any R1 code landed:
`tests/perf/database-partition-readiness.test.ts` 991 lines,
`tests/integration/runtime/retentionScheduler.test.ts` 998 lines. Neither split target exists yet.
Where an amendment quotes an earlier sentence of this file, the amendment wins and the quoted text is
read as replaced. `**Status:**` and `**Changelog:**` stay byte-identical. The Workflow Dispatch
Envelope is edited in place ONLY as recorded in A1-0.

#### A1-0 — Envelope amendment (edited in place)

Superseded (quoted):

- R1 preamble: "`**Status:**`, `**Changelog:**` and the Workflow Dispatch Envelope stay
  byte-identical." Now reads: `**Status:**` and `**Changelog:**` stay byte-identical, and the envelope
  changes only as listed below.
- R1-0 heading "(no envelope change)", plus "Every file R1 edits is already in the closed
  `allowlist`", "The four Bun files are in the `scheduler-and-database-tests` argv and discovery
  paths" and "No path, command or occurrence is added." Two paths are added. No command and no
  occurrence is added.

The in-place edit:

1. `allowlist` gains two paths: `tests/perf/database-partition-readiness-catalog.test.ts` and
   `tests/integration/runtime/retentionScheduler-real-db.test.ts`.
2. The `scheduler-and-database-tests` `argv` now lists six test files. The command stays
   `bun --env-file=/dev/null test`, 10 tokens, with no shell metacharacters. Each new file comes
   right after its source file.
3. `positiveDiscovery.paths` now holds the same six files. `positiveDiscovery.minimum` is now `6`,
   which equals the path count. Grounding correction: the minimum before the edit was `1`, not `4`
   as the seed said.
4. The envelope has no line-count or `wc` command, so none needed changing. R1-e gate 6 (the `wc -l`
   gate) covers both new files through "every touched file".

The family preflight (`preflightTask551DispatchSnapshot`, `sourceHead` `9c5b6666`, all 41
`TASK-551*` files, repo-relative paths) passed after this edit.

#### A1-a — Split: `tests/perf/database-partition-readiness-catalog.test.ts` (new)

This replaces the R1-a3 stop rule, which is superseded (quoted): "If the file would exceed 1,000
lines, the implementer STOPS and reports a blocker. It does not trim comments or assertions, and it
does not create a new file." Also superseded: "This file does not pre-authorize that path." The split
is now pre-authorized and binding, whatever the post-R1-a3 line count.

Grounding correction to the mandate seed (":874-960"). The real-catalog block is the banner at
`:824-826`, the `CheckCliResult` type at `:828`, `runCheckCli` at `:830-858` (definition `:837`),
`withOwnerExecutor` at `:860-878` (definition `:865`), and the `describe` at `:880-991` with five
`testIfDb` legs: `:881`, `:900`, `:918`, `:960`, `:983`. The whole block moves, including `:983`. That
leg is gated by the same `testIfDb` and belongs to the same `describe`, even though it exits before
any database contact.

- Moves (exclusive consumers): the owner-map gate (`OWNER_DB_TEST_MAP_PRESENT` `:70-74`, the
  routability probe `:82-100`, `testIfDb` `:103`). After the move, only the moved legs use them.
  Also moving: `CheckCliResult`, `runCheckCli`, `withOwnerExecutor` (widened per R1-a3 to pass
  `(executor, client)`), the R1-a3 `access_logs` marker seed and cleanup, and the R1-b4 `60_000`
  per-test timeouts on the DB-touching legs.
- Declared in both files (the new file keeps its own copies, and no cross-test-file import is
  allowed): constants and helpers that both halves consume, for example `CHECK_SCRIPT_PATH` (`:112`,
  still read by `CLI_SOURCE` `:123`) and `expectSanitizedTableEntry` with `isIsoTimestampOrNull`
  (`:268-319`, still used by the pure legs `:600-619`). Copy only what the moved legs call.
- Stays: every pure, registry, SQL-guard, injected-evidence, sanitization and CLI-grammar leg
  (`:325-822`), including the R1-a Vitest-independent guard counts at `:463-464`. The file-header
  JSDoc (`:1-35`) is reworded so it no longer claims real-catalog or CLI-smoke legs, and it points to
  the new file.
- New-file shape: its own header naming TASK-551-06-L03 and the owner-map execution contract, its own
  gate, and its own fixtures. It must run independently:
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/perf/database-partition-readiness-catalog.test.ts`
  gives 0 fail with every DB leg skipped by name. The owner-map form gives 0 fail and 0 skip. Target
  ≤ 700 lines. Hard cap 1,000.

#### A1-b — Split: `tests/integration/runtime/retentionScheduler-real-db.test.ts` (new)

The three "retention scheduler on the real fixture database (owner-executed)" legs move: the
`describe` at `:470-578` (legs `:471`, `:503`, `:532`) and its region banner `:467-468`.

- Moves (exclusive consumers): the `hasDb`/`testIfDb`/`canConnect` gate (`:62-75`), `advisoryHeld`
  (`:77-84`, used only at `:527` and `:571`), `positionalJobAdapter` (`:308-311`, used only at
  `:507`), and the `assertMaintenanceSessionAffinity` import (used only at `:484`). The header comment
  sentences about real-DB legs and the `testIfDb` gate (`:9-18`) move with them, and the source header
  is reworded.
- Declared in both files as own fixtures, copying only what the moved legs call: `K`, `schedulerEnv`,
  `DISABLED_ENV`, `RETENTION_FAMILY_TOKENS`, `ALL_FAMILIES_DISABLED_DRY_ENV`, `makeRuns`,
  `makeDeferred`, and `withTimers` with its `RecordedTimer`/`TimerRecorder` types. The new file also
  gets its own file-wide `afterEach(setDatabaseClientRuntimeForTests(null))` and
  `afterAll(resetRuntimeLifecycleForTests)` safety nets (source `:992-998`).
- Order independence. The ordering law (`:19-21`) relies on the real-DB legs running first on an
  empty affinity memo. One `bun test` invocation shares module state across files, and the argv runs
  the source file first. So the new file must not depend on file order. Before its first leg it
  starts from a fresh lifecycle generation through the landed idiom (the `beforeEach`
  `closeAllDatabaseClientsWithin(10_000)` of the affinity region, `:585-587`, run once in a
  `beforeAll`). Verify this against `core/db/client.ts` before use and do not invent a new reset seam.
  Prove it by running the new file alone AND after the source file in one invocation. The source
  file's ordering-law comment is updated to describe its remaining pure regions.
- Grounding correction to the mandate ("+ the real reserved-session fake replacement move there").
  `fakeReserved` (`:206-216`) has only DB-free consumers: `fakePool` (`:224`, the affinity-gating
  legs `:582-700`) and the default-binding leg (`:904`, `:907`). All of them stay in the source file.
  The moved real-DB legs use the real maintenance channel and no fake. So the R1-c4 replacement is
  written in `retentionScheduler.test.ts`, next to its consumers. The new file carries no fake
  reserved handle. Moving the fake would force a cross-test-file import or a duplicate, unused fake.
- R1-c4 stop rule superseded (quoted): "The scheduler test is at 998 lines, so the replacement must be
  net ≤ +2 lines. Otherwise the implementer STOPS and reports a blocker for an envelope-amended
  cohesive split". After the split (about 130 lines removed), the R1-c4 replacement is bounded only by
  the 1,000-line cap, with a soft target of 950 (C9.1). "No such path is pre-authorized here" is
  replaced by this amendment.
- New-file shape: own header and own gate. Independently runnable: the airtight form
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/runtime/retentionScheduler-real-db.test.ts`
  gives 0 fail with 3 skips by name. The owner-map form gives 0 fail and 0 skip. Target ≤ 700 lines.

#### A1-c — Gate wording follows the envelope

R1-e gates 2 and 3 now say "the six files" wherever they say "the four files"/"the same four files".
They run the six-path argv from A1-0. R1-e gate 6 records before-counts of 0 for the two new files.
R1-e gate 3 now also requires 0 skip in both new files on the owner map. In
`database-partition-readiness-catalog.test.ts`, `:983` runs without database contact but is still
gated. A skipped leg there is a failed gate.

#### A2 — R1-d superseded: mitigation owned by 06-L02 R9; no 06-L04 leaf

Superseded (quoted): "The limitation is DEFERRED to a new TASK-551-06 leaf that the orchestrator
allocates as the next free number (proposed `TASK-551-06-L04` "Bounded Revision Candidate
Examination")." Also superseded: that leaf's "Acceptance" and "Test shape" bullets, the R1-d heading
qualifier "(deferred with evidence)", and in R1-e the receipt's "the R1-d deferral target".

The 100k sparse aged-range mitigation now belongs to TASK-551-06-L02 re-open R9. R9 adds a
semi-join parent pre-filter inside the candidate SQL of `selectCandidateIds`
(`core/services/content/revisionRetentionService.ts`), with NO schema change and no persisted
high-water mark. Its acceptance, fixtures, EXPLAIN evidence and budgets are owned and pinned by the
R9 section in `TASK-551-06-L02-Concurrency-Safe-Revisions-And-Retention.md`. Grounding: on
2026-09-25 that file ends with re-open R8 (`:1505`, R8-2 at `:1639`) and has no R9 section yet, so
this leaf depends on R9 as that file will record it.

This leaf records only the DEPENDENCY: 06-L02 R9 code lands before the 06-L03 R1 gate run. The R1-d
evidence and the "Current behavior" paragraph remain accurate history for the pre-R9 state. The rule
"R1 adds no test or source for R1-d in this leaf" still applies. `TASK-551-06-L04` is not allocated.
No file under `_docs/_TASKS/` references it apart from R1-d above. It stays ineligible for
`TASK-9999`. The R1-e receipt records the 06-L02 R9 reference it landed on, instead of a deferral
target.

#### A3 — Land order (restated; supersedes R1-c "Dependency and land order" and R1-e "In order, after the land order in R1-c")

1. **02-L02 re-open code**: `TASK-551-02-L02` "Dated Contract Corrections — 2026-09-25 (re-open:
   reserved-session transactions)", `:1025`, R2-R4. It fixes the `ReservedSql` `begin` calls and
   exports the options-attaching helper.
2. **06-L02 R8 + R9 code**: R8-1 test defects, plus the R9 candidate-SQL semi-join pre-filter (A2).
3. **06-L03 R1 code**: R1-a, R1-a2, R1-a3, R1-b, R1-c, R1-c4, including the two A1 splits.
4. **Gates for all three**, run in the closed owner-map environment on `DATABASE_URL3`
   (`coderso02`) with `DB_LOCK_TIMEOUT_MS=15000`. For this leaf that means R1-e gates 1-6 over the
   six-file argv (A1-c).
5. **Post-audits** across the three re-opens, at least two independent auditors per scope.

Nothing in step 4 starts before steps 1-3 have all landed. A red R1-c or a red R9 leg before then is
expected, not a finding.

### R1 amendments round 2 (2026-09-25)

Append-only. These are orchestrator decisions from the round-2 pre-implementation audit of R1 and
its A1-A3 amendments. Anchors were grounded on 2026-09-25 against HEAD `9c5b6666` plus the
uncommitted working tree, before any R1 code landed. Neither A1 split file exists yet. Where an
item below quotes an earlier sentence of this file, the item wins and the quoted text is read as
replaced. `**Status:**` and `**Changelog:**` stay byte-identical. The Workflow Dispatch Envelope is
edited in place ONLY as recorded in A4-0. That edit adds 55 lines inside the `json` fence, so every
earlier anchor to this file at or after the fence (`:311`) is now 55 lines lower. Envelope anchors
in R1-0, R1-e and A1-0 (`:320-:371`) describe the pre-edit envelope.

#### A4 — (H) One Bun process per test file

Defect. The A1-0 `scheduler-and-database-tests` command runs all six files in ONE `bun test`
process, so module state is shared across files. `retentionScheduler.test.ts` (`:585-587`,
affinity-gating `describe`) runs this `beforeEach`:

> `await closeAllDatabaseClientsWithin(10_000);`

`closeAllDatabaseClientsWithin` (`core/db/client.ts:134-139`) ends every client from
`listDatabaseClients()` (`:116-118`). That includes the global `sqlClient`, which is also the
maintenance client in `primary` mode (`:101-113`). postgres.js 3.4.9 sets `ending` once
(`node_modules/postgres/src/index.js:53`, `:366-371`) and never resets it. From then on it rejects
every query with `CONNECTION_ENDED` (`:330-331`), so an ended client is never reopened. Every file
after `retentionScheduler.test.ts` in the argv therefore sees a dead global client. Their DB legs
skip (the pre-audit counted 3 skips in `retentionScheduler-real-db.test.ts` and 9 in
`task551RetentionJobService.test.ts`). Under R1-c5 a skipped leg is a failed gate, so the combined
command could never pass on the owner map, and on a laxer reading it would be vacuously green.

Decision: one command and one Bun process per test file. The test sources gain no cross-file reset
seam, and no leg is weakened.

##### A4-0 — Envelope amendment (edited in place)

1. `scheduler-and-database-tests` is removed. It is replaced, in the same position and file order,
   by six commands. Each has `lane` `bun-test`, `environmentProfile` `task551-db-test`, and argv
   `["bun", "--env-file=/dev/null", "test", "<file>"]` (4 tokens, no shell metacharacters). Each
   `positiveDiscovery` is `test-paths` with `paths` `["<file>"]` and `minimum` `1`, which equals the
   path count:

   | Command id | File |
   | --- | --- |
   | `retention-scheduler-test` | `tests/integration/runtime/retentionScheduler.test.ts` |
   | `retention-scheduler-real-db-test` | `tests/integration/runtime/retentionScheduler-real-db.test.ts` |
   | `retention-job-service-test` | `tests/integration/server/task551RetentionJobService.test.ts` |
   | `retention-jobs-perf-test` | `tests/perf/database-retention-jobs.test.ts` |
   | `partition-readiness-perf-test` | `tests/perf/database-partition-readiness.test.ts` |
   | `partition-readiness-catalog-test` | `tests/perf/database-partition-readiness-catalog.test.ts` |

2. `partition-readiness-vitest` keeps its id, lane, `none` profile and discovery. Its argv changes
   from `["bunx", "vitest", "run", "tests/vitest/maintenance/partitionReadinessService.test.ts"]`
   to the airtight form
   `["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/maintenance/partitionReadinessService.test.ts"]`.
   This matches R1-e gate 1 and the repository Vitest law. Grounding correction to the seed, which
   said "bunx is absent on bun 1.4": on this host `bunx` exists
   (`/usr/local/bin/bunx -> /usr/local/bun/bin/bunx`, Bun 1.4.2), and `bunx vitest --version` exits
   0 (`vitest/4.1.10`, run under `node-v26.10.0`). The change is kept for airtightness and
   runner parity: Bun with `--env-file=/dev/null` gets no ambient `.env`, and Node through `bunx`
   does not match that. Missing `bunx` is not the reason.
3. `occurrences[single].commandIds` lists the six new ids in place of `scheduler-and-database-tests`,
   in table order. No other command id changes.
4. `core-lint-types` (`["bun", "--cwd", "core", "lint:types"]`), `core-lint`
   (`["bun", "--cwd", "core", "lint"]`) and `coderso-gate` (`["bun", "run", "gates:coderso"]`) stay
   byte-identical. `requireLiteralArgv` and `normalizeCommand`
   (`_docs/_workflows/lib/task-551-dispatch-contract.mjs:473-490`, `:554-556`) forbid only shell
   metacharacters, `source`, `.` and `NAME=` tokens. The `bun --env-file=/dev/null` prefix is
   required only when the profile is not `none`, so the parser permits these forms. The orchestrator
   runs them between phases in their airtight equivalents. For `core-lint`, that is
   `./node_modules/.bin/eslint --max-warnings=0` on the touched files. `bun --cwd core lint:types`
   runs as-is, and it does not source `.env` or run tests.
5. Checks: the fence is valid JSON; every argv has 5 tokens or fewer; every non-`none` command
   starts `bun --env-file=/dev/null`; every `minimum` equals its path count. The family preflight
   (`preflightTask551DispatchSnapshot`, `sourceHead` `9c5b6666`, all 41 `TASK-551*` files,
   repo-relative paths) passed after this edit. Its `TASK-551-06-L03:single` dispatch lists the 13
   commands in the order above.

##### A4-1 — Superseded text (quoted)

- A1-0 item 2: "The `scheduler-and-database-tests` `argv` now lists six test files. The command stays
  `bun --env-file=/dev/null test`, 10 tokens, with no shell metacharacters. Each new file comes
  right after its source file." Replaced by A4-0 item 1.
- A1-0 item 3: "`positiveDiscovery.paths` now holds the same six files. `positiveDiscovery.minimum`
  is now `6`, which equals the path count." Replaced by A4-0 item 1 (one path, `minimum` `1`, per
  command).
- A1-b "Order independence": "One `bun test` invocation shares module state across files, and the
  argv runs the source file first. So the new file must not depend on file order." Now reads: each
  file runs in its own process, so no file can inherit another file's ended clients or affinity memo.
- A1-b: "Before its first leg it starts from a fresh lifecycle generation through the landed idiom
  (the `beforeEach` `closeAllDatabaseClientsWithin(10_000)` of the affinity region, `:585-587`, run
  once in a `beforeAll`)." Dropped. That call would end the global client that the file's own
  real-DB legs then use (A4). A fresh process already starts at generation 0 with an empty affinity
  memo. `retentionScheduler-real-db.test.ts` must NOT call `closeAllDatabaseClientsWithin` (or
  `closeDatabase`) before or between its DB legs. Its file-wide `afterEach`/`afterAll` safety nets
  from A1-b stay.
- A1-b: "Prove it by running the new file alone AND after the source file in one invocation."
  Replaced by the per-file proof in A7. A combined invocation is no longer a gate. Under A4 it
  would fail by construction.
- A1-c: "They run the six-path argv from A1-0." Now reads: they run the six per-file commands
  from A4-0.
- R1-e gate 2 command (the one-process four-file form
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/runtime/retentionScheduler.test.ts tests/integration/server/task551RetentionJobService.test.ts tests/perf/database-retention-jobs.test.ts tests/perf/database-partition-readiness.test.ts`)
  and gate 3 "`bun --env-file=/dev/null test <the same four files>`". Replaced by one invocation
  per file in each form (A7).
- A3 step 4: "over the six-file argv (A1-c)". Now reads: over the six per-file commands (A4-0).
- Validation Commands, bullet 1: "`bunx vitest run tests/vitest/maintenance/partitionReadinessService.test.ts`".
  Replaced by R1-e gate 1's airtight form.
- Validation Commands, bullet 2:
  "`set -a && source .env && set +a && bun test tests/integration/runtime/retentionScheduler.test.ts tests/integration/server/task551RetentionJobService.test.ts tests/perf/database-retention-jobs.test.ts tests/perf/database-partition-readiness.test.ts`".
  Replaced by the six per-file invocations in A7. `.env` is never sourced for this leaf's DB legs.
  They run only on the closed owner map.

Handoff (not edited here, outside this allowlist): `TASK-551-10-L01` still cites
"(06-L03 `scheduler-and-database-tests`, `minimum: 6`)" (`:1762`). Its own envelope argv (`:1321`)
runs `retentionScheduler.test.ts` followed by `retentionScheduler-real-db.test.ts`,
`task551RetentionJobService.test.ts` and the perf files in ONE process. The A4 defect therefore
applies to that command too. Its owner must split it in the same way.

#### A5 — (M1) R1-a2 also re-baselines the Bun perf hostile leg

R1-a2 listed only the Vitest hostile leg. The Bun perf file has a matching leg that stays in
`tests/perf/database-partition-readiness.test.ts` after A1-a: it is an injected-evidence leg inside
the retained `:325-822` range. The leg is
"sanitizes hostile catalog values instead of propagating them" (`:623-666`). Its catalog row feeds
a well-formed ISO string:

> `last_autovacuum_at: "2020-06-01T12:00:00.000Z",` (`:635`)

and it asserts:

> `expect(evidence.lastAutovacuumAt).toBeNull();` (`:660`) -> `.toBe("2020-06-01T12:00:00.000Z")`

Under R1-a2's `toTimestamp`, that string matches `PG_TIMESTAMP_TEXT` with a `Z` offset and
re-renders to the same ISO value. So the expectation above is the binding re-baseline. It is an
intended contract change, not a weakening. The rest of the leg stays byte-identical:
`:657` `oldestAt` (a real `Date`), `:658` `newestAt` `null` (invalid `Date`), `:659`
`lastVacuumAt` (a real `Date`), and the `NaN`/`Infinity` serialization pins `:663-665`. No
hostile (non-timestamp) text is added. R1-a2's sanitization rule still holds, because the output is
a re-rendered `toISOString()` value.

#### A6 — (M2) R1-c re-baselines the C1 `core/db/client` import pin

R1-c item 1 adds the 02-L02 helper import (`withPoolOptions`, pinned by 02-L02 B3) to
`retentionJobService.ts`. The C1 source guard in
`tests/integration/server/task551RetentionJobService.test.ts` (`:365-388`) pins the exact import
list with `toEqual` (`:376-381`):

> `expect(names).toEqual([`
> `  "DATABASE_CLIENT_ERROR_CODES",`
> `  "withDedicatedDatabaseSession",`
> `  "type DedicatedDatabaseSession",`
> `  "type DedicatedDatabaseTransaction",`
> `]);`

Binding re-baseline. The one `core/db/client` import block in `retentionJobService.ts`
(currently `:90-95`) becomes exactly these names, in this order: values first, then types,
alphabetical within each group, matching the current block. The guard pins that order:

```ts
expect(names).toEqual([
  "DATABASE_CLIENT_ERROR_CODES",
  "withDedicatedDatabaseSession",
  "withPoolOptions",
  "type DedicatedDatabaseSession",
  "type DedicatedDatabaseTransaction",
]);
```

The file header comment (`:5-8`) is updated to name `withPoolOptions` among the permitted imports.
No other client import is allowed. `toHaveLength(1)` for the import statements (`:367`), the
`import db` rejection and the three negative pins (`:382-387`) stay byte-identical. They sit beside
R1-c item 3's new pins (no `.options`, no `maintenanceSqlClient`, no `reserve(`).

#### A7 — Zero-skip rule, restated per file

Each of the six files runs in its own process in two forms:

- airtight:
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test <file>`
- owner map, R1-e gate 3's closed environment on `DATABASE_URL3` (`coderso02`):
  `env -i PATH=… HOME=… DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_NAME=coderso02 TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel> DB_LOCK_TIMEOUT_MS=15000 bun --env-file=/dev/null test <file>`

| File | Airtight | Owner map |
| --- | --- | --- |
| `retentionScheduler.test.ts` | 0 fail, 0 skip (pure after A1-b) | 0 fail, 0 skip |
| `retentionScheduler-real-db.test.ts` | 0 fail, 3 skips by name | 0 fail, 0 skip |
| `task551RetentionJobService.test.ts` | 0 fail, 9 skips by name | 0 fail, 0 skip |
| `database-retention-jobs.test.ts` | 0 fail, owner-map legs skip by name | 0 fail, 0 skip |
| `database-partition-readiness.test.ts` | 0 fail, 0 skip (pure after A1-a) | 0 fail, 0 skip |
| `database-partition-readiness-catalog.test.ts` | 0 fail, 5 skips by name | 0 fail, 0 skip |

On the owner map, any skip in any file is a failed gate, never a pass (R1-c5, A1-c). Each file is
counted from its own run, and the R1-e receipt records per-file pass/fail/skip counts for each
command. The Vitest file (R1-e gate 1) also needs 0 fail and 0 skip.

### A8 — 2026-09-26: pre-step channel, retentionScheduler.test.ts dispositions, RetentionJobService :156, envelope additions

Relabel note (2026-09-26, orchestrator Addendum C2 / D-9): this section was first written as `A4`; it is `A8` because `A4` already names the round-2 amendment at `:1442`, and the relabel changed labels only.

Append-only, apart from the fence edit recorded in A8-a. This amendment implements Addendum A2 of
the orchestrator dispositions of 2026-09-26
(`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`, cited as
D1-D9 and A1-A6 of that file). It consumes:

- D1, the maintenance-statement seam, owned by `TASK-551-02-L02` R9.1
  (`TASK-551-02-L02-…md:3406-3565`: signature `:3414-3434`, pseudocode `:3471-3493`, rules
  `:3495-3525`, test legs F27/RD13 `:3527-3564`), and the R9.11 handoff to this leaf (`:3790-3791`);
- D2, D4 and D5 as written into `TASK-551-06-L02` R13 (`TASK-551-06-L02-…md:4156-4796`): R13-1
  (`:4180-4326`), R13-2 (`:4327-4427`), R13-3 prerequisite 2 (`:4456-4476`, the text block
  `:4461-4473`), R13-4 (d) (`:4498-4517`), R13-4 (i) (`:4551-4568`) and R13-7 (`:4733-4744`);
- 02-L02 R9.9 (`:3722-3758`), the executable `tests/integration/runtime/retentionScheduler.test.ts`
  dispositions;
- Addendum A1: the `task551RetentionJobService.test.ts:156` edit is this leaf's, not 06-L02's.

Naming. This `### A8` is a new amendment. It is not the round-2 `#### A4 — (H) One Bun process per
test file` (`:1442`) or its `A4-0`/`A4-1` items; those keep their names. Items below are lettered
(`A8-a` … `A8-i`) so they never collide with `A4-0`/`A4-1`. Where an A8 item quotes an earlier
sentence of this file, the A8 item wins and the quoted sentence is read as replaced; every quote is
listed in **Superseded sentences (A8)**. Everything not quoted stays binding, including C4
(`:549-627`), which stays byte-identical.

Grounding. Anchors were grounded on 2026-09-26 against `/home/coder/project/Coderso-551` at HEAD
`420bb24a` plus the uncommitted working tree (dirty in 06-L02 source/tests,
`tests/integration/server/task551RetentionJobService.test.ts` and sibling task files; none of the
06-L03 source anchors below is in a file that A8 found dirty except that test file, whose anchor is
the working-tree line). Counts: `core/server/jobs/retentionScheduler.ts` 786,
`core/services/maintenance/retentionJobService.ts` 947,
`tests/integration/runtime/retentionScheduler.test.ts` 998,
`tests/integration/server/task551RetentionJobService.test.ts` 837. Neither A1 split file and none of
the four A8 paths exists yet. `**Status:**` and `**Changelog:**` stay byte-identical.

#### A8-a — Envelope additions (edited in place; inventory pinned)

The fence edit moves no line of this file: the four paths share the last `allowlist` line, and the
two command edits change values on existing lines. Every earlier anchor to this file stays valid.

1. `allowlist` (`:330`) gains, after `tests/integration/runtime/retentionScheduler-real-db.test.ts`:
   `"core/services/maintenance/preRetentionVacuumPlan.ts"`,
   `"core/services/maintenance/preRetentionVacuum.ts"`,
   `"tests/vitest/maintenance/preRetentionVacuumPlan.test.ts"` and
   `"tests/integration/runtime/preRetentionVacuum.test.ts"`. None of them is in any other TASK-551
   fence (06-L02 R13-9, `:4789-4793`), so `allowlist_cross_owner` cannot fire.
2. `partition-readiness-vitest` (`:346-356`): `argv` gains
   `"tests/vitest/maintenance/preRetentionVacuumPlan.test.ts"` as its last token (6 tokens);
   `positiveDiscovery.paths` gains the same path and `minimum` becomes `2` (= path count). Vitest
   isolates each file's module graph, so the round-2 A4 (H) process hazard does not apply to it.
3. `retention-scheduler-real-db-test` (`:368-378`): `argv` gains
   `"tests/integration/runtime/preRetentionVacuum.test.ts"` as its last token (5 tokens);
   `positiveDiscovery.paths` gains the same path and `minimum` becomes `2`. The id is kept (renaming
   it would change `occurrences`). The two files share one Bun process under the co-residency rules
   of A8-e.
4. NOT added: the two commands and the `occurrences[single].commandIds` line of 06-L02 R13-3
   prerequisite 2 (`:4466-4472`). Addendum A2 fixes "command argv additions; NO new occurrence", and
   the envelope parser rejects a command that no occurrence references
   (`envelope_command_unreferenced`, `_docs/_workflows/lib/task-551-dispatch-envelope.mjs:410-411`).
   `occurrences` (`:466-472`), `forbiddenPaths` (`:332-343`, `core/db/client.ts` stays at `:333`),
   `dependencies` and every other command stay byte-identical. The dispatch still lists 13 commands.
5. Checks run after the edit: the fence parses as JSON; the family preflight literal of
   `TASK-551-11-…md:1173` with `sourceHead` `420bb24ad9973ded1a5cdc93561c8bf502a09238` prints exactly
   `{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}`.

#### A8-b — Scheduler pre-step (pre-retention vacuum): channel, target, bound, abort (D1, D2)

This is the "scheduler pre-step (pre-retention vacuum)" item that 06-L02 R13-3 item 3 (`:4477-4479`)
and R12-5 (e) hand to this leaf. It carries 06-L02 R12-1 (`:3663-3810`) as amended by R13-1, R13-2
and R13-4. The 06-L02 text is authoritative for the design; this item makes it executable here.

- **Call site.** Only the scheduler's default runner, `createDefaultRunRetentionPlan`
  (`core/server/jobs/retentionScheduler.ts:397-398`, built at `:478`). A runner injected through
  `RetentionSchedulerDeps.runRetentionPlan` (`:368`) runs no pre-step. `retentionJobService.ts`
  gets no pre-step code.
- **Channel and target.** Every pre-step statement (the privilege read, each VACUUM, the
  effectiveness read) is one call of D1's
  `runDedicatedMaintenanceStatement({ signal, statementTimeoutMs, statement })` from
  `core/db/client.ts` (02-L02 R9.1). The seam resolves the R7.2 dedicated/direct maintenance target
  at call time, builds its own short-lived `max: 1` client, runs exactly one autocommit `execute`
  outside any BEGIN and discards the client on every path. The pre-step never uses `db`, a reserved
  handle, the plan's dedicated session, `set_config`, `reset`, a terminate branch or
  `query.cancel()`. `core/db/client.ts` stays forbidden; this leaf only imports the seam.
- **Skip.** Only a seam rejection `database_maintenance_session_unavailable` skips: the current and
  every remaining family get `skipped_session_unavailable`, no further pre-step statement is
  issued, and the plan runs. `database_maintenance_statement_bound_invalid` is never a skip (02-L02
  R9.11 `:3786-3788`); it is a `failed` outcome. The lock-timeout class is A8-d.
- **Bound.** Each VACUUM passes `min(120_000, shareMs)` (A8-c). The two catalog reads pass the
  statement floor (`config.statementTimeoutMs`). The pre-step never passes a bound below the floor
  (it records `budget_exhausted` instead), so the seam's lower clamp never extends a pre-step
  statement. `lock_timeout` stays the 02-L01 startup value.
- **Abort.** `signal.aborted` is checked before every seam call and the signal is passed into it.
  On abort the seam's `finally` runs the R7.4 drain and releases its slot. When the signal is
  aborted, any seam rejection is rethrown unchanged (normally `dedicated_database_session_lost`);
  a pre-call check throws `new Error("retention_pre_vacuum_aborted")`. The abort propagates to
  `executeRun` (`:513`), which logs the scheduler's `aborted` outcome (`:531-539`); the plan is not
  started. The run settles within `RETENTION_CANCEL_DRAIN_DEADLINE_MS` (4,500 ms,
  `core/db/databaseLifecycle.ts:30`). An abort is never classified as a pre-step failure or skip.
- **Connection budget.** Seam calls are sequential and each client is closed before the next call
  and before `runRetentionPlan` opens the plan's dedicated session; the pre-step adds no
  concurrent dedicated connection (06-L02 R13-1 `:4254-4259`).
- **C4.** Unchanged. The seam's client is not the plan's dedicated session and the pre-step is not
  a C4 statement.
- **Mode.** The pre-step runs for dry-run and apply alike (R12-1 **Mode**). A family whose owner
  normalizer reports it disabled gets no SQL. When no family is enabled, the pre-step issues zero
  seam calls (no privilege read either).

#### A8-c — Shared run deadline, modules, statements and outcomes (D4, D5)

**Modules (binding; 06-L02 R13-2 `:4357-4376`).**

- `core/services/maintenance/preRetentionVacuumPlan.ts` — pure and Bun-free. It imports nothing
  from `core/db/*`, `core/services/content/*` or any runtime adapter. It owns the renderers, the
  closed outcome set, the classification, the budget arithmetic and the loop, which takes its
  dependencies as an argument. Target ≤ 400 lines.
- `core/services/maintenance/preRetentionVacuum.ts` — the lazy-deps layer, STATIC imports only (no
  dynamic `import()` of `core/db/client`; `scripts/task551QueryInventory/literalDynamicClientImports.ts:331-332`,
  `:533`, `:551`). It binds: `families` = `REVISION_RETENTION_FAMILY_ORDER`
  (`revisionRetentionService.ts:115-121`); `isEnabled(family)` =
  `normalizeRevisionRetentionPolicy(family, undefined, process.env).enabled` (`:317`);
  `tableNameOf` = `getRevisionFamilyTableName` (06-L02 R12-3; landed by 06-L02 R8-R13);
  `statementFloorMs` = `parseDatabaseRuntimeConfig(process.env).statementTimeoutMs`
  (`core/db/databaseConfig.ts:270`, `:293-299`), evaluated once on first use (the same pure owner
  parser `client.ts:21` runs at import, so the value equals the seam's clamp floor); `runStatement`
  = the D1 seam with the adapter `(sql) => sql.unsafe(text)`, where `text` is exactly the pure
  renderer's output and no parameter array is passed (R13-2: the bytes do not change). It exports
  `runPreRetentionVacuum(input, overrides?)`; `overrides` exists for the Bun test file only and may
  replace `families`, `isEnabled`, `tableNameOf` and `runStatement`. Target ≤ 200 lines.
- `retentionScheduler.ts` receives only the call (A8-c pseudocode) and must stay ≤ 1,000 lines.

**Statements (closed).** `renderVacuum(name)` accepts only `^[a-z_][a-z0-9_]{0,62}$`, otherwise it
throws `retention_pre_vacuum_identifier_invalid`, and returns `VACUUM (ANALYZE) "<name>"`. The two
catalog reads render the same validated names as string literals:

```sql
-- privilege read (config floor bound)
select c.relname as relname, pg_has_role(current_user, c.relowner, 'USAGE') as permitted
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = current_schema() and c.relkind = 'r' and c.relname in ('<name>', ...)
-- effectiveness read (config floor bound), families that ran
select c.relname as relname, c.relpages as relpages, c.relallvisible as relallvisible
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = current_schema() and c.relkind = 'r' and c.relname in ('<name>', ...)
```

**Closed outcomes (one per family per run).** `ran`, `ineffective`, `skipped_disabled`,
`skipped_normalizer_error`, `skipped_session_unavailable`, `skipped_not_permitted` (also a table
absent from the privilege read, R13-4 (h)), `skipped_concurrent`, `budget_exhausted`,
`failed_statement_timeout`, `failed`. A `failed` outcome carries one closed `code`: the rejection's
`DATABASE_CLIENT_ERROR_CODES` value when it is one (`database_pool_reserve_timeout`,
`dedicated_database_session_lost`, `database_maintenance_statement_bound_invalid`, …), else
`retention_pre_vacuum_error`. Logs: one `log.info("retention_pre_vacuum_completed", { families:
[{ family, outcome }] })` per run with at least one enabled family, and one
`log.warn("retention_pre_vacuum_failed", { family, code })` per failed family, through the
scheduler's `RetentionSchedulerLogger`. No log carries SQL text, a table name, an OID, a bind
value, a URL or a server message (Security Contract `:248-250`).

**Pseudocode (binding shape).**

```ts
// retentionScheduler.ts — the only scheduler change
export function createDefaultRunRetentionPlan(
  maxRunMs: number,
  clock: () => number,
  log: RetentionSchedulerLogger,
  steps: DefaultRetentionRunSteps = { runPreRetentionVacuum, runRetentionPlan }
): RetentionPlanRunner {
  return async ({ now, signal }) => {
    const { planMaxRunMs } = await steps.runPreRetentionVacuum({
      runStartedAtMs: now.getTime(), maxRunMs, signal, clock, log,
    });
    return steps.runRetentionPlan(now, signal, { maxRunMs: planMaxRunMs });
  };
}
// engine (:478): deps.runRetentionPlan ?? createDefaultRunRetentionPlan(config.maxRunMs, now, log)

// preRetentionVacuumPlan.ts — pure loop
async function runPreRetentionVacuumLoop(input, deps): Promise<{ planMaxRunMs; outcomes }> {
  const runDeadlineAt = input.runStartedAtMs + input.maxRunMs;
  const planFloorMs = Math.max(1_000, Math.ceil(input.maxRunMs / 2)); // R13-2; 1_000 = MIN_RUN_MS
  const shareMs = () => runDeadlineAt - input.clock() - planFloorMs;
  const enabled = [];
  for (const family of deps.families) {
    let on: boolean;
    try { on = deps.isEnabled(family); } catch { record(family, "skipped_normalizer_error"); continue; }
    if (!on) { record(family, "skipped_disabled"); continue; }
    enabled.push({ family, name: deps.tableNameOf(family) }); // renderer validates the name
  }
  if (enabled.length === 0) return finish(); // zero seam calls
  const call = (text, boundMs) => {
    if (input.signal.aborted) throw new Error("retention_pre_vacuum_aborted");
    return deps.runStatement({ signal: input.signal, statementTimeoutMs: boundMs, text });
  };
  // privilege read
  if (shareMs() < deps.statementFloorMs) { exhaust(enabled); return finish(); }
  try { permitted = rowsToPermitted(await call(renderPrivilegeRead(enabled), deps.statementFloorMs)); }
  catch (error) { onPrivilegeReadError(error, enabled); return finish(); } // abort rethrows; unavailable -> skip all; else failed all
  for (const item of enabled) {
    if (!permitted.has(item.name)) { record(item.family, "skipped_not_permitted"); continue; }
    const share = shareMs();
    if (share < deps.statementFloorMs) { exhaustFrom(item); break; }
    try { await call(renderVacuum(item.name), Math.min(120_000, share)); record(item.family, "ran"); }
    catch (error) {
      const kind = classify(error, input.signal);   // A8-d
      if (kind === "abort") throw error;
      if (kind === "unavailable") { skipUnavailableFrom(item); break; }
      record(item.family, kind === "sqlstate_55P03" ? "skipped_concurrent"
        : kind === "sqlstate_57014" ? "failed_statement_timeout" : "failed", closedCode(error));
    }
  }
  // effectiveness read, only when some family ran and the share admits it; failure keeps "ran"
  if (ranFamilies().length > 0 && shareMs() >= deps.statementFloorMs) {
    try { applyEffectiveness(await call(renderEffectivenessRead(ranFamilies()), deps.statementFloorMs)); }
    catch (error) { if (classify(error, input.signal) === "abort") throw error; warnEffectiveness(closedCode(error)); }
  }
  return finish(); // planMaxRunMs = Math.max(1_000, runDeadlineAt - input.clock()); logs per A8-c
}
// effectiveness: relpages = 0 -> "ran"; relallvisible / relpages < 0.9 -> "ineffective" (R13-4 (a))
```

A privilege-read rejection that is neither an abort nor `unavailable` marks every enabled family
`failed` with its closed code and issues no VACUUM; the plan still runs. `budget_exhausted` marks
the current and every remaining enabled family. A failure never stops the plan.

#### A8-d — SQLSTATE closed values and replica concurrency (06-L02 R13-4 (d), R13-7)

- `classify(error, signal)`: `signal.aborted` → `abort` (checked first, whatever the rejection);
  `error.code === "database_maintenance_session_unavailable"` → `unavailable`; the rejection's
  SQLSTATE property `error.code === "57014"` → `sqlstate_57014`; `error.code === "55P03"` →
  `sqlstate_55P03`; anything else → `other`. Only the `code` property is read, and only compared
  against these closed literals. `message`, `detail`, `hint`, `query`, `parameters` and `where` are
  never read or logged; 06-L03 never parses server messages.
- Handoff check. 02-L02 R9.1 **Error surface** (`:3522-3525`) rethrows non-loss server errors
  unchanged (R7.3), so a server `57014`/`55P03` reaches the pre-step as the driver error with its
  SQLSTATE `code`. That satisfies R13-7's closed-value condition (`:4735-4738`); no 02-L02 handoff
  is recorded. If the landed seam wraps a non-loss server error so that `code` no longer carries the
  SQLSTATE, the implementer STOPS (A8-h).
- `55P03` (lock timeout under `SHARE UPDATE EXCLUSIVE`, normally a concurrent replica's pre-step,
  autovacuum, ANALYZE, `CREATE INDEX CONCURRENTLY` or DDL) is `skipped_concurrent`, never a
  failure. There is no `SKIP_LOCKED`; the statement text stays `VACUUM (ANALYZE) "<name>"`.
- The pre-step runs outside the advisory-lock lease on every replica and every tick, including a
  tick whose plan ends `skipped_locked`. The per-run cost (one VACUUM pass plus one ANALYZE sample
  per enabled family and replica, N + 2 seam connections) is accepted at the daily default and
  called out at the 60 s minimum interval (`retentionScheduler.ts:91`, `:94`), as R13-4 (d)
  records.

#### A8-e — Tests and the co-resident Bun process

**Vitest, DB-free** — `tests/vitest/maintenance/preRetentionVacuumPlan.test.ts` (command
`partition-readiness-vitest`, profile `none`). It imports only `preRetentionVacuumPlan.ts`. Legs:

1. the renderer for the five literal names passed as parameters (`page_revisions`,
   `widget_template_revisions`, `detail_page_revisions`, `content_revisions`, `post_revisions`),
   and rejection (`retention_pre_vacuum_identifier_invalid`) of a quoted, upper-case, empty and a
   64-character name;
2. the closed outcome set and closed failure codes;
3. `classify`: abort wins over every rejection; `database_maintenance_session_unavailable` skips
   the current and remaining families and issues no further call; `57014` →
   `failed_statement_timeout`; `55P03` → `skipped_concurrent`;
   `database_maintenance_statement_bound_invalid` → `failed` (never a skip); a rejection carrying a
   server `message` logs none of it;
4. effectiveness: `relpages = 0` → `ran`; ratio `< 0.9` → `ineffective`; `>= 0.9` → `ran`; a failed
   or budget-excluded effectiveness read keeps `ran`;
5. budget arithmetic with a fake clock: `planFloorMs` at `maxRunMs` 1,000 / 3,001 / 300,000; each
   VACUUM bound = `min(120_000, shareMs)`; `budget_exhausted` below the floor; the returned
   `planMaxRunMs` = `max(1_000, runDeadlineAt - now)`;
6. the loop with fake dependencies: disabled and normalizer-error families get no call; zero
   enabled families → zero calls and no log; the abort check runs before each call; a failure does
   not stop the next family; the privilege-read failure path issues no VACUUM.

Target ≤ 600 lines. Airtight: 0 fail, 0 skip.

**Bun** — `tests/integration/runtime/preRetentionVacuum.test.ts` (command
`retention-scheduler-real-db-test`, profile `task551-db-test`). Legs:

1. five-family identifier assertion through the real accessor:
   `renderVacuum(getRevisionFamilyTableName(family)) === 'VACUUM (ANALYZE) "<literal>"'` for every
   family in `REVISION_RETENTION_FAMILY_ORDER`, against the file's own literal map (it does not
   import 06-L02's `R10_FAMILY_TABLE`);
2. scheduler ordering (DB-free): `createDefaultRunRetentionPlan` with injected `steps` — the plan
   fake is not called until the pre-step fake settles, receives the returned `planMaxRunMs`, and is
   never called when the pre-step rejects with an aborted signal;
3. DB leg "ran": an EMPTY leg-owned table `t551pv_ran_<run marker>` in `current_schema()`,
   `overrides` = one enabled family whose `tableNameOf` returns that table, the REAL seam. The
   outcome is exactly `ran` (`relpages = 0`, so the xmin horizon cannot make it flaky), which proves
   the VACUUM ran outside a block (inside one PostgreSQL raises `25001`). The observer then sees
   `vacuum_count >= 1` for that table in `pg_stat_user_tables` with `schemaname = current_schema()`,
   polling up to 3,000 ms at 100 ms;
4. DB leg "abort" — 06-L02 R13-1 **DB leg for the abort** (`:4264-4286`) verbatim: a leg-owned table
   with a few rows; the observer holds `LOCK TABLE <leg table> IN SHARE UPDATE EXCLUSIVE MODE` in an
   open transaction; the pre-step starts with its own `AbortController` and the REAL seam; bounded
   50 ms polling of `pg_stat_activity` until a backend on the current database shows
   `wait_event_type = 'Lock'` and a query starting with `VACUUM`, recording its `pid` and
   `backend_start`; abort; the promise rejects with the abort within 4,500 ms of the abort call and,
   by settlement, no row matches that `pid` plus `backend_start`; `finally` rolls back the holder
   and drops the table. No leg VACUUMs or locks a shared family table.

Its DB gate is its own (A1-a/A1-b shape): owner-map fixture variables plus a routability probe;
every DB leg is skipped by name when absent. Every leg-owned name carries a per-run marker, and
`afterAll` drops only the tables this file created and ends only its own observer client. Target
≤ 500 lines.

**Co-residency (binding; exception to round-2 A4 (H) for exactly this pair).** The command runs
`retentionScheduler-real-db.test.ts` and `preRetentionVacuum.test.ts` in one Bun process. File order
inside one `bun test` invocation is not a contract, so each file must pass in either order:

- neither file calls `closeAllDatabaseClientsWithin`, `closeDatabase`, `closeRuntimeLifecycle` or
  `resetMaintenanceSessionAffinityForTests` (for the real-db file this restates A4-1);
- `preRetentionVacuum.test.ts` calls no `setDatabaseClientRuntimeForTests`,
  `assertMaintenanceSessionAffinity` or `startRetentionScheduler`, so it leaves the affinity memo,
  the lifecycle generation and the client overrides exactly as it found them (the seam does not
  await the affinity proof, 02-L02 R9.1 `:3503-3505`);
- each file's own clients and tables are its own; nothing is shared through module state.

Proof: each file alone in both forms, and the command's two-file argv in both forms. Counts per
file are read from the command run's per-file output.

| File | Airtight | Owner map |
| --- | --- | --- |
| `retentionScheduler-real-db.test.ts` (in the command) | 0 fail, 3 skips by name | 0 fail, 0 skip |
| `preRetentionVacuum.test.ts` (in the command) | 0 fail, 2 skips by name (legs 3-4); legs 1-2 pass | 0 fail, 0 skip |
| `preRetentionVacuumPlan.test.ts` (Vitest) | 0 fail, 0 skip | n/a (profile `none`) |

Airtight form of the command:
`env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/runtime/retentionScheduler-real-db.test.ts tests/integration/runtime/preRetentionVacuum.test.ts`.
The owner-map form is A7's closed `env -i` form with the same two paths. On the owner map any skip
is a failed gate. The no-leak check of R12-1 **Tests** is moot here (06-L02 R13-2 `:4423-4426`);
02-L02 RD13 owns it.

#### A8-f — `tests/integration/runtime/retentionScheduler.test.ts` dispositions (02-L02 R9.9)

These are intended contract changes that follow 02-L02 R7-R9, not weakenings. They build on the
02-L02 R8.9 re-baselines (`TASK-551-02-L02-…md:3104-3251`, which stand except where R9.9 amends
them). HEAD anchors; the A1-b split may move them, so the implementer re-anchors by leg title.

1. Ordering (`:613-646`, affinity-gating region): the capped-primary PASS leg runs AFTER the
   rejection legs (transaction-primary, outage, key/pid mismatch) of its lifecycle generation, OR in
   its own `test` (the per-test `beforeEach` `closeAllDatabaseClientsWithin` bumps the generation),
   OR calls `resetMaintenanceSessionAffinityForTests()` right after it. The transaction-primary leg
   may stay anywhere (it rejects by the mode matrix before any cache read). The PASS leg keeps
   exactly one factory call, one scheduled timer and `controller.stop()` in `finally` (R9.9
   `:3757-3758`).
2. Ordering-law banner (`:19-21`): the law is unchanged (only a generation bump clears a cached
   proof). The text names both bumps (the `beforeEach` `closeAll` and
   `resetMaintenanceSessionAffinityForTests()`) and states that every rejection leg on a mode that
   passes the matrix precedes the one counting PASS leg of its generation. After A1-b the
   "real-DB legs first on the empty memo" clause moves out with those legs.
3. Clock: `client.ts` captures `setTimeout`/`clearTimeout`/`performance.now` at module evaluation
   (02-L02 side, R9.9 `:3739-3746`), so `withTimers` (`:148-192`) records no dedicated-path timer;
   the index-based `fireTurn(recorder, 0)` (`:666`) and the `toHaveLength(0|1)` counts stay. A leg
   may instead assert scheduler timers by `delayMs`. `DatabaseClientRuntimeOverrideForTests.clock?`
   is 02-L02's; this file uses it only if a leg needs a fake dedicated-path clock.
4. `:395-412` (configuration failures): the override becomes
   `{ config: CHANNEL.direct, maintenanceUrl: <placeholder>, dedicatedClientFactory: <fake> }`;
   `expect(pool.reservations()).toBe(0)` becomes factory calls `0`; `recorder.scheduled` stays
   length 0.
5. `:900-945` (default job binding): `pool()` becomes a fake `dedicatedClientFactory` whose identity
   result carries `state.pid === <identity pid>` and `{ pid, started }`; every result carries that
   `state.pid` and a `command` tag equal to the upper-cased first keyword of the statement text
   (`BEGIN`, `COMMIT`, `SELECT`, and `VACUUM` should the pre-step reach it); a graceful `end` and
   `end({ timeout: 0 })` resolve. The override adds the `maintenanceUrl` placeholder. The
   assertions at `:927-936` stay and the factory-call count is not pinned. With
   `ALL_FAMILIES_DISABLED_DRY_ENV` the A8-b **Mode** rule means the pre-step issues zero seam calls
   in this leg, so it needs no new pre-step assertion.
6. No pre-step leg is added to this file (it is at 998 lines before A1-b); the pre-step's scheduler
   ordering leg lives in `preRetentionVacuum.test.ts` (A8-e leg 2). The file stays ≤ 1,000 lines
   (soft target 950, C9.1).

#### A8-g — `tests/integration/server/task551RetentionJobService.test.ts:156` (Addendum A1, 06-L02 R13-4 (i))

This file is 06-L03-owned (`allowlist` `:326`); the edit is this leaf's. Working-tree line `:156`
reads:

> `select coalesce((select n_tup_del::int from pg_stat_user_tables where relname = ${relname}), 0) as n`

It becomes:

```ts
select coalesce((select n_tup_del::int from pg_stat_user_tables where relname = ${relname} and schemaname = current_schema()), 0) as n
```

With one `bun_worker_*` schema per lane worker the unqualified scalar subquery can return several
rows ("more than one row returned"). It is the only `relname` lookup in the file (`:154-156`;
`grep -c relname` = 2, both inside `deletedTupleCount`). No test title, assertion or count changes;
the airtight form keeps 9 skips by name and the owner map 0 fail, 0 skip (A7).

#### A8-h — Land order, gates, stop rules and receipt

Land order (02-L02 R9.12 `:3799-3813`): step 1 (02-L02 R7 + R8 + R9 code, including the D1 seam) and
step 3 (06-L02 R8-R13, including `getRevisionFamilyTableName`) land before this leaf. A8 lands in
step 4, in the same 06-L03 dispatch as R1, AFTER the R1 code and both A1 splits (the co-resident
host file must exist). The pre-step code starts only when D1's F27 and RD13 receipts are green
(06-L02 R13-3 prerequisite 1, `:4452-4455`).

Gates (implementer, fast forms):

1. `./node_modules/.bin/eslint --max-warnings=0` on every A8-touched file.
2. `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/maintenance/partitionReadinessService.test.ts tests/vitest/maintenance/preRetentionVacuumPlan.test.ts` — 0 fail, 0 skip.
3. Airtight Bun, one invocation each: `preRetentionVacuum.test.ts` alone;
   `retentionScheduler.test.ts` alone; `task551RetentionJobService.test.ts` alone; and the
   two-file command form of A8-e. Counts as A8-e and A7.
4. `wc -l` on every touched file (each ≤ 1,000) and `git diff --check`.

Orchestrator (between phases): `bun --cwd core lint:types`; the owner-map forms of gate 3 and of the
Vitest pair, serialized under D9 (at most one `coderso02` DB gate at a time, family-wide).

Stop rules. The implementer STOPS and reports when:

- `runDedicatedMaintenanceStatement` is not exported by `core/db/client.ts`, or its F27/RD13
  receipts are not green;
- `getRevisionFamilyTableName` is not exported by `revisionRetentionService.ts`;
- a non-loss server rejection from the landed seam does not carry the SQLSTATE in `code` (A8-d);
- the `:156` predicate is not the only unqualified `relname` lookup when the edit is made;
- the co-resident pair cannot pass in both orders without a close/reset call forbidden by A8-e;
- any touched file would exceed 1,000 lines, or `retentionScheduler.test.ts` would after the A8-f
  edits.

Receipt: the R1-e receipt addendum in `_docs/_workflows/_smoke/task-551/impl-06-l03.json` also
records the A8 files (bytes, lines, sha256), the per-file counts of gates 2-3 in both forms, and
`coldStatePolicy` in the 06-L02 R13-1 shape (`TASK-551-06-L02-…md:4306-4318`). This task file
records the contract only.

#### Superseded sentences (A8)

1. `:30-39`, **Exact File Ownership** lists: "**Production/tooling:**
   `core/services/maintenance/retentionJobService.ts`,
   `core/services/maintenance/partitionReadinessService.ts`,
   `core/server/jobs/retentionScheduler.ts`, and
   `scripts/task-551-partition-readiness.ts`." and "**Tests:**
   `tests/vitest/maintenance/partitionReadinessService.test.ts`,
   `tests/integration/runtime/retentionScheduler.test.ts`,
   `tests/integration/server/task551RetentionJobService.test.ts`,
   `tests/perf/database-retention-jobs.test.ts`, and
   `tests/perf/database-partition-readiness.test.ts`." Now read with the A1 splits and the four A8
   paths (A8-a item 1) added to their lists.
2. `:41`, "No other path may be edited." Now reads: no path outside the envelope `allowlist`
   (`:319-331`) may be edited.
3. `:1284-1285` (R1 amendments preamble), "The Workflow Dispatch Envelope is edited in place ONLY as
   recorded in A1-0." and `:1437-1438` (round-2 preamble), "The Workflow Dispatch Envelope is
   edited in place ONLY as recorded in A4-0." Each is read as scoped to its own round; the
   2026-09-26 fence edit is recorded in A8-a.
4. `:1411-1412` (A2), "`TASK-551-06-L04` is not allocated. No file under `_docs/_TASKS/` references
   it apart from R1-d above." Now reads: `TASK-551-06-L04` is not allocated; the id is reserved for
   "Per-parent retention batching" (06-L02 R12-2 (a), R12-5 (e) `:4105-4111`), a different purpose
   from the superseded R1-d proposal, and 06-L02 references it; reserving it reuses no retired
   number.
5. `:1256`, R1-e gate 1,
   "`env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/maintenance/partitionReadinessService.test.ts`."
   Now: A8-h gate 2 (both Vitest files).
6. `:1460` (round-2 A4), "Decision: one command and one Bun process per test file." Now: one
   command and one Bun process per test file, except the A8-e co-resident pair in
   `retention-scheduler-real-db-test`.
7. `:1466-1469` (A4-0 item 1), "Each has `lane` `bun-test`, `environmentProfile` `task551-db-test`,
   and argv `["bun", "--env-file=/dev/null", "test", "<file>"]` (4 tokens, no shell
   metacharacters). Each `positiveDiscovery` is `test-paths` with `paths` `["<file>"]` and `minimum`
   `1`, which equals the path count:" Now: true for five of the six commands;
   `retention-scheduler-real-db-test` has 5 argv tokens, two paths and `minimum` `2` (A8-a item 3).
8. `:1480` (A4-0 item 2), "`partition-readiness-vitest` keeps its id, lane, `none` profile and
   discovery." Now: it keeps its id, lane and `none` profile; its argv and discovery gain the pure
   pre-step suite, `minimum` `2` (A8-a item 2).
9. `:1501-1502` (A4-0 item 5), "Checks: the fence is valid JSON; every argv has 5 tokens or fewer;
   every non-`none` command starts `bun --env-file=/dev/null`; every `minimum` equals its path
   count." Now: every argv has 6 tokens or fewer (the Vitest command has 6); the other checks
   stand.
10. `:1516-1517` (A4-1, A1-b "Order independence" replacement), "Now reads: each file runs in its
    own process, so no file can inherit another file's ended clients or affinity memo." Now: true
    for every Bun file except the A8-e pair, which shares one process under the A8-e co-residency
    rules.
11. `:1605`, "Each of the six files runs in its own process in two forms:" Now: each of the seven
    Bun files runs in two forms, one process per command; the A8-e pair shares its command's
    process.
12. `:1623`, "The Vitest file (R1-e gate 1) also needs 0 fail and 0 skip." Now: both Vitest
    files (A8-h gate 2) need 0 fail and 0 skip.

Superseded count: 12 items, 14 quoted sentences (items 1 and 3 quote two each).

#### A8-i — Cross-file notes (each belongs to its owner; none is edited here)

- `TASK-551-06-L02` R13-3 prerequisite 2 (`:4456-4476`): realized by A8-a with argv additions
  instead of two new commands and an `occurrences` change (Addendum A2). R13-9 (`:4775-4796`) and
  R13-5's stop rule resolve to "not 06-L02's edit" (Addendum A1).
- `TASK-551-01-L01`: the four new paths, the seam call sites in `preRetentionVacuum.ts` and the
  `sql.unsafe` adapter join the inventory and the lane tables through the growth rule when they
  land; `task551RetentionJobService` becomes lane-safe by A8-g ("fixed by 06-L03 A8", Addendum A1).
- `TASK-551-10-L02`: the runbook and env handoff gain the pre-step outcomes, log names, cost note
  (A8-d) and the "fixed by 06-L03 A8" wording (Addendum A1).
- `TASK-551-10-L01` (`:1321`) still runs `retentionScheduler.test.ts` with the later files in one
  process (round-2 A4-1 handoff); A8 does not change that finding.
- `TASK-551-02-L02`: no new handoff; R9.1's error surface already meets R13-7 (A8-d).

#### A8-j — 2026-09-26 fix pass (orchestrator Addendum D-9)

Append-only. This item executes Addendum D-9 of the orchestrator dispositions
(`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`) together
with the decisions it names there (C2, D5, D-1, D-4, D-5, D-7); it re-decides nothing. Anchors to
this file are working-tree lines after the relabel (the note at `:1627` added two lines, so each
A8 line sits two lines below the writer's first numbering). 02-L02 anchors are HEAD `420bb24a`
plus the working tree. 06-L02 R14 and 02-L02 R10 are being written concurrently and are cited by
item id only. Where a J item quotes a sentence, the J item wins; every quote is listed in
**Superseded sentences (A8-j)**. Everything not quoted stays binding.

**J1 — A8-g wording (D-9).** On a lane-runner worker database the unqualified scalar subquery
returns one row per `bun_worker_*` schema (one per lane worker) plus `public`, because every schema
that holds the table has its own `pg_stat_user_tables` row for that `relname`. With more than one
such row it raises "more than one row returned by a subquery used as an expression" (SQLSTATE
`21000`). The `schemaname = current_schema()` predicate leaves at most one row, and `coalesce`
maps no row to `0`. The A8-g edit itself is unchanged.

**J2 — Logger path (D-9).** The pre-step logs reach the scheduler's `RetentionSchedulerLogger` only
as the `log` argument of `createDefaultRunRetentionPlan` (J6):

1. The engine passes its resolved logger. `const log = deps.log ?? defaultLogger;`
   (`retentionScheduler.ts:479`) moves above the `runPlan` line (`:478`), so the value exists
   when the default runner is built.
2. The default runner forwards `log` unchanged in the `runPreRetentionVacuum` input. The lazy-deps
   layer passes it through unchanged to the pure loop's input.
3. The pure module types the logger structurally (`info` and `warn`, each
   `(message: string, details: Record<string, unknown>) => void`). It does not import from
   `core/server/*`.

A runner injected through `RetentionSchedulerDeps.runRetentionPlan` runs no pre-step and emits no
pre-step log (A8-b **Call site**).

**J3 — Land order (supersedes A3's steps and the first A8-h sentence).** The binding order is
02-L02 R9.12 (`TASK-551-02-L02-…md:3799-3807`). R9.12 replaced R8.9 `:3242-3250`, which replaced
R7.11 `:2608-2614`.

0. Prerequisite: the 02-L01 dated note (docs; R9.10, D7) lands before any 02-L02 R7/R8/R9 code is
   dispatched.
1. 02-L02 R7 + R8 + R9 code, including the R9.1 seam (D1), with the 02-L02 R10 amendments (D-1 to
   D-4, D-8) that apply to that code.
2. The 02-L01 source change (default 3, `2..6`, fleet formula, ceiling comment), executed by a
   02-L01 implementer mandate (dispositions Addendum A3: allowlist `core/db/databaseConfig.ts` and
   `tests/vitest/db/databaseConfig.test.ts`).
3. 06-L02 R8-R13 as amended by R14, including `getRevisionFamilyTableName`.
4. 06-L03 R1 (R1-a … R1-c4 and both A1 splits), together with:
   - the **R7.11 re-point** (`TASK-551-02-L02-…md:2565-2591`): the R1-c helper is
     `drizzleForDedicatedTransaction`, not `withPoolOptions`; the `:190`/`:201`/`:214` builders
     retype to `DedicatedDatabaseTransaction`; the `:170-179` collision comment says no probe key
     exists; the boundary maps `transaction_aborted`, `transaction_nested` and
     `drain_unconfirmed`; the `retentionScheduler.test.ts` overrides and pool fakes move to
     `dedicatedClientFactory`; the `session` leg expects `database_maintenance_session_unavailable`
     with zero factory calls; the inventory row `[0, 551551551]` is removed;
   - the **R8.9 flips** (`:3108-3174`): the superseded startup sentences of this file (`:123-132`,
     `:187-195`), the A6 import pin list (`:3143-3148`) and the `retentionScheduler.test.ts`
     re-baselines (`:3149-3174`);
   - R9.9 (`:3722-3758`), as dispositioned in A8-f and amended by J7;
   - A8, after the R1 code and both A1 splits. The pre-step code starts only when D1's F27 and
     RD13 receipts and the 02-L02 R10 F27 sub-legs for D-1 (57014/55P03 rethrown unchanged) and
     D-2 (a)/(b) are green.
5. The combined gates: the A8-h implementer gates, then the orchestrator's owner-map forms on
   `DATABASE_URL3` (`coderso02`) with `DB_LOCK_TIMEOUT_MS=15000`, one command per A4-0/A8-a entry,
   serialized under D9 (at most one `coderso02` DB gate at a time, family-wide).
6. At least two post-auditors per scope; A8 gets its own pair (dispositions Addendum A6).

No step-5 gate starts before steps 0-4 have landed. Before then, a red leg of 02-L02, 06-L02 or
this leaf is expected and is not a finding.

**J4 — Statement floor source (D-4).** The lazy-deps layer binds
`statementFloorMs = effectiveDedicatedStatementBoundMs()`, exported by `core/db/client.ts`
(02-L02 R10; it honours `setDatabaseClientRuntimeForTests`). It is read per run, not memoized, and
is the single floor for three uses: the two catalog-read bounds, the per-call `budget_exhausted`
check, and the D-5 `2 ×` precondition (J8). The seam rejects a bound `< 1` or `> 120_000` with
`database_maintenance_statement_bound_invalid` (never a skip) and raises a bound in
`[1, floor)` to the floor. The pre-step never passes a bound below the floor (A8-b **Bound**
stands). The statement adapter is `(sql) => sql.unsafe(renderedText)`, used for the VACUUM and
both catalog reads, with no parameter array and the rendered bytes unchanged. Those call sites
also join `_docs/_workflows/_smoke/task-551/inventory-rebase-kit/` (D-4); this leaf adds no
inventory-test expectation.

**J5 — Seam-rejection mapping (D-1, option (a)).** R9.1's unchanged rethrow is the error surface.
02-L02 R10 owns the related 02-L02 change: `55P03` joins the R7.3 not-loss list, and an F27
sub-leg pins `57014` and `55P03` as rethrown unchanged. That is 02-L02's own item, not a 06-L03
handoff.

- The pure module `preRetentionVacuumPlan.ts` owns the closed input and the result shape:

  ```ts
  export type PreRetentionVacuumRejection = Readonly<
    | { kind: "unavailable" | "lost" | "bound_invalid" | "reserve_timeout" | "other" }
    | { kind: "sqlstate"; sqlstate: "57014" | "55P03" }
  >;
  export type PreRetentionVacuumStatementResult =
    | Readonly<{ ok: true; rows: readonly Readonly<Record<string, unknown>>[] }>
    | Readonly<{ ok: false; rejection: PreRetentionVacuumRejection }>;
  ```

- The lazy-deps module `preRetentionVacuum.ts` exports `mapSeamRejection(error: unknown)`. It reads
  ONLY the `code` property, and only when `error` is a non-null object whose `code` is a string.
  It never reads `message`, `detail`, `hint`, `query`, `parameters` or `where`. It returns a
  fresh frozen object whose only keys are `kind`, plus `sqlstate` for the `sqlstate` kind:

  | `code` | Input |
  | --- | --- |
  | `DATABASE_CLIENT_ERROR_CODES.maintenanceSessionUnavailable` | `{ kind: "unavailable" }` |
  | `DATABASE_CLIENT_ERROR_CODES.dedicatedSessionLost` | `{ kind: "lost" }` |
  | the R9.1 `database_maintenance_statement_bound_invalid` constant | `{ kind: "bound_invalid" }` |
  | `DATABASE_CLIENT_ERROR_CODES.reserveTimeout` | `{ kind: "reserve_timeout" }` |
  | `"57014"` or `"55P03"` | `{ kind: "sqlstate", sqlstate: <code> }` |
  | anything else, a non-string `code`, no `code`, or a non-object | `{ kind: "other" }` |

- The adapter is the only caller of the seam, and it never lets a mapped rejection escape as a
  throw:

  ```ts
  const runStatement = async ({ signal, statementTimeoutMs, text }) => {
    try {
      const rows = await runDedicatedMaintenanceStatement({
        signal, statementTimeoutMs, statement: (sql) => sql.unsafe(text),
      });
      return { ok: true, rows };
    } catch (error) {
      if (signal.aborted) throw error; // A8-b: rethrown unchanged
      return { ok: false, rejection: mapSeamRejection(error) };
    }
  };
  ```

- The pure `classify(rejection, signal)` works on that input only. `signal.aborted` → abort
  (throw `new Error("retention_pre_vacuum_aborted")`), checked first. `unavailable` → the current
  and every remaining family get `skipped_session_unavailable`. `sqlstate` `55P03` →
  `skipped_concurrent`. `sqlstate` `57014` → `failed_statement_timeout`. `lost`, `bound_invalid`,
  `reserve_timeout` and `other` → `failed` with the closed code `dedicated_database_session_lost`,
  `database_maintenance_statement_bound_invalid`, `database_pool_reserve_timeout` or
  `retention_pre_vacuum_error`, respectively. These four are the complete `failed` code set. The
  pure module owns them as literals because it imports nothing from `core/db/*`.
- Bun pin, `preRetentionVacuum.test.ts` leg 2 (DB-free; replaces the ordering leg, which moves per
  J7):
  - every table row above;
  - an error object whose `message`, `detail`, `hint`, `query`, `parameters` and `where` are
    throwing getters maps without throwing (proof that only `code` is read);
  - `{ message: "database_maintenance_session_unavailable" }`, `{ code: 57014 }`, `null`,
    `undefined` and the string `"57014"` each map to `other`;
  - `Object.keys(result)` is exactly `["kind"]`, or `["kind", "sqlstate"]` for the `sqlstate`
    kind;
  - the pure module's four `failed` code literals equal their `core/db/client.ts` constants.
- Vitest leg 3 runs on the closed input only: with every kind and `signal.aborted` true, abort
  wins; otherwise every kind gets its outcome and code as above. The "logs none of the server
  `message`" check moves to the Bun pin, because the pure input has no message.
- The A8-h stop rule on a non-carrying `code` stands. The implementer also STOPS when the 02-L02
  R10 F27 sub-leg for `57014`/`55P03` is not green.

**J6 — Default runner shape (D-7 mechanism, D-5 precondition).** With the J7 mechanism, the
runner needs no `steps` injection and no export:

```ts
// retentionScheduler.ts — the only scheduler change (module-private, as today at :397)
function createDefaultRunRetentionPlan(
  maxRunMs: number,
  intervalMs: number,
  clock: () => number,
  log: RetentionSchedulerLogger
): RetentionPlanRunner {
  return async ({ now, signal }) => {
    const { planMaxRunMs } = await runPreRetentionVacuum({
      runStartedAtMs: now.getTime(), maxRunMs, intervalMs, signal, clock, log,
    });
    return runRetentionPlan(now, signal, { maxRunMs: planMaxRunMs });
  };
}
// engine: `const log = deps.log ?? defaultLogger;` first (J2), then
// deps.runRetentionPlan ?? createDefaultRunRetentionPlan(config.maxRunMs, config.intervalMs, now, log)
```

`now` (the scheduler-supplied `Date`) is passed unchanged as the plan's first argument, and
`runStartedAtMs = now.getTime()` (D-5). The pure loop reads the clock as integer milliseconds
(`Math.floor(input.clock())`; `Date.now` by default, D-5).

**J7 — Scheduler-ordering leg: injection mechanism (D-7).** The airtight ordering leg uses the
R9.9 fake `dedicatedClientFactory` under a placeholder URL. Installing it needs
`setDatabaseClientRuntimeForTests`, which A8-e forbids in the co-resident file. The leg therefore
lives in `tests/integration/runtime/retentionScheduler.test.ts`, as a sibling of the
default-binding leg (`:900-945`), using the file's `withFakeClient` idiom:

- Override:
  `{ config: CHANNEL.direct, maintenanceUrl: "postgres://task551-sched.invalid:5432/task551sched", dedicatedClientFactory: <fake> }`
  (the R8.9 placeholder). For every factory call, the fake records the ordered `command` tags
  (the upper-cased first keyword of each statement: `SELECT`, `VACUUM`, `BEGIN`, `COMMIT`). Its
  answers:
  - privilege read: `[{ relname: <table>, permitted: true }]`;
  - VACUUM: `[]`;
  - effectiveness read: `[{ relname: <table>, relpages: 0, relallvisible: 0 }]`;
  - the plan's session: the R9.9 fake shape (identity pid, `OWNER_LOCK` responder per D-8).
- Environment: exactly one family enabled in dry-run, with `process.env` saved and restored as in
  the `:900-945` leg. Scheduler env: interval `600000`, and `maxRun` at least
  `2 × effectiveDedicatedStatementBoundMs()` under the override (for example `300000`).
- Leg "ordering": the pre-step makes the first three factory calls, with tags `[SELECT]`,
  `[VACUUM]` and `[SELECT]`, each client ended before the next call. Every plan factory call comes
  after them. `retention_pre_vacuum_completed` reports `ran` for the family and is logged before
  the plan's `runCompleted`.
- Leg "interval too short": the same setup with interval `60000`. It makes zero pre-step factory
  calls (no `VACUUM` tag anywhere), the family's outcome is `interval_too_short`, and the plan
  runs.
- Leg "abort before plan": the fake's VACUUM result stays pending until `end({ timeout: 0 })`
  rejects it, as postgres.js does (D-3). `controller.stop()` during the pending VACUUM ends in the
  scheduler's `aborted` outcome, and no plan factory call happens.
- These legs land together with, or after, the A1-b split (the file is at 998 lines before it;
  D-8). The ≤ 1,000 check applies in that step, and the A8-h stop rule stands.
- `preRetentionVacuum.test.ts` keeps its four legs. Leg 2 is now the J5 mapping pin, so the A8-e
  count row ("legs 1-2 pass", two DB legs skipped by name airtight) stands unchanged.

**J8 — Pre-step precondition and budget (D-5; mirrored from 06-L02 R14).** Zero enabled families
still means zero seam calls and no log. Otherwise, before the privilege read:

1. `input.intervalMs < 600_000` → every enabled family gets `interval_too_short`, and no seam call
   is made.
2. Otherwise, `input.maxRunMs < 2 × statementFloorMs` → every enabled family gets
   `budget_exhausted`, and no seam call is made.
3. Otherwise, the per-call budget applies. The named reserve `CALL_OVERHEAD_MS`
   (`POOL_ACQUISITION_DEADLINE_MS + DEDICATED_OPEN_DEADLINE_MS + DEDICATED_STATEMENT_GRACE_MS +
   DEDICATED_DRAIN_DEADLINE_MS`) is subtracted before each bound is computed. The lazy-deps layer
   supplies the reserve to the pure loop as a dependency. The "at least half the run budget" goal
   for the plan is best-effort by that overhead.

In all three cases the plan still runs with the unchanged `finish()` rule. `interval_too_short`
joins the closed outcome set of A8-c, and the completion log lists it. Retention at the 60 s
minimum interval therefore runs WITHOUT the pre-step (the D-5 residual row, owned by R14). The
literal names, their placement and the arithmetic belong to 06-L02 R14. If R14 as landed differs
from J8, R14 wins, and the implementer STOPS and reports the mismatch before coding. Vitest leg 5
gains these cases:

- `intervalMs` `599_999` → `interval_too_short`, zero calls; `600_000` → proceeds;
- `maxRunMs` `2 × floor − 1` → all `budget_exhausted`, zero calls; `2 × floor` → proceeds;
- every bound includes the `CALL_OVERHEAD_MS` reserve.

**J9 — Abort DB leg shape (D-7; replaces A8-e Bun leg 4).** The leg runs in
`tests/integration/runtime/preRetentionVacuum.test.ts`:

1. Leg table `t551pv_abort_<run marker>` in `current_schema()`, with a few rows. One enabled family
   is injected through `overrides.tableNameOf`, and the leg uses the REAL seam. No leg VACUUMs or
   locks a shared family table.
2. Lock holder: the leg's own `max: 1` client on the fixture URL. It is not `db`, not the seam and
   not the observer. It issues the literal statements `begin` and then
   `lock table "<leg table>" in share update exclusive mode` through `unsafe`, each awaited, so
   both run on its single backend and the transaction stays open. `sql.begin(callback)` is not
   used.
3. Observer: a different connection (the file's own observer client), in autocommit. It polls
   every 50 ms, with a 5,000 ms cap (reaching the cap fails the leg):
   `select pid, backend_start::text as started from pg_stat_activity where datname = current_database() and application_name = $1 and wait_event_type = 'Lock' and position($2 in query) > 0`.
   - `$1` is `buildDatabaseApplicationName("maintenance", parseDatabaseApplicationIdentity(process.env, parseDatabaseRuntimeConfig(process.env).fleet).replicaId)`,
     the same inputs as `core/db/client.ts:48` and `:111`.
   - `$2` is the leg table name.
   - Exactly one row must match; otherwise the leg fails.
4. `lock_timeout`: the leg runs on the owner map with `DB_LOCK_TIMEOUT_MS=15000`, which is the
   seam's startup `lock_timeout`. The VACUUM therefore keeps waiting past both the 5,000 ms cap and
   the 4,500 ms settle bound. The airtight form skips this leg by name.
5. Abort. The pre-step promise rejects with the abort: either the raw seam rejection (A8-b) or
   `retention_pre_vacuum_aborted`, and never a failure or skip outcome. It must settle within
   4,500 ms of the abort call. At settlement the observer finds no row with the recorded `pid` plus
   `backend_start`.
6. `finally`, in this order: the holder runs `rollback`, then the holder client ends, then the
   observer drops the leg table (the drop needs the holder's lock released).

**J10 — 06-L04 reservation (D5).** `TASK-551-06-L04` is not allocated. Dispositions D5 reserves the
id, and the parent records the reservation under D9. It is reserved for "Per-parent retention
batching" (06-L02 R12-2 (a), R12-5 (e)), a different purpose from the superseded R1-d proposal, and
06-L02 references it. Reserving it reuses no retired number. Allocating it later:

- updates the family inventory pins from 41 to 42 (the literal `taskFileCount: 41,`);
- requires a Workflow Dispatch Envelope whose `dependencies` include `TASK-551-06-L03:single` or a
  later step, and whose dispatch position precedes `TASK-551-10-L02:single`.

Until then the family preflight stays 41/11/29/33.

**J11 — Remaining consequences.**

- Naming: A8's items now run from `A8-a` to `A8-j`.
- A8-h stop rules gain three cases. The implementer STOPS when:
  - `effectiveDedicatedStatementBoundMs` is not exported by `core/db/client.ts`;
  - the 02-L02 R10 F27 sub-legs named in J3 step 4 are not green;
  - 06-L02 R14 as landed differs from J8.
- A8-i, `TASK-551-02-L02` bullet: 02-L02 needs no new handoff from this leaf. D-1's 02-L02 items
  (55P03 in the not-loss list, the F27 sub-leg) belong to 02-L02 R10 (J5).
- Cross-references read "06-L03 A8 (2026-09-26)", never "06-L03 A4" (dispositions C2).

**Superseded sentences (A8-j)** (quoted verbatim; line = current working-tree anchor)

1. `:1418-1420` (A3 item 1), "**02-L02 re-open code**: `TASK-551-02-L02` "Dated Contract
   Corrections — 2026-09-25 (re-open: reserved-session transactions)", `:1025`, R2-R4. It fixes
   the `ReservedSql` `begin` calls and exports the options-attaching helper." Now: J3 steps 0-1.
2. `:1421` (A3 item 2), "**06-L02 R8 + R9 code**: R8-1 test defects, plus the R9 candidate-SQL
   semi-join pre-filter (A2)." Now: J3 step 3.
3. `:1422` (A3 item 3), "**06-L03 R1 code**: R1-a, R1-a2, R1-a3, R1-b, R1-c, R1-c4, including the
   two A1 splits." Now: J3 step 4, with the R7.11 re-point, the R8.9 flips, R9.9 and A8.
4. `:1423` (A3 item 4), "**Gates for all three**". Now: J3 step 5 (gates for every step). Its
   environment sentence stands, as amended by A4-1.
5. `:1428`, "Nothing in step 4 starts before steps 1-3 have all landed." Now: no step-5 gate
   starts before steps 0-4 have landed (J3).
6. `:1411-1412` (A2), "`TASK-551-06-L04` is not allocated. No file under `_docs/_TASKS/`
   references it apart from R1-d above." Now: J10.
7. `:2067-2071` (Superseded sentences (A8) item 4), "Now reads: `TASK-551-06-L04` is not
   allocated; the id is reserved for "Per-parent retention batching" (06-L02 R12-2 (a), R12-5 (e)
   `:4105-4111`), a different purpose from the superseded R1-d proposal, and 06-L02 references it;
   reserving it reuses no retired number." Now: J10, which adds the D5 allocation terms.
8. `:1645-1646` (A8 Naming), "Items below are lettered (`A8-a` … `A8-i`) so they never collide
   with `A4-0`/`A4-1`." Now: lettered `A8-a` … `A8-j` (J11).
9. `:1747-1749` (A8-c), "`statementFloorMs` = `parseDatabaseRuntimeConfig(process.env).statementTimeoutMs`
   (`core/db/databaseConfig.ts:270`, `:293-299`), evaluated once on first use (the same pure owner
   parser `client.ts:21` runs at import, so the value equals the seam's clamp floor);" Now: J4.
10. `:1749-1751` (A8-c), "`runStatement` = the D1 seam with the adapter `(sql) => sql.unsafe(text)`,
    where `text` is exactly the pure renderer's output and no parameter array is passed (R13-2:
    the bytes do not change)." Now: the J5 adapter (same bytes, with a mapped result).
11. `:1774-1777` (A8-c), "A `failed` outcome carries one closed `code`: the rejection's
    `DATABASE_CLIENT_ERROR_CODES` value when it is one (`database_pool_reserve_timeout`,
    `dedicated_database_session_lost`, `database_maintenance_statement_bound_invalid`, …), else
    `retention_pre_vacuum_error`." Now: the four-code set of J5.
12. `:1777-1780` (A8-c), "Logs: one `log.info("retention_pre_vacuum_completed", { families:
    [{ family, outcome }] })` per run with at least one enabled family, and one
    `log.warn("retention_pre_vacuum_failed", { family, code })` per failed family, through the
    scheduler's `RetentionSchedulerLogger`." Now: the same logs, reaching the loop per J2.
13. `:1787-1791` (A8-c pseudocode), "`export function createDefaultRunRetentionPlan(`" and
    "`steps: DefaultRetentionRunSteps = { runPreRetentionVacuum, runRetentionPlan }`". Now: J6
    (module-private, with no `steps`).
14. `:1795` (A8-c pseudocode), "`runStartedAtMs: now.getTime(), maxRunMs, signal, clock, log,`".
    Now: J6 (the input gains `intervalMs`).
15. `:1800` (A8-c pseudocode), "`// engine (:478): deps.runRetentionPlan ?? createDefaultRunRetentionPlan(config.maxRunMs, now, log)`".
    Now: J6 (`config.intervalMs` added; `log` declared first, J2).
16. `:1806` (A8-c pseudocode), "`const shareMs = () => runDeadlineAt - input.clock() - planFloorMs;`".
    Now: the J8 precondition, the `CALL_OVERHEAD_MS` reserve and the integer clock (J6), per 06-L02
    R14.
17. `:1852-1857` (A8-d), "`classify(error, signal)`: `signal.aborted` → `abort` (checked first,
    whatever the rejection); `error.code === "database_maintenance_session_unavailable"` →
    `unavailable`; the rejection's SQLSTATE property `error.code === "57014"` → `sqlstate_57014`;
    `error.code === "55P03"` → `sqlstate_55P03`; anything else → `other`." Now: `classify` takes
    the J5 closed input; `mapSeamRejection` does the `code`-only read. The sentences "Only the
    `code` property is read …" and "06-L03 never parses server messages" stand for the mapping.
18. `:1860-1861` (A8-d), "That satisfies R13-7's closed-value condition (`:4735-4738`); no 02-L02
    handoff is recorded." Now: the condition is met by D-1 option (a); the 02-L02 side is
    02-L02 R10's own item (J5).
19. `:1882-1886` (A8-e Vitest leg 3), "`classify`: abort wins over every rejection;
    `database_maintenance_session_unavailable` skips the current and remaining families and issues
    no further call; `57014` → `failed_statement_timeout`; `55P03` → `skipped_concurrent`;
    `database_maintenance_statement_bound_invalid` → `failed` (never a skip); a rejection carrying
    a server `message` logs none of it;" Now: the J5 Vitest leg 3 over closed inputs, with the
    message check in the Bun pin.
20. `:1905-1907` (A8-e Bun leg 2), "scheduler ordering (DB-free): `createDefaultRunRetentionPlan`
    with injected `steps` — the plan fake is not called until the pre-step fake settles, receives
    the returned `planMaxRunMs`, and is never called when the pre-step rejects with an aborted
    signal;" Now: leg 2 is the J5 mapping pin; the ordering legs are J7's, in
    `retentionScheduler.test.ts`.
21. `:1914-1921` (A8-e Bun leg 4), "DB leg "abort" — 06-L02 R13-1 **DB leg for the abort**
    (`:4264-4286`) verbatim: a leg-owned table with a few rows; the observer holds `LOCK TABLE
    <leg table> IN SHARE UPDATE EXCLUSIVE MODE` in an open transaction; the pre-step starts with
    its own `AbortController` and the REAL seam; bounded 50 ms polling of `pg_stat_activity` until
    a backend on the current database shows `wait_event_type = 'Lock'` and a query starting with
    `VACUUM`, recording its `pid` and `backend_start`; abort; the promise rejects with the abort
    within 4,500 ms of the abort call and, by settlement, no row matches that `pid` plus
    `backend_start`; `finally` rolls back the holder and drops the table." Now: J9.
22. `:1990-1992` (A8-f item 6), "No pre-step leg is added to this file (it is at 998 lines before
    A1-b); the pre-step's scheduler ordering leg lives in `preRetentionVacuum.test.ts` (A8-e leg
    2)." Now: the J7 legs are added to this file, together with or after A1-b, under the ≤ 1,000
    check. The file's other A8-f rules stand.
23. `:2007-2008` (A8-g), "With one `bun_worker_*` schema per lane worker the unqualified scalar
    subquery can return several rows ("more than one row returned")." Now: J1.
24. `:2014-2016` (A8-h), "Land order (02-L02 R9.12 `:3799-3813`): step 1 (02-L02 R7 + R8 + R9 code,
    including the D1 seam) and step 3 (06-L02 R8-R13, including `getRevisionFamilyTableName`) land
    before this leaf." Now: J3 (all of R9.12 steps 0-6; anchor `:3799-3807`).
25. `:2114` (A8-i), "`TASK-551-02-L02`: no new handoff; R9.1's error surface already meets R13-7
    (A8-d)." Now: J11.

Superseded count (A8-j): 25 items, 26 quoted sentences (item 13 quotes two).
