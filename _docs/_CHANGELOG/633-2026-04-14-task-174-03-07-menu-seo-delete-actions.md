# 633. TASK-174-03-07 menu SEO delete actions

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-03, TASK-174-03-07

## Key Changes

### Assistant Actions
- Added executable `menu.item.delete`.
- Added executable `seo.document.delete`.
- Planner resolves menu item delete from exact server-side catalog item id, label, or href.
- Planner resolves SEO document delete from exact server-side catalog id, slug, target title, or active SEO context.
- Menu item delete uses the menu tree service and preserves unrelated menu items.
- SEO document delete uses the SEO domain service and does not delete the page or entry target.
- Assistant resource catalog now includes bounded menu summaries and read-only existing SEO document summaries.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/admin-context-catalog-normalizer.test.ts tests/vitest/assistant/admin-context-catalogs.test.ts tests/vitest/assistant/provider-planning-context.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/menus/menuService.test.ts tests/unit/seo/seoService.test.ts`
