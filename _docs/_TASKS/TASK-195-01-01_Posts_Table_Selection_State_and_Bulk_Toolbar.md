# TASK-195-01-01: Posts Table Selection State and Bulk Toolbar
# FileName: TASK-195-01-01_Posts_Table_Selection_State_and_Bulk_Toolbar.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-195-01
**Status:** To Do

---

## Overview

Wire `PostsTable` as a controlled selection surface instead of a static visual
table with disconnected checkboxes.

Current code shows the core gap directly:

- `core/admin/ui/posts/PostsTable.tsx:57-195` exposes only uncontrolled header
  and row checkboxes.
- `core/admin/ui/posts/PostsListPage.tsx:62-72` and `140-143` have no selection
  state or visible-id derivation.
- `core/admin/ui/posts/PostsListPage.tsx:297-324` renders only the table, so no
  bulk toolbar can appear when selection exists.

The result matches the critical QA finding: the header checkbox can toggle
visually without selecting rows or exposing any bulk actions.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/PostsTable.tsx:57-195`
  - add controlled props for `selectedIds`, `isAllSelected`,
    `isIndeterminate`, `onToggleAll`, and `onTogglePost`.
- `core/admin/ui/posts/PostsListPage.tsx:62-72`
  - add selection state.
- `core/admin/ui/posts/PostsListPage.tsx:140-143`
  - derive visible IDs from the filtered rows.
- `core/admin/ui/posts/PostsListPage.tsx:297-324`
  - render a bulk toolbar above the table.
- `core/admin/ui/entries/EntryTable.tsx` and `EntryBulkActionsBar.tsx`
  - reuse the existing list-selection interaction model; do not invent a new
    Posts-only behavior.
- `tests/vitest/ui/posts-table-wave.test.tsx`
- `tests/vitest/ui/page-post-list-wave.test.tsx`

## New Files to Create

- `core/admin/ui/posts/PostsBulkActionsBar.tsx` only if the toolbar should be a
  reusable wrapper instead of inline list-page markup.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged because this leaf is controlled client
  state over existing per-item actions.
- Anti-abuse:
  - selection must stay scoped to visible filtered rows,
  - hidden rows must not stay silently selected,
  - the toolbar appears only when at least one visible row is selected.

## Testing Requirements

- `tests/vitest/ui/posts-table-wave.test.tsx`
  - header checkbox reflects all/none/indeterminate states,
  - row checkbox state and selected-row styling are controlled,
  - empty state still renders correctly.
- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - bulk toolbar appears only with selection,
  - changing filters trims hidden selections,
  - `Select all posts` acts on filtered rows only.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Clicking `Select all posts` selects every currently visible post row.
2. Row selection is fully controlled and visually consistent.
3. The list exposes a bulk toolbar whenever one or more visible posts are
   selected.
