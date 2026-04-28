# 681. TASK-184-10 posts media search live matrix

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-10

## Key Changes

### Assistant/QA

- Added an OpenAI/OpenRouter live matrix for Posts, Media, and Admin Search behavior.
- The live matrix verifies direct post mutations and media uploads stay gated without executable actions.
- Admin Search service smoke verifies seeded media fixtures are searchable and documents that dedicated posts are not indexed by the current global search service.

### Assistant/Core

- Direct post mutation prompts now return a gated `needs_input` plan until a typed post action contract exists.
- Media upload prompts now return a gated `needs_input` plan; assistant actions may reference existing media but do not accept upload bytes.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/assistant-live/postsMediaSearchLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
