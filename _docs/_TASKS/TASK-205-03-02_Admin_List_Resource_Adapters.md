# TASK-205-03-02: Admin List Resource Adapters
# FileName: TASK-205-03-02_Admin_List_Resource_Adapters.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-205-03-01, TASK-198, TASK-199, TASK-200
**Status:** Done (2026-04-24)

---

## Overview

Adopt the shared pagination contract in Content Types, Pages, Posts, and Menus
without creating resource-specific pagination copies. Each list keeps its own
filtering, sorting, loading, empty-state, selection, and resource copy, then
passes the already-filtered/sorted rows into `useListPagination`.

This leaf is about resource adapters only. If a resource needs different copy
or an empty-state edge case, pass props to the shared footer or handle it around
the shared contract; do not fork the pagination math.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeList.tsx`
  - call `useListPagination(rows, ...)` after existing search/status/sort,
  - pass `pagination.visibleRows` to `ContentTypeTable`,
  - render `ListPaginationFooter`.
- `core/admin/ui/content-types/ContentTypeTable.tsx`
  - keep empty/loading row behavior correct for paginated rows.
- `core/admin/ui/pages/PageListPage.tsx`
  - call `useListPagination(filteredItems, ...)`,
  - pass `pagination.visibleRows` to `PageTable`,
  - replace the static footer with `ListPaginationFooter`.
- `core/admin/ui/pages/PageTable.tsx`
  - keep table behavior independent from full filtered row count.
- `core/admin/ui/posts/PostsListPage.tsx`
  - call `useListPagination(filteredItems, ...)`,
  - pass `pagination.visibleRows` to `PostsTable`,
  - replace the static footer with `ListPaginationFooter`.
- `core/admin/ui/posts/PostsTable.tsx`
  - keep table behavior independent from full filtered row count.
- `core/admin/ui/menus/MenuListPage.tsx`
  - call `useListPagination(filteredItems, ...)`,
  - pass `pagination.visibleRows` to the internal table,
  - replace the static footer with `ListPaginationFooter`.
- `tests/vitest/ui/content-type-list-parity.test.tsx`
  - cover Content Types footer, page-size change, and navigation.
- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - cover Pages/Posts adoption and visible-page selection.
- `tests/vitest/ui/page-list.test.tsx`
  - update shell/footer assertions.
- `tests/vitest/ui/posts-list.test.tsx`
  - update shell/footer assertions.
- `tests/vitest/ui/menu-list-page.test.tsx`
  - update shell/footer assertions.
- `tests/vitest/ui/menu-list-page-actions.test.tsx`
  - cover Menus adoption and visible-page selection.

## Implementation Direction

The adapter shape should be the same across resources:

```ts
const filteredRows = useMemo(
  () => filterPages(items, searchQuery, statusFilter, authorFilter),
  [items, searchQuery, statusFilter, authorFilter]
);

const pagination = useListPagination(filteredRows, {
  resetKey: JSON.stringify({
    searchQuery,
    statusFilter,
    authorFilter,
  }),
});

const visibleRows = pagination.visibleRows;
const visibleIds = useMemo(
  () => visibleRows.map((row) => row.id),
  [visibleRows]
);
```

For Content Types, keep sorting before pagination:

```ts
const rows = useMemo(() => {
  const filtered = filterContentTypes(types, query, statusFilter);
  return sortContentTypes(filtered, sortKey, sortDirection);
}, [types, query, statusFilter, sortKey, sortDirection]);

const pagination = useListPagination(rows, {
  resetKey: JSON.stringify({ query, statusFilter, sortKey, sortDirection }),
});
```

Selection must use the paginated visible IDs:

```ts
const isAllSelected =
  visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

useEffect(() => {
  setSelectedIds((previous) =>
    previous.filter((id) => visibleIds.includes(id))
  );
}, [visibleIds]);

function handleToggleAll() {
  setSelectedIds(isAllSelected ? [] : visibleIds);
}
```

The shared footer should replace static footer markup:

```tsx
<PageTable items={pagination.visibleRows} ... />
<ListPaginationFooter resourceLabel="pages" pagination={pagination} />
```

Do not add resource-local `pageIndex`, `pageSize`, `totalPages`, or slice math
inside `ContentTypeList`, `PageListPage`, `PostsListPage`, or `MenuListPage`.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged; existing list reads and mutation flows
  keep their current contracts.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged; pagination changes only which rows are visible and
  selectable on the client.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-list.test.tsx tests/vitest/ui/posts-list.test.tsx tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Content Types, Pages, Posts, and Menus all consume the shared hook/footer.
2. Each list paginates after its existing filtering/sorting.
3. Tables receive only the currently visible paginated rows.
4. Header selection applies only to the current page of visible rows.
5. No targeted list owns duplicate pagination math.

## Completion Notes

- `ContentTypeList`, `PageListPage`, `PostsListPage`, and `MenuListPage`
  consume the shared pagination hook/footer after their existing filter/sort
  logic.
- Page-visible selection now uses paginated visible IDs for existing Pages,
  Posts, and Menus flows, and the same seam is used by Content Types selection.
- No resource-local pagination math or second list manager was introduced.
