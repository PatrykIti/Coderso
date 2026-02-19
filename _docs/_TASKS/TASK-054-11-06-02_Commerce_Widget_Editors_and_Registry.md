# TASK-054-11-06-02: Commerce Widget Editors and Registry
# FileName: TASK-054-11-06-02_Commerce_Widget_Editors_and_Registry.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11-06-01  
**Status:** Done (2026-02-19)

---

## Goal
Expose commerce widgets in the page editor with Wizard/Visual/Advanced controls.

## Scope
1. Add editor panels for all three widgets.
2. Add shared editor utilities (query controls, empty-state copy).
3. Register editors in admin widget registry.
4. Register no-op runtime editors in runtime widget registration.

## Files
- `core/admin/ui/widgets/editors/ProductCommerceEditors.tsx` (new)
- `core/admin/ui/widgets/editors/index.ts`
- `core/admin/ui/widgets/registry.ts`
- `core/widgets/runtime.tsx`

## Pseudocode
```tsx
<ProductQuerySection
  value={normalized.query}
  onChange={(query) => update(value, onChange, { query })}
/>
```

## Acceptance Criteria
1. Widgets are available in widget library.
2. Wizard/Visual/Advanced tabs show meaningful controls.
3. Editor changes preserve normalized payload shape.

## Delivered
- Added commerce widget editor components:
  - `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx`
  - `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
- Wired editor exports and registry:
  - `core/admin/ui/widgets/editors/index.ts`
  - `core/admin/ui/widgets/registry.ts`
- Added runtime editor registration for SSR/browser runtime consistency:
  - `core/widgets/runtime.tsx`
- Added registry/editor coverage:
  - `tests/unit/widgets/registry.test.ts`
