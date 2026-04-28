# 638. TASK-174-04-05 domain resource edit actions

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-04, TASK-174-04-05

## Key Changes

### Assistant Actions
- Added executable `entry.update`.
- Added executable `form.update`.
- Added executable `listing-query.update`.
- Added executable `listing-template.update`.
- Added executable `menu.item.update`.
- Added executable `seo.document.update`.
- Planner resolves conservative exact update plans for active entries and catalog-backed forms, listings, menu items, and SEO documents.
- Executor delegates persistence to existing domain services and preserves unrelated fields/config/tree items.
- Strict schemas reject unknown update fields and unsafe menu hrefs.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
