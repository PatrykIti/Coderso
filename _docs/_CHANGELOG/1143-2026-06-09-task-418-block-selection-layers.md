# 1143 - TASK-418 Block Selection Layers

**Date:** 2026-06-09
**Version:** Unreleased
**Tasks:** TASK-418-02-L02

## Key Changes

### Page Editor
- Added top-level block selection from the PageEditor canvas and Layers overlay.
- Updated the floating toolbar label to describe the selected block when a block
  is active.
- Routed existing typed content edits to the selected block, while preserving the
  section-only first-block fallback until registry-driven controls replace the
  panel.
- Updated assistant active page surface context to publish a valid
  `selectedBlockId` instead of always sending `null`.

## Validation

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
  - Passed: 10 tests.
- `bun --cwd core lint:types`
  - Passed.
- `bun --cwd core lint`
  - Passed.

## Notes

- Nested block paths and server-revalidated `selectedBlockPath` remain deferred
  to TASK-418-06-L02.
- Fresh read-only subagent confirmation
  `019eae49-d28f-7371-9164-4e1ad1e3e17a` reported no remaining L02 drift before
  implementation.
