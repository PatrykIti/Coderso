# TASK-194-01-01: Page Table Selection State and Bulk Bar
# FileName: TASK-194-01-01_Page_Table_Selection_State_and_Bulk_Bar.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-194-01
**Status:** To Do

---

## Overview

Wire `PageTable` as a controlled selection surface instead of a static visual
table with disconnected checkboxes.

Current code already shows the core gap:

- `core/admin/ui/pages/PageTable.tsx:52-80` renders a header checkbox with no
  state or callback.
- `core/admin/ui/pages/PageTable.tsx:109-180` renders row checkboxes with no
  state or callback.
- `core/admin/ui/pages/PageListPage.tsx:58-72` has no selection state at all.

The resulting UI can display a checked header checkbox without any selected rows
or bulk toolbar, which is exactly the critical report finding.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageTable.tsx:52-80`
  - add controlled props for `selectedIds`, `isAllSelected`,
    `isIndeterminate`, `onToggleAll`, and `onTogglePage`.
- `core/admin/ui/pages/PageTable.tsx:109-180`
  - bind row checkbox state and selected row styling.
- `core/admin/ui/pages/PageListPage.tsx:58-72`
  - add `selectedIds` and bulk-toolbar state.
- `core/admin/ui/pages/PageListPage.tsx:143-147`
  - derive visible ids from filtered rows.
- `core/admin/ui/pages/PageListPage.tsx:306-333`
  - render the bulk bar above the table.
- `core/admin/ui/entries/EntryTable.tsx:47-54` and `106-167`
  - reuse list-selection contract; do not fork a second behavior model.
- `core/admin/ui/entries/EntryBulkActionsBar.tsx:15-68`
  - use as the interaction baseline for Pages.
- `tests/vitest/ui/page-table-wave.test.tsx:146-280`
- `tests/vitest/ui/page-post-list-wave.test.tsx:851-920`
- `tests/vitest/ui/entry-page-support-wave.test.tsx:717-779`

## New Files to Create

- `core/admin/ui/pages/PageBulkActionsBar.tsx` if the Pages list needs its own
  component wrapper instead of inlining the toolbar in `PageListPage`.

## Implementation Sketch

```ts
const visibleIds = filteredItems.map((page) => page.id);
const isAllSelected =
  visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

const toggleAll = () => {
  setSelectedIds((prev) =>
    isAllSelected
      ? prev.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...prev, ...visibleIds]))
  );
};
```

The Pages behavior must match `_docs/CONTENT_LIST_UX.md`:

- selection is based on currently visible rows after filters,
- hidden rows must not stay silently selected,
- the bulk bar appears only when `selectedIds.length > 0`.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged because this leaf only wires controlled
  client state.
- Anti-abuse: selection must not outlive the visible filtered scope in a way
  that lets users apply actions to hidden rows by mistake.

## Testing Requirements

- `tests/vitest/ui/page-table-wave.test.tsx`
  - header checkbox reflects all/none/indeterminate states,
  - row checkbox changes call the provided toggles,
  - selected rows get a visible state.
- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - bulk bar appears only with selection,
  - changing filters trims hidden selections,
  - `Select all` acts on filtered rows only.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Clicking `Select all pages` selects every currently visible page row.
2. Row selection is fully controlled and visually consistent.
3. The list exposes a bulk toolbar whenever one or more visible pages are
   selected.
