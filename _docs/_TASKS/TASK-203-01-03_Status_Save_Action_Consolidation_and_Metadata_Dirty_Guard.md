# TASK-203-01-03: Status, Save Action Consolidation, and Metadata Dirty Guard
# FileName: TASK-203-01-03_Status_Save_Action_Consolidation_and_Metadata_Dirty_Guard.md

**Priority:** Medium
**Category:** CMS/Entries + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-203-01-02
**Status:** Done
**Completed:** 2026-04-23

---

## Overview

Remove duplicate save ambiguity and make local status changes safe. The toolbar
and sidebar both render `Save draft`, while the status dropdown changes state
that is only persisted later by metadata save.

Ownership:

- `EntryEditor` owns the authoritative dirty-state model and the guard that
  prevents local metadata edits from being overwritten or abandoned silently.
- `EntryMetadataPanel` owns status/schedule/SEO/taxonomy controls as
  presentational inputs; it does not own persistence or navigation blocking.
- Any leave-page/back/refresh protection must reuse the existing admin dirty
  pattern from the current codebase where applicable (for example the Page
  editor `beforeunload`/dirty warning path) instead of adding an Entries-only
  global event layer.

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
- status/schedule/SEO/taxonomy dirty state triggers the same visible unsaved
  warning and leave-page guard as content dirty state,
- route/internal refresh with dirty metadata defers or asks through the existing
  dirty contract instead of silently reloading stale remote data,
- no test depends on confusing duplicate save labels.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. There are no two indistinguishable `Save draft` actions.
2. Status edits clearly require metadata save or use an explicit save path.
3. Desktop and mobile details surfaces behave consistently.
4. Users cannot leave or refresh away from dirty metadata edits without the
   existing admin dirty-state warning/guard applying.
