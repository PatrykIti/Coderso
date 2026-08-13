# Tests README

This repository uses a hybrid testing model aligned with the product architecture.

## Runner ownership

- Bun owns runtime-kernel validation:
  - `tests/integration/routes/*`
  - `tests/integration/toolchain/*`
  - `tests/integration/runtime/*`
    - `tests/integration/runtime/detail-page-runtime-lite.test.ts` keeps the
      public detail-page route contract executable even when local DB fixtures
      are unavailable.
    - `tests/integration/runtime/detail-page-runtime.test.ts` extends that same
      contract with DB-backed content-type/detail-page fixture coverage when
      `DATABASE_URL` is reachable.
  - `tests/integration/server/*`
  - `tests/integration/store/*`
  - `tests/integration/plugins/*`
  - `tests/perf/*`
  - `tests/security/*`
  - plugin lifecycle and bundle/runtime contracts
- Vitest owns Bun-free tests in `tests/vitest/*`:
  - pure admin utilities
  - admin/UI component logic
  - SDK/shared contracts
  - validation schema suites
  - Bun-free assistant helper/provider/planner suites
  - Bun-free posts editor/model helper suites
  - Bun-free forms contract/helper/automation-core suites
  - Bun-free server helper suites
    - `tests/vitest/server/startupMigrations.test.ts` owns the Docker startup
      migration policy and injection seam without touching a live database.
  - Bun-free search pure-logic suites
  - DOM-rich editor helpers through `happy-dom`
  - UI integration/render suites moved from `tests/integration/ui/*`

## Commands

```bash
bun run test:vitest
bun run test:coverage
bun run test:bun:lane
bun run test:coverage:bun
bun run test:coverage:bun:full
bun run test:coverage:all
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
```

`test:vitest` loads `.env` when the file exists and then forces `NODE_ENV=test`
for the Vitest process so React test helpers and test-only assistant diagnostics
do not inherit production shell settings. CI can provide the same values through
job environment variables without creating a local `.env` file.
`test:bun` runs the DB/runtime lane serially with a `15000ms` per-test timeout;
the lane exercises real database and runtime flows that can exceed Bun's default
`5000ms` timeout under full-suite load.
Selected DB-backed runtime HTTP suites may also pass a higher `idleTimeout` to
`startHttpServer` so Bun does not reset an in-flight request while the handler
waits on database-backed settings or auth checks.
`test:bun:lane` runs curated Bun-owned route/plugin/perf suites without coverage.
`test:coverage:bun` uses the same curated Bun-owned route/plugin/perf suites through `scripts/run-bun-lane.ts`.
It writes `coverage/bun/lcov.info` and prints a compact LCOV-derived summary,
instead of streaming Bun's full per-file text coverage table into CI logs.
`test:coverage` now uses `scripts/run-vitest-coverage.ts` and the canonical full-lane report path `coverage/vitest/coverage-summary.json`.
`check:admin-bundle` must run after `bun --cwd core build:admin`; it writes
`.tmp/admin-bundle-report.json` and guards the admin SPA chunk count, HTML entry
gzip, and initial static JS graph gzip.
`check:admin-boundary` is source-based and can run before the build. It walks
the admin browser import graph, including lazy route imports, and fails when
admin-reachable code value-imports server/runtime-only modules such as DB,
server routes, storage adapters, provider SDKs, password hashing, secret-store,
or runtime data resolvers.

## Runtime Smoke Platform

Reusable local runtime smokes use one strict entry point:

```bash
bun scripts/runtime-smoke.ts run \
  --suite <task-540|task-547|task-554|widget-contract|production-boundary> \
  --profile <fast|certification> \
  --session <task-scoped-name>
```

`fast` preserves its suite's product-visible scenarios while selecting
short-feedback infrastructure settings that the adapter can safely restore.
`certification` keeps production-strength timing and belongs at the release
boundary when running both profiles would repeat the same product proof. A
profile never silently falls back to the other.

The entry point owns local lifecycle, condition polling, bounded process
supervision, repository guards, redaction, timings, JSON/Markdown reporting,
and cleanup aggregation. Suite adapters reuse profile-scoped persistent Bun
workers (`DB_POOL_MAX=1` for database-bearing profiles), bounded transactional
database batches, Playwright action segments, and checkpoint contracts. New
suites add a fixed registry entry plus a thin adapter; they must not duplicate
worker, cleanup, polling, browser, or reporting loops.

The current adapters are:

- `task-540`: the complete seven-scenario Custom Screens proof with 496 logical
  action identities, 13 PNGs, light/dark coverage, console checks, and canonical
  cleanup. Its 18 setup baselines use two profile-isolated worker frames and its
  DB cleanup remains projected into the original ordered receipts. Bootstrap
  restoration uses an exact typed read → compare-and-swap → read sequence on
  the persistent worker and fails closed on ownership drift. All operations are
  native, statically registered and persistent/batched; no workflow source-code
  executor remains.
- `task-547`: the complete 18-scenario Full Site package and installed
  `projekty-domow` proof. It uses the shared supervised developer host,
  persistent worker bridge, segmented Playwright transport, transactional
  cleanup, exact observation manifest, and the same scenario descriptors in
  `fast` and `certification` profiles.
- `task-554`: seven Classic Post metadata flows. `fast` distributes the seven
  flows across light/dark desktop/mobile variants; `certification` runs every
  flow in all four variants. It proves the exact metadata PATCH receipt,
  persisted projection, zero console/page errors, seven manifest PNGs, and
  synthetic fixture cleanup through the shared host, worker, browser, and
  reporting platform.
- `widget-contract`: a focused `gallery-mosaic` adapter over the retained
  widget contract harness plus a fresh public browser error probe.
- `production-boundary`: a certification-only production build/server probe
  covering install status, root/Admin, one built asset, exact `/peri` 404,
  clean logs, and PID/port release.

Reports go to stdout as bounded canonical JSON and stderr as a concise Markdown
summary; redirect them to a task-scoped file when durable evidence is required.
Screenshots remain under `_docs/_workflows/_smoke/`. Generic checkpoint
validation/sealing/storage primitives are available to adapters whose scenarios
can prove independent cleanup and reset. TASK-540 currently uses its canonical
full-run cleanup and reset inventory; do not claim automatic TASK-540 resume
until that adapter seals and consumes those checkpoints end to end.

For a copyable suite-registration sequence, adapter/worker skeletons, DB ledger
and transactional cleanup recipe, Playwright segmentation and evidence rules,
checkpoint limitations, targeted tests, and the closure checklist, use the
[Runtime Smoke Authoring Cookbook](../docs/develop/runtime-smoke-cookbook.md).

## Widget Compatibility CLI

The TASK-336 command remains as a thin compatibility CLI over the same modular
suite used by the registered adapter. Its browser/session work uses the shared
dispatcher and lifecycle. Direct invocation is useful for targeted debugging
and still requires local admin/frontend servers and admin credentials.

```bash
CODERSO_PLAYWRIGHT_EMAIL="<admin email>" \
CODERSO_PLAYWRIGHT_PASSWORD="<admin password>" \
bun scripts/playwright-widget-contract-smoke.ts \
  --session widget-contract-smoke \
  --admin http://localhost:5173/admin \
  --front http://localhost:3000
```

Use `--dry-run` for inventory validation and `--widget <type>` for targeted
debugging. The durable evidence is written to `_docs/PLAYWRIGHT`.

## Lane guidance

- Prefer adding new Bun-free tests to `tests/vitest/*`.
- Keep existing Bun suites when they validate runtime semantics.
- Keep Bun-free production modules import-safe for Vitest: avoid top-level imports of DB/settings/runtime services in pure helpers; use pure seams or lazy default deps instead.
- Use `// @vitest-environment happy-dom` for DOM-heavy Vitest files.
- Do not move runtime/plugin/install/security/perf suites to Vitest only for coverage.

## Bun lane manifest

`tests/bun-lane-manifest.json` is the partitioner source of truth for the Bun
lane. `scripts/bun-lane-classify.ts` regenerates it deterministically from the
repo root (`bun scripts/bun-lane-classify.ts`) and classifies every
`*.test.{ts,tsx}` file under the `test:bun` lane dirs into `perf` / A / B / C;
`tests/unit/toolchain/bunLaneManifest.test.ts` pins the golden file set,
classification examples, and byte-stable regeneration. New lane test files are
picked up automatically on the next regeneration; do not hand-edit the
manifest.

## Bun lane timings

`tests/bun-lane-timings.json` stores per-file wall time (ms) for the Bun lane,
measured serially by `scripts/bun-lane-time.ts` (the TASK-557-01-L02 timing
probe). The TASK-557-05 weighted partitioner consumes these values. Refresh
from the repo root:

- `bun scripts/bun-lane-time.ts` times all non-C files (default; C files
  contend on shared state), merging with prior values and keeping the min.
- `bun scripts/bun-lane-time.ts --include-c` additionally times C files
  serially on a dedicated worker schema.

The probe requires `DATABASE_DIRECT_URL` (direct 5432; a pooler is not
allowed), never runs while another process uses the shared `public` schema,
and is a maintenance tool, not part of the normal gate.
`tests/unit/toolchain/bunLaneTimings.test.ts` pins the merge semantics and the
import guard.

## Bun lane worker URL contract

`scripts/bun-lane-worker-url.ts` (TASK-557-02-L01) builds per-worker
`DATABASE_URL` values and worker env without any DB or runtime coupling:

- `buildWorkerDatabaseUrl` appends URL-encoded
  `options=-csearch_path=bun_worker_<i>` (`?` or `&`, preserving existing
  params), so each worker session uses its own schema.
- `assertDirectUrl` reuses `inspectDatabaseUrl` (pooled port passed
  positionally, required) and fails closed with `worker_direct_url_unverifiable`
  / `worker_direct_url_pooled`; the direct URL must never point at the pooler.
  The built worker URL (with `options=-csearch_path=` appended) is
  guard-compatible: the driver-endpoint Vitest lane
  (`tests/vitest/server/databaseDriverEndpoints.test.ts`) proves it still
  resolves as direct 5432, non-pooled, via the driver's own dial, and the Bun
  integration test (`tests/unit/db/bunLaneWorkerSchema.test.ts`) proves
  postgres.js forwards the parameter to the StartupMessage (`search_path` =
  `bun_worker_<i>`; `current_schema()` returns the first EXISTING schema, so
  it is not the throwaway name until the schema is provisioned).
- `resolveWorkerPoolMax` clamps `DB_POOL_MAX` to [1, 4] and never inherits an
  ambient value (the real `.env` sets 20 for the pooled client); only explicit
  non-integer or <1 requested values throw. The aggregate budget is
  `workers x pool <= 10` (`assertConnectionBudget`, Render's direct-connect
  reserve), so 8 workers at pool 1 fit but 6 x 2 does not.
- `resolveWorkerEnv` returns `DATABASE_URL` (worker URL), `DATABASE_DIRECT_URL`
  as-is, `DB_POOL_MAX`, `BUN_TEST_WORKER_INDEX`, `NODE_ENV=test`, and
  `BUN_TEST_FENCE_NAMESPACE_OFFSET` when requested. `NODE_ENV=test` is
  mandatory because `bun test` does not set it and the TASK-557-04 fence
  honors the offset only under test.
- `resolveWorkerCount` reads `BUN_TEST_WORKERS` (default 8; CI sets 4); absent
  means default, present-but-empty or invalid throws `worker_count_invalid`.
- `describeWorkerTarget` is the only permitted target log shape
  (`schema@host:port`); the module never prints credentials.

`tests/unit/toolchain/bunLaneWorkerUrl.test.ts` pins the contract; the runner
(TASK-557-05) maps the named errors to `mapWorkerEnvError` before spawning.

## Bun lane migration applier

`scripts/bun-lane-migrate.ts` (TASK-557-03-L01) replaces drizzle's migrator
for the Bun lane: it applies every `core/db/migrations/<tag>.sql` file from
`meta/_journal.json` into one named schema via per-file transactions with
`SET LOCAL search_path TO <schema>, public`, tracks applied tags in
`<schema>._bun_migrations`, and is idempotent (re-runs apply 0). Run it with
`bun scripts/bun-lane-migrate.ts <schema>` (requires `DATABASE_DIRECT_URL`).
Pure helpers are pinned in `tests/unit/toolchain/bunLaneMigrate.test.ts`; the
DB-backed idempotency proof lives in
`tests/integration/toolchain/bunLaneMigrate.test.ts` (skips cleanly without
`DATABASE_DIRECT_URL`). Production `core/server/startupMigrations.ts` and
drizzle-kit are untouched.

- Provisioning: `bun scripts/bun-lane-provision.ts <workers>` (default 8,
  integer 1..16, requires `DATABASE_DIRECT_URL`) drops only the exact
  `bun_worker_<i>` schemas it derives (never a wildcard, never `public` or
  non-worker schemas) and migrates each concurrently; see
  `tests/integration/toolchain/bunLaneProvision.test.ts`.

## Bun lane partitioner

`scripts/bun-lane-partition.ts` (TASK-557-05-L01) is the pure weighted
partitioner for the Bun lane. `partition(rows, timings, bWorkers)` assigns B
files longest-processing-time-first (sorted by weight descending, each placed
on the currently lightest worker), keeps C files serial in filename order on
one dedicated worker by default (the future `--split-c` flag enables
one-C-per-worker), and keeps perf files serial on their own dedicated worker.
A files are not partitioned here (pure lane, TASK-557-06). Weights come from
`timings[file] ?? row.weightMs ?? DEFAULT_WEIGHT[bucket]`
(`{A: 1000, B: 10000, C: 20000, perf: 20000}`); timings entries absent from
the manifest are ignored. `bWorkers < 1` throws `worker_count_invalid` and an
unknown bucket throws `manifest_bucket_invalid:<file>`. The runner CLI
(TASK-557-05-L02) wires this pure surface to `--dry-run` / `--split-c`.
`tests/unit/toolchain/bunLanePartition.test.ts` pins balance, C determinism,
perf isolation, no loss/duplication, and the error contract.
