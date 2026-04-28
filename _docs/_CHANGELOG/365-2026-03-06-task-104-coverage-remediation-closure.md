# 365. TASK-104 Coverage Remediation Closure

- Date: 2026-03-06
- Version: Unreleased
- Tasks: TASK-104, TASK-104-01, TASK-104-02, TASK-104-03, TASK-104-04, TASK-104-05, TASK-104-06, TASK-104-07, TASK-104-08

## Key Changes

### Runner Ownership

- Added `tests/RUNNER_OWNERSHIP.md` with current `move to Vitest`, `keep in Bun`, and `refactor first` classification.
- Migrated broad Bun-free test waves from `tests/unit/*` and `tests/integration/ui/*` into `tests/vitest/*`.

### Vitest Lane

- Added large admin/UI/widget/page-builder/auth/store migration waves into Vitest.
- Added shared matcher compatibility in `tests/setup/vitest.ts`.
- Kept runtime/database-coupled suites in Bun after validation.

### Bun Baseline

- Added `scripts/run-bun-coverage-baseline.ts`.
- `test:coverage:bun` now runs a curated, self-filtering Bun baseline instead of relying on stale path lists.

### Validation

- Verified:
  - `bun run test:vitest`
  - `bun run test:coverage:bun`

- The Bun baseline now auto-skips env-dependent route suites when `DATABASE_URL` is unavailable.
