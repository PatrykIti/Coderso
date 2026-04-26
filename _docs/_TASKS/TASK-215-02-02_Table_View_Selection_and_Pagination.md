# TASK-215-02-02: Table View Selection and Pagination
# FileName: TASK-215-02-02_Table_View_Selection_and_Pagination.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-215-02, TASK-205
**Status:** To Do

---

## Overview

Add the default Pages-style table view for Widget Library rows with checkbox
selection, section-aware row columns, row action menus, and shared pagination.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetLibraryTable.tsx` if extracted.
- `core/admin/ui/shared/ListPaginationFooter.tsx` only if a generic bug is
  found and fixed.
- `core/admin/ui/shared/useListPagination.ts`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/list-pagination.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth model: unchanged admin session/admin API key path.
- RBAC: table rows are backed by `widgets:read`.
- CSRF: no writes in table rendering.
- Rate-limit bucket: unchanged `admin_read`.
- Reject-unknown validation: no route schema changes.
- Anti-abuse: selected ids are clipped to current visible rows before bulk
  actions can execute.

## Pseudocode

```tsx
<WidgetLibraryTable
  rows={pagination.visibleRows}
  selectedIds={selectedIds}
  allVisibleSelected={allVisibleSelected}
  onToggleRow={toggleRow}
  onToggleAllVisible={toggleAllVisible}
  onAction={handleRowAction}
/>
<ListPaginationFooter {...pagination.footerProps} />
```

## Testing Requirements

- Table is rendered for default `All Items`.
- Header checkbox selects only visible rows.
- Row checkbox toggles the row without opening drawer/actions.
- Pagination slices rows and trims selected ids.
- Table columns use available catalog/template fields only.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/list-pagination.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Table view follows Pages list behavior without inventing unavailable data.
2. Visible-row selection is reliable across pagination.
3. Row actions are wired through a controlled action callback.
