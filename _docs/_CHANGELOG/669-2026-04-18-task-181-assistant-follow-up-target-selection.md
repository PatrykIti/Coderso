# 669. TASK-181 assistant follow-up target selection

Date: 2026-04-18
Version: unreleased
Tasks: TASK-181

## Key Changes

### Assistant/Core

- `LLM Guide` now resolves bounded planning-state follow-ups before calling a live provider.
- Confirmations such as `tak, to te dwie, usun je` can reuse the prior candidate list and produce reviewed typed delete actions instead of being interpreted as a fresh target query.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-planning-state.test.ts`
