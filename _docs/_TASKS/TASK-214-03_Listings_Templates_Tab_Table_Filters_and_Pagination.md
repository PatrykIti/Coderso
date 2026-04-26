# TASK-214-03: Listings Templates Tab Table, Filters, and Pagination
# FileName: TASK-214-03_Listings_Templates_Tab_Table_Filters_and_Pagination.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-214-01, TASK-205
**Status:** To Do

---

## Overview

Upgrade the `Templates` tab from the current card-wrapped manager into a
Pages-style list tab with filters, checkbox selection, shared pagination, and
visible-row selection trimming while preserving the template edit dialog/binding
editor contract.

## Sub-Tasks

- [ ] TASK-214-03-01: Template Filter Model and View Component
- [ ] TASK-214-03-02: Template Table Selection, Layout, and Binding Summary
- [ ] TASK-214-03-03: Template Pagination and Visible Selection
- [ ] Remove nested card-in-card treatment from the tab content.
- [ ] Keep template row actions limited to Edit and Delete.
- [ ] Keep template filters, pagination, visible ids, and selected template ids
  shell-owned or exposed through controlled props so `ListingListPage` can render
  the active-tab bulk bar in `PageHeader.actions`.
- [ ] Keep `ListingTemplateManager` as the template dialog/form owner only after
  it receives controlled open/edit state from the shell.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/ui/listings/ListingTemplateTable.tsx` if extracted.
- `core/admin/ui/listings/ListingTemplateFilters.tsx` if extracted.
- `core/admin/ui/listings/ListingTemplateBulkActionsBar.tsx` if extracted.
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listing-binding-editor.test.tsx` if dialog extraction changes
  binding editor wiring.

## Security Contract

- Visibility: internal admin UI.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: template list reads require `content:read`; mutations remain covered by
  TASK-214-04.
- CSRF: no writes in this display task.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: unchanged.
- Anti-abuse: selected ids must be limited to visible template rows.

## Pseudocode

```ts
export function filterListingTemplates(items, search, layout) {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q);
    const matchesLayout = layout === "all" || item.layout === layout;
    return matchesSearch && matchesLayout;
  });
}

const templatePagination = useListPagination(filteredTemplates, { resetKey });
const visibleTemplateIds = templatePagination.visibleRows.map((item) => item.id);
const templateResourceState = {
  selectedCount: selectedTemplateIds.length,
  bulkBar: selectedTemplateIds.length > 0 ? templateBulkBar : null,
  onNew: () => setTemplateCreateOpen(true),
};
```

## Testing Requirements

- Template tab renders filters, table, and shared pagination.
- Search filters by name, slug, and description.
- Layout filter supports all, grid, list, table, calendar, map.
- Header checkbox and row checkboxes update only visible template row
  selection.
- Template selected count and bulk bar are visible to `ListingListPage` without
  reading private child state.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-cluster-wave.test.tsx tests/vitest/ui/listing-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The Templates tab visually matches Pages-style list behavior.
2. Template filters reset pagination and trim hidden selection.
3. Template selection and pagination are tab-local.
4. Template selection, pagination, and bulk metadata are available to the shell
   for the active-tab header actions.
