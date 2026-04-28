# 482. TASK-105 Editor Canvas Follow-Up and Coverage Wrapper Stabilization

**Date:** 2026-03-14  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor Canvas
- Expanded `PostEditorCanvas` coverage for delete and replace-image flows, mixed list preview rendering, and provider-specific embed URL fallbacks.
- Expanded `PostRichTextAdapter` coverage for loose-root list wrapping, native list fallback without selection, slash-close behavior when slash syntax disappears, and cancelled link-prompt no-op behavior.
- Expanded `PostRichTextToolbar` coverage for base-text-scale-only controls and mouse-down focus-guard behavior.

### QA / Tooling
- Stabilized `scripts/run-vitest-coverage.ts` by stopping the wrapper from double-cleaning `coverage/vitest` after the wrapper already recreates the reports directory and `.tmp` temp area.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/post-richtext-adapter-wave.test.tsx`
  - `tests/vitest/ui/post-editor-canvas-wave.test.tsx`
  - `tests/vitest/ui/post-richtext-toolbar-wave.test.tsx`
- Full `bun run test:coverage` passed with:
  - `458` files / `1691` tests
  - `% Stmts`: `69.01`
  - `% Branch`: `59.75`
  - `% Funcs`: `72.51`
  - `% Lines`: `72.19`
