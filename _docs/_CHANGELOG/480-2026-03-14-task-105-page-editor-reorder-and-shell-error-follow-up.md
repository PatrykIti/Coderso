# 480. TASK-105 Page Editor Reorder and Shell-Error Follow-Up

**Date:** 2026-03-14  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Pages
- Expanded `PageEditor` coverage for block reordering, invalid move no-op behavior, duplicate/delete selection fallback, and additional shell-level error handling.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/page-editor-shell-wave.test.tsx`
  - `tests/vitest/ui/post-richtext-toolbar-wave.test.tsx`
  - `tests/vitest/ui/block-inserter-wave.test.tsx`
  - `tests/vitest/ui/post-block-inserter-wave.test.tsx`
  - `tests/vitest/ui/post-richtext-adapter-wave.test.tsx`
- Full `bun run test:coverage` passed with:
  - `% Stmts`: `68.66`
  - `% Branch`: `59.38`
  - `% Funcs`: `72.31`
  - `% Lines`: `71.81`
