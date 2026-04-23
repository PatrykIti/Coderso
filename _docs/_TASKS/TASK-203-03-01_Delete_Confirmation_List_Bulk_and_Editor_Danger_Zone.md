# TASK-203-03-01: Delete Confirmation, List/Bulk, and Editor Danger Zone
# FileName: TASK-203-03-01_Delete_Confirmation_List_Bulk_and_Editor_Danger_Zone.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-203-03, TASK-203-01-02
**Status:** To Do

---

## Overview

Replace native delete confirmations and add an editor-local delete path.

Ownership:

- `EntryList` owns row and bulk delete orchestration over the existing
  `entriesClient.deleteEntry()` wrapper and visible-scope selection state.
- `EntryEditor` owns the editor danger-zone action for the currently loaded
  exact entry and the post-delete navigation back to the Entries list.
- Confirmation UI must reuse the repo's existing app dialog pattern used by
  adjacent admin surfaces, currently the shared `Dialog` primitive plus
  owner-local state such as `MenuItemDeleteDialog`; do not add another
  delete-dialog abstraction or a new `AlertDialog` primitive unless this leaf
  first records why the current UI owner cannot carry the state clearly.
- Feedback must use the existing shared admin notifier or current Entries error
  surface; do not reintroduce `window.confirm()` or add a local notification
  path.
- This leaf owns delete confirmation only. Do not move duplicate behavior into a
  delete-dialog abstraction or broaden the row action contract beyond the
  existing `EntryList`/`EntryTable`/`EntryEditor` owners.

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
- confirm deletes, refreshes, and shows success/failure feedback,
- bulk delete dialog includes selected count,
- editor danger zone deletes, navigates back, and shows the delete success toast
  required by the Playwright report,
- no test stubs depend on `window.confirm()`,
- dialog tests assert the existing app-dialog owner behavior directly instead of
  proving only a row/list mock.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Row and bulk delete use app dialogs.
2. Editor delete confirms before mutation.
3. Success refreshes list/cache and failure stays visible.
4. Editor danger-zone delete redirects to the list and emits the shared success
   feedback expected by the report.
