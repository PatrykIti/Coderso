# TASK-484-01: Schema & Schedule Run-Metadata (DB foundation)
# FileName: TASK-484-01-Schema-And-Schedule-Run-Metadata.md

**Parent Task:** TASK-484
**Priority:** High
**Category:** `backups` / `persistence`
**Estimated Effort:** Medium
**Dependencies:** None. Sequenced first because TASK-484-02 (scheduler) reads and
advances `next_run_at`, and TASK-484-05 (remote storage) needs `artifact_key` for
clean remote deletion. Schema/type changes land here; behaviour lands downstream.
**Status:** ⏳ To Do
**Started:**
**Completed:**

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
| 484-01-L01 | `TASK-484-01-L01-Backup-Schedule-Run-Metadata-Columns.md` | Run-metadata + artifact-key columns & migration | ⏳ To Do |
| 484-01-L02 | `TASK-484-01-L02-Next-Run-Calculator-And-Schedule-Wiring.md` | `computeNextRunAt` + schedule service wiring | ⏳ To Do |

**Implementation order:** L01 (columns + migration + type fields) → L02 (pure
calculator + `getBackupSchedule`/`setBackupSchedule`/`markScheduleRun` wiring).

---

## Dependencies

- Drizzle schema + migration tooling (`core/db/schema.ts`,
  `core/db/migrations/*`, journal at version `"7"`, next free index `0064`).
- Existing backup domain (`core/services/backups/backupService.ts`,
  `backupTypes.ts`) — extended, not rewritten.

---

## Testing Requirements

Bun lane only (DB + pure domain). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — `computeNextRunAt` cases (daily/weekly/monthly,
  month rollover), `mapSchedule`/`mapBackup` include new fields,
  `getBackupSchedule` seeds `next_run_at`, `setBackupSchedule` recomputes on
  enable/frequency change.
- Migration `0064` applies cleanly; `meta/0064_snapshot.json` + `_journal.json`
  entry present.
