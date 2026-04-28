# TASK-101-09-07-02: Generic Catalog Family Blueprint Engine
# FileName: TASK-101-09-07-02_Generic_Catalog_Family_Blueprint_Engine.md

**Priority:** High  
**Category:** Core/Assistant + Coderso  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09-07-01  
**Status:** Done (2026-04-10)

---

## Overview

Generalize the current catalog blueprint generator so it can produce typed plans from a parameterized
catalog intent instead of one hardcoded house-projects preset.

## Scope

1. Separate generic catalog fields from domain-specific defaults.
2. Support parameterized variants:
   - house projects
   - product catalog
   - portfolio/projects
3. Keep current `house-projects-catalog` as one preset of the generic engine.
4. Reuse current typed action families:
   - content route
   - content type
   - custom screen
   - listing query
   - listing template
   - page

## Integration Notes

- This task should generalize blueprint generation, not invent new executor action types.
- If a new business family needs extra resources, first check whether the current action families
  and existing domain services already cover that need.

## Files to Change

- `core/services/assistant/blueprints/houseProjectsCatalogBlueprint.ts`
- `core/services/assistant/blueprints/*`
- `core/services/assistant/actionPlannerService.ts`
- `tests/vitest/assistant/*blueprint*`

## Testing Requirements

- `Vitest` for deterministic blueprint output across multiple catalog domains.
- `Bun` parity checks for resulting persisted resources where needed.

## Completion Notes (2026-04-10)

- Extracted a shared catalog family blueprint builder:
  - `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- Added reusable catalog family presets:
  - house projects
  - product catalog
  - portfolio projects
- Rewired `houseProjectsCatalogBlueprint.ts` to act as a backward-compatible preset wrapper over the new generic builder.
- Preserved the current action-engine contract:
  - no new executor action types were introduced,
  - existing house-projects execute flow remained green.
- Added deterministic blueprint tests across multiple catalog domains.
