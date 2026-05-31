# 960 - Product Table editor drift cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Cleaned the `product-table` Wizard / Visual / Advanced contract after the
  TASK-336-19 re-audit.
- Added widget-control path metadata to real Product Table Wizard and Visual
  controls so Playwright ownership checks no longer report false-empty writable
  paths.
- Wrapped Wizard and Visual preview status in explicit diagnostics sections.
- Replaced Advanced raw query JSON with human read-only source/runtime
  summaries for product limit, search scope, collection scope, status scope,
  sort order, visitor controls, and page size.
- Kept manual collection keys support-owned in setup instead of exposing a raw
  collection-ID fallback field.

### QA

- Updated Product Table editor-wave and widget contract coverage for writable
  path metadata, Wizard preview-section ownership, read-only Advanced summaries,
  and no raw query JSON.
- Added strict Product Table Playwright evidence with zero admin failures,
  public failures, fixture gaps, or metadata gaps.
- Added a focused Product Table `Run setup again` Wizard probe proving missing
  metadata `0`, raw technical inputs `0`, and source writable paths present.
- Verified with `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/widgets/productTable.test.tsx tests/vitest/widgets/editorContract.test.ts`.

### Docs

- Updated Product Table widget docs, TASK-336-19 status notes, the shared
  widget contract notes, historical Playwright report, and the Playwright
  targeted-rerun index.
