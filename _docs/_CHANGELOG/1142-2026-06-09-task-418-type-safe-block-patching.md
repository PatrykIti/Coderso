# 1142 - TASK-418 Type-Safe Block Patching

**Date:** 2026-06-09
**Version:** Unreleased
**Tasks:** TASK-418-02-L01

## Key Changes

### Page Editor
- Replaced the generic first-block content patch with block-type-aware helpers
  that filter patches through the Pages owner `pageBlockPropKeys`.
- Kept desktop edits on base block props and moved tablet/mobile edits into
  sparse `block.responsive[device].props` overrides.
- Added button URL editing through the same allowlist-bound content panel path.
- Surfaced autosave failures with a bounded inline "Autosave paused" alert
  instead of silently swallowing background save failures.

## Validation

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
  - Passed: 8 tests.
- `bun --cwd core lint:types`
  - Passed.
- `bun --cwd core lint`
  - Passed.

## Notes

- This leaf intentionally keeps the current section-level selection model; full
  block selection/layers context is owned by TASK-418-02-L02.
