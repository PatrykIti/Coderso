# 677. TASK-184-06 listings live matrix

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-06

## Key Changes

### Assistant/QA

- Added a DB-backed OpenAI/OpenRouter live matrix for listing queries and listing templates.
- The live matrix covers query/template inspection, query limit update, template layout update, broad delete safety, exact deletes, state verification, and cleanup.

### Assistant/Core

- Provider planning now applies prompt-implied listing query `limit` and listing template `layout` field intents when the provider omits them.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/live-cms-harness.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/assistant-live/listingsLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
