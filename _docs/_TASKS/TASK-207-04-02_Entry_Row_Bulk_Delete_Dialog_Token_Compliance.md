# TASK-207-04-02: Entry Row/Bulk Delete Dialog Token Compliance
# FileName: TASK-207-04-02_Entry_Row_Bulk_Delete_Dialog_Token_Compliance.md

**Priority:** High
**Category:** Admin/UI + Design Tokens + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-207-04-01, TASK-205-02
**Status:** To Do

---

## Overview

Ensure Entries row and bulk delete confirmations use the shared token-backed
Admin UI dialog pattern.

Prefer reusing `ConfirmActionDialog` unless a specific Entries-only requirement
is documented before implementation. Do not introduce another local confirmation
component if the shared one can carry the copy and loading state.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryDeleteDialog.tsx`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- new focused dialog test only if existing suites cannot assert token behavior.

## Security Contract

- Visibility: internal admin UI.
- Auth/RBAC/CSRF/rate-limit: unchanged; delete still uses
  `deleteEntry(typeSlug, id)`.
- Reject-unknown validation: unchanged.
- Anti-abuse: explicit confirmation for destructive row and bulk delete; selected
  IDs must come from visible controlled selection.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-list-wave.test.tsx`
- Add assertions that delete does not call `window.confirm()` and does not render
  hard-coded rose/amber popup palette classes.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/DESIGN_TOKENS.md` only if token primitives change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Row delete opens a themed confirmation dialog.
2. Bulk delete opens a themed confirmation dialog with selected count.
3. Confirmation copy includes the target context.
4. No native browser confirm is used.
5. Popup styling comes from shared primitives/tokens.
