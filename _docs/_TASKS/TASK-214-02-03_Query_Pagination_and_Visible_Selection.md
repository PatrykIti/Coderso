# TASK-214-02-03: Query Pagination and Visible Selection
# FileName: TASK-214-02-03_Query_Pagination_and_Visible_Selection.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-214-02-02, TASK-205
**Status:** Done (2026-04-26)

---

## Overview

Use the shared pagination contract for listing queries and ensure selected query
ids are trimmed to the current visible page after filters or page changes.

## Sub-Tasks

- [x] Use `useListPagination(filteredQueryRows, { resetKey })`.
- [x] Render `ListPaginationFooter` with `resourceLabel="listing queries"`.
- [x] Compute visible query ids from `pagination.visibleRows`.
- [x] Trim `selectedQueryIds` whenever visible ids change.
- [x] Keep empty-state copy truthful for loading, no data, and no filter match.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingQueryTable.tsx`
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-page.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: unchanged `content:read`.
- CSRF: no writes.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: bulk operations can only receive ids still present in visible
  query rows.

## Pseudocode

```ts
const queryPagination = useListPagination(filteredQueries, { resetKey });
const visibleQueryIds = queryPagination.visibleRows.map((item) => item.id);

useEffect(() => {
  setSelectedQueryIds((prev) => prev.filter((id) => visibleQueryIds.includes(id)));
}, [visibleQueryIds]);
```

## Testing Requirements

- Query pagination footer shows correct counts.
- Filter changes reset query pagination.
- Hidden selected ids are removed before a bulk action can run.
- Empty copy differs between no queries and no filter matches.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-page.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Queries use the shared pagination footer.
2. Query bulk selection is always limited to current visible rows.
