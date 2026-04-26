# TASK-214-04-03: Template Create, Edit, and Delete Confirmations
# FileName: TASK-214-04-03_Template_Create_Edit_Delete_Confirmations.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI + API Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-214-03-03, TASK-214-04-04
**Status:** To Do

---

## Overview

Make template create/edit/delete flows match the shared list action contract
while preserving the existing template config and `BindingEditor` behavior.

## Sub-Tasks

- [ ] Move template create open state behind the active-tab header `New`.
- [ ] Keep edit opened from template row action.
- [ ] Make create/edit open state controlled by `ListingListPage`, using
  `templateCreateOpen`, `editingTemplateId`, or an equivalent dialog controller.
- [ ] Keep `ListingTemplateManager` local state limited to the form draft,
  cloned `BindingEditor` config, save progress, and dialog-local validation
  messages.
- [ ] Emit shared create/update toasts after `createListingTemplate` and
  `updateListingTemplate` resolve.
- [ ] Replace direct row delete with `ConfirmActionDialog`.
- [ ] Add active-tab bulk delete with `Promise.allSettled`.
- [ ] Full bulk success clears selected template ids.
- [ ] Partial bulk failure keeps failed template ids selected and shows inline
  plus toast feedback.
- [ ] Keep `BindingEditor` value cloning and config normalization intact.

## Files to Change

- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingTemplateBulkActionsBar.tsx` if extracted.
- `core/admin/ui/listings/ListingTemplateTable.tsx` if row actions are
  extracted from the manager.
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `tests/vitest/ui/listing-binding-editor.test.tsx` if edit dialog extraction
  touches binding behavior.

## Security Contract

- Visibility: internal admin UI and existing template create/update/delete API.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: `content:write`.
- CSRF: `createListingTemplate`, `updateListingTemplate`, and
  `deleteListingTemplate` continue using `withCsrf: true`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: create/update payloads remain
  `listingTemplateCreateSchema` / `listingTemplateUpdateSchema` owned.
- Anti-abuse: deletes require explicit confirmation and operate only on visible
  selected template ids from the active `Templates` tab.

## Pseudocode

```ts
<ListingTemplateManager
  createOpen={templateCreateOpen}
  editingTemplateId={editingTemplateId}
  onCreateOpenChange={setTemplateCreateOpen}
  onEditingTemplateIdChange={setEditingTemplateId}
  onRequestDelete={setPendingTemplateDeleteId}
  onSaved={handleTemplateSaved}
/>

if (form.id) {
  const updated = await updateListingTemplate(form.id, payload);
  listingTemplateToasts.success("update", { targetLabel: updated.name });
} else {
  const created = await createListingTemplate(payload);
  listingTemplateToasts.success("create", { targetLabel: created.name });
}
```

## Testing Requirements

- `Templates` tab header `New` opens template create.
- Header `New`, row Edit, and dialog close all update parent-controlled
  template dialog state.
- Template create success emits create toast and refreshes templates.
- Template update success emits update toast.
- Row delete is confirmation-gated.
- Row delete and bulk delete requests pass through shell-owned pending
  confirmation state.
- Bulk delete mutates only visible selected template ids.
- Partial bulk failure keeps failed template ids selected and shows inline
  feedback.
- `BindingEditor` tests still pass if dialog code is extracted.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-binding-editor.test.tsx` if dialog extraction touches it.
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Template create/edit/delete feedback uses shared resource-specific toasts.
2. Template deletes are confirmation-gated.
3. Template bulk delete cannot mutate hidden or inactive-tab rows.
4. `ListingTemplateManager` does not own a separate header/new/bulk/delete flow;
   it is controlled by `ListingListPage` for tab-level actions.
