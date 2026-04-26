# TASK-214-02-01: Query Filter Model and View Component
# FileName: TASK-214-02-01_Query_Filter_Model_and_View_Component.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-214-02
**Status:** To Do

---

## Overview

Add a compact filter strip for listing queries that follows the Pages list
pattern while using Listings-specific fields.

## Sub-Tasks

- [ ] Add `filterListingQueries` as a pure exported helper.
- [ ] Support search by query `name` and `description`.
- [ ] Support source filter: all, entries, posts, users, taxonomies.
- [ ] Reset pagination and trim selection when filter state changes.
- [ ] Keep source labels consistent with `listingSources`.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingQueryFilters.tsx` if extracted.
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI filter state only.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: unchanged `content:read`.
- CSRF: no writes.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: no route params are introduced; filtering is
  client-side over already authorized rows.
- Anti-abuse: filter text must not be sent to any new endpoint in this leaf.

## Pseudocode

```tsx
<ListingQueryFilters
  search={querySearch}
  source={querySource}
  onSearchChange={setQuerySearch}
  onSourceChange={setQuerySource}
/>
```

## Testing Requirements

- Search matches query name.
- Search matches query description.
- Source filter narrows to the selected query source.
- Reset or empty search restores all query rows.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Query filters are small, resource-specific, and client-side.
2. Filter changes cannot leave hidden rows selected.
