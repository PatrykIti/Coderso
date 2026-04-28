# 706. TASK-188 policy engine closure

Date: 2026-04-19
Version: unreleased
Tasks: TASK-188

## Key Changes

### Assistant/Core

- Completed the assistant operation policy engine program.
- `assistantOperationPolicy` is now the source of truth for provider guidance, resolver/filtering, action mapping/safety, follow-up planning state, and live coverage metadata.
- Removed the legacy CMS resource registry and duplicated planner count/resource guard paths.
- Deferred LangGraph adoption through ADR until a future long-running orchestration need exists.

### QA

- Final targeted Vitest assistant suites, lint/typecheck, and full OpenAI/OpenRouter live assistant matrix passed after cutover.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun run test:assistant:live`
