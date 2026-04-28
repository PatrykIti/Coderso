# 678. TASK-184-07 widget templates live matrix

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-07

## Key Changes

### Assistant/QA

- Added a DB-backed OpenAI/OpenRouter live matrix for widget templates.
- The live matrix covers template inspection, active template rename, selected hero block patching, broad delete safety, exact delete, state verification, and cleanup.

### Assistant/Core

- Active selected-block prompts now prefer local admin context before provider inference.
- Widget template live fixtures now use valid hero block variants/data so executor validation exercises real widget contracts.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/live-cms-harness.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/assistant-live/widgetTemplatesLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
