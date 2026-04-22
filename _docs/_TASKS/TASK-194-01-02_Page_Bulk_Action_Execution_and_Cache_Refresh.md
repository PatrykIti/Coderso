# TASK-194-01-02: Page Bulk Action Execution and Cache Refresh
# FileName: TASK-194-01-02_Page_Bulk_Action_Execution_and_Cache_Refresh.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-194-01-01
**Status:** Done (2026-04-22)

---

## Overview

Turn selected Pages rows into an executable, reviewable bulk flow. The report’s
critical bug is not fixed by checkbox state alone; the list must also expose the
action toolbar and apply the existing per-item Pages mutations in a way that is
clear about confirmations, partial failures, and refresh behavior.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageListPage.tsx:184-260`
  - reuse current single-item preview/publish/unpublish/delete helpers as the
    building blocks for bulk execution.
- `core/admin/ui/pages/PageListPage.tsx:278-347`
  - render the bulk toolbar and apply state above the table.
- `core/admin/services/pagesClient.ts:248-278`
  - reuse existing publish/unpublish wrappers.
- `core/admin/services/pagesClient.ts:337-349`
  - reuse existing delete wrapper and invalidation behavior.
- `core/admin/ui/entries/EntryList.tsx:204-352`
  - reference bulk selection/apply/error pattern; do not clone it blindly, but
    keep the same operational semantics.
- `core/admin/ui/entries/EntryBulkActionsBar.tsx:24-68`
  - reuse labels/interaction density as the baseline.
- `tests/vitest/ui/page-post-list-wave.test.tsx:738-849`
- `tests/vitest/ui/page-post-list-wave.test.tsx:851-920`
- `tests/vitest/ui/page-table-wave.test.tsx`

## New Files to Create

- `core/admin/ui/pages/PageBulkActionsBar.tsx` if the toolbar is extracted.

## Implementation Sketch

```ts
if (bulkAction === "delete") {
  confirm(`Delete ${selectedIds.length} page(s)? This cannot be undone.`);
}

const results = await Promise.allSettled(
  selectedIds.map((id) => {
    if (bulkAction === "publish") return publishPage(id);
    if (bulkAction === "unpublish") return unpublishPage(id);
    return deletePage(id);
  })
);

const failed = results.filter((entry) => entry.status === "rejected");
await refresh({ force: true, background: true });
clearSelection();
```

Direction:

- use existing per-item client wrappers first,
- keep partial failure visible,
- clear selection after a completed refresh,
- do not add a dedicated bulk API route in this leaf.

## Security Contract

- Visibility: internal admin list only.
- Auth/RBAC: inherited from existing per-item endpoints.
- CSRF: inherited from existing per-item client wrappers.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - delete bulk flow requires confirmation,
  - bulk actions must not execute against ids that are no longer selected,
  - refresh after apply must reconcile the visible list with actual server
    state.

## Testing Requirements

- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - publish/unpublish/delete bulk actions apply to selected ids,
  - delete confirmation blocks execution when rejected,
  - partial failures surface error copy and still refresh the list,
  - selection clears after successful completion.
- `tests/vitest/ui/page-table-wave.test.tsx`
  - toolbar shell/action state renders correctly when rows are selected.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Selected pages can be bulk-published, bulk-unpublished, or bulk-deleted.
2. Delete requires confirmation and partial failures remain visible.
3. The list refreshes and clears selection after the bulk apply path completes.
