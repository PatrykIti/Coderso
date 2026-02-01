# Menus editor wiring

## Summary
- Replaced menu editor mock data with live menu + page data from the API.
- Added menu creation dialog, editable menu metadata, and save/discard actions.
- Implemented menu item editing, deletion, and drag & drop reordering within a level.
- Added admin menus client coverage and updated menu UI tests.

## Tasks
- TASK-006-02
- TASK-066

## Files touched
- `core/admin/services/menusClient.ts`
- `core/admin/ui/menus/MenuCreateDialog.tsx`
- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/menus/MenuItemDrawer.tsx`
- `core/admin/ui/menus/MenuItemForm.tsx`
- `core/admin/ui/menus/MenuItemRow.tsx`
- `core/admin/ui/menus/MenuTree.tsx`
- `core/admin/ui/menus/types.ts`
- `tests/unit/admin/menusClient.test.ts`
- `tests/unit/ui/menu-editor.test.tsx`
- `tests/unit/ui/menu-item-form.test.tsx`
