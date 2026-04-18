# 676. TASK-184-05 forms live matrix

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-05

## Key Changes

### Assistant/QA

- Added a DB-backed OpenAI/OpenRouter live matrix for forms.
- The live matrix covers form create, public visibility search, metadata update, archive, broad delete safety, counted delete, state verification, and cleanup.

### Assistant/Core

- Provider planning now applies prompt-implied public/internal form visibility filters when the provider omits them.
- Provider-generated destructive actions are rejected for broad all-resource prompts such as `usun wszystkie formularze`.
- Explicit form create fields can recover to `form.upsert` when provider output is actionless.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-target-resolver.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/assistant-live/formsLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
