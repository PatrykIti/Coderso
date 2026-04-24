# TASK-205-03: Content Type List Footer and Pagination Parity
# FileName: TASK-205-03_Content_Type_List_Footer_and_Pagination_Parity.md

**Priority:** Medium
**Category:** CMS/Engine + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-205, TASK-198, TASK-199, TASK-200
**Status:** To Do

---

## Overview

Add the Content Types list footer and pagination affordance so the list matches
the Pages, Posts, and Menus admin pattern.

The current `ContentTypeList` ends at `ContentTypeTable`. Pages, Posts, and Menus
show a footer with filtered counts and `Previous` / `Next` buttons. Content
Types should use the same visual pattern while keeping search, status filter,
and sort as the source of list truth.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeList.tsx`
  - add filtered count footer,
  - add `Previous` / `Next` controls,
  - derive paginated rows after filter and sort,
  - clamp/reset page index when filters or sort change,
  - pass only visible/paginated rows to the table.
- `core/admin/ui/content-types/ContentTypeTable.tsx`
  - keep empty/loading row behavior correct for paginated rows.
- `tests/vitest/ui/content-type-list-parity.test.tsx`
  - cover footer count and previous/next behavior.
- `tests/vitest/ui/content-type-table.test.tsx`
  - update any row count assumptions.

## Implementation Direction

Use a small client-side pagination contract unless the existing API gains real
server pagination in a separate task:

```ts
const pageSize = 20;
const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
const clampedPage = Math.min(pageIndex, totalPages - 1);
const visibleRows = sortedRows.slice(
  clampedPage * pageSize,
  clampedPage * pageSize + pageSize
);
```

Footer copy should stay close to Pages/Posts/Menus:

```tsx
<div className="flex flex-col items-start gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
  <span>Showing {visibleRows.length} of {rows.length} content types</span>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm">Previous</Button>
    <Button variant="outline" size="sm">Next</Button>
  </div>
</div>
```

Disable `Previous` on the first page and `Next` on the last page.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/content-type-table.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Content Types list shows `Showing X of Y content types`.
2. `Previous` and `Next` controls render in the same footer position/pattern as
   Pages, Posts, and Menus.
3. Filtering and sorting happen before pagination.
4. Page index is clamped when filters reduce the visible row count.
5. Empty and loading states remain clear and do not render misleading counts.
