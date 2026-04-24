# TASK-207-04: Entries Bulk Actions, Popups, and Token Compliance
# FileName: TASK-207-04_Entries_Bulk_Actions_Popups_and_Token_Compliance.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-207-02, TASK-207-03, TASK-205-02
**Status:** To Do

---

## Overview

Bring Entries bulk actions, row actions, delete confirmations, and popups into
the same token-backed pattern as Pages, Posts, Menus, and Content Types.

This task does not add a bulk endpoint. It should reuse existing per-entry
client helpers and report partial failures truthfully.

## Sub-Tasks

- [ ] TASK-207-04-01: Entries Inline Bulk Actions and Partial-Failure Feedback
- [ ] TASK-207-04-02: Entry Row/Bulk Delete Dialog Token Compliance
- [ ] TASK-207-04-03: Entries Create/Action Popup Theme Token Audit

## Files to Change

- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryBulkActionsBar.tsx`
- `core/admin/ui/entries/EntryDeleteDialog.tsx`
- `core/admin/ui/entries/EntryCreateDrawer.tsx`
- `core/admin/ui/entries/EntryEditorHeader.tsx` only for popup/action token
  findings that are in scope.
- `core/admin/ui/entries/EntryMetadataPanel.tsx` only for popup/action token
  findings that are in scope.
- `tests/vitest/ui/entry-bulk-actions.test.tsx`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/ui/content-entry-editor.test.tsx` if editor popups are touched.

## Security Contract

- Visibility: internal admin Entries UI.
- Auth model: authenticated admin session/API key where supported.
- RBAC: `content:write` for draft/archive/delete/duplicate and
  `content:publish` for publish transitions.
- CSRF: use existing `entriesClient` helpers.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: no new payload shape unless a client wrapper is
  added; existing route schemas remain source of truth.
- Anti-abuse: destructive delete requires token-backed confirmation and applies
  only to controlled visible selected IDs.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-bulk-actions.test.tsx tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/content-entry-editor.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/DESIGN_TOKENS.md` only if shared token variants change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Entries bulk controls render inline in header actions.
2. Bulk publish/draft/archive/delete reuse existing client write helpers.
3. Partial failures remain visible and do not claim full success.
4. Row/bulk delete uses token-backed shared confirmation, not native confirm.
5. Create/action popups follow Admin UI Theme token surfaces.

