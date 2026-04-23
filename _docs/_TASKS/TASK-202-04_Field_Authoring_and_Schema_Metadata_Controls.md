# TASK-202-04: Field Authoring and Schema Metadata Controls
# FileName: TASK-202-04_Field_Authoring_and_Schema_Metadata_Controls.md

**Priority:** High
**Category:** CMS/Engine + Schema Builder + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-202, TASK-048
**Status:** To Do

---

## Overview

Upgrade the field authoring controls without breaking existing schema metadata.
This subtask covers `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` findings `BUG-5`,
`UX-3`, `UX-4`, and `UX-5`.

Current code shows the gaps:

- `ContentTypeEditor.tsx:200-212` creates new fields as `field-<n>` with label
  `New field`.
- `FieldEditor.tsx:110-132` edits field key and label independently.
- `FieldEditor.tsx:165-182` stores select options from a comma-separated input.
- `FieldEditor.tsx:425-434` treats default value as a generic text input.
- `schemaMapping.ts:3-14` has no typed number constraints or multi-select
  metadata yet.

## Sub-Tasks

- `TASK-202-04-01_Label_to_Field_Name_Autogeneration_and_Manual_Lock.md`
- `TASK-202-04-02_Human_Readable_Label_Backfill_and_Display_Normalization.md`
- `TASK-202-04-03_Select_Options_Builder_and_Multi_Select_Schema_Contract.md`
- `TASK-202-04-04_Number_Field_Constraints_Format_Step_Schema_Mapping.md`

## Scope

- Add label-to-field-name generation for newly added fields.
- Stop auto-generating the key after manual key edits.
- Normalize machine-like schema labels into readable editor labels without
  rewriting stored schema destructively.
- Replace comma-separated select options with option rows.
- Support label/value option pairs and deterministic value slugs.
- Add multi-select field behavior using existing JSON Schema-compatible array
  metadata, including the entry renderer/validation owners needed for the new
  value shape.
- Add number constraints: min, max, integer/decimal format, and step.
- Preserve current `xFieldType`, `xFieldConfig`, `enum`, `default`, `required`,
  relation, media, and layout behavior.

Out of scope:

- brand-new field types outside current `text`, `richtext`, `number`,
  `boolean`, `select`, `media`, and `relation`,
- entry editor runtime redesign,
- arbitrary JSON Schema editing in the UI,
- destructive rewriting of existing schema labels on load.

## Files to Change

- `core/admin/ui/content-types/SchemaBuilder.tsx:139-180`
- `core/admin/ui/content-types/ContentTypeEditor.tsx:200-212`
- `core/admin/ui/content-types/FieldEditor.tsx:110-182`
- `core/admin/ui/content-types/FieldEditor.tsx:425-434`
- `core/admin/ui/content-types/schemaMapping.ts:3-274`
- `core/admin/services/contentTypesClient.ts:6-40`
- `core/services/content/validation.ts`
  - keep the existing AJV contract as owner; edit only if new schema metadata
    needs explicit keyword support, but always add validation coverage for the
    declared select/number value shapes.
- `core/admin/ui/entries/FieldRenderer.tsx`
  - required when multi-select is introduced because entry editing currently
    renders select fields as a single value.

## Security Contract

- Visibility: internal admin schema editor.
- Auth model: unchanged admin route access.
- RBAC: schema mutation still requires `content:write` through save/publish.
- CSRF: unchanged because field config persists through existing content type
  update route.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: schema metadata additions must stay explicit and
  normalized.
- Anti-abuse:
  - generated names must reject unsafe keys such as empty, duplicate, or
    non-kebab-case values,
  - option values must be deterministic and bounded,
  - number constraints must reject invalid ranges before persistence.

## Testing Requirements

- Vitest:
  - label-to-key generation and manual lock,
  - readable fallback labels for camelCase and kebab-case schema keys,
  - select option rows round-trip through `schemaMapping`,
  - multi-select schema round-trip,
  - entry renderer reads/writes multi-select arrays while preserving legacy
    single-select values,
  - content validation accepts/rejects the declared array shape through the
    existing AJV schema contract,
  - number min/max/format/step round-trip and invalid-range handling.
- Bun/content validation coverage is required when select/number schema value
  shapes change.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CONTENT_FIELDS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Field names can be generated from labels and remain stable after manual edit.
2. Existing fields display readable labels without destructive schema rewrites.
3. Select and number fields expose structured controls that round-trip through
   schema metadata.
