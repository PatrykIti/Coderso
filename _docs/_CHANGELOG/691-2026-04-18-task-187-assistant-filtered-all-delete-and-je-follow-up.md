# 691. TASK-187 assistant filtered all delete and je follow-up

Date: 2026-04-18
Version: unreleased
Tasks: TASK-187

## Key Changes

### Assistant/Core

- Follow-up `usun je` now reuses previous inspection candidates.
- Natural prompts such as `znajdz wszystkie opublikowane strony i je usun` now infer a published-status filter and produce reviewed typed delete actions for the filtered set.
- Unfiltered broad destructive prompts remain gated.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-target-resolver.test.ts`
- `set -a && source .env && set +a && bun run test:assistant:live:openai`
- `set -a && source .env && set +a && bun run test:assistant:live:openrouter`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
