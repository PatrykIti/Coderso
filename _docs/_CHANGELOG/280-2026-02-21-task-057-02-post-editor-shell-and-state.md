# 280 - TASK-057-02 Modular Post Editor Shell and State Architecture

- **Date:** 2026-02-21
- **Version:** 0.1.280
- **Tasks:** TASK-057-02

## Key Changes

### New Post Editor Shell
- Replaced previous post editor entry wiring with dedicated modular shell:
  - `core/admin/ui/posts/PostEditorPage.tsx`
  - `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
  - `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
  - `core/admin/ui/posts/editor/PostEditorCanvas.tsx`

### Dedicated Editor State/Reducer
- Added post editor reducer with history, selection, dirty/saving state, undo/redo, insert/delete/move:
  - `core/admin/ui/posts/editor/postEditorStore.ts`
- Added runtime/editor orchestration hook:
  - `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`

### Route/UX Integration
- Route `/admin/coderso/posts/:id` now renders dedicated block editor shell.
- Runtime preview dialog, publish/save controls, and cache-sync refresh are integrated in shell state flow.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/posts/postEditorStore.test.ts tests/unit/ui/post-block-editor-shell.test.tsx tests/unit/ui/post-editor-page.test.tsx`

### Added/Updated Tests
- `tests/unit/posts/postEditorStore.test.ts`
- `tests/unit/ui/post-block-editor-shell.test.tsx`
- `tests/unit/ui/post-editor-page.test.tsx`
