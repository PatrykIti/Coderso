# TASK-484-06: Storage Usage, Docs & Closure
# FileName: TASK-484-06-Storage-Usage-Docs-And-Closure.md

**Parent Task:** TASK-484
**Priority:** Medium
**Category:** `backups` / `observability-docs`
**Estimated Effort:** Medium
**Dependencies:** TASK-484-01..05 (usage aggregates the rows produced by the
scheduler, retention, and remote-storage work; docs describe the shipped
behaviour). Closes the task.
**Status:** ⏳ To Do
**Started:**
**Completed:**

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
| 484-06-L01 | `TASK-484-06-L01-Storage-Usage-Source-And-Surface.md` | `getBackupStorageUsage` + `GET /backups/usage` | ⏳ To Do |
| 484-06-L02 | `TASK-484-06-L02-Docs-Gates-And-Closure.md` | Docs sync, gate matrix & closure | ⏳ To Do |

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
  `BACKUP_MAX_TOTAL_BYTES`.
- `bun test tests/integration/routes/backups.test.ts` — `GET /backups/usage`
  requires `backups:read`, returns the usage shape, no secrets in payload.
- Final full matrix recorded in the closeout (lint, types, Bun service + route +
  security, migration apply).
