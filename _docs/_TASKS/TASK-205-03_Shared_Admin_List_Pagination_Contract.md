# TASK-205-03: Shared Admin List Pagination Contract
# FileName: TASK-205-03_Shared_Admin_List_Pagination_Contract.md

**Priority:** Medium
**Category:** CMS/Engine + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-205, TASK-198, TASK-199, TASK-200
**Status:** To Do

---

## Overview

Complete the first-screen list footer and pagination affordance for Content
Types, Pages, Posts, and Menus.

The current `ContentTypeList` ends at `ContentTypeTable`, so it is missing the
footer entirely. Pages, Posts, and Menus already show a footer with filtered
counts and `Previous` / `Next` buttons, but those controls are not backed by
real page state and the tables do not limit visible rows. This task makes the
footer truthful and functional across all four list screens.

The implementation should be shared by default: one reusable admin list
pagination hook/contract plus one footer component should own page-size options,
page index, clamping, visible-row slicing, range metadata, and `Previous` /
`Next` behavior. The four list screens should only supply filtered/sorted rows,
resource labels, and resource-specific loading/empty/selection behavior.

This task owns pagination and visible-row exposure only. Pages, Posts, and Menus
already have selection contracts that must be adapted to the paginated visible
row set. Content Types bulk selection is introduced later in `TASK-205-04`; this
task must expose the same `visibleRows` / `visibleIds` seam for it, but must not
create a second Content Types bulk flow.

## Sub-Tasks

- [ ] TASK-205-03-01: Shared Pagination Hook and Footer
- [ ] TASK-205-03-02: Admin List Resource Adapters
- [ ] TASK-205-03-03: Pagination Regression Matrix and Docs

## Files to Change

- `core/admin/ui/shared/useListPagination.ts`
  - create the generic client-side pagination contract for admin list screens,
  - export the default page size and allowed page-size options,
  - return visible rows, visible range metadata, disabled previous/next state,
    and page-size/page navigation setters,
  - own reset/clamp behavior so resource screens do not reimplement pagination
    math.
- `core/admin/ui/shared/ListPaginationFooter.tsx`
  - create the shared footer UI used by Content Types, Pages, Posts, and Menus,
  - render truthful count copy, the page-size selector, and `Previous` / `Next`
    controls from the shared pagination contract.
- `core/admin/ui/content-types/ContentTypeList.tsx`
  - consume the shared pagination hook/footer after existing filtering and
    sorting,
  - pass only visible/paginated rows to the table.
- `core/admin/ui/content-types/ContentTypeTable.tsx`
  - keep empty/loading row behavior correct for paginated rows.
- `tests/vitest/ui/content-type-list-parity.test.tsx`
  - create this focused suite if it does not exist yet, and cover footer count,
    page-size options, and previous/next behavior.
- `tests/vitest/ui/list-pagination.test.tsx`
  - create focused coverage for the shared hook/footer contract.
- `tests/vitest/ui/content-type-table.test.tsx`
  - update any row count assumptions.
- `core/admin/ui/pages/PageListPage.tsx`
  - replace the static footer with the shared pagination hook/footer,
  - pass only paginated rows to `PageTable`.
- `core/admin/ui/pages/PageTable.tsx`
  - keep empty/loading row behavior correct for paginated rows.
- `core/admin/ui/posts/PostsListPage.tsx`
  - replace the static footer with the shared pagination hook/footer,
  - pass only paginated rows to `PostsTable`.
- `core/admin/ui/posts/PostsTable.tsx`
  - keep empty/loading row behavior correct for paginated rows.
- `core/admin/ui/menus/MenuListPage.tsx`
  - replace the static footer with the shared pagination hook/footer,
  - pass only paginated rows to the internal list table.
- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - cover Pages/Posts default page size, page-size changes, page navigation,
    filter reset/clamp, and visible-scope selection.
- `tests/vitest/ui/page-list.test.tsx`
  - update list shell assertions for page-size and footer copy.
- `tests/vitest/ui/posts-list.test.tsx`
  - update list shell assertions for page-size and footer copy.
- `tests/vitest/ui/menu-list-page.test.tsx`
  - update list shell assertions for page-size and footer copy.
- `tests/vitest/ui/menu-list-page-actions.test.tsx`
  - cover Menus default page size, page-size changes, page navigation, filter
    reset/clamp, and visible-scope selection.

## Implementation Direction

Implement in dependency order:

1. `TASK-205-03-01` creates the shared hook/footer and focused contract tests.
2. `TASK-205-03-02` adapts Content Types, Pages, Posts, and Menus to that hook
   after their existing filtering/sorting logic.
3. `TASK-205-03-03` records the cross-resource regression matrix and docs.

The API continues to return the current full list in this task; pagination
happens client-side after filtering and sorting. Do not add four local page
state implementations.

The hook should expose a typed contract rather than resource-specific state:

```ts
export const ADMIN_LIST_PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 150, 200, 500] as const;
export const DEFAULT_ADMIN_LIST_PAGE_SIZE = 10;

export type ListPaginationState<T> = {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  visibleRows: T[];
  canPreviousPage: boolean;
  canNextPage: boolean;
  setPageSize: (next: number) => void;
  previousPage: () => void;
  nextPage: () => void;
  resetPage: () => void;
};
```

Core hook pseudocode:

```ts
const pagination = useListPagination(sortedRows, {
  resetKey: `${query}:${statusFilter}:${sortKey}:${sortDirection}`,
});

function useListPagination<T>(rows: T[], options?: UseListPaginationOptions) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSizeState] = useState(DEFAULT_ADMIN_LIST_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const clampedPageIndex = Math.min(pageIndex, totalPages - 1);
  const pageStart = clampedPageIndex * pageSize;
  const visibleRows = rows.slice(pageStart, pageStart + pageSize);

  useEffect(() => setPageIndex(0), [options?.resetKey]);
  useEffect(() => setPageIndex((current) => Math.min(current, totalPages - 1)), [totalPages]);

  return {
    pageIndex: clampedPageIndex,
    pageSize,
    totalItems: rows.length,
    totalPages,
    rangeStart: rows.length === 0 ? 0 : pageStart + 1,
    rangeEnd: Math.min(pageStart + pageSize, rows.length),
    visibleRows,
    canPreviousPage: clampedPageIndex > 0,
    canNextPage: clampedPageIndex < totalPages - 1,
    setPageSize: (next) => {
      setPageSizeState(normalizePageSize(next));
      setPageIndex(0);
    },
    previousPage: () => setPageIndex((current) => Math.max(0, current - 1)),
    nextPage: () => setPageIndex((current) => Math.min(totalPages - 1, current + 1)),
    resetPage: () => setPageIndex(0),
  };
}
```

Footer copy should be truthful for the filtered set and rendered through the
same `ListPaginationFooter` component:

```tsx
<ListPaginationFooter resourceLabel="content types" pagination={pagination} />
```

Disable `Previous` on the first page and `Next` on the last page. Reset or
clamp the page index when filters, sort, or page size changes.

Selection must be page-visible scoped where a list already has selection
behavior. Header checkboxes select only the rows in the current paginated result,
not hidden rows on other pages. For Content Types, this task provides the
paginated row set and `TASK-205-04` wires the controlled selection and bulk
actions through that existing seam.

## Security Contract

- Visibility: internal admin UI read/list surfaces only.
- Auth/RBAC/CSRF/rate-limit: unchanged; this task does not add endpoints or new
  write calls.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged; pagination only changes client-side visible row state.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/content-type-table.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-list.test.tsx tests/vitest/ui/posts-list.test.tsx tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Content Types, Pages, Posts, and Menus default to 10 visible rows per page.
2. Users can select `10`, `20`, `30`, `50`, `100`, `150`, `200`, or `500`
   visible rows per page.
3. `Previous` and `Next` controls render through the same shared footer
   component and change the actual visible row set.
4. Filtering and sorting happen before pagination.
5. Page index is clamped when filters, sort, or page-size changes reduce the
   visible row count.
6. Empty and loading states remain clear and do not render misleading counts.
7. The repeated page-size, range, clamp, and `Previous` / `Next` math is not
   duplicated separately in `ContentTypeList`, `PageListPage`, `PostsListPage`,
   and `MenuListPage`.
8. Content Types bulk selection remains owned by `TASK-205-04`; this task only
   prepares the shared visible-row contract that selection consumes.
