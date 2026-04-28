# 689. TASK-185 assistant read-only status question guard

Date: 2026-04-18
Version: unreleased
Tasks: TASK-185

## Key Changes

### Assistant/Core

- Status/visibility questions such as `czy formularz Lead Form jest publiczny?` now route through deterministic read-only inspection before provider inference.
- The provider metadata contract is preserved for live smoke assertions while preventing accidental action plans.

## Validation

- `set -a && source .env && set +a && bun run test:assistant:live:openai`
- `set -a && source .env && set +a && bun run test:assistant:live:openrouter`
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
