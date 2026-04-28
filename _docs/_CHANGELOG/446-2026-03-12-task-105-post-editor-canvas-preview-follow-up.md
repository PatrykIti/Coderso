# 446. TASK-105 Post Editor Canvas Preview Follow-up

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Expanded `PostEditorCanvas` coverage for selected paragraph adapter callbacks, embed preview rendering across supported providers, title focus deselection, image-picker search/reset flow, and media-load error handling.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/post-editor-canvas-wave.test.tsx`
  - `tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx`
  - `tests/vitest/ui/post-editor-canvas-toolbar-profile-routing.test.tsx`
  - `tests/vitest/ui-integration/post-editor-toolbar-inspector-dedup.test.tsx`
- Targeted coverage re-check showed:
  - `PostEditorCanvas.tsx` -> `85.29%` lines / `70.09%` branches
