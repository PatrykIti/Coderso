# 484. TASK-105 Hook Helper Follow-Up Coverage

**Date:** 2026-03-14  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor Hooks
- Expanded `usePostEditorState` coverage for in-flight delete guarding, invalid selected-block no-op paths, and attribute patching when block attrs are not records.

### QA / Editor Helpers
- Expanded `PostRichTextAdapter` helper coverage for clipboard image extraction, escaped default image insert HTML, and paste-mode resolution.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
  - `tests/vitest/ui/post-richtext-adapter-command-dispatch.test.tsx`
- Full `bun run test:coverage` passed with:
  - `458` files / `1698` tests
  - `% Stmts`: `69.03`
  - `% Branch`: `59.95`
  - `% Funcs`: `72.51`
  - `% Lines`: `72.19`
