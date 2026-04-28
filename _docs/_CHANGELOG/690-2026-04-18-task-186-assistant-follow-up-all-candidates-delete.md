# 690. TASK-186 assistant follow-up all candidates delete

Date: 2026-04-18
Version: unreleased
Tasks: TASK-186

## Key Changes

### Assistant/Core

- Follow-ups such as `usun te strony` now reuse all prior candidates when the previous inspection had no search query.
- The planner now targets exact previous candidate labels instead of using the first label as a prefix.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `bun --cwd core lint:types`
