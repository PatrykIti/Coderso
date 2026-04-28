# TASK-195-01-02: Bulk Apply Flow and Shared Filter Copy
# FileName: TASK-195-01-02_Bulk_Apply_Flow_and_Shared_Filter_Copy.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-195-01
**Status:** Done (2026-04-22)

---

## Overview

Finish the operational behavior of the Posts list after selection exists.

Current code already exposes the per-item actions needed for bulk work in
`core/admin/ui/posts/PostsListPage.tsx:195-253`, but there is no apply flow,
selection cleanup, or aggregated result handling. The same screen also routes
through `core/admin/ui/pages/PageFilters.tsx:18-45`, which hard-codes
`Search pages by title...`.

This leaf keeps the current per-item client wrappers as the default execution
path and fixes the shared filter component so the Posts surface stops leaking
Pages terminology.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/PostsListPage.tsx:195-253`
  - add bulk publish/unpublish/delete apply orchestration, refresh, and
    selection clearing.
- `core/admin/ui/posts/PostsListPage.tsx:269-337`
  - surface aggregated success/error states near the list.
- `core/admin/ui/pages/PageFilters.tsx:18-45`
  - accept resource-specific `searchPlaceholder` and `searchAriaLabel` props.
- `core/admin/ui/posts/PostsListPage.tsx:297-305`
  - pass Posts-specific filter copy.
- `core/admin/ui/pages/PageListPage.tsx`
  - update call sites to preserve existing Pages wording after the shared
    component is generalized.
- `tests/vitest/ui/page-post-list-wave.test.tsx`

## Implementation Notes

- Reuse the existing `publishPost`, `unpublishPost`, and `deletePost` client
  wrappers by default.
- If partial failures occur, keep the failure list explicit and refresh the
  authoritative list state after the batch completes.
- Do not add a dedicated bulk route unless the per-item path proves
  operationally insufficient.

## Security Contract

- Visibility: internal admin list UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged existing per-item endpoints.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - destructive bulk delete keeps explicit confirmation,
  - bulk execution must never target rows that are no longer visible,
  - partial failures must surface with concrete item counts or identifiers.

## Testing Requirements

- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - Posts-specific placeholder/ARIA copy renders through the shared filters,
  - Pages call sites keep their current placeholder/ARIA wording after the
    shared component is generalized,
  - bulk publish/unpublish/delete clears selection after completion,
  - partial failure surfaces an aggregated list error without hiding successes,
  - cache refresh or refetch happens after bulk apply.
- Bun only if a dedicated bulk route is introduced later.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Posts bulk actions execute from the shared list and refresh authoritative
   list state after completion.
2. Shared filters show Posts-specific search copy while Pages keep their current
   wording.
3. Partial failures are actionable and do not leave stale hidden selection
   behind.
