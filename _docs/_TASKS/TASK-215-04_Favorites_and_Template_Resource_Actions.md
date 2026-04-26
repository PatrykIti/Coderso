# TASK-215-04: Favorites and Template Resource Actions
# FileName: TASK-215-04_Favorites_and_Template_Resource_Actions.md

**Priority:** High
**Category:** Coderso Widgets + Templates + Admin/UI + Actions
**Estimated Effort:** Large
**Dependencies:** TASK-215-02, TASK-215-03, TASK-208, TASK-213-04
**Status:** To Do

---

## Overview

Wire the resource-specific actions for `Favorites` and `Templates`. Favorites
focus on managing the user's saved widget/template list. Templates keep the
existing template management contract: edit, duplicate, delete, categories,
confirmed bulk delete, shared toasts, and cache refresh.

## Sub-Tasks

- [ ] TASK-215-04-01: Favorites Section Actions and User Settings
- [ ] TASK-215-04-02: Template Table/Grid Actions and Category Management
- [ ] TASK-215-04-03: Template Bulk Actions, Confirmations, and Toasts
- [ ] TASK-215-04-04: Widget Action Error Mapping and Toast Adapter
- [ ] Keep template edits on the existing canonical template editor route.
- [ ] Keep category management in `WidgetTemplateCategoryDrawer`.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetTemplateCategoryDrawer.tsx`
- `core/admin/ui/widgets/WidgetTemplatePreviewDialog.tsx` only if reused for a
  later non-placeholder preview path; not required for this task.
- `core/admin/ui/widgets/WidgetLibraryRowActions.tsx` if extracted.
- `core/admin/ui/widgets/widgetActionToasts.ts` if extracted.
- `core/admin/services/widgetTemplatesClient.ts`
- `core/admin/services/widgetTemplateCategoriesClient.ts`
- `core/server/routes/widgetTemplateRoutes.ts` only if route error mapping
  changes.
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widget-template-preview-dialog.test.tsx` only if preview
  behavior changes.
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
- `tests/vitest/admin/widgetTemplateCategoriesClient.test.ts`
- `tests/integration/routes/widgetTemplates.test.ts` if route mapping changes.

## Security Contract

- Visibility: internal admin UI and existing internal Widgets template APIs.
- Auth model: existing admin session/admin API key path.
- RBAC: favorites user setting path stays authenticated; template reads require
  `widgets:read`; template mutations require `widgets:write`.
- CSRF: template duplicate/delete/category mutations continue through existing
  clients with CSRF.
- Rate-limit buckets: existing `admin_read` and `admin_write`.
- Reject-unknown validation: template/category payloads remain owned by
  `widgetSchemas.ts`.
- Anti-abuse: destructive template actions require confirmation and operate
  only on visible selected template rows.

## Testing Requirements

- Favorites section can remove one or many selected favorite rows.
- Favorites rows use source-specific actions without exposing template delete as
  a favorite-management shortcut unless the row is in the Templates action
  context.
- Templates section supports table and grid actions.
- Template delete and bulk delete are confirmed and partial-failure safe.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/admin/widgetTemplatesClient.test.ts tests/vitest/admin/widgetTemplateCategoriesClient.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` if route behavior changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Favorites and Templates actions are visibly different and resource-specific.
2. Template management keeps existing route/client/service ownership.
3. Destructive actions are confirmed and visible-scope safe.
