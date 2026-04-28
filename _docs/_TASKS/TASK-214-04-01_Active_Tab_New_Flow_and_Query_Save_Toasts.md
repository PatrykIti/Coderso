# TASK-214-04-01: Active Tab New Flow and Query Save Toasts
# FileName: TASK-214-04-01_Active_Tab_New_Flow_and_Query_Save_Toasts.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-214-01-02, TASK-214-04-04, TASK-208
**Status:** Done (2026-04-26)

---

## Overview

Complete the active-tab `New` behavior and add shared toast feedback for query
create/update in `ListingEditorPage`.

The query create flow already lives at `/admin/coderso/listings/new`. This leaf
keeps that route and adds feedback after save mutations settle.

## Sub-Tasks

- [x] `Queries` tab header `New` navigates to `/coderso/listings/new` through
  `useAdminRouter().navigate`, preserving shared admin path canonicalization.
- [x] Query create success emits a shared action toast after
  `createListingQuery` resolves.
- [x] Query update success emits a shared action toast after
  `updateListingQuery` resolves.
- [x] Query create/update failures emit a shared failure toast after the rejected
  mutation settles and keep the existing inline error state for editor context.
- [x] Import `listingQueryToasts` from
  `core/admin/ui/listings/listingActionToasts.ts`; do not create editor-local
  query toast copy.
- [x] Preserve dirty-state, preview, discard, and template-selection behavior in
  `ListingEditorPage`.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingEditorPage.tsx`
- `core/admin/ui/listings/listingActionToasts.ts`
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `tests/vitest/ui/list-action-toasts.test.ts` if helper coverage expands.

## Security Contract

- Visibility: internal admin UI and existing internal query create/update API.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: `content:write` for create/update.
- CSRF: `createListingQuery` and `updateListingQuery` continue using
  `withCsrf: true`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: create/update payloads remain
  `listingQueryCreateSchema` / `listingQueryUpdateSchema` owned.
- Anti-abuse: no public write path; create/update payload still comes from the
  existing query editor normalizer.

## Pseudocode

```ts
if (isCreateMode) {
  const created = await createListingQuery(payload);
  listingQueryToasts.success("create", { targetLabel: created.name });
  navigate(`/coderso/listings/${encodeURIComponent(created.id)}`);
} else {
  const updated = await updateListingQuery(listingId, payload);
  listingQueryToasts.success("update", { targetLabel: updated.name });
}
```

## Testing Requirements

- `Queries` tab `New` still navigates to query create.
- Query create navigation does not use `window.location` or a raw anchor.
- Create save emits listing query create feedback and navigates to detail.
- Update save emits listing query update feedback and stays on detail.
- Failed save preserves inline error copy.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Query create/update feedback matches shared admin action timing.
2. Existing query editor behavior remains intact.
