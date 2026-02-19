# TASK-054-11-06: Commerce Runtime Widgets (Gallery, Compare, Table)
# FileName: TASK-054-11-06_Commerce_Runtime_Widgets_Gallery_Compare_Table.md

**Priority:** High  
**Category:** Widgets/Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-11-03, TASK-054-11-05  
**Status:** To Do

---

## Goal
Provide core commerce widgets for non-technical builders.

## Scope
1. `product-gallery` widget.
2. `product-compare` widget.
3. `product-table` widget.
4. Resolver wiring for runtime payload hydration.

## Files (planned)
- `core/widgets/core/productGallery.tsx` (new)
- `core/widgets/core/productCompare.tsx` (new)
- `core/widgets/core/productTable.tsx` (new)
- `core/widgets/core/index.ts`
- `core/services/commerce/commerceRuntimeResolver.ts`
- `tests/unit/widgets/productGallery.test.tsx` (new)
- `tests/unit/widgets/productCompare.test.tsx` (new)
- `tests/unit/widgets/productTable.test.tsx` (new)

## Pseudocode
```ts
const runtime = await resolveCommerceRuntimeData(block, context);
return renderProductTable(runtime.rows, block.model.columns);
```

## Acceptance Criteria
1. Widgets are configurable in Wizard/Visual/Advanced editors.
2. Runtime output is deterministic and SSR-safe.
3. Widget tests cover schema + render behavior.
