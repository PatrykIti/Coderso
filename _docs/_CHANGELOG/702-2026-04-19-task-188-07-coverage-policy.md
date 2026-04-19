# 702. TASK-188-07 coverage policy

Date: 2026-04-19
Version: unreleased
Tasks: TASK-188-07

## Key Changes

### Assistant/QA

- Added policy helpers for generated live coverage rows and admin navigation route coverage validation.
- Updated live coverage matrix tests to compare markdown state/task metadata against `assistantOperationPolicy`.
- Added policy coverage tests for admin navigation routes and planned-route executable guards.

### Docs

- Documented that the live coverage matrix remains checked in but is validated from policy output.
- Added Assistant operation policy coverage to the Vitest-owned pure metadata lane.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
