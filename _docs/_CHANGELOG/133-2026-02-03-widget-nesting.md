# Widget nesting support in editors and insert flow

## Summary
- Added nested block support with child lists in the widget renderer and block model.
- Updated insert dialog and library insertion logic to nest when the target supports children.
- Refactored page/template editors to manage nested block trees and added coverage.

## Tasks
- TASK-050-03

## Files touched
- `core/widgets/types.ts`
- `core/widgets/registry.ts`
- `core/widgets/core/hero.tsx`
- `core/widgets/validator.ts`
- `core/widgets/renderers/widgetRenderer.tsx`
- `core/server/validation/pageSchemas.ts`
- `core/server/validation/widgetSchemas.ts`
- `core/admin/ui/pages/builder/blockUtils.ts`
- `core/admin/ui/pages/builder/BlockList.tsx`
- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/widgets/WidgetInsertDialog.tsx`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/widgetInsertUtils.ts`
- `tests/unit/pageBuilder/blockList.test.tsx`
- `tests/unit/ui/widgetInsertUtils.test.ts`
- `tests/unit/widgets/renderer.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/PAGE_MODEL.md`
