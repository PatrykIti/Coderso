# TASK-557-03: Per-Worker Schema Provisioning and Custom Migration Applier
# FileName: TASK-557-03-Per-Worker-Schema-Provisioning-And-Custom-Migration-Applier.md
**Parent Task:** TASK-557
**Priority:** High
**Category:** Testing / Database
**Estimated Effort:** Large
**Dependencies:** TASK-557-02 (worker URL builder)
**Status:** ⏳ To Do
---
## Overview
Each worker schema (`bun_worker_N`) must receive the full 71-migration schema
shape before its tests run. drizzle's own migrator writes its journal to a
FIXED shared `drizzle` schema (pg-core/dialect.cjs:47-51), so `search_path`
alone migrates only the first worker. This subtask owns a custom applier that
reads `core/db/migrations/meta/_journal.json` (v7, `breakpoints: true`), runs
each tagged SQL file with `SET search_path TO bun_worker_N` honoring
`--> statement-breakpoint` splits, and tracks applied tags in a per-schema
`_bun_migrations` table (schema-local, so each worker migrates exactly its own
tables). All 71 SQL files are unqualified (zero `public.`), verified;
`0006_search_indexes.sql` uses `CREATE EXTENSION IF NOT EXISTS pg_trgm` which is
per-database and safe to run from any worker (first wins, others no-op).

Provisioning sequence per run: `DROP SCHEMA IF EXISTS bun_worker_N CASCADE;
CREATE SCHEMA bun_worker_N;` then apply migrations (idempotent via the local
`_bun_migrations` table). Fresh-worker seed (admin/starter content where tests
require it) is owned by TASK-557-07-L02, not here.

## Sub-Tasks
- TASK-557-03-L01: Custom migration applier (journal reader + SQL runner)
- TASK-557-03-L02: Schema provisioning script (drop/create + applier wiring)
- TASK-557-03-L03: Applier and provisioning tests

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Applier tests (Bun, DB-backed): full 71-migration apply into a fresh schema
  succeeds; re-run is a no-op (idempotent); `--> statement-breakpoint` splits
  execute independently; a failing statement aborts the file with a named error
  and rolls back the file's partial work.
- Provisioning test: `DROP SCHEMA IF EXISTS ... CASCADE` + recreate + apply is
  reproducible across two runs; `pg_trgm` creation is not duplicated (per-db).
- Run against a dedicated throwaway schema (e.g. `bun_provision_test`), never
  `public`, and clean up only rows/schemas created by the test.

## Documentation Updates Required
- `tests/README.md` — provisioning command and applier contract.
- `_docs/TESTING_STRATEGY.md` — per-worker schema migration model.
