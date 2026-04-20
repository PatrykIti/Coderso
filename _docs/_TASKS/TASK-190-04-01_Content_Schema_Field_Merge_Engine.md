# TASK-190-04-01: Content Schema Field Merge Engine
# FileName: TASK-190-04-01_Content_Schema_Field_Merge_Engine.md

**Priority:** High
**Category:** Assistant/Core + Content Schema
**Estimated Effort:** Large
**Dependencies:** TASK-190-03
**Status:** To Do

---

## Overview

Merge content schema fields contributed by multiple capabilities into one valid
content type schema.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintSchemaMerger.ts`
- Add `tests/vitest/assistant/blueprint-schema-merger.test.ts`
- Reuse validation from `core/services/content/validation.ts`

## Pseudocode

```ts
export const mergeBlueprintSchemas = (inputs: BlueprintSchemaContribution[]) => {
  const result = createBaseObjectSchema();
  for (const contribution of ordered(inputs)) {
    for (const [field, definition] of Object.entries(contribution.properties)) {
      if (!result.properties[field]) {
        result.properties[field] = definition;
        continue;
      }
      result.properties[field] = mergeFieldDefinition(result.properties[field], definition);
    }
  }
  result.required = mergeRequired(inputs);
  validateContentSchema(result);
  return result;
};
```

## Security Contract

- Visibility: internal planning.
- Auth model: unchanged.
- RBAC: schema writes still require content type action permissions.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: merged schema must pass content schema validation.
- Anti-abuse: no arbitrary DB paths or secret-like fields.
- Secret handling: reject or redact secret-like field definitions.

## Testing Requirements

- Merge compatible fields.
- Reject incompatible type.
- Merge enum values safely.
- Preserve required fields.
- Reject secret-like field defaults.

## Documentation Updates Required

- `_docs/CMS_API.md`
