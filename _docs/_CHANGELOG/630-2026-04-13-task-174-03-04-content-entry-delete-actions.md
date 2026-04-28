# 630. TASK-174-03-04 content and entry delete actions

**Date:** 2026-04-13
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-03, TASK-174-03-04

## Key Changes

### Assistant Actions
- Added executable `entry.delete`.
- Added executable `content-type.delete`.
- Planner resolves entry delete from active entry route context.
- Planner resolves content type delete from exact server-side resource catalog targets.
- Content type delete is blocked when the catalog reports existing entries.
- Execute revalidates targets before calling the existing content domain services.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
