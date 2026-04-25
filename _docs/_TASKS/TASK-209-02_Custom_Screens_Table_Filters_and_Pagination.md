# TASK-209-02: Custom Screens Table, Filters, and Pagination
# FileName: TASK-209-02_Custom_Screens_Table_Filters_and_Pagination.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-209-01
**Status:** To Do

---

## Overview

Move `/admin/coderso/custom-screens` onto the same list shell, filter bar, table
treatment, pagination footer, and visible-row selection model used by Pages.

This round is UI structure and list ergonomics. Mutating action feedback and
confirmations are owned by `TASK-209-03`.

## Sub-Tasks

- [ ] TASK-209-02-01: Custom Screen List Shell and Create Entry Point
- [ ] TASK-209-02-02: Custom Screen Filters for Search, Status, and Content Type
- [ ] TASK-209-02-03: Custom Screen Table, Pagination, and Visible Selection

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- new `core/admin/ui/custom-screens/CustomScreenTable.tsx`
- new `core/admin/ui/custom-screens/CustomScreenFilters.tsx`
- new `core/admin/ui/custom-screens/CustomScreenBulkActionsBar.tsx`
- new `core/admin/ui/custom-screens/CustomScreenCreateDrawer.tsx`
- new `core/admin/ui/custom-screens/CustomScreenRowActions.tsx`
- `core/admin/ui/shared/useListPagination.ts`
- `core/admin/ui/shared/ListPaginationFooter.tsx`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- new mounted list suite, for example
  `tests/vitest/ui/custom-screens-list-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC: `content:read` for list labels; create entry point writes are
  specified in `TASK-209-03`.
- CSRF: no mutation is required by filter/table/pagination rendering.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: no new route payloads.
- Anti-abuse: visible selection is local UI state and must be trimmed to the
  current filtered/paginated rows before later bulk actions consume it.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-list-wave.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-records.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. The list shell, header, table surface, and pagination visually match the Pages
   first-screen list pattern.
2. Filters and pagination are stable on desktop and mobile.
3. Selection is scoped to visible rows and does not survive hidden filter/page
   changes.
4. Existing builder and records links keep using canonical admin navigation.
