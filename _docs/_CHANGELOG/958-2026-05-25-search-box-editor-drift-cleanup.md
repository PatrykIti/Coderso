# 958 - Search Box editor drift cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19, TASK-336-05

## Key Changes

### Widgets

- Cleaned the `search-box` Wizard / Visual / Advanced contract after the
  TASK-336-19 re-audit.
- Removed raw endpoint and query-parameter authoring from Wizard while keeping
  legacy custom provider/query values backward-compatible and support-owned.
- Replaced route-submit target typing with the shared page-first destination
  picker.
- Converted Visual search surface colors to swatch-only controls so authors do
  not type CSS tokens.
- Replaced the Advanced raw runtime payload textarea with read-only human
  source/routing/runtime summaries.

### QA

- Extended Search Box editor-wave coverage for beginner-safe global and
  route-submit setup, swatch-only Visual colors, read-only Advanced status, and
  legacy provider/query preservation without raw author fields.
- Refreshed strict Search Box Playwright evidence with zero admin failures,
  public failures, fixture gaps, or metadata gaps.
- Added a focused Playwright probe for post-setup `Run setup again` Wizard,
  Global setup, and Route-submit setup, proving no raw endpoint/query/CSS inputs
  and confirming the page-first destination picker.
- Verified the targeted Search Box lane with
  `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/widgets/searchBox.test.tsx tests/vitest/widgets/editorContract.test.ts`.

### Docs

- Updated Search Box widget docs, the historical TASK-336-05 ownership notes,
  TASK-336-19 status notes, shared widget contract notes, and the Playwright
  targeted-rerun index.
