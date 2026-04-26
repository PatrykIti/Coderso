# TASK-215-02: Widget Library Filter Bar, Table, and Grid Model
# FileName: TASK-215-02_Widget_Library_Filter_Bar_Table_and_Grid_Model.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-215-01, TASK-205
**Status:** To Do

---

## Overview

Build the shared list model used by both table and grid views. The filter bar
stays visible for both modes, the table is the default, and grid mode renders
the same visible rows as selectable cards.

## Sub-Tasks

- [ ] TASK-215-02-01: Section-Aware Filter Model and Counts
- [ ] TASK-215-02-02: Table View Selection and Pagination
- [ ] TASK-215-02-03: Grid View Selection and Drawer Parity
- [ ] Keep filters and counts in `widgetLibraryUtils.ts` or a clearly named
  extracted owner.
- [ ] Treat table as the user-facing contract; if the legacy internal view key
  remains `"list"` temporarily, tests and labels must still assert table mode.
- [ ] Do not add fake table columns for data the catalog does not provide.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetCatalogFilters.tsx`
- `core/admin/ui/widgets/WidgetCard.tsx`
- `core/admin/ui/widgets/widgetLibraryUtils.ts`
- `core/admin/ui/widgets/WidgetLibraryTable.tsx` if extracted.
- `core/admin/ui/widgets/WidgetLibraryGrid.tsx` if extracted.
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widget-card.test.tsx`
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
- `tests/vitest/ui/list-pagination.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth model: existing admin session/admin API key path.
- RBAC: `widgets:read`.
- CSRF: no writes in display/filter/view-mode work.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: filter values are closed UI enums and are not sent
  to new endpoints.
- Anti-abuse: visible-row selection is derived from already-authorized rows and
  is trimmed on every filter/section/page change.

## Testing Requirements

- Section, search, widget filters, template category filter, view mode, and
  pagination produce the same visible ids for table and grid.
- Table is the default view for `All Items`.
- Grid mode keeps the filter/action bar visible.
- Selection cannot include hidden rows after filtering or pagination changes.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widget-card.test.tsx tests/vitest/ui/widgetLibraryUtils.test.ts tests/vitest/ui/list-pagination.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. One view model drives both table and grid.
2. Filter bar visibility is independent of view mode.
3. Selection and pagination are visible-scope safe.
