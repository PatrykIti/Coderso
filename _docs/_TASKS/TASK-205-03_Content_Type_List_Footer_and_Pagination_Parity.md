# TASK-205-03: Admin List Footer, Page Size, and Pagination Completion
# FileName: TASK-205-03_Content_Type_List_Footer_and_Pagination_Parity.md

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

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/shared/useListPagination.ts`
  - create the generic client-side pagination contract for admin list screens,
  - export the default page size and allowed page-size options,
  - return visible rows, visible range metadata, disabled previous/next state,
    and page-size/page navigation setters.
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

Use a small shared client-side pagination contract. The API continues to return
the current full list in this task; pagination happens after filtering and
sorting.

```ts
const pageSizeOptions = [10, 20, 30, 50, 100, 150, 200, 500] as const;
const pageSize = selectedPageSize ?? 10;
const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
const clampedPage = Math.min(pageIndex, totalPages - 1);
const visibleRows = sortedRows.slice(
  clampedPage * pageSize,
  clampedPage * pageSize + pageSize
);
```

The four list screens should call that contract after they finish
resource-specific filtering/sorting:

```ts
const pagination = useListPagination(sortedRows, {
  defaultPageSize: 10,
  pageSizeOptions,
});
```

Footer copy should be truthful for the filtered set and rendered through the
same `ListPaginationFooter` component:

```tsx
<ListPaginationFooter resourceLabel="content types" pagination={pagination} />
```

Disable `Previous` on the first page and `Next` on the last page. Reset or
clamp the page index when filters, sort, or page size changes.

Selection must be page-visible scoped. Header checkboxes select only the rows in
the current paginated result, not hidden rows on other pages.

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
