# Tests README

This repository uses a hybrid testing model aligned with the product architecture.

## Runner ownership

- Bun owns runtime-kernel validation:
  - `tests/integration/routes/*`
  - `tests/integration/runtime/*`
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
bun run test:coverage:bun
bun run test:coverage:bun:full
bun run test:coverage:all
```

`test:coverage:bun` now uses curated Bun-owned route/plugin/perf suites through `scripts/run-bun-coverage-baseline.ts`.
`test:coverage` now uses `scripts/run-vitest-coverage.ts` and the canonical full-lane report path `coverage/vitest/coverage-summary.json`.

## Lane guidance

- Prefer adding new Bun-free tests to `tests/vitest/*`.
- Keep existing Bun suites when they validate runtime semantics.
- Keep Bun-free production modules import-safe for Vitest: avoid top-level imports of DB/settings/runtime services in pure helpers; use pure seams or lazy default deps instead.
- Use `// @vitest-environment happy-dom` for DOM-heavy Vitest files.
- Do not move runtime/plugin/install/security/perf suites to Vitest only for coverage.
