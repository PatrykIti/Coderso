# 612. TASK-172-06 editorial content hub pack

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-172, TASK-172-06

## Key Changes

### Assistant Blueprints
- Added `Editorial Content Hub` blueprint pack.
- Blog/editorial prompts now generate a public `/blog` page with:
  - intro copy,
  - `posts-feed` widget.

### Scope
- No `post.*` assistant action was added.
- The pack reads existing published posts through the existing posts feed runtime behavior and does not create or mutate post records.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
