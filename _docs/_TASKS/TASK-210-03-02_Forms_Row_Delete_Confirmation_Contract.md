# TASK-210-03-02: Forms Row Delete Confirmation Contract
# FileName: TASK-210-03-02_Forms_Row_Delete_Confirmation_Contract.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + Destructive UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-03-01, TASK-205, TASK-208
**Status:** To Do

---

## Overview

Replace immediate Forms row deletion with the shared `ConfirmActionDialog`.
Delete feedback must happen only after the user confirms and the mutation
settles.

## Sub-Tasks

- [ ] Add `pendingDeleteId` and `deletingId` state in `FormListPage`.
- [ ] Make row Delete open `ConfirmActionDialog` instead of calling
  `deleteForm` directly.
- [ ] Call `deleteForm(id)` only from the dialog `onConfirm`.
- [ ] Refresh Forms list/cache after successful delete.
- [ ] Keep inline errors visible on delete failure.
- [ ] Leave toast success/error wiring to TASK-210-06-01.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/forms/FormRowActions.tsx` if extracted.
- `tests/vitest/ui/forms-pages-wave.test.tsx`

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
  - confirmation must not expose raw submission payloads.

## Testing Requirements

- Clicking row Delete opens confirmation.
- Cancelling confirmation does not call `deleteForm`.
- Confirming calls `deleteForm` exactly once for the target id.
- Delete failure keeps an inline error.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. No row delete runs directly from a dropdown click.
2. Delete mutation runs only after shared dialog confirmation.
3. Delete failure remains recoverable and visible.
