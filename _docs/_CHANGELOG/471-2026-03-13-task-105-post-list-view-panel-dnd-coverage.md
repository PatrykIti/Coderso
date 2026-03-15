# 471. TASK-105 Post List View Panel DnD Coverage

**Date:** 2026-03-13  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Expanded `PostListViewPanel` coverage for no-hint mode, `toc` labeling, drag hover markers, drag-state opacity reset, and missing drop-payload fallback after cleared drag state.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui-integration/post-block-dnd.test.tsx`
  - `tests/vitest/ui/post-editor-support-wave-2.test.tsx`
  - `tests/vitest/ui-integration/post-editor-writing-canvas-flow.test.tsx`
- Targeted coverage re-check showed:
  - `PostListViewPanel.tsx` -> `100.00%` lines / `94.59%` branches
