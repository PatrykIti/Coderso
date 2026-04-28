# 262 - Engagement Mega Menu Metadata and Utility Widgets

- **Date:** 2026-02-19
- **Version:** 0.1.262
- **Tasks:** TASK-054-12, TASK-054-12-05

## Key Changes

### Mega Menu Metadata Contract
- Added strict menu item metadata contract for:
  - `visibility` (`all | logged_in | logged_out`),
  - `badge` (`label`, `tone`),
  - `description`,
  - `icon`.
- Added shared normalization/resolution helper:
  - `core/services/menus/menuItemSettings.ts`
- Tightened API validation:
  - `core/server/validation/menuSchemas.ts`

### Menu Editor and Persistence Wiring
- Extended menu item form/drawer with metadata fields and save flow.
- Persisted normalized `settings` payload during menu item replacement.
- Added row-level metadata hints (badge + visibility) in menu tree.
- Files:
  - `core/admin/ui/menus/MenuItemForm.tsx`
  - `core/admin/ui/menus/MenuItemDrawer.tsx`
  - `core/admin/ui/menus/MenuEditorPage.tsx`
  - `core/admin/ui/menus/MenuItemRow.tsx`
  - `core/services/menus/menuService.ts`
  - `core/services/menus/treeBuilder.ts`
  - `core/admin/services/menusClient.ts`

### Navigation Runtime Metadata
- Navigation runtime now maps deterministic item metadata shape to menu-driven items.
- Navigation editor menu sync now includes metadata in mapped links.
- Files:
  - `core/services/navigation/navigationRuntimeResolver.ts`
  - `core/widgets/core/navigation.tsx`
  - `core/admin/ui/widgets/editors/NavigationEditors.tsx`

### New Utility Widgets
- Added `tabs` widget with repeatable panel slots and runtime tab switching script.
- Added `accordion` widget with repeatable item slots and open-state options.
- Added `toggle-block` widget with two pane slots and runtime toggle script.
- Added full Wizard/Visual/Advanced editors and registration wiring.
- Files:
  - `core/widgets/core/tabs.tsx`
  - `core/widgets/core/accordion.tsx`
  - `core/widgets/core/toggleBlock.tsx`
  - `core/admin/ui/widgets/editors/TabsEditors.tsx`
  - `core/admin/ui/widgets/editors/AccordionEditors.tsx`
  - `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
  - `core/widgets/core/index.ts`
  - `core/widgets/runtime.tsx`
  - `core/admin/ui/widgets/registry.ts`
  - `core/admin/ui/widgets/editors/index.ts`

### Tests
- Added and updated tests for:
  - menu metadata persistence,
  - navigation runtime metadata mapping,
  - navigation editor menu mapping,
  - new utility widget runtime/editor/schema coverage.
- Files:
  - `tests/unit/menus/menuService.test.ts`
  - `tests/unit/navigation/navigationRuntimeResolver.test.ts`
  - `tests/unit/widgets/navigation.test.tsx`
  - `tests/unit/ui/menu-item-form.test.tsx`
  - `tests/unit/widgets/tabs.test.tsx`
  - `tests/unit/widgets/accordionWidget.test.tsx`
  - `tests/unit/widgets/toggleBlock.test.tsx`
