# TASK-202-04-03: Select Options Builder and Multi Select Schema Contract
# FileName: TASK-202-04-03_Select_Options_Builder_and_Multi_Select_Schema_Contract.md

**Priority:** High
**Category:** CMS/Engine + Schema Builder + Entry Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-202-04
**Status:** To Do

---

## Overview

Replace the primitive comma-separated select input from `UX-3` with structured
option rows. Preserve backward compatibility with existing `enum` and
`xFieldConfig.select.options` data.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/FieldEditor.tsx:165-182`
  - replace comma input with option rows.
- `core/admin/ui/content-types/SchemaBuilder.tsx:148-165`
  - extend `ContentField` metadata for label/value options and multi-select.
- `core/admin/ui/content-types/schemaMapping.ts:67-78`
  - read legacy options and new option metadata.
- `core/admin/ui/content-types/schemaMapping.ts:128-208`
  - write deterministic schema metadata.
- `core/admin/services/contentTypesClient.ts:6-40`
  - extend typed schema metadata.
- `core/admin/ui/entries/FieldRenderer.tsx` if multi-select entry editing needs
  a renderer update.
- `tests/vitest/ui/schema-mapping.test.ts`
- `tests/vitest/ui/field-editor-layout.test.tsx` or a new field-editor select
  owner suite.

## Security Contract

- Visibility: internal admin schema editor; entry renderer if multi-select is
  enabled.
- Auth model: unchanged.
- RBAC: `content:write` for schema save.
- CSRF: existing content type update route.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: option values must be bounded strings and unknown
  option object fields are rejected by normalizers.
- Anti-abuse:
  - values are unique,
  - labels are display-only,
  - multi-select stores arrays only when the schema declares array type.

## Testing Requirements

- Option rows add, edit, remove, and reorder deterministically.
- Labels generate stable values until values are manually edited.
- Legacy comma/enum data reads correctly.
- Multi-select writes JSON Schema array metadata and reads it back.
- Entry renderer validation remains compatible with legacy single-select.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CONTENT_FIELDS.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Select options are managed as rows, not comma text.
2. Multi-select has an explicit schema contract.
3. Existing select fields still load and save safely.
