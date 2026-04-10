# TASK-101-09-05-02: Generated Admin Surfaces, Listings, and Beginner-Safe Follow-Ups
# FileName: TASK-101-09-05-02_Generated_Admin_Surfaces_Listings_and_Beginner_Safe_Followups.md

**Priority:** High  
**Category:** Core/Assistant + Coderso UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-05-01, TASK-054-22, TASK-055, TASK-059  
**Status:** To Do

---

## Overview

Z blueprintu maja wynikac konkretne surfaces do pracy dla usera:
- entries management,
- custom screen do wygodnej edycji,
- listing katalogu,
- runtime page,
- follow-up questions dla opcji, ktorych nie wolno zgadywac.

## Files to Change

- `core/services/assistant/blueprints/projectsCatalogBlueprint.ts` (update, ~60-100 LOC)
- `core/services/assistant/actionPlannerService.ts` (update, ~60-120 LOC)
- `core/services/assistant/actions/*` (update, ~120-200 LOC)
- `tests/vitest/assistant/catalog-surface-generation.test.ts` (new, ~140-220 LOC)

## Pseudocode

```ts
return {
  createEntriesSurface: true,
  createCustomScreen: true,
  createListing: true,
  questions: missingPriceMode ? ["Should projects expose exact prices?"] : [],
};
```

## Sub-Tasks

1. Map blueprint outputs to existing Coderso surfaces.
2. Prefer follow-up questions for business-sensitive decisions.
3. Keep generated plan beginner-friendly and editable.

## Testing Requirements

- Vitest unit for surface composition.
- Vitest unit for follow-up question triggers.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/WIDGET_PACK_MATRIX.md`
