# 438. TASK-105 Post Richtext Helper Export Coverage

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Expanded `PostRichTextAdapter` helper coverage for clipboard image extraction fallback paths, custom image layout HTML generation, and the remaining clipboard paste mode branches.

### Validation
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/post-richtext-adapter-command-dispatch.test.tsx`
  - `tests/vitest/ui/post-richtext-clear-formatting.test.tsx`
  - `tests/vitest/ui/post-richtext-inline-typography-selection.test.ts`
  - `tests/vitest/ui/post-richtext-inline-wrapper.test.ts`
  - `tests/vitest/ui-integration/post-editor-paste-image.test.tsx`
  - `tests/vitest/ui-integration/post-editor-paste-from-word.test.tsx`
- Targeted coverage re-check showed:
  - `PostRichTextAdapter.tsx` -> `24.52%` lines / `18.65%` branches
