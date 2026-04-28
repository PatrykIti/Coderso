# 635. TASK-174-04-02 page widget patch action

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-04, TASK-174-04-02

## Key Changes

### Assistant Actions
- Expanded executable `page.widget.patch` with selected-block `patch-data`.
- Added strict `blockId`, optional `expectedBlockType`, `dataPath[]`, and primitive `value` input.
- Planner resolves selected page block patch plans from active page context.
- Executor blocks missing selected blocks, changed block types, and unknown data paths.
- Patch helper preserves unrelated page blocks and avoids broad JSON rewrites.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/page-widget-patch.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
