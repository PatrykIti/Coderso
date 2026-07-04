# 1176 - TASK-438/440/441/445 post-implementation Phase 3a drift

**Date:** 2026-06-16
**Version:** Unreleased
**Tasks:** TASK-438, TASK-438-01-L01, TASK-440, TASK-440-01-L01, TASK-441, TASK-441-01-L01, TASK-445-01-L01
**Type:** Pages Runtime/Admin UI/Docs/Drift Audit

## Key Changes

### Pages Runtime

- Wired `image.fit` into the public image renderer so `cover` and `contain`
  reach the rendered image object-fit class.
- Wired `video.title` into the public video renderer as `title` and
  `aria-label`, while preserving autoplay policy companions.
- Added the missing spacer runtime guard proving `size` reaches the inert
  spacer height.

### Page Editor Canvas

- Made rich text blocks panel-only for inline editing so the canvas cannot
  collapse stored HTML through the plain-text inline-edit sanitizer.
- Kept sanitized rich output visible on the canvas without wrapping block rich
  children in inline edit chrome.

### Docs And Tasks

- Updated Page Model and Phase 3a task contracts to record the post-implementation
  audit decisions for `image.fit`, `video.title`, and rich text panel-only
  inline-edit behavior.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`
- `git diff --check`
