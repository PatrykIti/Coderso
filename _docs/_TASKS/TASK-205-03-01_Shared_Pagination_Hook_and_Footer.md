# TASK-205-03-01: Shared Pagination Hook and Footer
# FileName: TASK-205-03-01_Shared_Pagination_Hook_and_Footer.md

**Priority:** High
**Category:** Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-205-03
**Status:** Done (2026-04-24)

---

## Overview

Create the reusable admin list pagination contract used by Content Types,
Pages, Posts, and Menus. This leaf owns the generic behavior once: page-size
options, default page size, page index, range metadata, visible-row slicing,
clamping, and footer controls.

The contract must stay resource-agnostic. It should not import Pages, Posts,
Menus, Content Types, services, cache clients, or route helpers.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/shared/useListPagination.ts`
  - create the generic hook,
  - export `DEFAULT_ADMIN_LIST_PAGE_SIZE`,
  - export `ADMIN_LIST_PAGE_SIZE_OPTIONS`,
  - normalize invalid page-size input back to the default,
  - reset page index when `resetKey` or page size changes,
  - clamp page index when row count shrinks.
- `core/admin/ui/shared/ListPaginationFooter.tsx`
  - render count/range copy from hook metadata,
  - render page-size selector with the shared options,
  - render token-backed `Previous` / `Next` buttons,
  - disable controls when no previous/next page exists,
  - accept resource-specific labels without resource-specific math.
- `tests/vitest/ui/list-pagination.test.tsx`
  - create focused hook/footer tests.

## Implementation Direction

Keep the generic contract small:

```ts
export const DEFAULT_ADMIN_LIST_PAGE_SIZE = 10;
export const ADMIN_LIST_PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 150, 200, 500] as const;
export type AdminListPageSize = (typeof ADMIN_LIST_PAGE_SIZE_OPTIONS)[number];

type UseListPaginationOptions = {
  defaultPageSize?: AdminListPageSize;
  pageSizeOptions?: readonly AdminListPageSize[];
  resetKey?: string;
};

export function useListPagination<T>(
  rows: readonly T[],
  options: UseListPaginationOptions = {}
) {
  const pageSizeOptions = options.pageSizeOptions ?? ADMIN_LIST_PAGE_SIZE_OPTIONS;
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_ADMIN_LIST_PAGE_SIZE;
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [pageIndex, setPageIndex] = useState(0);

  const normalizedPageSize = pageSizeOptions.includes(pageSize)
    ? pageSize
    : defaultPageSize;
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const startIndex = safePageIndex * normalizedPageSize;
  const endIndex = startIndex + normalizedPageSize;

  useEffect(() => setPageIndex(0), [options.resetKey]);
  useEffect(() => setPageIndex((current) => Math.min(current, totalPages - 1)), [totalPages]);

  return {
    pageIndex: safePageIndex,
    pageSize: normalizedPageSize,
    totalItems,
    totalPages,
    rangeStart: totalItems === 0 ? 0 : startIndex + 1,
    rangeEnd: Math.min(endIndex, totalItems),
    visibleRows: rows.slice(startIndex, endIndex),
    canPreviousPage: safePageIndex > 0,
    canNextPage: safePageIndex < totalPages - 1,
    setPageSize: (next: number) => {
      setPageSizeState(normalizePageSize(next, pageSizeOptions, defaultPageSize));
      setPageIndex(0);
    },
    previousPage: () => setPageIndex((current) => Math.max(0, current - 1)),
    nextPage: () => setPageIndex((current) => Math.min(totalPages - 1, current + 1)),
    resetPage: () => setPageIndex(0),
  };
}
```

Footer usage should stay declarative:

```tsx
<ListPaginationFooter
  resourceLabel="pages"
  pagination={pagination}
/>
```

The footer should render copy equivalent to `Showing 1-10 of 42 pages`; when
there are no rows, render `Showing 0 of 0 pages` or another truthful empty
state approved by the existing list copy.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged; no route or write behavior changes.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Pagination state and range math live in one shared hook.
2. Footer UI is shared by all targeted list screens.
3. Default page size is `10`.
4. Allowed page sizes are `10`, `20`, `30`, `50`, `100`, `150`, `200`, and
   `500`.
5. Empty, first-page, last-page, page-size-change, and row-count-shrink cases
   are covered by Vitest.

## Completion Notes

- Implemented `useListPagination`, page-size constants, page-size normalization,
  reset/clamp behavior, and visible-row slicing in one resource-agnostic module.
- Implemented `ListPaginationFooter` with truthful range copy, page-size
  selector, and shared Previous/Next controls.
- Covered by `tests/vitest/ui/list-pagination.test.tsx`.
