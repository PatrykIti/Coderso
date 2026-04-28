# TASK-214-02: Listings Queries Tab Table, Filters, and Pagination
# FileName: TASK-214-02_Listings_Queries_Tab_Table_Filters_and_Pagination.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-214-01, TASK-205
**Status:** Done (2026-04-26)

---

## Overview

Upgrade the `Queries` tab from the current simple `ListingQueryTable` into a
Pages-style list surface with filters, checkbox selection, shared pagination,
and visible-row selection trimming.

## Sub-Tasks

- [x] TASK-214-02-01: Query Filter Model and View Component
- [x] TASK-214-02-02: Query Table Selection, Source, and Updated Columns
- [x] TASK-214-02-03: Query Pagination and Visible Selection
- [x] Reuse `listingSourceOptions` from `core/admin/ui/listings/defaults.ts`
  for source filter labels.
- [x] Keep query row actions limited to Edit and Delete.
- [x] Keep editor links on `AdminLink` with `/coderso/listings/:id`.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingQueryTable.tsx`
- `core/admin/ui/listings/ListingQueryFilters.tsx` if extracted.
- `core/admin/ui/listings/ListingQueryBulkActionsBar.tsx` if extracted.
- `core/admin/ui/listings/defaults.ts` only if source labels need a
  backward-compatible extension.
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-page.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: list reads require `content:read`; delete actions remain covered by
  TASK-214-04.
- CSRF: no writes in this display task.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: unchanged.
- Anti-abuse: selected ids must be limited to visible query rows.

## Pseudocode

```ts
export function filterListingQueries(items, search, source) {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q);
    const matchesSource = source === "all" || item.query.source === source;
    return matchesSearch && matchesSource;
  });
}
```

## Testing Requirements

- Query tab renders filters, table, and shared pagination.
- Search filters by name and description.
- Source filter supports all, entries, posts, users, and taxonomies.
- Header checkbox and row checkboxes update only visible query row selection.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-page.test.tsx tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The Queries tab visually matches Pages-style list behavior.
2. Query filters reset pagination and trim hidden selection.
3. Selection and pagination are query-tab local.
