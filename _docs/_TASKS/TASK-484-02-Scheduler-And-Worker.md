# TASK-484-02: Scheduler & Worker (run due backups)
# FileName: TASK-484-02-Scheduler-And-Worker.md

**Parent Task:** TASK-484
**Priority:** High
**Category:** `backups` / `runtime-jobs`
**Estimated Effort:** Large
**Dependencies:** TASK-484-01 (needs `backup_schedules.next_run_at` /
`last_run_at`, `computeNextRunAt`, `markScheduleRun`). Triggers TASK-484-03
(retention) after each run — soft dependency; the worker feature-detects
`pruneExpiredBackups` at runtime (guarded dynamic lookup, no static import), so
it typechecks and no-ops until 03 merges and calls it once it exists.
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

Make the stored schedule actually execute. The repo has **no scheduler/cron** —
only the in-process webhook queue (`core/server/jobs/webhooksDelivery.ts`). This
subtask adds a time-driven, in-process **backup scheduler job** that, on each
tick, checks whether the (single) schedule is enabled and due
(`next_run_at <= now`), runs `createBackup({ kind: "scheduled" })`, then persists
`last_run_at` + the recomputed `next_run_at` via `markScheduleRun`, and triggers
retention pruning.

It is started from the shared server bootstrap seam `startHttpServer()`
(`core/server/httpServer.ts:494`) — which BOTH `core/server/dev.ts` and
`core/server/prod.ts` call (`dockerStart.ts` is the Docker-only entry and just
imports `./prod`, so anchoring the start call there would leave the scheduler
dead in local dev and non-docker deployments). It is single-flight (in-process flag **and** a Postgres
advisory lock acquired/released on a **dedicated single-connection client**
(`postgres(url, { max: 1 })`), mirroring `runDrizzleStartupMigrations` — advisory
locks are session-scoped, so the pooled `core/db/client.ts` client must never be
used for them, and the due-check is re-verified after lock acquisition), is
env-gated **opt-in outside production** (`BACKUP_SCHEDULER_ENABLED` explicitly
truthy, or `NODE_ENV === "production"` — per the parent Scope rationale, so
multiple dev instances sharing the remote test DB do not all tick; see L01),
and exposes a deterministic `runDueScheduledBackups(now)` seam for tests.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| 484-02-L01 | `TASK-484-02-L01-In-Process-Backup-Scheduler-Job.md` | In-process scheduler job + bootstrap wiring | ✅ Done |
| 484-02-L02 | `TASK-484-02-L02-Scheduler-Tests.md` | Scheduler runtime + advisory-lock tests | ✅ Done |

**Implementation order:** L01 (job + `runDueScheduledBackups` + start/stop +
bootstrap hook) → L02 (Bun runtime tests).

---

## Dependencies

- TASK-484-01 columns + helpers.
- `core/server/jobs/webhooksDelivery.ts` (pattern), `core/server/httpServer.ts`
  (`startHttpServer()` — the shared bootstrap seam called by both `dev.ts` and
  `prod.ts`; `dockerStart.ts` imports `./prod` and inherits it),
  `core/server/startupMigrations.ts` (advisory-lock
  pattern), `core/services/backups/backupService.ts` (`createBackup`,
  `markScheduleRun`, `getBackupSchedule`).

---

## Testing Requirements

Bun lane (runtime + DB). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/integration/runtime/backupScheduler.test.ts` (new) — due/not-due
  by injected `now`; disabled schedule skipped; `next_run_at` advances after a
  run; single-flight in-process (overlapping ticks run once) AND cross-session
  (advisory lock held by a separate dedicated connection skips a due run; after a
  normal run a fresh session can acquire the lock, proving release); a scheduled
  `backups` row of `kind: "scheduled"` is created with an `audit_logs` entry
  (`actorId: null`, `metadata.source: "scheduler"`); retention invoked post-run;
  error in one tick does not stop the loop.
- **Shared remote test DB:** the suite tracks and deletes only backups it created
  (per-id) and snapshot/restores the singleton `backup_schedules` row — never
  whole-table deletes, never a leftover enabled schedule or held advisory lock
  (see L02).
