# 1173 - TASK-466 Page full-width section background bleed

**Date:** 2026-06-14
**Version:** Unreleased
**Tasks:** TASK-466
**Type:** Pages/Public Runtime/Admin Preview/QA/Docs

## Key Changes

### Pages Runtime

- Fixed Pages v2 `full-width` section variants so hero/CTA background colors
  fill the full section band instead of leaving white strips from the outer
  section wrapper gutter.
- Preserved the existing `px-4 py-6` outer wrapper gutter for non-full-width
  section variants.

### Documentation

- Documented the full-width section band contract in `_docs/PAGE_MODEL.md`.
- Added TASK-466 to the task board.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run lint`
- Real `coderso-dev-core-host` + `playwright-cli` smoke for a published
  full-width hero on desktop, tablet, and mobile. The smoke verified the
  section class is `w-full`, content starts at `left=0`, content ends at the
  viewport width, and the painted content top/bottom matches the outer section.
