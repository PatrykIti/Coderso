# TASK-203-03-01: Delete Confirmation, List/Bulk, and Editor Danger Zone
# FileName: TASK-203-03-01_Delete_Confirmation_List_Bulk_and_Editor_Danger_Zone.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-203-03
**Status:** To Do

---

## Overview

Replace native delete confirmations and add an editor-local delete path.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryList.tsx:231-248`
- `core/admin/ui/entries/EntryList.tsx:311-353`
- `core/admin/ui/entries/EntryTable.tsx:71-103`
- `core/admin/ui/entries/EntryEditor.tsx:843-917`
- `core/admin/services/entriesClient.ts:366-380`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/ui/entry-table-wave.test.tsx`
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF: inherited from existing `deleteEntry()` wrapper/route.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: unchanged.
- Anti-abuse: exact entry/count confirmation, cancel must not mutate, bulk ids
  are read from current selected state at confirmation time.

## Testing Requirements

- row delete opens dialog and cancel blocks delete,
- confirm deletes and refreshes,
- bulk delete dialog includes selected count,
- editor danger zone deletes and navigates back,
- no test stubs depend on `window.confirm()`.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Row and bulk delete use app dialogs.
2. Editor delete confirms before mutation.
3. Success refreshes list/cache and failure stays visible.

