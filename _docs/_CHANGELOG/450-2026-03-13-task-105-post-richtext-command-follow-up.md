# 450. TASK-105 Post Richtext Command Follow-up

**Date:** 2026-03-13  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Expanded `PostRichTextAdapter` coverage for native-inline command variants, collapsed and selected link flows, root block-format fallback, slash-menu close behavior, editor blur callback emission, and mouse-up image selection refresh.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for the adapter coverage suites under `tests/vitest/ui/*`, `tests/vitest/ui-dom/*`, and `tests/vitest/ui-integration/*`.
- Targeted coverage re-check showed:
  - `PostRichTextAdapter.tsx` -> `86.47%` lines / `66.66%` branches
