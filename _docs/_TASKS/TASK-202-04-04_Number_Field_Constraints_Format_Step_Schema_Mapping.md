# TASK-202-04-04: Number Field Constraints, Format, and Step Schema Mapping
# FileName: TASK-202-04-04_Number_Field_Constraints_Format_Step_Schema_Mapping.md

**Priority:** Medium
**Category:** CMS/Engine + Schema Builder + Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-202-04
**Status:** Done (2026-04-23)

---

## Overview

Fix `UX-4`: number fields have no min, max, integer/decimal, or step controls.
Add these as explicit schema metadata and JSON Schema-compatible constraints.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/FieldEditor.tsx:37-40`
  - update number helper copy if needed.
- `core/admin/ui/content-types/FieldEditor.tsx:425-434`
  - render typed default/constraint controls for number fields.
- `core/admin/ui/content-types/SchemaBuilder.tsx:148-165`
  - extend number field metadata.
- `core/admin/ui/content-types/schemaMapping.ts:3-14`
  - add `minimum`, `maximum`, `multipleOf`, and number format metadata.
- `core/admin/ui/content-types/schemaMapping.ts:128-274`
  - round-trip number constraints.
- `core/services/content/validation.ts`
  - keep the existing AJV contract as the validation owner; use standard JSON
    Schema keywords where possible and do not add a parallel number validator.
    Extend custom keywords only if explicit schema metadata requires it.
- `tests/vitest/ui/schema-mapping.test.ts`
- `tests/unit/content/validation.test.ts`
  - Bun owner for entry schema validation with AJV-backed number constraint
    acceptance/rejection.
- `tests/vitest/validation/schemaValidator.test.ts` only if route payload
  schema validation changes.

## Security Contract

- Visibility: internal admin schema editor and entry validation.
- Auth model: unchanged.
- RBAC: `content:write` for schema save.
- CSRF: existing update route.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: min/max/step/format must be normalized and invalid
  combinations rejected.
- Anti-abuse:
  - min cannot exceed max,
  - step must be positive,
  - integer format must not accept decimal defaults.

## Testing Requirements

- Number constraints write to schema and read back.
- Invalid min/max/step combinations show errors and cannot save.
- Integer and decimal formats handle default values correctly.
- Existing unconstrained number fields remain valid.
- Entry validation rejects payloads that violate generated number constraints
  through the existing content validation owner.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CONTENT_FIELDS.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Number fields expose min, max, format, and step controls.
2. Constraints persist through schema mapping.
3. Invalid numeric contracts are rejected before persistence.
