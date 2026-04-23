# TASK-202-03-03: Field Remove Confirmation, Undo, and Schema Selection Recovery
# FileName: TASK-202-03-03_Field_Remove_Confirmation_Undo_and_Schema_Selection_Recovery.md

**Priority:** High
**Category:** CMS/Engine + Schema Builder + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-202-03
**Status:** To Do

---

## Overview

Fix `BUG-4`: `Remove field` currently removes the selected field immediately.
The editor must confirm removal, keep selected-field fallback deterministic, and
offer a bounded recovery path while unsaved changes are still local.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/FieldEditor.tsx:99-108`
  - make remove trigger explicit and descriptive.
- `core/admin/ui/content-types/ContentTypeEditor.tsx:487-530`
  - own pending field removal state for desktop/mobile settings.
- `core/admin/ui/content-types/SchemaBuilder.tsx:221-245`
  - keep shared builder behavior aligned if still used.
- `tests/vitest/ui/content-type-editor.test.tsx`
- `tests/vitest/ui/field-editor-layout.test.tsx` or a new direct field removal
  owner suite.

## Security Contract

- Visibility: internal admin editor only.
- Auth model: unchanged.
- RBAC: schema persistence still requires `content:write`.
- CSRF: unchanged because local removal persists only through save/publish.
- Rate-limit bucket: existing update route.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - confirmation must name the field label/key,
  - cancel must leave schema untouched,
  - undo must not resurrect stale state after a server refresh.

## Testing Requirements

- Remove field opens confirmation instead of mutating immediately.
- Cancel preserves field list and selected field.
- Confirm removes the field and selects the next stable field.
- Undo restores the removed field before save.
- Mobile details sheet closes only after confirmed removal.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Field removal cannot happen with one accidental click.
2. Undo is available while the removal is still an unsaved local change.
3. Schema selection state remains stable after removal.
