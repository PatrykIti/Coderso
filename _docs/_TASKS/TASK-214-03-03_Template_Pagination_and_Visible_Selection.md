# TASK-214-03-03: Template Pagination and Visible Selection
# FileName: TASK-214-03-03_Template_Pagination_and_Visible_Selection.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-214-03-02, TASK-205
**Status:** To Do

---

## Overview

Use the shared pagination contract for listing templates and ensure selected
template ids are trimmed to the current visible page after filters or page
changes.

## Sub-Tasks

- [ ] Use `useListPagination(filteredTemplateRows, { resetKey })`.
- [ ] Render `ListPaginationFooter` with `resourceLabel="listing templates"`.
- [ ] Compute visible template ids from `pagination.visibleRows`.
- [ ] Trim `selectedTemplateIds` whenever visible ids change.
- [ ] Keep empty-state copy truthful for loading, no templates, and no filter
  match.

## Files to Change

- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/ui/listings/ListingListPage.tsx`; template pagination/selection
  metadata must be parent-visible so the shell can render active-tab bulk
  controls.
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `tests/vitest/ui/listing-list-page-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: unchanged `content:read`.
- CSRF: no writes.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: bulk operations can only receive ids still present in visible
  template rows.

## Pseudocode

```ts
const templatePagination = useListPagination(filteredTemplates, { resetKey });
const visibleTemplateIds = templatePagination.visibleRows.map((item) => item.id);

useEffect(() => {
  setSelectedTemplateIds((prev) =>
    prev.filter((id) => visibleTemplateIds.includes(id))
  );
}, [visibleTemplateIds]);

const templateSelectedCount = selectedTemplateIds.length;
```

## Testing Requirements

- Template pagination footer shows correct counts.
- Filter changes reset template pagination.
- Hidden selected template ids are removed before a bulk action can run.
- `ListingListPage` can read template selected count and pending bulk ids
  directly or through a shell-owned hook, not through a child-only local state.
- Empty copy differs between no templates and no filter matches.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-cluster-wave.test.tsx tests/vitest/ui/listing-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Templates use the shared pagination footer.
2. Template bulk selection is always limited to current visible rows.
3. Template pagination and selected-count state is available to the active-tab
   header bulk bar.
