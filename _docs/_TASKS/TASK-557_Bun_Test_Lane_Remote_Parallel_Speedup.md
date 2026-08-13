# TASK-557: Bun Test Lane Remote Parallel Speedup (direct 5432, 10-15 min)
# FileName: TASK-557_Bun_Test_Lane_Remote_Parallel_Speedup.md
**Priority:** High
**Category:** Testing / Developer Experience / Database / CI
**Estimated Effort:** Very Large
**Dependencies:** None (standalone; must not collide with TASK-555/556/489/414 closures)
**Related Tasks:** TASK-102, TASK-230, TASK-509, TASK-551-02, TASK-545
**Status:** 🚧 In Progress
**Started:** 2026-08-13
**Changelog:** 1271 (pinned)
---
## Overview
`bun run test:bun` executes `bun test --parallel=1 --timeout=15000` over ~365
files (255 unit, 66 routes, 19 runtime, 5 server, 2 store, 3 plugins, 4
analytics, 5 perf, 6 security) serially against Render Frankfurt PgBouncer
(port 6432, transaction pooling). The lane takes ~50 min locally today, of
which ~45 min is DB-bound: ~12-15k round trips at 50-110 ms each, plus serial
execution forced by changelog 811 collisions on the shared `public` schema.

This family rebuilds the lane for a **remote direct-5432 database only** (no
local Postgres, per owner decision 2026-08-13) with a full professional
architecture: per-worker PostgreSQL schemas (`bun_worker_N`) for full data
isolation, a weighted parallel runner, a custom per-schema migration applier,
fence advisory-lock isolation, DB-free files parallelized separately, and
perf-gate isolation. Measured targets: ~10-15 min total.

### Verified facts (audit 2026-08-13, read-only, 4 collaboration agents)
- Lane: `bun test --parallel=1 --timeout=15000 tests/unit tests/integration/{routes,runtime,server,store,plugins,analytics} tests/perf tests/security` (package.json:30).
- Classification (otter): A=222 DB-free, B=113 DB-backed self-scoped, C=30 shared mutable state (settings keys, `backup_schedules` singleton, starterContent first-admin). Per-dir A/B/C: unit 160/84/11, routes 47/13/6, runtime 4/4/11, server 2/1/2, store 0/2/0, plugins 1/2/0, analytics 0/4/0, perf 4/1/0, security 4/2/0.
- Measured anchors (mouse): settingsService 22.0s, entryService 85.7s, menus 26.3s, seoService 8.5s; warm RT 26ms, under load 50-110ms; cold connect 531ms.
- All 71 migration SQL files are unqualified (zero `public.`); journal `core/db/migrations/meta/_journal.json` is v7 with `breakpoints: true`; `0006_search_indexes.sql` uses `CREATE EXTENSION IF NOT EXISTS pg_trgm` (extensions are per-database, so a single creation serves all worker schemas).
- drizzle `PgDialect.migrate` writes its journal to a FIXED shared `drizzle` schema (pg-core/dialect.cjs), so `search_path` alone migrates only the first worker. The custom applier in TASK-557-03 avoids drizzle's migrator entirely.
- `?options=-csearch_path=bun_worker_N` is forwarded by postgres.js to StartupMessage (`options.connection`, connection.js), and `connection` is in `AUDITED_DRIVER_OPTION_KEYS` (driverEndpoints.ts:175), so the fail-closed guard passes on direct 5432 and still rejects 6432. Render PgBouncer is `pool_mode=transaction` (Render docs): session-level state (search_path, advisory locks) does NOT survive; direct 5432 is mandatory. Render reserves ~10 direct connections (`max_connections - 10` backend pool), so worker count × per-worker pool must fit the instance budget.
- Fence `pg_try_advisory_xact_lock_shared(548,0)` (nativeCmsWriterFence.ts:77) is **per-database, not per-schema**; exclusive holder `legacyInstallRunPersistence.holder()` (legacyInstallRunPersistence.ts:808) blocks all workers on the same DB. In-lane fence uses are all shared+shared compatible, but exclusive paths in kits/installer suites are in-lane (`tests/unit/kits/*`), so a test-mode namespace offset is required (TASK-557-04).
- Hygiene gaps: `tests/utils/db.ts:17` and 3 other `to_regclass` sites hardcode `public.`; fresh worker schemas have no seeded admin/starter content; trafficSchema `information_schema`/`pg_indexes` queries lack schema filters.
- CI `coderso-pr-gates.yml` bun-lane runs `bun run test:bun:lane` = `bun scripts/run-bun-lane.ts --test`, whose `canRunSuite` (run-bun-lane.ts:86) probes each route suite by RUNNING it fully, then the lane runs it again -> ~2x CI DB execution.
- Bun 1.3.14 supports `--parallel=N`, `--shard=i/n` (verified deterministic), `--preload`; `--timings`/`--update-timings`/`--no-isolate` are NOT supported (unknown flags silently accepted — do not rely on them).

### Architecture (summary)
1. **TASK-557-01** classification manifest + measured timing weights (`tests/bun-lane-manifest.json`, `timings.json`) — single source of truth for the partitioner.
2. **TASK-557-02** worker connection adapter: builds `DATABASE_URL` per worker as `DATABASE_DIRECT_URL + ?options=-csearch_path=bun_worker_N`, resolves `DATABASE_DIRECT_URL` (already in `.env`), validates guard compatibility, sets `DB_POOL_MAX=2-4` per worker.
3. **TASK-557-03** custom per-schema migration applier: reads `_journal.json`, applies each tagged SQL file with `SET search_path TO bun_worker_N` honoring `--> statement-breakpoint`, tracks applied tags in a per-schema `_bun_migrations` table, and provisions N worker schemas (`DROP SCHEMA IF EXISTS ... CASCADE; CREATE SCHEMA bun_worker_N;`).
4. **TASK-557-04** fence isolation: `resolveFenceNamespace()` returns `548` by default and `548 + BUN_TEST_FENCE_NAMESPACE_OFFSET` only when the offset env is set AND `NODE_ENV === "test"` (fail-closed); all fence users route through it.
5. **TASK-557-05** weighted parallel runner (`scripts/run-bun-parallel.ts`): partitions files by conflict class (C files each isolated or serial-ordered, B weighted, A to a pure lane), spawns `K` worker processes with per-worker env, provisions schemas, aggregates exit codes, supports `--dry-run`, `--workers`, `--lane` flags, and retries flaky failures once.
6. **TASK-557-06** DB-free lane (`A` bucket) under `--parallel=16` without any DATABASE_URL override, plus a dedicated serial perf lane for the 4 wall-time p95 gates.
7. **TASK-557-07** schema-isolation hygiene: schema-aware `hasTable` (no hardcoded `public.`), trafficSchema schema filters, seed-assumption inventory (admin user, starter content, settings defaults) with per-worker seed where required.
8. **TASK-557-08** CI + docs + closure: fix `canRunSuite` double-run, wire runner into `coderso-pr-gates.yml` (needs `DATABASE_DIRECT_URL` secret), changelog 1271, board/statistics, tests/README and TESTING_STRATEGY updates.

### Expected time model (remote direct 5432, K=8 workers)
- A lane (222 files, --parallel=16): ~1-2 min
- B lane (113 files weighted over 6 workers): ~4-6 min
- C lane (30 files, serial-order over 1-2 workers): ~6-8 min
- Perf lane (5 files serial): ~2-4 min (wall-time p95 gates, CPU-contention sensitive)
- Provisioning (migrations × 8 schemas, concurrent): ~1-2 min
- **Total: ~10-15 min** (measured per-suite timings feed TASK-557-01-L02 weights; final numbers recorded in changelog 1271).

## Isolation and Collision Guard
- Execute on a dedicated branch/worktree named `feat/task-557-bun-lane-parallel`. Changelog 1271 is reserved ONLY for TASK-557.
- Forbidden concurrent-stream paths: `_docs/_TASKS/TASK-489*.md`, `_docs/_TASKS/TASK-555*.md`, `_docs/_TASKS/TASK-556*.md`, `_docs/_TASKS/TASK-414*.md`, `_docs/_CHANGELOG/1266-*`, `_docs/_CHANGELOG/1268-*`, `_docs/_CHANGELOG/1269-*`, `_docs/_CHANGELOG/1270-*`, `core/services/kits/**`, `core/services/settings/settingsService.ts` (owned reads only; fence namespace change must be additive via `resolveFenceNamespace`, never rewrite lock semantics).
- Only the closure subtask (TASK-557-08-L02) edits `_docs/_TASKS/*` and `_docs/_CHANGELOG/*`. Implementation leaves never touch board/changelog files.
- Do not modify production code beyond the additive `resolveFenceNamespace()` seam (TASK-557-04-L01) and any seed/`hasTable` helper changes owned by TASK-557-07; never weaken a behavior assertion, never add `--no-isolate`, never truncate whole domain tables from the shared test DB, and never point workers at `public` schema.
- Do not run tests against the shared production `public` schema concurrently with the dev server or another agent's lane; worker schemas are exclusive per run (drop/create at start).

## Sub-Tasks
- TASK-557-01: Suite classification manifest and timing weights (2 leaves)
- TASK-557-02: Worker connection adapter (direct 5432 + search_path URL) (2 leaves)
- TASK-557-03: Per-worker schema provisioning and custom migration applier (3 leaves)
- TASK-557-04: Fence advisory-lock isolation for parallel workers (2 leaves)
- TASK-557-05: Weighted parallel runner (3 leaves)
- TASK-557-06: DB-free lane and perf-lane isolation (2 leaves)
- TASK-557-07: Schema-isolation test hygiene and seed assumptions (2 leaves)
- TASK-557-08: CI integration, docs, and closure (2 leaves)

## Implementation Order
TASK-557-01 -> TASK-557-02 -> TASK-557-03 -> TASK-557-04 -> TASK-557-07 (hygiene
unblocks green runs) -> TASK-557-05 -> TASK-557-06 -> TASK-557-08. Leaves inside
a subtask land L01 then L02/L03. TASK-557-02/03/04 may be implemented
sequentially (03 depends on 02's URL, 04 is independent but lands after 02).
Land in dependency order to avoid rework: runner (05) must not start before
01-04 and 07 are green.

## Testing Requirements
- Every leaf: targeted Bun tests for the touched contract (`bun --cwd core lint`, `bun --cwd core lint:types`, the exact owning `bun test` files) plus runner self-tests that assert partition determinism, exit-code aggregation, schema provisioning idempotence, and guard compatibility (URL builder round-trip).
- Full validation at closure: `bun run test:bun` (new runner), `bun run test:vitest`, `bun run precommit:check`, `bun run gates:coderso`, security scan, and a recorded wall-time measurement of the new lane (must be 10-15 min on direct 5432).
- Fence tests must prove: default namespace = 548 with no env, offset applied ONLY in `NODE_ENV=test` with the env set, and production paths byte-identical when unset.
- Migration applier tests must prove: full 71-migration apply into a fresh schema is idempotent on re-run, `--> statement-breakpoint` splitting works, and `to_regclass`-based `hasTable` resolves within the worker schema.

## Documentation Updates Required
- `tests/README.md` (new runner surface: `bun run test:bun` still works, `bun run test:bun:parallel --workers=8 --dry-run`).
- `_docs/TESTING_STRATEGY.md` (remote-direct-5432 parallel lane architecture, worker schemas, fence isolation).
- `_docs/_CHANGELOG/1271-2026-08-13-bun-test-lane-remote-parallel-speedup.md` + `_docs/_CHANGELOG/README.md` index row.
- `_docs/_TASKS/README.md` board rows + statistics.
- `_docs/AGENTS.md`/repo index only if the command surface changes permanently.
