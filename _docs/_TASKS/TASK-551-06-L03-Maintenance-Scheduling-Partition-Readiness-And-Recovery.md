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
`tests/integration/database/retentionJobService.test.ts`,
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
async function runRetentionPlan(now: Date, deps: JobDeps): Promise<JobSummary> {
  return withDedicatedDatabaseSession(async lockSession => {
    const locked = await trySessionAdvisoryLock(lockSession, RETENTION_JOB_LOCK_ID);
    if (!locked) return { status: "skipped_locked", families: [] };
    try {
      const deadline = deps.clock.now() + deps.config.maxRunMs;
      // Verify the lock session before every batch. Each bounded family batch
      // uses its own short db.transaction and independently commits high-water;
      // there is no all-family transaction.
      return await runFamiliesSequentially(RETENTION_FAMILY_REGISTRY, deadline, deps);
    } finally {
      await bestEffortSessionAdvisoryUnlock(lockSession, RETENTION_JOB_LOCK_ID);
    }
  });
}

async function startRetentionScheduler(deps: SchedulerDeps): Promise<SchedulerController> {
  // Environment gated; no overlapping local ticks; unref timer; catch/redact;
  // initial jitter, fixed bounded interval, graceful stop-and-drain/test reset.
}

export function createRetentionSchedulerLifecycleParticipant(
  deps: SchedulerDeps
): RuntimeLifecycleParticipant {
  // Return fixed { id: "retention-scheduler", phase: "worker" }.
  // start is awaited/idempotent; close stops new ticks and awaits the in-flight
  // run exactly once. This function registers nothing by itself.
}

async function inspectPartitionReadiness(db: Db): Promise<PartitionReadinessReport> {
  // Allowlisted catalogs/tables only: size/live/dead rows, oldest/newest,
  // delete churn and projected growth; classify observe|plan, never execute DDL.
}
```

`core/db/client.ts` supplies exactly `DedicatedDatabaseSession` and
`withDedicatedDatabaseSession<T>(run)` from TASK-551-02-L02; this leaf must not
invent a second reserve/release helper. TASK-551-08-L03 alone calls
`registerRuntimeLifecycleParticipant(createRetentionSchedulerLifecycleParticipant(deps))`
from its sole HTTP/development composition, alongside the existing
`startBackupScheduler`/`stopBackupScheduler` adapter and cursor/cache startup.
The fixed participant ID is `retention-scheduler`, phase is `worker`, startup is
awaited after database/cache, and close stops new ticks then drains the current
run before cache/Redis/DB close. This leaf edits no composition or backup source,
registers nothing by itself, and installs no signal handler. Disabled/test
environments do not schedule. Exact variables are `RETENTION_SCHEDULER_ENABLED` (default false),
`RETENTION_SCHEDULER_INTERVAL_MS` (86,400,000; `60,000..604,800,000`),
`RETENTION_SCHEDULER_INITIAL_JITTER_MS` (30,000; `0..300,000` and no greater
than interval), and `RETENTION_SCHEDULER_MAX_RUN_MS` (300,000;
`1,000..3,600,000` and less than interval). Explicit malformed/out-of-range
values fail startup; TASK-551-10 owns `.env.example`. A failure records the last
successful high-water mark/counts and retries on the next tick; it never marks
partial progress as a full success. Errors are `retention_job_locked`,
`retention_job_timeout`, `retention_family_failed`, and
`partition_readiness_unavailable`.

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
  sanitized logs.
- Lifecycle integration imports only `registerRuntimeLifecycleParticipant`,
  the runtime lifecycle type/API, and this leaf's factory. It proves the factory
  returns fixed ID/phase, registers nothing itself, has awaited/idempotent start
  and close, drains an in-flight run, adds no signal owner, and preserves exact
  worker-before-cache-before-database close ordering when 08-style composition
  registers it.
- Two independent scheduler instances against one DB tick simultaneously;
  both acquire and release exactly one dedicated session to attempt the lock;
  exactly one obtains it and runs while the other reports `skipped_locked`.
  Pool active count returns to baseline. Connection loss aborts before another
  batch, releases the server-side lock, and the next tick succeeds.
- Inject family failure and deadline exhaustion; committed batch semantics,
  high-water marks, remaining families, and retry are deterministic.
- Prove each completed batch commits independently, there is no outer
  all-family transaction, and a later-family failure does not roll back an
  earlier committed high-water mark.
- Large fixtures prove total statements/deletes/time stay within configured
  family/run budgets; no request path invokes the job.
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
- `set -a && source .env && set +a && bun test tests/integration/runtime/retentionScheduler.test.ts tests/integration/database/retentionJobService.test.ts tests/perf/database-retention-jobs.test.ts tests/perf/database-partition-readiness.test.ts`
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
  are zero, both lock attempts release their dedicated sessions, pool use returns
  to baseline, and lock release/recovery succeeds on the next eligible tick.
- A run deletes at most the sum of explicit family budgets, respects the maximum
  runtime within one in-flight batch, and issues no unbounded DELETE.
- Scheduler failure leaks zero sensitive values and never prevents server start,
  backup scheduling, auth, or public anti-abuse.
- Readiness inspection executes only allowlisted catalog/aggregate reads and
  exactly zero partition/destructive statements; every `plan` result includes a
  separate-task/online-migration/rollback recommendation.
