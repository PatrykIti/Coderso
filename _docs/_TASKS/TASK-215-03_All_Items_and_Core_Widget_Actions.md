# TASK-215-03: All Items and Core Widget Actions
# FileName: TASK-215-03_All_Items_and_Core_Widget_Actions.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI + Actions
**Estimated Effort:** Large
**Dependencies:** TASK-215-02, TASK-208, TASK-213
**Status:** To Do

---

## Overview

Wire section-specific actions for `All Items`, `All Widgets`, and widget
category sections. Core widget actions use Preview placeholder, Edit/Configure
drawer, Insert dialog, and favorite/bulk favorite operations.

Template rows may appear in `All Items`, but they must use template-safe
actions from TASK-215-04. Do not route template rows into the core widget
configuration drawer.

## Sub-Tasks

- [ ] TASK-215-03-01: All Items Row Actions and Preview Placeholder
- [ ] TASK-215-03-02: Core Widget Drawer and Insert Dialog Flow
- [ ] TASK-215-03-03: Core Widget Bulk Actions and Favorites
- [ ] Keep Insert as a one-widget operation through `WidgetInsertDialog`.
- [ ] Do not add a bulk insert action.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetCard.tsx`
- `core/admin/ui/widgets/WidgetDetailsDrawer.tsx`
- `core/admin/ui/widgets/WidgetInsertDialog.tsx`
- `core/admin/ui/widgets/WidgetLibraryRowActions.tsx` if extracted.
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widget-card.test.tsx`
- `tests/vitest/ui/widgetInsertUtils.test.ts`

## Security Contract

- Visibility: internal admin UI.
- Auth model: existing admin session/admin API key path.
- RBAC: `widgets:read` for preview placeholder/drawer reads; page-target insert
  uses existing page/content write path; template-target insert uses
  `widgets:write`.
- CSRF: insert mutations continue through `updatePage` and
  `updateWidgetTemplate` clients with CSRF.
- Rate-limit buckets: existing `admin_read` and `admin_write`.
- Reject-unknown validation: inserted blocks still come from widget registry
  defaults and existing page/template schemas.
- Anti-abuse: insert requires one explicit target and placement confirmation;
  bulk insert remains out of scope.

## Testing Requirements

- `All Items` core rows show Preview placeholder, Edit/Configure, Insert, and
  favorite actions.
- `All Widgets` and category sections show the same core row actions.
- Preview placeholder is non-mutating.
- Insert opens existing dialog and does not mutate until confirmed.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widget-card.test.tsx tests/vitest/ui/widgetInsertUtils.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Core widget row/card actions match the new Pages-style action model.
2. Edit/Configure and Insert reuse existing action surfaces.
3. Template rows in `All Items` are not forced through core widget actions.
