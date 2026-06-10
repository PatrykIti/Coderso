# 1147 - TASK-418 responsive override reset UX

**Date:** 2026-06-09
**Version:** Unreleased
**Tasks:** TASK-418-03-L03

## Key Changes

- Added field-level `Base`, `Inherited`, and `Override` state to PageEditor
  section and block controls.
- Added per-field reset for tablet/mobile overrides without clearing unrelated
  sparse override values.
- Added responsive override badges to canvas and layer targets.
- Added block override reset pruning through `clearBlockResponsiveOverride`,
  including deletion of empty optional block `responsive` objects after final
  reset.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
