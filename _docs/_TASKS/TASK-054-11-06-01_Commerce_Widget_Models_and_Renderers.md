# TASK-054-11-06-01: Commerce Widget Models and Renderers
# FileName: TASK-054-11-06-01_Commerce_Widget_Models_and_Renderers.md

**Priority:** High  
**Category:** Widgets/Core  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11-03  
**Status:** Done (2026-02-19)

---

## Goal
Implement the three core commerce widgets with strict schemas, normalization, and runtime-friendly rendering.

## Scope
1. Add `product-gallery` widget model + renderer.
2. Add `product-compare` widget model + renderer.
3. Add `product-table` widget model + renderer.
4. Reuse commerce runtime payload contracts (`cards`, `compare rows`) from resolver service.

## Files
- `core/widgets/core/productGallery.tsx` (new)
- `core/widgets/core/productCompare.tsx` (new)
- `core/widgets/core/productTable.tsx` (new)
- `core/widgets/core/index.ts`

## Pseudocode
```tsx
const normalized = normalizeProductGalleryData(data);
const items = normalized.resolved?.items ?? [];

if (items.length === 0) {
  return <EmptyState title={normalized.emptyState.title} />;
}

return (
  <div className={layoutClass(normalized.style)}>
    {items.map(renderProductCard)}
  </div>
);
```

## Acceptance Criteria
1. Each widget has defaults + strict schema + normalize helper.
2. Renderers support empty/error states.
3. Widgets are registered in `core/widgets/core/index.ts`.

## Delivered
- Added widget models/renderers:
  - `core/widgets/core/productGallery.tsx`
  - `core/widgets/core/productCompare.tsx`
  - `core/widgets/core/productTable.tsx`
  - shared helpers in `core/widgets/core/commerceWidgetShared.ts`
- Registered widgets in:
  - `core/widgets/core/index.ts`
- Added renderer/schema unit tests:
  - `tests/unit/widgets/productGallery.test.tsx`
  - `tests/unit/widgets/productCompare.test.tsx`
  - `tests/unit/widgets/productTable.test.tsx`
