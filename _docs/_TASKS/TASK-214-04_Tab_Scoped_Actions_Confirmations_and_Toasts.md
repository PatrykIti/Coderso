# TASK-214-04: Tab-Scoped Actions, Confirmations, and Toasts
# FileName: TASK-214-04_Tab_Scoped_Actions_Confirmations_and_Toasts.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI + API Contract
**Estimated Effort:** Large
**Dependencies:** TASK-214-02, TASK-214-03, TASK-208
**Status:** Done (2026-04-26)

---

## Overview

Wire Listings create/save/delete/bulk feedback through the shared admin action
toast contract and make every destructive action use token-backed confirmation.

The active tab decides which resource is being acted on. Do not share selected
ids or mutation copy between queries and templates.

## Sub-Tasks

- [x] TASK-214-04-04: Listings Error Mapping and Toast Adapter
- [x] TASK-214-04-01: Active Tab New Flow and Query Save Toasts
- [x] TASK-214-04-02: Query Row and Bulk Delete Confirmations
- [x] TASK-214-04-03: Template Create, Edit, and Delete Confirmations
- [x] Add active-tab bulk delete bar placement in `PageHeader.actions`.
- [x] Keep inline alerts for contextual load/action errors.
- [x] Keep row/bulk delete pending state in `ListingListPage` for both queries
  and templates.
- [x] Keep template create/edit form draft state in the controlled template
  dialog, but route open/close/save completion back through shell-owned state.

## Action Ownership Contract

- `ListingListPage` owns query and template row delete confirmation state,
  query and template bulk delete confirmation state, active bulk action values,
  selected visible ids, and `PageHeader.actions` bulk bar placement.
- `ListingTemplateManager` can keep form draft state and run
  `createListingTemplate` / `updateListingTemplate` from the controlled dialog,
  but it must receive create/edit open state from `ListingListPage` and report
  save completion through `onSaved` so the shell can refresh, close, and clear
  active-tab feedback consistently.
- Template row Delete and bulk Delete must not execute inside a private manager
  state path. They should call shell-owned `onRequestTemplateDelete` /
  `onRequestTemplateBulkDelete`, then use `ConfirmActionDialog` from the shared
  list action flow.
- Query and template toast adapters must have one Listings owner module,
  `core/admin/ui/listings/listingActionToasts.ts`, so list actions and
  `ListingEditorPage` share the same copy. That module should export
  `listingQueryToasts` and `listingTemplateToasts` built from
  `createListActionToastAdapter` with resource-specific labels.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingQueryTable.tsx`
- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/ui/listings/ListingEditorPage.tsx`
- `core/admin/ui/listings/listingActionToasts.ts`
- `core/admin/ui/shared/listActionToasts.ts` only if the generic helper lacks a
  resource-safe capability.
- `core/server/routes/listingsRoutes.ts` if route mapping needs tightening.
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `tests/vitest/ui/list-action-toasts.test.ts`
- `tests/integration/routes/listings.test.ts` if route mapping changes.

## Security Contract

- Visibility: internal admin UI and existing internal Listings API.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: `content:write` for create/update/delete.
- CSRF: all writes go through `listingsClient` helpers with `withCsrf: true`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: query/template create/update payloads remain
  schema-first through `listingSchemas.ts`.
- Anti-abuse: destructive actions require explicit confirmation; bulk mutation
  ids come only from the active tab's visible selected rows.

## Pseudocode

```ts
// core/admin/ui/listings/listingActionToasts.ts
import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";

const listingQueryToasts = createListActionToastAdapter({
  labels: { singular: "listing query", plural: "listing queries" },
  actions: {
    create: { pastTense: "created", failureVerb: "create" },
    update: { pastTense: "updated", failureVerb: "update" },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});

const listingTemplateToasts = createListActionToastAdapter({
  labels: { singular: "listing template", plural: "listing templates" },
  actions: {
    create: { pastTense: "created", failureVerb: "create" },
    update: { pastTense: "updated", failureVerb: "update" },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});

export { listingQueryToasts, listingTemplateToasts };

const activeResource =
  activeTab === "queries" ? queryActionState : templateActionState;

const handleTemplateSaved = async () => {
  await refreshTemplates({ force: true, background: true });
  setTemplateCreateOpen(false);
  setEditingTemplateId(null);
};
```

## Testing Requirements

- Query create/update/delete feedback uses query-specific toast copy.
- Template create/update/delete feedback uses template-specific toast copy.
- Row delete toasts emit only after confirmation and resolved mutation.
- Bulk delete handles full success and partial failure with toast plus inline
  error copy.
- Inactive-tab selected rows are never mutated.
- Template delete requests are confirmation-gated by shell-owned pending state,
  not by a private `ListingTemplateManager` direct delete path.
- Template create/edit save closes through the controlled dialog state and does
  not desynchronize the header `New` flow.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-cluster-wave.test.tsx tests/vitest/ui/list-action-toasts.test.ts`
  - `set -a && source .env && set +a && bun test tests/integration/routes/listings.test.ts` if route mapping changes.
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CMS_API.md` if route error mapping or examples change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listings actions use shared toast helpers with resource-specific labels.
2. Destructive row and bulk deletes are confirmation-gated.
3. Bulk action execution is active-tab scoped and visible-row scoped.
4. Template create/edit/delete state cannot fork into an independent
   manager-local flow outside the active-tab shell.
