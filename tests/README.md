# Tests README

This repository uses a hybrid testing model aligned with the product architecture.

## Runner ownership

- Bun owns runtime-kernel validation:
  - `tests/integration/routes/*`
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

## Manual Smoke

The TASK-336 widget contract smoke is a Bun-owned Playwright CLI harness. It is
not part of the default automated lane because it requires local admin/frontend
servers and admin credentials.

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
