# 656. TASK-178 OpenRouter live planner smoke

Date: 2026-04-17
Version: unreleased
Tasks: TASK-178-07-01

## Key Changes

### Assistant/QA

- Added an opt-in live OpenRouter integration smoke for `LLM Guide` planner behavior.
- The test uses only `TEST_OPENROUTER_API_KEY` and `TEST_OPENROUTER_MODEL`.
- The test is skipped when either env var is missing.

### Assistant/Core

- OpenRouter provider now sends the raw user message for planner calls with no snippets, instead of wrapping it in documentation RAG prompt text.
- Provider CMS operation drafts can repair safe small-model JSON shape drift before strict validation, while still rejecting secret-like keys.

### Configuration

- Documented `TEST_OPENROUTER_API_KEY` and `TEST_OPENROUTER_MODEL` in `.env.example` as test-only variables.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/openRouterProvider.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant-openrouter-live.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
