# TASK-202-01-01: Content Type List Search, Sort, and Status Filters
# FileName: TASK-202-01-01_Content_Type_List_Search_Sort_Status_Filters.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-202-01
**Status:** To Do

---

## Overview

Repair the Engine list scalability issue from `UX-1`: 35 content types render in
one static table with no search, filter, or sort controls. Keep the fix inside
the current list/table components.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeList.tsx:22-115`
  - add query, sort, and status filter state,
  - derive filtered rows before rendering `ContentTypeTable`.
- `core/admin/ui/content-types/ContentTypeTable.tsx:32-117`
  - render sortable headers and filtered empty state.
- `tests/vitest/ui/content-type-table.test.tsx`
- `tests/vitest/ui-integration/contentTypes.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged read-only admin list behavior.
- Reject-unknown validation: unchanged.
- Anti-abuse: filtering must use already-loaded summaries only and must not
  expose schema bodies or entry payloads.

## Testing Requirements

- Search matches name and slug.
- Sort order is deterministic for name, slug, field count, and status.
- Status filter is active only after `TASK-202-05-01` adds real status; before
  that, no fake status filter is shipped.
- Empty states distinguish loading, no records, and no filter results.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The list can be searched by content type name or slug.
2. Sort controls do not change selection, navigation, or cache behavior.
3. Status filtering is tied to a real status contract.
