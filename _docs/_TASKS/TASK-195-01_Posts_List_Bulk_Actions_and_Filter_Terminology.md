# TASK-195-01: Posts List Bulk Actions and Filter Terminology
# FileName: TASK-195-01_Posts_List_Bulk_Actions_and_Filter_Terminology.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-195
**Status:** To Do

---

## Overview

Repair the Posts list as an operational admin surface. The report found one
critical blocker here and one clear copy regression:

- header `Select all posts` does not select rows or reveal bulk actions,
- the shared search field still uses Pages wording.

This subtask must make the list behave like the repo’s existing list patterns:
selection applies to the currently visible filtered rows, destructive bulk work
is confirmed and clearly reported, and shared list-filter copy is resource-aware
instead of hard-coded to Pages.

## Sub-Tasks

- `TASK-195-01-01_Posts_Table_Selection_State_and_Bulk_Toolbar.md`
- `TASK-195-01-02_Bulk_Apply_Flow_and_Shared_Filter_Copy.md`

## Scope

- Add controlled selection state to `PostsTable`.
- Add a Posts bulk-action toolbar and apply flow.
- Keep selection scoped to the currently visible filtered rows.
- Clear selection when affected rows disappear or after bulk completion.
- Make the shared filter/search component accept resource-specific wording.

Out of scope:

- a new Posts grid view or pagination redesign,
- a new dedicated bulk backend route unless the current per-item actions cannot
  satisfy the UX with acceptable partial-failure handling,
- Posts editor changes outside list-entry actions and list copy.

## Files to Change

- `core/admin/ui/posts/PostsListPage.tsx`
- `core/admin/ui/posts/PostsTable.tsx`
- `core/admin/ui/pages/PageFilters.tsx`
- `core/admin/ui/entries/EntryList.tsx`, `EntryTable.tsx`, and
  `EntryBulkActionsBar.tsx` for pattern reference only
- `tests/vitest/ui/posts-table-wave.test.tsx`
- `tests/vitest/ui/page-post-list-wave.test.tsx`

## Security Contract

- Visibility: internal admin list UI only.
- Auth model: unchanged admin session/API-key path.
- RBAC: reuse existing per-item `content:write` and `content:publish` checks via
  current endpoints.
- CSRF: unchanged because bulk execution still calls current mutating client
  wrappers.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - destructive bulk delete requires confirmation,
  - selection must only apply to visible filtered rows,
  - partial failures must surface instead of silently skipping items.

## Testing Requirements

- Vitest:
  - post table controlled header/row selection,
  - bulk toolbar render/clear/apply states,
  - visible-scope selection after filters/search,
  - Posts-specific placeholder/copy wiring through the shared filters.
- Bun only if a route contract widens for bulk behavior.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Select all posts` controls the visible row checkboxes and reveals bulk
   actions.
2. Bulk publish/unpublish/delete paths refresh the list and handle partial
   failure cleanly.
3. Shared list filters render Posts-specific copy instead of Pages wording.
