# 441. TASK-105 Post Richtext Adapter DOM Flow Coverage

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Added direct DOM-focused coverage for `PostRichTextAdapter` toolbar fallback callbacks, keyboard shortcut dispatch, slash menu selection, rich-text paste directives, and clipboard image upload/unavailable branches.

### Validation
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/post-richtext-adapter-command-dispatch.test.tsx`
  - `tests/vitest/ui/post-richtext-clear-formatting.test.tsx`
  - `tests/vitest/ui/post-richtext-inline-typography-selection.test.ts`
  - `tests/vitest/ui/post-richtext-inline-wrapper.test.ts`
  - `tests/vitest/ui/post-richtext-adapter-wave.test.tsx`
  - `tests/vitest/ui-integration/post-editor-paste-image.test.tsx`
  - `tests/vitest/ui-integration/post-editor-paste-from-word.test.tsx`
- Targeted coverage re-check showed:
  - `PostRichTextAdapter.tsx` -> `63.36%` lines / `46.92%` branches
