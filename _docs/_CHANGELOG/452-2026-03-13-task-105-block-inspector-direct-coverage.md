# 452. TASK-105 Block Inspector Direct Coverage

**Date:** 2026-03-13  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Added direct `happy-dom` coverage for `BlockInspector`, including per-block controls for heading, toc, list, image, callout, separator, button, embed, code, paragraph highlight, advanced anchor/class/mobile visibility, and fixed-layout guidance states.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/post-block-inspector-wave.test.tsx`
  - `tests/vitest/ui-integration/post-block-inspector.test.tsx`
  - `tests/vitest/ui/post-editor-block-inspector-ownership.test.tsx`
- Targeted coverage re-check showed:
  - `BlockInspector.tsx` -> `98.50%` lines / `93.44%` branches
