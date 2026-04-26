# TASK-214-02-02: Query Table Selection, Source, and Updated Columns
# FileName: TASK-214-02-02_Query_Table_Selection_Source_and_Updated_Columns.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-214-02-01
**Status:** To Do

---

## Overview

Update `ListingQueryTable` to match Pages table behavior: checkbox column,
selected-row styling, responsive row metadata, and resource-specific columns.

## Sub-Tasks

- [ ] Add header checkbox with all/indeterminate state.
- [ ] Add row checkbox and selected-row visual state.
- [ ] Keep columns: Query, Source, Updated, Actions.
- [ ] Keep row actions: Edit and Delete.
- [ ] Use `AdminLink` for editor navigation, preserve `prefetch`, and keep the
  canonical `/coderso/listings/:id` route flowing through shared admin path
  resolution instead of hand-built anchors.

## Files to Change

- `core/admin/ui/listings/ListingQueryTable.tsx`
- `core/admin/ui/listings/ListingListPage.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `tests/vitest/ui/listing-list-page-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI row selection.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: display requires `content:read`; delete remains owned by TASK-214-04.
- CSRF: no writes in this leaf.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: table events must pass row-owned query ids only.

## Pseudocode

```tsx
<ListingQueryTable
  items={pagination.visibleRows}
  selectedIds={selectedQueryIds}
  isAllSelected={isQueryAllSelected}
  isIndeterminate={isQueryIndeterminate}
  onToggleAll={handleToggleAllQueries}
  onToggleItem={handleToggleQuery}
  onDelete={setPendingQueryDeleteId}
/>
```

## Testing Requirements

- Header checkbox selects visible query rows.
- Row checkbox toggles one query row.
- Selected row gets a visible selected state.
- Edit links still point to `/coderso/listings/:id` through `AdminLink` and
  preserve prefetch behavior.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-cluster-wave.test.tsx tests/vitest/ui/listing-list-page-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Query table selection matches Pages table behavior.
2. Query rows retain Listings-specific columns and editor links.
