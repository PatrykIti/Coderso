# TASK-216-02-03: Shared Pagination and Visible Selection
# FileName: TASK-216-02-03_Shared_Pagination_and_Visible_Selection.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI + Pagination
**Estimated Effort:** Medium
**Dependencies:** TASK-216-02-02, TASK-205
**Status:** To Do

---

## Overview

Add shared `useListPagination` and `ListPaginationFooter` to the Commerce
catalog, and make selection visible-page scoped like Pages.

## Sub-Tasks

- [ ] Use `useListPagination(filteredProducts, { resetKey })`.
- [ ] Render `pagination.visibleRows` in `CommerceTable`.
- [ ] Render `ListPaginationFooter` with `resourceLabel="products"`.
- [ ] Derive `visibleIds` from `pagination.visibleRows`.
- [ ] Trim `selectedIds` when filters, page, page size, or product cache change.
- [ ] Keep bulk actions limited to visible selected ids.

## Files to Change

- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/admin/ui/commerce/CommerceTable.tsx`
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/ui/commerce-list-page-wave.test.tsx` if added.
- `tests/vitest/ui/list-pagination.test.tsx` only if shared behavior changes.

## Security Contract

- Visibility: internal admin UI state only.
- Auth model: unchanged.
- RBAC: `commerce:read`.
- CSRF: no writes.
- Rate-limit bucket: no new server request.
- Reject-unknown validation: unchanged.
- Anti-abuse: selected ids must always be derived from normalized product rows,
  not arbitrary user input.

## Pseudocode

```ts
const pagination = useListPagination(filteredRows, {
  resetKey: JSON.stringify({ search, statusFilter, collectionFilter, stockFilter }),
});
const visibleIds = useMemo(
  () => pagination.visibleRows.map((row) => row.product.id),
  [pagination.visibleRows]
);

useEffect(() => {
  setSelectedIds((prev) => {
    const next = prev.filter((id) => visibleIds.includes(id));
    return next.length === prev.length ? prev : next;
  });
}, [visibleIds]);
```

## Testing Requirements

- Pagination footer range copy matches filtered products.
- Changing search/status/collection/stock resets to the first page.
- Selection trims when a selected product moves off the visible page.
- Select-all applies only to visible page rows.
- Footer disabled/loading behavior matches Pages.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx tests/vitest/ui/list-pagination.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `docs/coderso/commerce-catalog.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Commerce uses the shared pagination footer.
2. Hidden products cannot remain selected after filter/page changes.
3. Bulk action inputs are limited to visible selected ids.
