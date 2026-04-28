# 680. TASK-184-09 bulk follow-up safety live matrix

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-09

## Key Changes

### Assistant/QA

- Added an OpenAI/OpenRouter live matrix for bulk follow-up and safety behavior.
- The live matrix covers planning-state follow-up deletion, count mismatch safety, broad destructive prompt blocking, and counted multi-update planning.

### Assistant/Core

- Polish `dwom/dwóm` count wording now resolves as two targets.
- Follow-up pronouns such as `te` now match whole words instead of substrings inside unrelated update prompts.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/assistant-live/bulkSafetyLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
