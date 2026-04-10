# TASK-101-09-05: Generated Catalog Blueprints and Admin Surface Composition
# FileName: TASK-101-09-05_Generated_Catalog_Blueprints_and_Admin_Surface_Composition.md

**Priority:** High  
**Category:** Core/Assistant + Coderso + Product UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09-03, TASK-101-09-04, TASK-054-22, TASK-055, TASK-059  
**Status:** To Do

---

## Overview

`llm-guide` ma przekladac wysokopoziomowe potrzeby usera na istniejace powierzchnie produktu,
a nie na ad-hoc implementacje.

Przyklad:
- prompt: "potrzebuje strony z katalogiem projektow domow",
- output: content model + entries/custom screen + listing + runtime page + filters + optional form.

## Scope

1. Dodac blueprint presets dla powtarzalnych intents.
2. Utrzymac beginner-safe defaults i product-first naming.
3. Generowac surfaces przez `Engine`, `Entries`, `Custom Screens`, `Listings`, `Pages`, `Forms`.

## Files to Change

- `core/services/assistant/blueprints/*` (new, ~250-450 LOC)
- `core/services/assistant/actionPlannerService.ts` (update, ~60-120 LOC)
- `core/services/assistant/actions/*` (update, ~120-220 LOC)
- `tests/vitest/assistant/catalog-blueprints.test.ts` (new, ~160-240 LOC)

## Pseudocode

```ts
if (intent.type === "catalog" && intent.domain === "house-projects") {
  return buildProjectsCatalogBlueprint(intent, adminContext);
}
```

## Sub-Tasks

- `TASK-101-09-05-01_Projects_Catalog_Blueprint_and_Default_Content_Model.md`
- `TASK-101-09-05-02_Generated_Admin_Surfaces_Listings_and_Beginner_Safe_Followups.md`

## Testing Requirements

- Vitest unit for blueprint outputs.
- Vitest unit for generated default field sets and surface composition.
- Integration coverage for selected end-to-end blueprint-to-plan flow.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/WIDGET_PACK_MATRIX.md`
