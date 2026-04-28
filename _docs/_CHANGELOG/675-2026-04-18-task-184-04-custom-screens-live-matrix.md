# 675. TASK-184-04 custom screens live matrix

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-04

## Key Changes

### Assistant/QA

- Added a DB-backed OpenAI/OpenRouter live matrix for custom screens.
- The live matrix covers screen prefix search, sidebar visibility filtering, active screen rename, broad delete safety, counted delete, state verification, and cleanup.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/assistant-live/customScreensLiveMatrix.test.ts`
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/live-cms-harness.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
