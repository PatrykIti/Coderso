# TASK-054-11: Coderso Commerce Suite
# FileName: TASK-054-11_Coderso_Commerce_Suite.md

**Priority:** Medium  
**Category:** Commerce + Admin/UI + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-07, TASK-054-08  
**Status:** In Progress (started 2026-02-19)

---

## Goal
Define and implement commerce modules comparable to JetWooBuilder + related Jet plugins for product presentation and conversion.

## Features
- Product listing/detail templates and dynamic product cards.
- Product gallery, comparison, wishlist.
- Product tables for large catalogs.
- Checkout/cart integration abstraction.

## Scope (Detailed)
1. Commerce domain contract and validation:
   - products, variants, pricing snapshot, stock state,
   - collections/categories and listing bindings.
2. Product query engine:
   - deterministic filter/sort/pagination for runtime widgets,
   - safe allowlisted fields and operators (same philosophy as listings).
3. Admin API + RBAC:
   - product CRUD, publish state, collections assignment,
   - compare/wishlist runtime state contracts.
4. Admin UI:
   - product list/editor screens with WordPress-like flow,
   - catalog controls and quick filters.
5. Runtime widgets:
   - `product-gallery`,
   - `product-compare`,
   - `product-table`.
6. Checkout abstraction:
   - adapter interface for external checkout/cart providers,
   - no payment orchestration in phase 1.
7. QA/docs/changelog closure.

## Sub-Tasks
- `TASK-054-11-01`: Commerce domain contract and schemas
- `TASK-054-11-02`: Commerce DB schema and migrations
- `TASK-054-11-03`: Commerce service/query engine
- `TASK-054-11-04`: Commerce admin API routes and RBAC
- `TASK-054-11-05`: Commerce admin UI (catalog + editor)
- `TASK-054-11-06`: Runtime widgets (gallery/compare/table)
- `TASK-054-11-07`: Checkout/cart adapter contract
- `TASK-054-11-08`: QA, docs, changelog closure

## Implementation Order
1. Contract and data model.
2. Services/query engine.
3. Admin API and UI.
4. Runtime widgets and checkout abstraction.
5. Regression matrix and documentation closure.

## Files to Change
- `core/services/commerce/*` (new)
- `core/server/routes/commerceRoutes.ts` (new)
- `core/admin/ui/commerce/*` (new)
- `core/widgets/core/productGallery.tsx` (new)
- `core/widgets/core/productCompare.tsx` (new)
- `core/widgets/core/productTable.tsx` (new)

## Pseudocode
```ts
const productQuery = buildCommerceQuery({ filters, sort, pagination });
const products = await listProducts(productQuery);
return renderProductTemplate(templateId, { products });
```

## Acceptance Criteria
1. Merchants can create product pages from templates.
2. Compare/wishlist/table widgets are configurable via visual editors.
3. Commerce features can be enabled/disabled by module flags.

## Progress Update (2026-02-19)
- Completed `TASK-054-11-01`:
  - established commerce product/query type contract,
  - added normalization helpers for status/stock/money/slug,
  - added create/update/query/collection schema validation with unit coverage.
