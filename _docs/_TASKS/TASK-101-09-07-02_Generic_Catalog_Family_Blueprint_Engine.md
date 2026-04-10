# TASK-101-09-07-02: Generic Catalog Family Blueprint Engine
# FileName: TASK-101-09-07-02_Generic_Catalog_Family_Blueprint_Engine.md

**Priority:** High  
**Category:** Core/Assistant + Coderso  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09-07-01  
**Status:** To Do

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

## Files to Change

- `core/services/assistant/blueprints/houseProjectsCatalogBlueprint.ts`
- `core/services/assistant/blueprints/*`
- `core/services/assistant/actionPlannerService.ts`
- `tests/vitest/assistant/*blueprint*`

## Testing Requirements

- `Vitest` for deterministic blueprint output across multiple catalog domains.
- `Bun` parity checks for resulting persisted resources where needed.
