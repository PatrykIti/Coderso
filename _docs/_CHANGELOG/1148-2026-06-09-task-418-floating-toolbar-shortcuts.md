# 1148 - TASK-418 floating toolbar shortcuts

**Date:** 2026-06-09
**Version:** Unreleased
**Tasks:** TASK-418-03, TASK-418-03-L04

## Key Changes

- Added selection-aware floating toolbar labels, icon tooltips/ARIA labels, one
  active subpanel state, collapsible toolbar state, and local draggable offset
  state.
- Added guarded PageEditor shortcuts for `Ctrl/Cmd+K`, `Esc`, duplicate, and
  delete; shortcuts do not fire from input/select/textarea/contenteditable
  targets.
- Routed toolbar and keyboard delete actions through the shared destructive
  confirmation dialog before draft mutation.
- Added Command Palette keyboard navigation for filtered section/block results
  with arrow keys and Enter insertion.
- Closed TASK-418-03 after all four physical children completed.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx` (40 tests)
- `bun --cwd core lint:types`
- `bun --cwd core lint`
