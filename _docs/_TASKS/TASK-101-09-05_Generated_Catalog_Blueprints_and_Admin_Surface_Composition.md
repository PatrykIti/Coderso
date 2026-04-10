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
4. Pierwszy business-complete flow ma byc zrobiony dla promptu katalogu projektow domow.

## Existing Product Surfaces to Reuse

- `Engine` / content types:
  - `core/services/content/typeService.ts`
  - `core/server/routes/contentTypeRoutes.ts`
- `Entries`:
  - `core/services/content/entryService.ts`
  - `core/server/routes/contentEntryRoutes.ts`
- `Custom Screens`:
  - `core/services/customScreens/customScreenService.ts`
  - `core/server/routes/customScreenRoutes.ts`
- `Listings`:
  - `core/services/content/listingQueriesService.ts`
  - `core/services/content/listingTemplatesService.ts`
  - `core/server/routes/listingsRoutes.ts`
- `Pages`:
  - `core/services/pages/pageService.ts`
  - `core/server/routes/pageRoutes.ts`
- `Forms`:
  - `core/services/forms/formsService.ts`

## Legacy or Wrong Approach to Avoid

- do not generate a bespoke assistant-only admin panel when `Entries` or `Custom Screens` already solves the problem,
- do not answer the prompt only with recommendations if the product requirement is actual setup execution,
- do not create a catalog flow that skips listing query/template composition and leaves the user without a working runtime surface.

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
- `TASK-101-09-05-03_House_Projects_Catalog_End_to_End_Acceptance_Flow.md`

## Testing Requirements

- Vitest unit for blueprint outputs.
- Vitest unit for generated default field sets and surface composition.
- Integration coverage for selected end-to-end blueprint-to-plan flow.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/WIDGET_PACK_MATRIX.md`
