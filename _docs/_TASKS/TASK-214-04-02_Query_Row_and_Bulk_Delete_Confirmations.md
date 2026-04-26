# TASK-214-04-02: Query Row and Bulk Delete Confirmations
# FileName: TASK-214-04-02_Query_Row_and_Bulk_Delete_Confirmations.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI + API Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-214-02-03, TASK-214-04-04
**Status:** To Do

---

## Overview

Replace direct listing query delete with confirmed row and bulk delete flows
that use shared toasts and visible-scope selection.

## Sub-Tasks

- [ ] Row delete opens `ConfirmActionDialog`.
- [ ] Confirmed row delete calls `deleteListingQuery`.
- [ ] Bulk delete opens `ConfirmActionDialog` with selected query count.
- [ ] Bulk delete executes `Promise.allSettled` over visible selected query ids.
- [ ] Full success clears selected query ids.
- [ ] Partial failure keeps failed query ids selected and shows inline plus toast
  feedback.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingQueryTable.tsx`
- `core/admin/ui/listings/ListingQueryBulkActionsBar.tsx` if extracted.
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI and existing query delete API.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: `content:write`.
- CSRF: `deleteListingQuery` continues using `withCsrf: true`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: delete id remains a route param; no request body.
- Anti-abuse: deletes require explicit confirmation and operate only on visible
  selected query ids from the active `Queries` tab.

## Pseudocode

```ts
const runQueryBulkDelete = async (ids: string[]) => {
  const results = await Promise.allSettled(ids.map(deleteListingQuery));
  await refreshQueries({ force: true, background: true });
  const summary = listingQueryToasts.summarizeBulkAction("delete", ids, results);
  listingQueryToasts.emitBulk(summary);
  if (!summary.ok) setActionError(summary.inlineMessage);
};
```

## Testing Requirements

- Row delete does not call `deleteListingQuery` before confirmation.
- Confirmed row delete refreshes queries and emits delete toast.
- Bulk delete uses selected visible query ids only.
- Partial failure keeps failed ids selected and shows inline feedback.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. No listing query delete runs directly from a dropdown click.
2. Query row and bulk deletes use shared confirmation and toast behavior.
3. Bulk delete cannot mutate hidden or inactive-tab query rows.
