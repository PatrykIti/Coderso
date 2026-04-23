# TASK-203-01-03: Status, Save Action Consolidation, and Metadata Dirty Guard
# FileName: TASK-203-01-03_Status_Save_Action_Consolidation_and_Metadata_Dirty_Guard.md

**Priority:** Medium
**Category:** CMS/Entries + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-203-01-02
**Status:** To Do

---

## Overview

Remove duplicate save ambiguity and make local status changes safe. The toolbar
and sidebar both render `Save draft`, while the status dropdown changes state
that is only persisted later by metadata save.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryEditor.tsx:641-670`
- `core/admin/ui/entries/EntryEditor.tsx:843-917`
- `core/admin/ui/entries/EntryMetadataPanel.tsx:235-249`
- `core/admin/ui/entries/EntryMetadataPanel.tsx:479-486`
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `tests/vitest/ui/content-entry-editor.test.tsx`
- `tests/vitest/ui/entry-metadata.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF: unchanged existing client calls.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: status changes must not fire hidden writes outside the same
  auth/CSRF path as explicit saves.

## Testing Requirements

- only one content `Save draft` action per desktop/mobile surface,
- metadata save is clearly scoped if it remains separate,
- status dropdown sets metadata dirty state,
- no test depends on confusing duplicate save labels.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. There are no two indistinguishable `Save draft` actions.
2. Status edits clearly require metadata save or use an explicit save path.
3. Desktop and mobile details surfaces behave consistently.

