# TASK-484-01: Schema & Schedule Run-Metadata (DB foundation)
# FileName: TASK-484-01-Schema-And-Schedule-Run-Metadata.md

**Parent Task:** TASK-484
**Priority:** High
**Category:** `backups` / `persistence`
**Estimated Effort:** Medium
**Dependencies:** None. Sequenced first because TASK-484-02 (scheduler) reads and
advances `next_run_at`, and TASK-484-05 (remote storage) needs `artifact_key` for
clean remote deletion. Schema/type changes land here; behaviour lands downstream.
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

Add the persistence + pure helpers the rest of the task builds on:

- `backup_schedules` gains **`next_run_at`** (timestamp, nullable) and
  **`last_run_at`** (timestamp, nullable) so the scheduler knows when a backup is
  due and records the last execution.
- `backups` gains **`artifact_key`** (text, nullable) — the storage object key for
  remote artifacts (local backups keep using the filesystem `artifact_path`),
  enabling robust remote deletion in TASK-484-05.
- `BackupSchedule` / `BackupRecord` types + `mapSchedule` / `mapBackup` carry the
  new fields; `getBackupSchedule` seeds `next_run_at`; `setBackupSchedule`
  recomputes it on relevant changes.
- A **pure** `computeNextRunAt(frequency, from)` calculator and a
  `markScheduleRun(scheduleId, runAt)` service helper.

This subtask is the only place the schema and the schedule types change; the
scheduler/retention/restore/remote leaves consume these.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| 484-01-L01 | `TASK-484-01-L01-Backup-Schedule-Run-Metadata-Columns.md` | Run-metadata + artifact-key columns & migration | ✅ Done |
| 484-01-L02 | `TASK-484-01-L02-Next-Run-Calculator-And-Schedule-Wiring.md` | `computeNextRunAt` + schedule service wiring | ✅ Done |

**Implementation order:** L01 (columns + migration + type fields) → L02 (pure
calculator + `getBackupSchedule`/`setBackupSchedule`/`markScheduleRun` wiring).

---

## Dependencies

- Drizzle schema + migration tooling (`core/db/schema.ts`,
  `core/db/migrations/*`, journal at version `"7"`; current max in this worktree
  is `0063_yummy_glorian`). **Pinned migration index for TASK-484: `0065`** —
  `0064` is owned by the parallel TASK-483 stream (analytics tables), which
  merges first. Do not use `0064` anywhere in this task.
- **Sync precondition (mandatory, before authoring the migration):** before
  TASK-484-01 authors its migration and runs `db:migrate`, the orchestrator
  syncs TASK-483's `0064` artifacts (the SQL file + `meta/0064_snapshot.json` +
  the `meta/_journal.json` entry) into this worktree so the journal stays
  gapless; only then is `0065` generated via drizzle-kit and `db:migrate` run.
- Existing backup domain (`core/services/backups/backupService.ts`,
  `backupTypes.ts`) — extended, not rewritten.

---

## Testing Requirements

Lanes split by dependency shape, per `_docs/TESTING_STRATEGY.md` and the
parent TASK-484 Testing Requirements: the **pure** `computeNextRunAt` cases
(no `Bun.*`, no DB) go to the **Vitest** lane —
`tests/vitest/backups/computeNextRunAt.test.ts`, run via `bun run test:vitest`
("Pure domain … `core/services/*` without `Bun.*`" → Vitest). Only the
DB-backed schedule-wiring / `markScheduleRun` / mapper coverage stays in the
Bun backups folder. Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun run test:vitest` — `tests/vitest/backups/computeNextRunAt.test.ts`
  (daily/weekly/monthly deltas, month rollover/clamp, same-day anchor).
- `bun test tests/unit/backups` — `mapSchedule`/`mapBackup` include new fields,
  `getBackupSchedule` seeds `next_run_at`, `setBackupSchedule` recomputes on
  enable/frequency change.
- **Shared remote test DB contract:** all three parallel streams (482/483/484)
  and the owner share ONE remote Postgres (`DATABASE_URL` in `.env`). DB-backed
  tests must use uniquely scoped fixtures and clean up only rows they created;
  never truncate or bulk-delete `backup_schedules` / `backups`. Tests that
  mutate the singleton `backup_schedules` row (seed/recompute/`markScheduleRun`
  cases in L02) must capture the row's prior values before mutating and restore
  them exactly in `afterEach`/`afterAll` — never leave the schedule disabled,
  re-frequencied, or with altered `next_run_at`/`last_run_at`. See L02's
  shared-DB test contract for the full clause.
- Migration `0065` applies cleanly; `meta/0065_snapshot.json` + `_journal.json`
  entry (idx 65) present. Precondition: TASK-483's `0064` artifacts are synced
  into this worktree first (see Dependencies above) so the journal stays
  gapless.
