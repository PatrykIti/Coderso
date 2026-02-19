# TASK-054-11-01: Commerce Domain Contract and Schemas
# FileName: TASK-054-11-01_Commerce_Domain_Contract_and_Schemas.md

**Priority:** High  
**Category:** Domain/Validation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-07-01, TASK-054-11  
**Status:** To Do

---

## Goal
Define stable, deterministic commerce contracts used by services, API, widgets, and admin UI.

## Scope
1. Product/variant DTO and status model (`draft|published|archived`).
2. Price model (`amount`, `currency`, optional compare-at).
3. Stock model (`in_stock|out_of_stock|backorder`).
4. Collection/category reference model.
5. Validation schemas for CRUD and query payloads.

## Files (planned)
- `core/server/validation/commerceSchemas.ts` (new)
- `core/services/commerce/commerceTypes.ts` (new)
- `core/services/commerce/commerceValidation.ts` (new)
- `tests/unit/validation/commerceSchemas.test.ts` (new)

## Pseudocode
```ts
type CommerceProduct = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  pricing: { amount: number; currency: string; compareAtAmount?: number | null };
  stock: { state: "in_stock" | "out_of_stock" | "backorder"; quantity?: number | null };
  collections: string[];
  data: Record<string, unknown>;
};
```

## Acceptance Criteria
1. Schemas reject unsafe/invalid payloads with stable error codes.
2. Core product/query types are reusable by API and widget runtime.
3. Unit coverage exists for positive/negative schema paths.
