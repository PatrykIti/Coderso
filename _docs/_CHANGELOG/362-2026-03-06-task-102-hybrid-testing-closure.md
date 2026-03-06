# 362. TASK-102 Hybrid Testing Closure

- Date: 2026-03-06
- Version: Unreleased
- Tasks: TASK-102, TASK-102-01, TASK-102-02, TASK-102-03, TASK-102-04, TASK-102-05

## Key Changes

### Testing Architecture

- Closed the hybrid testing rollout for Nextless:
  - Bun remains the runtime-kernel runner,
  - Vitest is now shipped for Bun-free suites under `tests/vitest/*`.
- Added contributor-facing lane ownership in `AGENTS.md` and `tests/README.md`.

### Coverage

- Kept Vitest coverage for Bun-free source-wide reporting.
- Added separate Bun baseline and Bun full coverage commands:
  - `test:coverage:bun`
  - `test:coverage:bun:full`
  - `test:coverage:all`

### Tooling And CI

- Added `tests/setup/vitest.ts`.
- Added `happy-dom` support for DOM-rich Vitest files.
- Added `.github/workflows/testing-lanes.yml` for Vitest lane and Bun baseline coverage artifacts.

### Validation

- Verified:
  - `bun run test:vitest`
  - `bun run test:coverage`
  - `bun run test:coverage:bun`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun --cwd store lint`
  - `./node_modules/.bin/tsc -p packages/sdk/tsconfig.json --noEmit`
