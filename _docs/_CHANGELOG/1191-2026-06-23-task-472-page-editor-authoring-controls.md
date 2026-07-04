# 1191 - TASK-472 Page Editor V2 Authoring Controls Backlog

**Date:** 2026-06-23
**Version:** Unreleased
**Tasks:** TASK-472, TASK-472-01, TASK-472-01-L01, TASK-472-01-L02, TASK-472-02, TASK-472-02-L01, TASK-472-02-L02, TASK-472-03, TASK-472-03-L01, TASK-472-03-L02, TASK-472-04, TASK-472-04-L01, TASK-472-05, TASK-472-05-L01, TASK-472-06, TASK-472-06-L01

## Key Changes

### Page V2 Authoring

- Completed Page Editor V2 block style authoring with block margin controls,
  clamped `borderWidth`, `borderStyle` (`none`/`solid`/`dashed`/`dotted`),
  responsive CSS parity, and legacy border-color fallback.
- Added visual gradient composition into the existing `style.background` field
  and block `style.backgroundImage` media authoring with safe URL rendering.
- Added in-session undo/redo around the central draft mutation path and
  Page-only copy/paste fragments with Clipboard API plus session fallback,
  fresh ids, and full Page document re-normalization before insert.
- Extended Page authoring colors with allowlisted site token references
  (`var(--color-primary|secondary|accent|bg|surface|text|border)`) while
  preserving custom raw color input.
- Extended Page text marks from color-only to safe bold, italic, link,
  highlight, and color marks. Link marks use the Page-owned
  `normalizeAuthoringSafeHref`; Page Editor canvas code does not import
  widget-core helpers.

### Docs And Board

- Updated `_docs/PAGE_MODEL.md`, `_docs/DESIGN_TOKENS.md`,
  `_docs/SECURITY_SPEC.md`, and the Page Editor user guide for the finished
  sections/blocks-only authoring contract.
- Closed the TASK-472 family and synchronized `_docs/_TASKS/README.md`.
- External Claude/subagent consultation was not run because this implementation
  did not have explicit user approval for external-agent audit; closure used
  local source/task drift review plus required validation lanes.

## Validation

- Focused Page Vitest suite:
  `tests/vitest/pages/page-document-v2.test.ts`,
  `tests/vitest/pages/page-document-v2-block-roundtrip.test.ts`,
  `tests/vitest/pages/page-authoring-sanitizers.test.ts`,
  `tests/vitest/pages/page-renderer-v2.test.tsx`,
  `tests/vitest/pages/page-responsive-css.test.ts`,
  `tests/vitest/pages/page-editor-control-registry.test.ts`,
  `tests/vitest/pages/page-editor-control-ui-model.test.ts`,
  `tests/vitest/pages/page-editor-clipboard.test.ts`,
  `tests/vitest/pages/page-editor-xss-guards.test.tsx`,
  `tests/vitest/ui/page-editor-control-primitives.test.tsx`,
  `tests/vitest/ui/page-authoring-canvas.test.tsx`, and
  `tests/vitest/ui/page-editor-v2-flow.test.tsx`.
- `bun run test:vitest`
- `bun run test:bun`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun run gates:coderso`
- `git diff --check`
- Live `coderso-dev-core-host` plus terminal `playwright-cli` smoke passed on a
  throwaway page. The smoke covered admin setup after the Bun test reset, block
  spacing, border width/style, gradient, background image, token color, rich
  marks, undo/redo, copy/paste, admin reload, public runtime render at
  `http://coderso-a.localhost:3000`, and throwaway page cleanup.
