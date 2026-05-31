# 841 - Widget editor single-column control stacking

**Date:** 2026-05-12
**Version:** Unreleased
**Tasks:** TASK-252

## Key Changes

### Editor readability

- Updated the shared admin widget editor styling so responsive multi-column
  control groups inside `Visual` and `Advanced` modes collapse to a single
  column.
- This keeps one option per line across widget editors while preserving the
  compact two-part layout used inside a single field, such as color picker +
  text input rows.

### Coverage

- Added a regression test that pins the shared admin stylesheet contract for
  `data-widget-editor-mode="visual"` and `data-widget-editor-mode="advanced"`.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest`
- `bunx vite build --config vite.config.ts`
