# 727. TASK-200 menus list parity

Date: 2026-04-23
Version: unreleased
Tasks: TASK-200

## Key Changes

### CMS Menus / Admin UI

- Aligned `/admin/menus` with the Pages/Posts list pattern: compact `New`
  header action, filter strip, controlled table selection, selected-row styling,
  right-aligned three-dot row actions, and list footer.
- Added Menus-specific search, status, and location filters without introducing
  fake author fields.
- Added row and visible-scope bulk lifecycle actions for `Publish`,
  `Move to Draft`, and `Delete`; destructive delete requires confirmation.

### CMS Menus / Runtime

- Added whole-menu lifecycle persistence through `draft` / `published` plus
  `publishedAt`.
- Kept existing menus published during migration so current public navigation
  remains visible after deploy; new menus default to draft.
- Public runtime navigation now resolves only published menus.

### Docs / QA

- Updated CMS API and content-list UX docs for the Menus lifecycle/list
  contract.
- Added Vitest coverage for Menus list filtering, visible-row selection, bulk
  confirmation, cache wrappers, schema validation, and runtime draft fallback.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx tests/vitest/admin/menusClient.test.ts tests/vitest/validation/menuSchemas.test.ts tests/vitest/ui/menu-editor.test.tsx tests/vitest/ui/menu-editor-shell-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/menus.test.ts tests/unit/menus/menuService.test.ts tests/unit/navigation/navigationRuntimeResolver.test.ts`
