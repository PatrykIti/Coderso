# TASK-207-03-02: Advanced Content Type, Author, and Date Filters
# FileName: TASK-207-03-02_Advanced_Content_Type_Author_and_Date_Filters.md

**Priority:** High
**Category:** Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-207-03-01, TASK-207-02-02
**Status:** To Do

---

## Overview

Add the collapsible advanced filter panel for Entries.

The panel must include content type. Author and date filters should be included
when they can be derived from the all-entries list without adding a new backend
contract.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryFilters.tsx`
  - use existing `Collapsible`/shared controls,
  - content-type select: `All content types` plus current Engine types,
  - author select from visible all-entries authors,
  - optional updated-date range if it stays simple and deterministic.
- `core/admin/ui/entries/EntryList.tsx`
  - own advanced filter state and pass options.
- `tests/vitest/ui/entry-list-filters.test.ts`
- `tests/vitest/ui/entry-list-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless filters become server query params.
- Anti-abuse: no hidden selected rows can survive advanced filter changes.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-list-filters.test.ts tests/vitest/ui/entry-list-wave.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Advanced filters can be expanded/collapsed.
2. Content type filtering is available in advanced filters.
3. Content type options use readable names and stable slug/id values.
4. Author/date filters, if included, are derived from current list data and have
   clear reset behavior.
5. No duplicate content-type sidebar or second selector flow is introduced.
