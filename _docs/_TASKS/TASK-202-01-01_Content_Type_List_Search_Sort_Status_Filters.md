# TASK-202-01-01: Content Type List Search, Sort, and Status Filters
# FileName: TASK-202-01-01_Content_Type_List_Search_Sort_Status_Filters.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-202-01; TASK-202-05-01 for status filter closure
**Status:** To Do

---

## Overview

Repair the Engine list scalability issue from `UX-1`: 35 content types render in
one static table with no search, filter, or sort controls. Keep the fix inside
the current list/table components.

Search and deterministic sorting can land in this leaf before status is
persisted. Status filtering must not be implemented against the current
hard-coded `published` UI value; full status-filter closure depends on
`TASK-202-05-01` returning a real content type status contract.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeList.tsx:22-115`
  - add query and sort state,
  - add status filter state only after real content type status exists,
  - derive filtered rows before rendering `ContentTypeTable`,
  - do not filter on the current fake `published` row value; wire status only to
    real API/client status returned by `TASK-202-05-01`.
- `core/admin/ui/content-types/ContentTypeTable.tsx:32-117`
  - render sortable headers and filtered empty state.
- `tests/vitest/ui/content-type-table.test.tsx`
  - presentation-only table assertions.
- `tests/vitest/ui-integration/contentTypes.test.tsx`
  - list-owned search/sort behavior with mocked `listContentTypesCached` data,
    because `ContentTypeList` owns filtering state,
  - status filter coverage only after `ContentTypeSummary.status` is real; before
    that, prove the UI does not expose a fake status filter.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged read-only admin list behavior.
- Reject-unknown validation: unchanged.
- Anti-abuse: filtering must use already-loaded summaries only and must not
  expose schema bodies or entry payloads.

## Testing Requirements

- Search matches name and slug.
- Sort order is deterministic for name, slug, field count, and real status once
  `TASK-202-05-01` makes status available.
- Status filter is active only after `TASK-202-05-01` adds real status; before
  that, no fake status filter is shipped.
- Empty states distinguish loading, no records, and no filter results.
- Tests prove filtering/sorting in the list owner, not only static table SSR.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The list can be searched by content type name or slug.
2. Sort controls do not change selection, navigation, or cache behavior.
3. Status filtering is tied to a real status contract; if `TASK-202-05-01` has
   not landed yet, this leaf must leave the filter absent or explicitly disabled
   and record `TASK-202-05-01` as the remaining owner.
