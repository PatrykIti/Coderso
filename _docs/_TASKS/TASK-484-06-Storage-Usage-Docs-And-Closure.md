# TASK-484-06: Storage Usage, Docs & Closure
# FileName: TASK-484-06-Storage-Usage-Docs-And-Closure.md

**Parent Task:** TASK-484
**Priority:** Medium
**Category:** `backups` / `observability-docs`
**Estimated Effort:** Medium
**Dependencies:** TASK-484-01..05 (usage aggregates the rows produced by the
scheduler, retention, and remote-storage work; docs describe the shipped
behaviour). Closes the task.
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

There is no aggregate **storage usage** source today — `size_bytes` is stored per
row but never summed, so an operator cannot see how much space backups consume or
whether a quota is exceeded. This subtask adds `getBackupStorageUsage()`
(total bytes, count, per-driver/per-status breakdown, optional quota signal),
surfaces it via an internal `GET /backups/usage` route, then syncs all
source-of-truth docs and runs the final gate matrix for task closure.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| 484-06-L01 | `TASK-484-06-L01-Storage-Usage-Source-And-Surface.md` | `getBackupStorageUsage` + `GET /backups/usage` | ✅ Done |
| 484-06-L02 | `TASK-484-06-L02-Docs-Gates-And-Closure.md` | Docs sync, gate matrix & closure | ✅ Done |

**Implementation order:** L01 (usage source + route + tests) → L02 (docs + gates +
board/changelog closure).

---

## Dependencies

- TASK-484-01..05 shipped behaviour; `backups.size_bytes` (existing),
  `getStorageSettings()` for the active driver label.

---

## Testing Requirements

Bun lane (DB + route). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — usage sums `size_bytes` (treating null as 0),
  per-driver/per-status breakdown, quota `overQuota` flag from
  `BACKUP_MAX_TOTAL_BYTES`. Tests run against the **shared remote test DB**
  (used concurrently by TASK-482/483 and the owner): assert **deltas** against
  a captured before-usage, not absolute sums; seed uniquely-scoped fixtures;
  clean up only rows the test created; never truncate the shared `backups`
  table (full contract in L01's regression-test shape).
- `bun test tests/integration/routes/backups.test.ts` — `GET /backups/usage`
  requires `backups:read`, returns the usage shape, no secrets in payload.
- Final full matrix recorded in the closeout (lint, types, Bun service + route +
  security, the Vitest `computeNextRunAt` spec via `bun run test:vitest`,
  migration apply).

---

## Closure Pins (coordination)

- **Changelog number:** closure (L02) creates `_docs/_CHANGELOG/1222-*.md`.
  Numbers `1219` (TASK-510, in flight in the shared main tree — may be absent
  from this worktree's checkout), `1220` (TASK-482) and `1221` (TASK-483) are
  reserved by parallel streams and must not be reallocated.
- **Migration index:** TASK-484's migration is `0065` (`0065_*.sql` +
  `meta/0065_snapshot.json` + journal entry idx 65). `0064` is owned by the
  parallel TASK-483 analytics stream, which merges first and must be synced
  into this worktree before the migration gate runs.
- **Board/changelog discipline:** only the closure leaf (L02) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`, scoped to TASK-484 rows
  and this stream's own statistics deltas.
