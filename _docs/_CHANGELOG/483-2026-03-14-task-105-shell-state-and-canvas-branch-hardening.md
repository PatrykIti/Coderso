# 483. TASK-105 Shell State and Canvas Branch Hardening

**Date:** 2026-03-14  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor Shell
- Expanded `PostBlockEditorShell` coverage for focus-restore layout persistence and list-view shell-close focus behavior.
- Expanded `usePostEditorState` coverage for helper exports around writing-flow normalization, decoded route-id parsing, and draft-sync guard logic.

### QA / Editor Canvas
- Expanded `PostEditorCanvas` coverage for selected callout typography/profile routing, custom TOC preview copy, direct-url image preview metadata, and styled button preview behavior.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
  - `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
  - `tests/vitest/ui/post-editor-canvas-wave.test.tsx`
- Full `bun run test:coverage` passed with:
  - `458` files / `1691` tests
  - `% Stmts`: `69.01`
  - `% Branch`: `59.91`
  - `% Funcs`: `72.51`
  - `% Lines`: `72.19`
