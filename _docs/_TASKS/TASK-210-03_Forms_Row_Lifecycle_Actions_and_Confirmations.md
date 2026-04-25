# TASK-210-03: Forms Row Lifecycle Actions and Confirmations
# FileName: TASK-210-03_Forms_Row_Lifecycle_Actions_and_Confirmations.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02, TASK-210-06-02
**Status:** To Do

---

## Overview

Add Forms-specific row lifecycle actions and token-backed delete confirmation to
the Pages-style Forms table.

Row actions must match the Forms contract rather than copying Page-only actions.
Use `updateForm(id, { status })` for lifecycle changes and `deleteForm(id)` for
delete. Add the existing Forms Action logs route as a row shortcut. Do not add
Duplicate, Runtime Preview from the list, or Embed Code in this task because the
current Forms list/service/client contract does not expose those flows.

TASK-210-06-02 must land before this task claims retained-history delete
conflict acceptance. The UI can only keep blocked rows recoverable when the
route returns a stable `form_delete_restricted` 409 instead of a raw database
constraint error.

## Sub-Tasks

- [ ] TASK-210-03-01: Forms Row Lifecycle Menu Contract
- [ ] TASK-210-03-02: Forms Row Delete Confirmation Contract
- [ ] Add or extract `FormRowActions` with:
  - Edit;
  - Action logs;
  - Publish when `status !== "published"`;
  - Move to draft when `status !== "draft"`;
  - Archive when `status !== "archived"`;
  - Delete.
- [ ] Navigate Action logs through canonical `/coderso/forms/:id/action-runs`.
- [ ] Wire lifecycle actions through `updateForm` and list refresh/cache patch
  behavior from `formsClient`.
- [ ] Replace immediate row delete with `ConfirmActionDialog`.
- [ ] Treat hard delete as deletion-safe only: if the route reports a retained
  submission/action-diagnostic conflict, keep the row recoverable, show inline
  conflict copy, and leave Archive available as the safe retained-history action.
- [ ] Keep delete toast emission for TASK-210-06; this task only ensures the
  mutation is gated by confirmation and surfaces inline state.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/forms/FormRowActions.tsx` if extracted.
- `core/admin/services/formsClient.ts` only if status cache patching needs a
  focused helper.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` for the non-mocked
  `FormTable` / `FormRowActions` menu contract.
- `tests/vitest/admin/formsClient.test.ts`

## Security Contract

- Visibility: internal admin UI row actions.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: lifecycle and delete require `forms:write` through existing routes.
- CSRF: writes continue through `formsClient` with `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: unchanged in this task; schema hardening is owned
  by TASK-210-06 if needed.
- Anti-abuse: delete requires `ConfirmActionDialog`; retained submissions/action
  diagnostics are not exposed or destroyed by list UI; no public write path.

## Pseudocode

```ts
const handleSetStatus = async (id: string, status: FormStatus) => {
  setError(null);
  try {
    await updateForm(id, { status });
    await refresh({ force: true, background: true });
  } catch (err) {
    setError(resolveFormsListError(err, `Failed to update form.`));
  }
};

const handleDelete = (id: string) => {
  setPendingDeleteId(id);
};
```

## Testing Requirements

- Add or update Vitest coverage proving:
  - draft rows expose Publish, Archive, Delete, and Edit;
  - published rows expose Move to draft, Archive, Delete, and Edit;
  - archived rows expose Publish, Move to draft, Delete, and Edit;
  - every row exposes Action logs and navigates to canonical
    `/coderso/forms/:id/action-runs`;
  - lifecycle actions call `updateForm` with the expected status;
  - delete does not call `deleteForm` until `ConfirmActionDialog` confirms;
  - delete conflicts caused by retained submissions/action diagnostics keep a
    visible inline error and do not remove the row locally;
  - API failures keep a visible inline error.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/admin/formsClient.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Row actions match Forms statuses and do not expose Page-only actions.
2. Lifecycle mutations use existing `updateForm`.
3. Existing Action logs route is reachable from the list row menu.
4. Row delete is confirmed before mutation.
5. Inline errors remain visible when lifecycle/delete fails or is blocked by
   retained-history constraints.
6. Existing builder and action-log route behavior is not changed.
