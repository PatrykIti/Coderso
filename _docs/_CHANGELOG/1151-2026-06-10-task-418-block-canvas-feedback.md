# 1151 - TASK-418 block canvas feedback

**Date:** 2026-06-10
**Version:** Unreleased
**Tasks:** TASK-418-04-L03

## Key Changes

- Added shared Pages v2 block render props for width, alignment, text color,
  background, opacity, radius, border, shadow, padding, and margin.
- Updated PageEditor block canvas chrome to consume shared block render props so
  selected-block style controls visibly affect the canvas.
- Made public/shared runtime omit hidden block frames by default, while admin
  canvas opts into selectable hidden block ghosts.
- Added UI coverage for selected block style feedback, hidden block ghost
  selection, and empty-section insertion.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx` (35 tests)
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts` (10 tests)
- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx` (54 tests)
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- Drift fix rerun: `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx` (36 tests)

## Audit Notes

- Pre-implementation audit `019eaeff-08ac-7dd0-aee6-533d76f99db1` found real
  medium contract drift for hidden-block public behavior. The L03 contract now
  states that public/shared runtime omits hidden block frames and admin preview
  alone opts into hidden block ghosts.
- Fresh read-only audit `019eaf03-118e-71c3-95cb-e7ff246b2ce3` reported no
  High or Medium drift after that correction and before source edits.
- Post-implementation drift audit `019eaf10-d801-7263-994d-d1c496a9e10a`
  found one low placeholder-test gap. Renderer tests now assert empty
  image/video placeholders and safe runtime-pending embed placeholders.
