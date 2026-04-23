# TASK-202-04-01: Label to Field Name Autogeneration and Manual Lock
# FileName: TASK-202-04-01_Label_to_Field_Name_Autogeneration_and_Manual_Lock.md

**Priority:** High
**Category:** CMS/Engine + Schema Builder
**Estimated Effort:** Medium
**Dependencies:** TASK-202-04
**Status:** Done (2026-04-23)

---

## Overview

Fix `BUG-5`: when admins type `Title` as the label for a newly added field, the
field key stays `field-1`. Match the content type slug behavior: generate from
label until the key is manually edited.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeEditor.tsx:200-212`
- `core/admin/ui/content-types/SchemaBuilder.tsx:203-215`
- `core/admin/ui/content-types/FieldEditor.tsx:110-132`
- `core/admin/ui/content-types/SchemaBuilder.tsx:167-180`
- `tests/vitest/ui/content-type-editor.test.tsx`
- new or updated field-name helper test near `tests/vitest/ui/schema-mapping.test.ts`

## Security Contract

- Visibility: internal admin schema editor.
- Auth/RBAC/CSRF/rate-limit: unchanged until the schema is saved through the
  existing content type update route.
- Reject-unknown validation: generated keys must still pass
  `validateFieldName`.
- Anti-abuse:
  - generated keys must be kebab-case,
  - generated keys must not collide silently,
  - manual edits stop future auto-generation.

## Testing Requirements

- New fields start in auto-key mode.
- Editing label updates key to kebab-case.
- Editing key manually locks future key generation.
- Duplicate generated keys are resolved or blocked deterministically.
- Existing loaded fields do not unexpectedly regenerate keys.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CONTENT_FIELDS.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Label entry generates a useful field key for new fields.
2. Manual key edits are preserved.
3. Validation remains strict and visible.
