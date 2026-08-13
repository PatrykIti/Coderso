# TASK-557-02: Worker Connection Adapter (direct 5432 + search_path URL)
# FileName: TASK-557-02-Worker-Connection-Adapter.md
**Parent Task:** TASK-557
**Priority:** High
**Category:** Testing / Database
**Estimated Effort:** Medium
**Dependencies:** TASK-557-01 (manifest defines worker file sets)
**Status:** ⏳ To Do
---
## Overview
Each parallel worker process must connect to the SAME remote database but an
EXCLUSIVE schema (`bun_worker_0..N-1`), so its `DATABASE_URL` becomes
`DATABASE_DIRECT_URL` (direct 5432, already in `.env`) plus the postgres.js
`?options=-csearch_path=bun_worker_N` query parameter. postgres.js forwards
`options.connection` into the StartupMessage (verified: connection.js:996) and
`connection` is in `AUDITED_DRIVER_OPTION_KEYS` (driverEndpoints.ts:175), so the
fail-closed `inspectDatabaseUrl` guard still resolves the direct port and marks
the URL non-pooled. This subtask owns the URL builder + env resolver, the
per-worker pool sizing, and the guard-compatibility tests. It does NOT touch
`core/db/client.ts` production imports; the runner injects `DATABASE_URL` via
process env per spawned worker.

Critical constraint (Render docs, verified): PgBouncer 6432 is
`pool_mode=transaction`; session-level state (search_path, advisory locks) does
not survive, so workers MUST use direct 5432. Render reserves ~10 direct
connections (`max_connections - 10` backend pool), so
`workers × DB_POOL_MAX ≤ 8-10` is the safe budget; `DB_POOL_MAX=2-4` per worker.

## Sub-Tasks
- TASK-557-02-L01: Worker URL builder and env resolution
- TASK-557-02-L02: Guard-compatibility and pool tests

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Bun tests for URL round-trip (no credential leak in logs), guard acceptance
  on a direct-5432 URL, guard rejection on a 6432 URL (already covered by
  existing driver-endpoint lane; extend it), and pool max per worker.
- Dry-run of the builder against `.env` values must print schema/port only,
  never credentials.

## Documentation Updates Required
- `tests/README.md` — worker URL contract and the `DB_POOL_MAX` budget.
- `_docs/TESTING_STRATEGY.md` — direct-5432 worker connection model.
