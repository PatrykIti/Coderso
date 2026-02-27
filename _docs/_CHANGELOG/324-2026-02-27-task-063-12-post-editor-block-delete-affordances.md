# 324 - TASK-063-12 post editor block delete affordances (list view + canvas)

Date: 2026-02-27  
Version: Unreleased  
Tasks: TASK-063-12, TASK-063-12-03, TASK-063-12-04

## Key Changes

### List view delete affordance (`063-12-03` follow-up)
- Added a dedicated delete icon (`trash`) for each row in `PostListViewPanel`.
- Kept current drag-and-drop and keyboard reorder behavior intact.
- Wired list-view delete action to the existing editor state contract (`editor.deleteBlock` -> `delete_block` reducer).

### Canvas selected-block delete affordance (`063-12-04` follow-up)
- Added a compact delete control in the top-right corner of the selected block on `PostEditorCanvas`.
- Implemented as a secondary delete path to avoid visual noise on non-selected blocks.
- Reused the same block delete flow as list view (no backend/API changes).

### Integration wiring
- Extended editor shell and sidebars to pass `onDeleteBlock` through:
  - `PostBlockEditorShell`
  - `PostListViewSidebar`
  - `PostListViewPanel`
  - `PostEditorCanvas`

## Tests and Quality Gates
- `bun test tests/integration/ui/post-block-dnd.test.tsx tests/integration/ui/post-editor-canvas-shared.test.tsx tests/integration/ui/post-editor-listview-outline.test.tsx tests/integration/ui/post-editor-writing-canvas-flow.test.tsx tests/integration/ui/post-editor-layout-shell.test.tsx` -> pass.
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.

## Documentation
- Updated:
  - `_docs/_TASKS/TASK-063-12_Post_Editor_Reference_Parity_with_46_Template.md`
  - `_docs/_TASKS/TASK-063-12-03_Left_Outline_Parity_with_Optional_List_Tab.md`
  - `_docs/_TASKS/TASK-063-12-04_Canvas_Geometry_Typography_and_Block_Surface_Parity.md`
  - `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
  - `_docs/_CHANGELOG/README.md`
