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
```

`test:vitest` loads `.env` and then forces `NODE_ENV=test` for the Vitest
process so React test helpers and test-only assistant diagnostics do not inherit
production shell settings.
`test:bun` runs the DB/runtime lane serially with a `15000ms` per-test timeout;
the lane exercises real database and runtime flows that can exceed Bun's default
`5000ms` timeout under full-suite load.
`test:bun:lane` runs curated Bun-owned route/plugin/perf suites without coverage.
`test:coverage:bun` uses the same curated Bun-owned route/plugin/perf suites through `scripts/run-bun-lane.ts`.
`test:coverage` now uses `scripts/run-vitest-coverage.ts` and the canonical full-lane report path `coverage/vitest/coverage-summary.json`.

## Lane guidance

- Prefer adding new Bun-free tests to `tests/vitest/*`.
- Keep existing Bun suites when they validate runtime semantics.
- Keep Bun-free production modules import-safe for Vitest: avoid top-level imports of DB/settings/runtime services in pure helpers; use pure seams or lazy default deps instead.
- Use `// @vitest-environment happy-dom` for DOM-heavy Vitest files.
- Do not move runtime/plugin/install/security/perf suites to Vitest only for coverage.
