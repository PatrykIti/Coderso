# TASK-054-11-03: Commerce Service and Query Engine
# FileName: TASK-054-11-03_Commerce_Service_and_Query_Engine.md

**Priority:** High  
**Category:** Services/Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-11-01, TASK-054-11-02  
**Status:** To Do

---

## Goal
Implement deterministic commerce service layer and safe runtime query engine for product widgets.

## Scope
1. Product CRUD service with slug uniqueness and publish lifecycle.
2. Collection assignment and retrieval helpers.
3. Query engine with allowlisted filters/sort/pagination.
4. Compare/wishlist normalized runtime payload builders.

## Files (planned)
- `core/services/commerce/commerceService.ts` (new)
- `core/services/commerce/commerceQueryService.ts` (new)
- `core/services/commerce/commerceRuntimeResolver.ts` (new)
- `tests/unit/commerce/commerceService.test.ts` (new)
- `tests/unit/commerce/commerceQueryService.test.ts` (new)

## Pseudocode
```ts
const plan = buildCommercePlan({ filters, sort, pagination });
const rows = await executeCommercePlan(plan);
return rows.map(toRuntimeProductCard);
```

## Acceptance Criteria
1. Product CRUD and query service produce deterministic outputs.
2. Unsafe query inputs are rejected before DB access.
3. Unit/DB tests cover lifecycle + query behavior.
