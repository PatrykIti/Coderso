# TASK-210-02-03: Forms Shared Pagination and Selection Trim
# FileName: TASK-210-02-03_Forms_Shared_Pagination_and_Selection_Trim.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02-01, TASK-210-02-02
**Status:** To Do

---

## Overview

Wire the Forms filtered list through the shared admin pagination footer and
keep selection scoped to the currently visible paginated rows.

## Sub-Tasks

- [ ] Feed filtered Forms rows into `useListPagination`.
- [ ] Render `ListPaginationFooter` with `resourceLabel="forms"`.
- [ ] Derive `visibleIds` from `pagination.visibleRows`.
- [ ] Make header select-all affect only `visibleIds`.
- [ ] Trim hidden selected ids after filter, page, or page-size changes.
- [ ] Keep empty-state copy based on original rows vs filtered rows.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/shared/useListPagination.ts` only if a generic bug is found.
- `core/admin/ui/shared/ListPaginationFooter.tsx` only if a generic bug is found.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/list-pagination.test.tsx` only if the shared helper changes.

## Security Contract

- Visibility: internal admin UI read/list behavior.
- Auth model: unchanged authenticated admin read path.
- RBAC: existing `forms:read`.
- CSRF: no writes in this leaf.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse: hidden rows must not remain selected for later writes.

## Testing Requirements

- Footer shows shared page-size options.
- Table receives only current paginated rows.
- Select-all selects only the current visible page.
- Hidden selections are trimmed after filtering and page changes.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/list-pagination.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms uses the shared pagination hook/footer after filtering.
2. Selection never includes hidden filtered-out or off-page rows.
3. Pagination and empty-state copy stay truthful for filtered results.
