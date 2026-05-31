# 1031 - Bun coverage WriteFailed stabilization

Date: 2026-05-31
Version: Unreleased
Tasks: TASK-344

## Key Changes

### CI and Testing

- Stabilized `bun run test:coverage:bun` by stopping the Bun lane from
  streaming the full per-file text coverage table into CI logs.
- Kept the canonical `coverage/bun/lcov.info` artifact and added a compact
  LCOV-derived totals summary after the coverage run.
- Added focused Vitest coverage for the LCOV parsing and summary formatting
  helper.

## Validation

- Reproduced the previous `WriteFailed` with `bun run test:coverage:bun` before
  the fix.
- Passed `bun run vitest run --config vitest.config.ts tests/vitest/tooling/bun-lane-coverage.test.ts`.
- Passed `bun run test:coverage:bun` with `116 pass`, `0 fail`, and compact LCOV summary output.
- Passed `bun run test:bun:lane` with `116 pass`, `0 fail`.
- Passed `bun --cwd core lint`, `bun --cwd core lint:types`, and `bun run lint:repo:types`.
