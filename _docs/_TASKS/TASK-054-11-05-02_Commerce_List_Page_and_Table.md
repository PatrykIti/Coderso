# TASK-054-11-05-02: Commerce List Page and Table
# FileName: TASK-054-11-05-02_Commerce_List_Page_and_Table.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11-05-01  
**Status:** Done (2026-02-19)

---

## Goal
Deliver WordPress-like product catalog table with fast navigation and quick filters.

## Scope
1. Add commerce list route page under Coderso.
2. Add product table with:
   - clickable title,
   - status/price/stock columns,
   - row actions (edit/delete).
3. Add quick filters:
   - search by title/slug,
   - status chips/tabs.
4. Add create CTA and empty/loading/error states.

## Files
- `core/admin/ui/commerce/CommerceListPage.tsx` (new)
- `core/admin/ui/commerce/CommerceTable.tsx` (new)
- `core/admin/ui/commerce/hooks/useCommerceProducts.ts` (new)
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/navigation/codersoModules.ts`
- `tests/unit/ui/commerce-page.test.tsx` (new)

## Pseudocode
```tsx
const { items, refresh } = useCommerceProducts();
const filtered = items.filter(matchesSearchAndStatus);
return <CommerceTable items={filtered} onDelete={handleDelete} />;
```

## Acceptance Criteria
1. List page renders with cached data immediately when available.
2. Product title is clickable and opens editor.
3. Quick filters update table in-place without hard reload.

## Delivered
- Added commerce list UI:
  - `core/admin/ui/commerce/CommerceListPage.tsx`
  - `core/admin/ui/commerce/CommerceTable.tsx`
  - `core/admin/ui/commerce/hooks/useCommerceCatalog.ts`
- Added route:
  - `/coderso/commerce` in `core/admin/app/AdminApp.tsx`
- Enabled commerce module visibility in Coderso nav (beta):
  - `core/admin/ui/navigation/codersoModules.ts`
- Added UI coverage:
  - `tests/unit/ui/commerce-page.test.tsx`
