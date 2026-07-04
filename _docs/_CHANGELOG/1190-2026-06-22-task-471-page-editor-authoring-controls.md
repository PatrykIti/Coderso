# 1190 - TASK-471 Page Editor Authoring Controls

**Date:** 2026-06-22
**Version:** Unreleased
**Tasks:** TASK-471, TASK-471-01, TASK-471-01-L01, TASK-471-02, TASK-471-02-L01, TASK-471-03, TASK-471-03-L01, TASK-471-04, TASK-471-04-L01, TASK-471-05, TASK-471-05-L01

## Key Changes

### Page V2 Authoring

- Added `2xs` and `xs` typography sizes to the Page V2 typography contract,
  theme token defaults, CSS variable emission, editor labels, and renderer tests.
- Fixed block-box self-alignment so `align:center/right` positions the block
  itself for text, media, button, badge, and other Page V2 block types instead of
  only aligning inner text.
- Added safe text color marks for heading, text, and quote blocks, with bounded
  mark counts, strict write validation, desktop inline swatch authoring, and
  shared renderer output via `data-page-text-mark="color"`.
- Added a native Page V2 `badge` block with strict enum/color/icon
  normalization, editor controls, token-backed sizing, and public/admin renderer
  parity. No Page Editor widget surface or widget pack contract was added.

### Docs And Board

- Updated `_docs/PAGE_MODEL.md`, `_docs/DESIGN_TOKENS.md`, and
  `_docs/SECURITY_SPEC.md` for the new Page V2 schema/render/security
  invariants.
- Closed the TASK-471 family and synchronized `_docs/_TASKS/README.md`.
- External Claude read-only audit was attempted before implementation, but the
  CLI calls timed out or returned no actionable output; local source/task drift
  review was used for closure evidence.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-responsive-css.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/services/page-inline-edit-contract.test.ts`
- `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/pages/page-block-render-defaults.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun run gates:coderso`
- `git diff --check`
- Live `coderso-dev-core-host` plus
  `playwright-cli -s=task471-authoring-smoke run-code --filename .tmp/task-471-authoring-smoke.js`
  smoke passed for admin editor render, published public runtime render,
  `2xs`/`xs` text, center/right block self-alignment, safe color marks, native
  badge props, and throwaway page cleanup.
