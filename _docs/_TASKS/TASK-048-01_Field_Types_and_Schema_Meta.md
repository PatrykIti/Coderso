# TASK-048-01: Field Types & Schema Meta
# FileName: TASK-048-01_Field_Types_and_Schema_Meta.md

**Priority:** 🟡 Medium  
**Category:** CMS/Content  
**Estimated Effort:** Medium  
**Dependencies:** TASK-003, TASK-048  
**Status:** ⏳ **To Do** (2026-02-01)

---

## Overview

Expand the content schema to keep **field type metadata** and configuration so the UI can faithfully reconstruct fields after save/load.
This prevents issues where Relation/Media/Rich text fields revert to `text`.

---

## Architecture

```
core/admin/ui/content-types/
  schemaMapping.ts        # UPDATE: xFieldType + xFieldConfig
  SchemaBuilder.tsx       # UPDATE: type options + config
core/services/content/
  validation.ts           # UPDATE: AJV custom keywords
core/admin/services/
  contentTypesClient.ts   # UPDATE: ContentSchemaProperty typing
```

---

## Implementation Details

### 1) Schema meta fields
Add non‑breaking meta keys to each property:

```ts
type ContentSchemaProperty = {
  type?: "string" | "number" | "boolean";
  enum?: string[];
  default?: string | number | boolean;
  xFieldType?: FieldType;
  xFieldConfig?: Record<string, unknown>;
}
```

### 2) Mapping rules (schemaMapping.ts)
- `buildSchemaFromFields` should set `xFieldType` for every field
- `xFieldConfig` carries type‑specific config (e.g. relation target, media rules)
- `fieldsFromSchema` should prefer `xFieldType`

### 3) AJV custom keywords
Register `xFieldType`, `xFieldConfig`, and `xRelationTarget` as **valid** keywords.

### 4) UI stability
Ensure `FieldEditor` + `ContentTypeEditor` do not lose type info after save/reload.

---

## Implementation Checklist

| File | Change |
|------|--------|
| `core/admin/ui/content-types/schemaMapping.ts` | add `xFieldType`, `xFieldConfig` |
| `core/services/content/validation.ts` | register AJV keywords |
| `core/admin/services/contentTypesClient.ts` | extend `ContentSchemaProperty` |
| `tests/unit/ui/schema-mapping.test.ts` | add round‑trip tests |

---

## Testing Requirements

**Unit tests**
- Schema round‑trip preserves `relation` and `media` field types.
- `xFieldType` does not break strict AJV compilation.

**Suggested tests**
- `tests/unit/ui/schema-mapping.test.ts`
- `tests/unit/content/validation.test.ts`

---

## Documentation Updates Required

Update:
- `_docs/CONTENT_TYPES_SPEC.md` (schema meta)
- `_docs/CMS_SPEC.md` (field definitions)

---

## Changelog

Add `_docs/_CHANGELOG/<next>-YYYY-MM-DD-field-schema-meta.md` and link TASK-048-01.
