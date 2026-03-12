# 444. TASK-105 Post Editor State Hook Coverage

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Added direct `happy-dom` hook coverage for `usePostEditorState`, including dirty-refresh deferral, remote reload, autosave/save normalization, publish/unpublish flow, preview errors, revisions restore flow, move-to-trash outcomes, clipboard upload error remapping, and in-memory block editor callbacks.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
  - `tests/vitest/ui/post-editor-save-sync.test.ts`
  - `tests/vitest/ui/post-editor-state-normalization.test.ts`
- Targeted coverage re-check showed:
  - `usePostEditorState.ts` -> `90.10%` lines / `74.33%` branches
