# TASK-054-11-06: Commerce Runtime Widgets (Gallery, Compare, Table)
# FileName: TASK-054-11-06_Commerce_Runtime_Widgets_Gallery_Compare_Table.md

**Priority:** High  
**Category:** Widgets/Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-11-03, TASK-054-11-05  
**Status:** Done (2026-02-19)

---

## Goal
Provide core commerce widgets for non-technical builders.

## Scope
1. `product-gallery` widget.
2. `product-compare` widget.
3. `product-table` widget.
4. Resolver wiring for runtime payload hydration.

## Security Contract
- Current scope does **not** introduce new public `/api/commerce/*` endpoints; widget data is hydrated server-side via existing internal services.
- If any subtask introduces public commerce endpoints, mandatory protections:
  - public read: signed request contract (HMAC/signature) + dedicated read bucket,
  - public write: nonce + signature/HMAC + optional reCAPTCHA (`public_write`) + dedicated write bucket,
  - internal mode: `session` or `API key` scope authorization (no anonymous fallback).

## Files (planned)
- `core/widgets/core/productGallery.tsx` (new)
- `core/widgets/core/productCompare.tsx` (new)
- `core/widgets/core/productTable.tsx` (new)
- `core/widgets/core/index.ts`
- `core/widgets/runtime.tsx`
- `core/admin/ui/widgets/editors/ProductCommerceEditors.tsx` (new)
- `core/admin/ui/widgets/editors/index.ts`
- `core/admin/ui/widgets/registry.ts`
- `core/server/publicSite.tsx`
- `core/services/commerce/commerceRuntimeResolver.ts`
- `tests/unit/widgets/productGallery.test.tsx` (new)
- `tests/unit/widgets/productCompare.test.tsx` (new)
- `tests/unit/widgets/productTable.test.tsx` (new)
- `tests/unit/server/publicSite.commerce-hydration.test.ts` (new)

## Pseudocode
```ts
const runtime = await resolveCommerceRuntimeProducts({ query, preview });
const blockData = {
  ...normalized,
  resolved: {
    items: runtime.cards,
    total: runtime.total,
    resolvedAt: now,
  },
};
```

## Acceptance Criteria
1. Widgets are configurable in Wizard/Visual/Advanced editors.
2. Runtime output is deterministic and SSR-safe.
3. Widget tests cover schema + render behavior.
4. Runtime hydration sets `resolved` payload for all three commerce widgets.

## Sub-Tasks
- `TASK-054-11-06-01`: Commerce widget models and renderers
- `TASK-054-11-06-02`: Commerce widget editors and registry wiring
- `TASK-054-11-06-03`: Public runtime hydration wiring
- `TASK-054-11-06-04`: Tests, docs, and changelog closure

## Delivered
- Added commerce runtime widgets and shared helpers:
  - `core/widgets/core/productGallery.tsx`
  - `core/widgets/core/productCompare.tsx`
  - `core/widgets/core/productTable.tsx`
  - `core/widgets/core/commerceWidgetShared.ts`
  - `core/widgets/core/index.ts`
- Added admin widget editors and registry wiring:
  - `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx`
  - `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
  - `core/admin/ui/widgets/editors/index.ts`
  - `core/admin/ui/widgets/registry.ts`
  - `core/widgets/runtime.tsx`
- Added runtime hydration integration:
  - `core/services/commerce/commerceWidgetRuntime.ts`
  - `core/server/publicSite.tsx`
- Added tests:
  - `tests/unit/widgets/productGallery.test.tsx`
  - `tests/unit/widgets/productCompare.test.tsx`
  - `tests/unit/widgets/productTable.test.tsx`
  - `tests/unit/commerce/commerceWidgetRuntime.test.ts`
  - `tests/unit/widgets/registry.test.ts`
