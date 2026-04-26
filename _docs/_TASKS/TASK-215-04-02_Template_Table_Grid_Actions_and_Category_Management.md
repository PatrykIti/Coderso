# TASK-215-04-02: Template Table/Grid Actions and Category Management
# FileName: TASK-215-04-02_Template_Table_Grid_Actions_and_Category_Management.md

**Priority:** High
**Category:** Coderso Widgets + Templates + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-215-04, TASK-213-04
**Status:** To Do

---

## Overview

Bring template rows into the same table/grid model while preserving existing
template management: Edit, Duplicate, Delete, status/category display, category
filter, and category drawer. Template row/card actions should move into the
same three-dot dropdown pattern as Pages; do not keep the current inline
Edit/Duplicate/Delete button group as the final table UI. The `Templates`
section owns the active `New Template` action in the filter/action bar; no
`New` action is shown for core-widget sections.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetTemplateCategoryDrawer.tsx`
- `core/admin/ui/widgets/WidgetLibraryRowActions.tsx` if extracted.
- `core/admin/services/widgetTemplatesClient.ts`
- `core/admin/services/widgetTemplateCategoriesClient.ts`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
- `tests/vitest/admin/widgetTemplateCategoriesClient.test.ts`

## Security Contract

- Visibility: internal admin UI.
- Auth model: existing admin session/admin API key path.
- RBAC: template reads require `widgets:read`; duplicate/delete/category writes
  require `widgets:write`.
- CSRF: template and category mutations keep existing CSRF-enabled clients.
- Rate-limit buckets: existing `admin_read` and `admin_write`.
- Reject-unknown validation: template/category payloads stay schema-owned in
  `widgetSchemas.ts`.
- Anti-abuse: category actions keep explicit row/category context and do not
  delete templates.

## Testing Requirements

- Templates section table and grid show template-safe actions.
- Template actions are exposed through the shared row/card action menu, not
  inline action buttons.
- Template category filter still works in the filter bar.
- Category drawer remains reachable after the left rail is removed.
- `New Template` is visible only for the active `Templates` section; core-widget
  sections do not show a generic `New` action.
- Edit navigation uses canonical admin helpers.
- Duplicate uses the existing service/client path and refreshes caches.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/admin/widgetTemplatesClient.test.ts tests/vitest/admin/widgetTemplateCategoriesClient.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Template actions are available in table and grid.
2. Category management remains discoverable without the left rail.
3. Template edit/duplicate/delete reuse existing clients and routes.
