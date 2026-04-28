# 361. TASK-102 Dual Coverage Commands

- Date: 2026-03-06
- Version: Unreleased
- Tasks: TASK-102, TASK-102-03

## Key Changes

### QA / Testing

- Kept `test:coverage` as the Vitest coverage command for the Bun-free lane.
- Added `test:coverage:bun` for a locally stable Bun UI/plugin/perf baseline coverage output.
- Added `test:coverage:bun:full` for the broader Bun runtime/perf/security coverage pass.
- Added `test:coverage:all` to run both reports sequentially.

### Coverage

- Vitest coverage continues to own source-wide reporting for Bun-free pilot surfaces.
- Bun coverage now produces a separate Bun baseline report under `coverage/bun`.
- The full Bun runtime/perf/security sweep is available separately under `coverage/bun-full`.
- The two reports intentionally stay separate because they measure different layers:
  - Vitest: pure TS/UI gaps,
  - Bun: executed runtime/integration/perf/security files.
- The default Bun coverage command intentionally stays on stable UI/plugin-asset plus selected perf suites so contributors can generate a Bun report locally before opting into the broader environment-dependent pass.

### Validation

- Verified:
  - `bun run test:coverage`
  - `bun run test:coverage:bun`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
