# TASK-054-11: Coderso Commerce Suite
# FileName: TASK-054-11_Coderso_Commerce_Suite.md

**Priority:** Medium  
**Category:** Commerce + Admin/UI + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-07, TASK-054-08  
**Status:** To Do

---

## Goal
Define and implement commerce modules comparable to JetWooBuilder + related Jet plugins for product presentation and conversion.

## Features
- Product listing/detail templates and dynamic product cards.
- Product gallery, comparison, wishlist.
- Product tables for large catalogs.
- Checkout/cart integration abstraction.

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
