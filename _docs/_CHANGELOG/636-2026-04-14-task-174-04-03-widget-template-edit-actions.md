# 636. TASK-174-04-03 widget template edit actions

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-04, TASK-174-04-03

## Key Changes

### Assistant Actions
- Added executable `widget-template.update`.
- Added executable `widget-template.block.patch`.
- Planner resolves reusable template metadata/settings edits from active widget template context.
- Planner resolves selected reusable template block patches from active widget template context.
- Planner returns explicit `needs_input` when a reusable template edit is requested from page-instance context.
- Executor delegates persistence to `widgetTemplateService.updateWidgetTemplate`.
- Block patching preserves unrelated template blocks and settings.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
