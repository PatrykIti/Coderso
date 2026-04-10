# TASK-101-09-05-01: Projects Catalog Blueprint and Default Content Model
# FileName: TASK-101-09-05-01_Projects_Catalog_Blueprint_and_Default_Content_Model.md

**Priority:** High  
**Category:** Core/Assistant + Content Modeling  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-05  
**Status:** To Do

---

## Overview

Przygotowac canonical blueprint dla katalogu projektow:
- content type,
- field schema,
- sane defaults,
- starter labels i statuses.

## Files to Change

- `core/services/assistant/blueprints/projectsCatalogBlueprint.ts` (new, ~140-220 LOC)
- `core/services/assistant/actionPlanTypes.ts` (update, ~20-40 LOC)
- `tests/vitest/assistant/projects-catalog-blueprint.test.ts` (new, ~120-180 LOC)

## Pseudocode

```ts
return {
  contentTypeSlug: "house_projects",
  fields: ["title", "slug", "gallery", "areaM2", "rooms", "price", "location", "status"],
  defaults: { status: "draft", featured: false },
};
```

## Sub-Tasks

1. Define starter field contract for projects catalog.
2. Add explicit defaults and validation-friendly field ids.
3. Cover stable output for repeated prompts.

## Testing Requirements

- Vitest unit for generated schema and defaults.
- Vitest snapshot-like contract tests for deterministic output.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
