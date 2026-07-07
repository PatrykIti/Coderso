# TASK-484-03: Retention Pruning
# FileName: TASK-484-03-Retention-Pruning.md

**Parent Task:** TASK-484
**Priority:** High
**Category:** `backups` / `retention`
**Estimated Effort:** Medium
**Dependencies:** TASK-484-01 (schedule + `retentionDays` already exist; no new
column needed for retention itself). Reuses `deleteBackup` (which TASK-484-05
extends to also remove remote objects). Invoked by the TASK-484-02 worker.
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

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
| 484-03-L01 | `TASK-484-03-L01-Retention-Prune-Service.md` | `pruneExpiredBackups` service + worker hook | ✅ Done |
| 484-03-L02 | `TASK-484-03-L02-Retention-Route-And-Tests.md` | `POST /backups/prune` route + tests | ✅ Done |

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

**Shared-DB isolation (MANDATORY, both leaves):** all these tests run against the
ONE shared remote Postgres (render.com, `.env` `DATABASE_URL`) used by the owner
and the parallel 482/483 streams, and prune is a table-wide sweep. Tests must use
uniquely scoped fixtures and clean up only rows they created: the L01 service
test scopes the cutoff via the `now?` parameter (ancient `now`, e.g. year 2000,
with fixtures seeded older than that cutoff); the L02 route test temporarily sets
the schedule to the max `retentionDays` (3650) and restores it in
`afterEach`/`finally`. Assertions are per seeded id — never table-global counts —
and leftover fixture rows are deleted per id afterwards (pattern:
`tests/unit/backups/backupService.test.ts:30-39`). A test must never delete or
assert on rows it did not create, and must leave no schedule mutation behind.
