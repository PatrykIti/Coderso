# TASK-054-11-05: Commerce Admin UI Catalog and Editor
# FileName: TASK-054-11-05_Commerce_Admin_UI_Catalog_and_Editor.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-11-04, TASK-053-07, TASK-053-08  
**Status:** To Do

---

## Goal
Deliver WordPress-like commerce authoring flow: product list + product editor.

## Scope
1. Product list table (search/status quick filters, row actions).
2. Product editor (title/slug/pricing/stock/collections/publish state).
3. Local cache + prefetch hooks for smooth transitions.
4. Mobile panel toggles consistent with other editors.

## Files (planned)
- `core/admin/services/commerceClient.ts` (new)
- `core/admin/ui/commerce/CommerceListPage.tsx` (new)
- `core/admin/ui/commerce/CommerceEditorPage.tsx` (new)
- `core/admin/ui/commerce/*` (new components)
- `core/admin/AdminApp.tsx`
- `tests/unit/ui/commerce-list.test.tsx` (new)
- `tests/unit/ui/commerce-editor.test.tsx` (new)

## Pseudocode
```ts
const products = await listCommerceProductsCached({ force: false });
renderTable(products);
// row click -> /admin/coderso/commerce/:id
```

## Acceptance Criteria
1. Users can create/edit/publish products without API tooling.
2. Navigation/list/editor behavior follows existing admin UX patterns.
3. UI tests cover rendering and key interactions.
