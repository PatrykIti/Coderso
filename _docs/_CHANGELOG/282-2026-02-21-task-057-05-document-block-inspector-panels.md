# 282 - TASK-057-05 Document and Block Inspector Panels

- **Date:** 2026-02-21
- **Version:** 0.1.282
- **Tasks:** TASK-057-05

## Key Changes

### Inspector Modularization
- Added dedicated inspector modules:
  - `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
  - `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
  - `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts`
- Replaced inline inspector logic in shell with reusable inspector components:
  - `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`

### Document Settings and Metadata Flow
- Added document-side controls for:
  - slug, excerpt, featured image,
  - tags input and category id mapping,
  - SEO draft fields (title/description/canonical/robots).
- Extended editor state hook to manage metadata draft and featured image dirty-state:
  - `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- Save flow now synchronizes:
  - document/content draft (`updatePost`),
  - metadata draft (`updatePostMetadata`) when changed.

### UX Consistency
- Top bar `Unsaved changes` now reflects full editor state (content + metadata), not only block document dirty flag.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/ui/post-document-inspector.test.tsx tests/integration/ui/post-block-inspector.test.tsx tests/unit/ui/post-block-editor-shell.test.tsx`

### Added/Updated Tests
- `tests/integration/ui/post-document-inspector.test.tsx`
- `tests/integration/ui/post-block-inspector.test.tsx`
- `tests/unit/ui/post-block-editor-shell.test.tsx`
