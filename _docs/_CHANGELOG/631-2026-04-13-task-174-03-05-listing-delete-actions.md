# 631. TASK-174-03-05 listing delete actions

**Date:** 2026-04-13
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-03, TASK-174-03-05

## Key Changes

### Assistant Actions
- Added executable `listing-query.delete`.
- Added executable `listing-template.delete`.
- Planner resolves listing query delete from active listing query context or exact catalog name.
- Planner resolves listing template delete from exact catalog name/slug.
- Dry-run and execute block deletion when page or widget template references are still visible.
- Execute delegates deletion to the existing listing query/template domain services.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
