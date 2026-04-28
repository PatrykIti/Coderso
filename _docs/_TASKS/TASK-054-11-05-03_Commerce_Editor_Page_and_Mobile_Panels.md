# TASK-054-11-05-03: Commerce Editor Page and Mobile Panels
# FileName: TASK-054-11-05-03_Commerce_Editor_Page_and_Mobile_Panels.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-11-05-01  
**Status:** Done (2026-02-19)

---

## Goal
Provide commerce product editor with publish lifecycle, stock/pricing controls, and responsive side panels.

## Scope
1. Add editor route for `/coderso/commerce/:id` and `/coderso/commerce/new`.
2. Build editor sections:
   - identity (`title`, `slug`, `excerpt`, `description`),
   - pricing (`amount`, `currency`, `compareAtAmount`),
   - stock (`state`, `quantity`),
   - collections assignment.
3. Add publish state controls (`draft`, `published`, `archived`).
4. Add desktop left/right panels and mobile toggle sheets.
5. Add save/discard actions and unsaved state indicator.

## Files
- `core/admin/ui/commerce/CommerceEditorPage.tsx` (new)
- `core/admin/ui/commerce/components/*` (new)
- `core/admin/app/AdminApp.tsx`
- `tests/unit/ui/commerce-page.test.tsx` (new/extended)

## Pseudocode
```tsx
if (isCreateMode) createCommerceProduct(payload);
else updateCommerceProduct(id, payload);

<EditorShell
  leftPanel={<CatalogContextPanel />}
  rightPanel={<CollectionsPanel />}
>
  <ProductForm />
</EditorShell>
```

## Acceptance Criteria
1. Product editor supports create, edit, publish state updates.
2. Collections can be assigned in editor.
3. Mobile can open left/right panels through explicit buttons.

## Delivered
- Added commerce editor route and page:
  - `/coderso/commerce/:id`
  - `core/admin/ui/commerce/CommerceEditorPage.tsx`
- Added modular editor components:
  - `core/admin/ui/commerce/components/CommerceEditorSections.tsx`
  - `core/admin/ui/commerce/components/CommerceCollectionsPanel.tsx`
  - `core/admin/ui/commerce/components/CommerceContextPanel.tsx`
- Added draft/input transformation model:
  - `core/admin/ui/commerce/commerceEditorModel.ts`
- Implemented mobile panel sheets for context/details in editor.
