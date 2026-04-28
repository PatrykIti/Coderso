# 281 - TASK-057-04 Inserter, Slash Commands, List View DnD, and Transforms

- **Date:** 2026-02-21
- **Version:** 0.1.281
- **Tasks:** TASK-057-04

## Key Changes

### Block Inserter and Catalog
- Added reusable block catalog (labels, categories, search keywords):
  - `core/admin/ui/posts/editor/blocks/blockCatalog.ts`
- Added global inserter panel with search and category groups:
  - `core/admin/ui/posts/editor/blocks/BlockInserter.tsx`

### Slash Command in Rich Text
- Added slash command dropdown integration in rich text adapter:
  - `core/admin/ui/posts/editor/blocks/SlashCommandMenu.tsx`
  - `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`

### List View Reorder
- Added list view panel with:
  - mouse drag/drop reorder,
  - keyboard fallback (`Alt + ArrowUp/ArrowDown`):
  - `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx`
  - `core/admin/ui/posts/editor/blocks/blockDnD.ts`

### Block Transforms
- Added block transform matrix and mappings:
  - `core/admin/ui/posts/editor/blocks/blockTransforms.ts`
- Integrated transforms + move-to-index into reducer/hook/canvas:
  - `core/admin/ui/posts/editor/postEditorStore.ts`
  - `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
  - `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
  - `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/posts/block-transforms.test.ts tests/unit/posts/postEditorStore.test.ts tests/integration/ui/post-block-inserter.test.tsx tests/integration/ui/post-block-dnd.test.tsx`

### Added/Updated Tests
- `tests/unit/posts/block-transforms.test.ts`
- `tests/unit/posts/postEditorStore.test.ts`
- `tests/integration/ui/post-block-inserter.test.tsx`
- `tests/integration/ui/post-block-dnd.test.tsx`
