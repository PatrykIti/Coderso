# TASK-207-02-03: Shared Pagination and Visible-Scope Selection
# FileName: TASK-207-02-03_Shared_Pagination_and_Visible_Scope_Selection.md

**Priority:** High
**Category:** Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-207-02-02, TASK-205-03
**Status:** Done (2026-04-24)

---

## Overview

Replace the static Entries table footer with the shared admin list pagination
contract and make row selection page-visible scoped.

`EntryTable` currently renders `Showing 1-N of N entries` with disabled
Previous/Next buttons. This must use `useListPagination` and
`ListPaginationFooter` like Pages, Posts, Menus, and Content Types.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryList.tsx`
  - call `useListPagination(filteredEntries, { resetKey })`,
  - pass only `pagination.visibleRows` to `EntryTable`,
  - derive visible selection refs from paginated rows as
    `{ id, typeSlug: entry.contentType.slug }`,
  - trim selected IDs when filters/page/page size hide rows.
- `core/admin/ui/entries/EntryTable.tsx`
  - remove local static footer and separators,
  - stay a presentation adapter for rows and controlled selection.
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/ui/entry-table-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: bulk actions can only mutate controlled selected visible IDs.
  For the cross-type list, execution must resolve each selected id to the
  visible row's owning `contentType.slug`; never execute bulk work against a
  hidden row or against a single stale `activeSlug`.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-table-wave.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Entries default to 10 visible rows per page.
2. Entries use the shared page-size options and footer component.
3. Previous/Next controls change the actual visible row set.
4. Filtering happens before pagination.
5. Header checkbox selects only current visible paginated rows.
6. Selection is trimmed when page, page size, filter, or sort changes hide rows.
7. Cross-type selected rows keep their owning content-type slug for later row
   and bulk mutations.
