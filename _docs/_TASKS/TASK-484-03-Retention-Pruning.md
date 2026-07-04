# TASK-484-03: Retention Pruning
# FileName: TASK-484-03-Retention-Pruning.md

**Parent Task:** TASK-484
**Priority:** High
**Category:** `backups` / `retention`
**Estimated Effort:** Medium
**Dependencies:** TASK-484-01 (schedule + `retentionDays` already exist; no new
column needed for retention itself). Reuses `deleteBackup` (which TASK-484-05
extends to also remove remote objects). Invoked by the TASK-484-02 worker.
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

`retentionDays` is stored, defaulted (30), and validated (`assertRetentionDays`,
`backupService.ts` 144-148) but **never enforced** — old backups accumulate
forever. This subtask adds `pruneExpiredBackups(retentionDays, now?)` that deletes
**terminal** backups (`status` in `complete` | `failed`) older than the retention
cutoff, reusing `deleteBackup` for artifact cleanup, and surfaces a manual
internal trigger route. The TASK-484-02 worker calls it after each scheduled run.

---

## Sub-Tasks

| ID | File | Title | Status |
|----|------|-------|--------|
| 484-03-L01 | `TASK-484-03-L01-Retention-Prune-Service.md` | `pruneExpiredBackups` service + worker hook | ⏳ To Do |
| 484-03-L02 | `TASK-484-03-L02-Retention-Route-And-Tests.md` | `POST /backups/prune` route + tests | ⏳ To Do |

**Implementation order:** L01 (service helper + invoked from the worker post-run)
→ L02 (manual trigger route + Bun route/security/service tests).

---

## Dependencies

- TASK-484-01 (schedule access), TASK-484-02 (worker call site).
- `deleteBackup` (`backupService.ts` 399-411) for per-row artifact cleanup.

---

## Testing Requirements

Bun lane (DB + route). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — prune deletes only terminal rows older than
  cutoff; keeps `running`/`queued`; keeps in-window rows; returns
  `{ prunedCount, prunedIds }`; idempotent on empty set; invalid `retentionDays`
  rejected.
- `bun test tests/integration/routes/backups.test.ts` — `POST /backups/prune`
  requires `backups:write`, rejects unknown body fields, audit-logged.
