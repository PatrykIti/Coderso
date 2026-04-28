# 671. TASK-183 assistant page title search filtering

Date: 2026-04-18
Version: unreleased
Tasks: TASK-183

## Key Changes

### Assistant/Core

- Page read-only search now filters actual title/name search terms instead of returning every page from the current surface.
- Provider drafts such as `test-page OR test2 OR test` now resolve only matching page candidates.
- Surface-only read prompts still return visible candidates for broad UI surface questions.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant-openai-live.test.ts tests/integration/routes/assistant-openrouter-live.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
