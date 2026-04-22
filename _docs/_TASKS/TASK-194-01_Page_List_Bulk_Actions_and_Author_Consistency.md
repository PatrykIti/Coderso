# TASK-194-01: Page List Bulk Actions and Author Consistency
# FileName: TASK-194-01_Page_List_Bulk_Actions_and_Author_Consistency.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-194, TASK-191
**Status:** Done (2026-04-22)

---

## Overview

Repair the Pages list as an operational surface. The report found one critical
failure here and one medium-severity data-trust issue:

- header `Select all pages` does not select rows or reveal bulk actions,
- newly created pages can appear with `Unknown` author because the list is
  hydrated from stale partial cache state.

This subtask must make the list behave like the repo’s existing list patterns:
selection applies to visible filtered records, bulk actions are explicit and
confirm destructive work, and the author column reflects current persisted data
instead of mutation-local placeholders. When the server truly reports no author,
the list should render a neutral missing-author state rather than the same
generic `Unknown` copy that currently masks stale cache bugs.

Ownership note:

- `core/admin/services/pagesClient.ts` owns mutation-driven list/detail cache
  writes and invalidation.
- `core/admin/ui/pages/PageListPage.tsx` owns mount refresh behavior and cache
  consumption, not author synthesis.
- `core/admin/ui/pages/PageTable.tsx` owns only the truthful rendering of
  resolved vs intentionally missing author payloads.

## Sub-Tasks

- `TASK-194-01-01_Page_Table_Selection_State_and_Bulk_Bar.md`
- `TASK-194-01-02_Page_Bulk_Action_Execution_and_Cache_Refresh.md`
- `TASK-194-01-03_Create_Path_Author_Hydration_and_List_Cache_Correctness.md`

## Scope

- Add controlled selection state to `PageTable`.
- Add a Pages bulk-actions bar and bulk apply flow.
- Keep selection scoped to currently visible filtered rows.
- Clear selection when affected rows disappear or after bulk completion.
- Fix author/cache correctness after create/open-after-create without inventing a
  second author source.
- Distinguish stale authorless cache from a real missing-owner state in the
  author cell.

Out of scope:

- a new Pages grid view,
- pagination redesign,
- server-side bulk endpoint unless per-item actions prove insufficient.

## Files to Change

- `core/admin/ui/pages/PageListPage.tsx`
- `core/admin/ui/pages/PageTable.tsx`
- `core/admin/services/pagesClient.ts`
- `core/admin/ui/entries/EntryList.tsx` and `core/admin/ui/entries/EntryBulkActionsBar.tsx` for pattern reference only
- `tests/vitest/ui/page-table-wave.test.tsx`
- `tests/vitest/ui/page-post-list-wave.test.tsx`
- `tests/vitest/ui/page-list-cache-behavior.test.tsx`
- `tests/vitest/admin/pagesClient.test.ts`
- `tests/vitest/ui/entry-page-support-wave.test.tsx`
- `tests/integration/routes/pages.test.ts` only if the author-fix leaf widens server response shape

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
  - partial failures must surface as errors instead of silently skipping items.

## Testing Requirements

- Vitest:
  - page table controlled header/row selection,
  - bulk bar render/clear/apply states,
  - filtered visible-scope selection rules,
  - cache-owner regression coverage in `tests/vitest/admin/pagesClient.test.ts`
    for create/duplicate list/detail cache writes,
  - author/cache correctness after create/open-after-create,
  - neutral missing-author fallback rendering when `author: null` is real,
  - partial bulk failure messaging.
- Bun only if route/service payloads change for author hydration.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md` only if cache invalidation semantics change materially
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Select all pages` controls visible row checkboxes and reveals bulk actions.
2. Bulk publish/unpublish/delete paths refresh the list and handle partial
   failure cleanly.
3. A page created through the current admin flow does not sit in the list with
   `Unknown` author because of stale client cache.
