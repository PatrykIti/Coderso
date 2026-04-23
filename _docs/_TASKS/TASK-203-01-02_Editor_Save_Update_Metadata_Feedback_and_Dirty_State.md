# TASK-203-01-02: Editor Save, Update, Metadata Feedback, and Dirty State
# FileName: TASK-203-01-02_Editor_Save_Update_Metadata_Feedback_and_Dirty_State.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-203-01-01
**Status:** To Do

---

## Overview

Add visible feedback for entry save/update/metadata flows and track metadata
changes separately from field-data changes.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryEditor.tsx:120-154`
- `core/admin/ui/entries/EntryEditor.tsx:364-389`
- `core/admin/ui/entries/EntryEditor.tsx:391-423`
- `core/admin/ui/entries/EntryEditor.tsx:425-428`
- `core/admin/ui/entries/EntryEditor.tsx:470-525`
- `core/admin/ui/entries/EntryMetadataPanel.tsx:62-81`
- `core/admin/app/AdminApp.tsx`
- `core/admin/components/ui/sonner.tsx`
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `tests/vitest/ui/entry-metadata.test.tsx`
- `tests/vitest/admin/adminApp.test.tsx` only if toaster mount changes

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF: inherited from existing client calls.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: UI state must not enter API payloads.
- Anti-abuse: feedback must not include stack traces, tokens, headers, or
  secret-like payloads.

## Testing Requirements

- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
  - save draft success/failure,
  - publish/update success/failure,
  - metadata save success/API failure,
  - status/SEO/taxonomy/schedule dirty state.
- `tests/vitest/ui/entry-metadata.test.tsx`
  - metadata panel dirty/saving affordance if presentation changes.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Save/update/metadata successes are visible.
2. Save/update/metadata failures are actionable.
3. Metadata dirty state is distinct from field dirty state.
