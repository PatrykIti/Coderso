# 629. TASK-174-03-03 widget template delete action

**Date:** 2026-04-13
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-03, TASK-174-03-03

## Key Changes

### Assistant Actions
- Added executable `widget-template.delete`.
- Planner now resolves widget template delete requests from active widget template context.
- Dry-run includes a `delete` operation and reusable-template blast-radius warning.
- Execute revalidates template id/name/status/category before calling `widgetTemplateService.deleteWidgetTemplate`.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
