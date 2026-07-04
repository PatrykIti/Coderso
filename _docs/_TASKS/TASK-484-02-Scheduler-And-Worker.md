# TASK-484-02: Scheduler & Worker (run due backups)
# FileName: TASK-484-02-Scheduler-And-Worker.md

**Parent Task:** TASK-484
**Priority:** High
**Category:** `backups` / `runtime-jobs`
**Estimated Effort:** Large
**Dependencies:** TASK-484-01 (needs `backup_schedules.next_run_at` /
`last_run_at`, `computeNextRunAt`, `markScheduleRun`). Triggers TASK-484-03
(retention) after each run — soft dependency; if 03 is not yet merged, the worker
calls a no-op-safe `pruneExpiredBackups` once it exists.
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

Make the stored schedule actually execute. The repo has **no scheduler/cron** —
only the in-process webhook queue (`core/server/jobs/webhooksDelivery.ts`). This
subtask adds a time-driven, in-process **backup scheduler job** that, on each
tick, checks whether the (single) schedule is enabled and due
(`next_run_at <= now`), runs `createBackup({ kind: "scheduled" })`, then persists
`last_run_at` + the recomputed `next_run_at` via `markScheduleRun`, and triggers
retention pruning.

It is started from the server bootstrap (`core/server/dockerStart.ts`, next to
`runStartupMigrations()`), is single-flight (in-process flag **and** a Postgres
advisory lock mirroring `runStartupMigrations`), is env-toggleable, and exposes a
deterministic `runDueScheduledBackups(now)` seam for tests.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| 484-02-L01 | `TASK-484-02-L01-In-Process-Backup-Scheduler-Job.md` | In-process scheduler job + bootstrap wiring | ⏳ To Do |
| 484-02-L02 | `TASK-484-02-L02-Scheduler-Tests.md` | Scheduler runtime + advisory-lock tests | ⏳ To Do |

**Implementation order:** L01 (job + `runDueScheduledBackups` + start/stop +
bootstrap hook) → L02 (Bun runtime tests).

---

## Dependencies

- TASK-484-01 columns + helpers.
- `core/server/jobs/webhooksDelivery.ts` (pattern), `core/server/dockerStart.ts`
  (top-level-await bootstrap), `core/server/startupMigrations.ts` (advisory-lock
  pattern), `core/services/backups/backupService.ts` (`createBackup`,
  `markScheduleRun`, `getBackupSchedule`).

---

## Testing Requirements

Bun lane (runtime + DB). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/integration/runtime/backupScheduler.test.ts` (new) — due/not-due
  by injected `now`; disabled schedule skipped; `next_run_at` advances after a
  run; single-flight (overlapping ticks run once); a scheduled `backups` row of
  `kind: "scheduled"` is created; retention invoked post-run; error in one tick
  does not stop the loop.
