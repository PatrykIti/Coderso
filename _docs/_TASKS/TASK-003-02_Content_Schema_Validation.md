# TASK-003-02: Content Schema Validation
# FileName: TASK-003-02_Content_Schema_Validation.md

**Priority:** High  
**Category:** CMS/Content  
**Estimated Effort:** Medium  
**Dependencies:** TASK-003-01  
**Status:** To Do  

---

## Overview

Implement JSON Schema validation for content types and entries. This ensures every entry matches the schema defined by admins in the Content Types builder.

**UI Alignment:**
- Content Type editor saves JSON schema -> validate on create/update.
- Entry editor saves entry data -> validate on create/update/publish.

## Rules

- Schema must be `type: object`.
- `additionalProperties: false` required.
- Reject unknown fields and missing required properties.
- Cache validators per content type and invalidate on schema update.

## Sub-Tasks

1. Extend `core/services/content/validation.ts` with strict schema checks.
2. Add cached AJV validator per content type (keyed by type id).
3. Integrate validation into type/entry services.

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/content/validation.ts` | add `assertContentSchema`, `validateEntryData` | strict AJV + cache |
| `core/services/content/typeService.ts` | validate schema on create/update | fail fast with clear error |
| `core/services/content/entryService.ts` | validate data on create/update/publish | include schema lookup |
| `core/server/validation/contentSchemas.ts` | request payload validators | create/update endpoints |

## Example Schema (valid)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["title"],
  "properties": {
    "title": {"type": "string"},
    "body": {"type": "string"},
    "tags": {"type": "array", "items": {"type": "string"}}
  }
}
```

## Testing Requirements

- `tests/unit/content/validation.test.ts`
  - accepts strict schema
  - rejects missing required fields
  - rejects unknown properties
  - accepts valid payload

- `tests/unit/content/typeService.test.ts`
  - rejects invalid schema

- `tests/unit/content/entryService.test.ts`
  - rejects invalid entry data

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md` (schema rules)
- `_docs/CMS_SPEC.md` (validation rules)

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-types-engine.md`
