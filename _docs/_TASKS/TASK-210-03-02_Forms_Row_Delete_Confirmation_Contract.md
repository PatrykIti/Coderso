# TASK-210-03-02: Forms Row Delete Confirmation Contract
# FileName: TASK-210-03-02_Forms_Row_Delete_Confirmation_Contract.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + Destructive UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-03-01, TASK-210-06-02, TASK-205, TASK-208
**Status:** Done (2026-04-26)

---

## Overview

Replace immediate Forms row deletion with the shared `ConfirmActionDialog`.
Delete feedback must happen only after the user confirms and the mutation
settles.

This leaf depends on the backend retained-history error contract from
TASK-210-06-02. Do not close the conflict-copy assertions against raw
foreign-key/database errors.

## Sub-Tasks

- [x] Add `pendingDeleteId` and `deletingId` state in `FormListPage`.
- [x] Make row Delete open `ConfirmActionDialog` instead of calling
  `deleteForm` directly.
- [x] Use copy that names the form and clearly states that the operation is
  irreversible for deletion-safe forms, while retained submissions/action
  diagnostics may block hard delete and should be preserved by archiving instead.
- [x] Call `deleteForm(id)` only from the dialog `onConfirm`.
- [x] Refresh Forms list/cache after successful delete.
- [x] If delete returns a retained-history conflict, keep the form in the list,
  keep Archive available, and show stable inline copy instead of a false success.
- [x] Keep inline errors visible on delete failure.
- [x] Leave toast success/error wiring to TASK-210-06-01.

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

## Completion Notes (2026-04-26)

- Implemented in branch `task/TASK-210-forms-list-parity` with Forms list parity scoped to the refined TASK-210 contract.
- Validation:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/userSettingsClient.test.ts` - PASS (9 files, 48 tests).
  - `bun --cwd core lint` - PASS.
  - `bun --cwd core lint:types` - PASS.
  - `set -a && source ../Nextless/.env && set +a && bun test tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts tests/unit/forms/submissionService.test.ts tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts` - PASS (20 tests; run outside sandbox for DB/env access).
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts` - PASS (2 files, 14 tests).
  - `set -a && source ../Nextless/.env && set +a && bun run gates:coderso` - BLOCKED after Core lint and Core typecheck passed; the gate script still points Functional UI smoke at absent `tests/unit/ui/*` files while current UI suites live under `tests/vitest/ui/*`.
- Scope notes: TASK-210 closes the Forms list/create-drawer/cache/toast/error-mapping/docs contract. Runtime preview, editor, duplicate, embed-code, and global dialog-wrapper follow-ups remain outside TASK-210 unless covered by a separate task.
