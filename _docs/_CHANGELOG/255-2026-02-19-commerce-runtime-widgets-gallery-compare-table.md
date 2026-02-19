# 255 - Commerce Runtime Widgets (Gallery, Compare, Table)

- **Date:** 2026-02-19
- **Version:** 0.1.255
- **Tasks:** TASK-054-11, TASK-054-11-06, TASK-054-11-06-01, TASK-054-11-06-02, TASK-054-11-06-03, TASK-054-11-06-04

## Key Changes

### Commerce Widget Models and Rendering
- Added three commerce widgets with defaults, normalization, and runtime rendering contracts:
  - `product-gallery`
  - `product-compare`
  - `product-table`
- Added shared commerce widget normalization helpers.
- Files:
  - `core/widgets/core/productGallery.tsx`
  - `core/widgets/core/productCompare.tsx`
  - `core/widgets/core/productTable.tsx`
  - `core/widgets/core/commerceWidgetShared.ts`
  - `core/widgets/core/index.ts`

### Widget Editors and Registry Wiring
- Added dedicated editor bundles for all commerce widgets and shared editor utilities.
- Registered commerce widget editors in admin registry and runtime editor registry.
- Files:
  - `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx`
  - `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
  - `core/admin/ui/widgets/editors/index.ts`
  - `core/admin/ui/widgets/registry.ts`
  - `core/widgets/runtime.tsx`

### Runtime Hydration
- Added SSR hydration pipeline for commerce widgets via dedicated runtime helper.
- Public rendering now resolves commerce payloads for gallery/compare/table before SSR output.
- Files:
  - `core/services/commerce/commerceWidgetRuntime.ts`
  - `core/server/publicSite.tsx`

### Tests
- Added/updated widget/runtime coverage:
  - `tests/unit/widgets/productGallery.test.tsx`
  - `tests/unit/widgets/productCompare.test.tsx`
  - `tests/unit/widgets/productTable.test.tsx`
  - `tests/unit/commerce/commerceWidgetRuntime.test.ts`
  - `tests/unit/widgets/registry.test.ts`
