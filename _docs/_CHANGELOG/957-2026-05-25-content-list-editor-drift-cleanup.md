# 957 - Content List editor drift cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Cleaned the `content-list` Wizard / Visual / Advanced contract after the
  TASK-336-19 re-audit.
- Kept Wizard focused on one-time source setup while Visual owns daily variant,
  layout, filters, section context, pagination, presentation fields, swatches,
  and empty-state copy.
- Replaced the Visual `View all` raw path input with the shared page-first
  destination picker and beginner-facing resolved-list fallback copy.
- Converted Advanced from raw JSON/runtime payload output to read-only human
  summaries for source, style, item counts, pagination, runtime health, and
  support ownership.
- Tightened `WidgetControlRow` metadata so helper search fields are preview-only
  and persisted selects/pickers own the correct paths.

### QA

- Updated Content List editor-wave coverage for page-first destinations,
  metadata truthfulness, Advanced read-only summaries, no raw JSON leaks, no raw
  internal IDs, and helper search path separation.
- Refreshed strict Content List Playwright evidence for TASK-336-19 with zero
  admin failures, public failures, fixture gaps, or metadata gaps.
- Added a focused Playwright probe for post-setup `Run setup again` Wizard and
  conditional Visual `View all page` controls so the browser evidence covers
  paths that the standard smoke does not reveal by default.
- Verified with `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/widgets/listingRuntimeScript.test.ts`,
  `bun test tests/unit/widgets/contentList.test.tsx`, `git diff --check`,
  Playwright strict smoke, and the focused Wizard/View-All Playwright probe.
  Full lint/type/gate validation is recorded in the final task summary.

### Docs

- Updated Content List widget docs, the historical Content List Playwright
  report, TASK-336-19 status notes, the shared widget contract notes, and the
  Playwright targeted-rerun index.
