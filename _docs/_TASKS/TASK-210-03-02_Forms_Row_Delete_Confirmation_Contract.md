# TASK-210-03-02: Forms Row Delete Confirmation Contract
# FileName: TASK-210-03-02_Forms_Row_Delete_Confirmation_Contract.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + Destructive UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-03-01, TASK-210-06-02, TASK-205, TASK-208
**Status:** To Do

---

## Overview

Replace immediate Forms row deletion with the shared `ConfirmActionDialog`.
Delete feedback must happen only after the user confirms and the mutation
settles.

This leaf depends on the backend retained-history error contract from
TASK-210-06-02. Do not close the conflict-copy assertions against raw
foreign-key/database errors.

## Sub-Tasks

- [ ] Add `pendingDeleteId` and `deletingId` state in `FormListPage`.
- [ ] Make row Delete open `ConfirmActionDialog` instead of calling
  `deleteForm` directly.
- [ ] Use copy that names the form and clearly states that the operation is
  irreversible for deletion-safe forms, while retained submissions/action
  diagnostics may block hard delete and should be preserved by archiving instead.
- [ ] Call `deleteForm(id)` only from the dialog `onConfirm`.
- [ ] Refresh Forms list/cache after successful delete.
- [ ] If delete returns a retained-history conflict, keep the form in the list,
  keep Archive available, and show stable inline copy instead of a false success.
- [ ] Keep inline errors visible on delete failure.
- [ ] Leave toast success/error wiring to TASK-210-06-01.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/forms/FormRowActions.tsx` if extracted.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` if delete menu rendering is
  owned by `FormTable` / `FormRowActions`.

## Security Contract

- Visibility: internal admin UI row delete.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: delete requires `forms:write`.
- CSRF: delete continues through `deleteForm` with `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - no public write path is added;
  - destructive delete must be gated by `ConfirmActionDialog`;
  - confirmation and conflict copy must not expose raw submission payloads.

## Testing Requirements

- Clicking row Delete opens confirmation.
- Confirmation copy includes the target form name when available and explains
  the irreversible impact plus retained-history conflict possibility.
- Cancelling confirmation does not call `deleteForm`.
- Confirming calls `deleteForm` exactly once for the target id.
- A retained-history delete conflict keeps the row visible and suggests archive
  or status change instead of retrying destructive delete blindly.
- Delete failure keeps an inline error.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. No row delete runs directly from a dropdown click.
2. Delete mutation runs only after shared dialog confirmation.
3. Delete failure or retained-history conflict remains recoverable and visible.
