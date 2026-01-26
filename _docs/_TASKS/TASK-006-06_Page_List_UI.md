# TASK-006-06: Page List UI
# FileName: TASK-006-06_Page_List_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-002, TASK-024
**Status:** To Do

---

## Overview

Build the pages list view with toolbar filters, table, and row actions. This is
part of the page management UI.

## Reference UI

- `_docs/UI/admin_panel/6-page-list/code.html`
- `_docs/UI/admin_panel/6-page-list/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Page header with primary action.
- Toolbar (search, filters, view options).
- Table with status badges and row actions.
- Pagination footer.

## Shadcn Components

- `Table`, `Button`, `Input`, `Select`, `Badge`, `DropdownMenu`, `Checkbox`,
  `Pagination`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/pages/PageListPage.tsx` | create | screen layout |
| `core/admin/ui/pages/PageFilters.tsx` | create | toolbar |
| `core/admin/ui/pages/PageTable.tsx` | create | table + rows |
| `core/admin/ui/pages/PageRowActions.tsx` | create | dropdown actions |
| `core/admin/ui/layouts/AdminShell.tsx` | use | wrapper |

## Data + State

- `GET /pages` with filters (status, author, query).
- `PATCH /pages/:id` for status updates.
- `DELETE /pages/:id` for removals.

## Unit Tests

- `tests/unit/ui/page-list.test.tsx` renders table + filters.
- `tests/unit/ui/page-row-actions.test.tsx` renders action menu.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-page-list-ui.md`

