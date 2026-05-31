# 937 - Posts Feed editor ownership

Date: 2026-05-24
Version: Unreleased
Tasks: TASK-336-09

## Key Changes

### Widgets

- Split `posts-feed` so Wizard owns source/query setup, Visual owns daily
  display, layout/style, pagination, and empty-state presentation, and Advanced
  is read-only diagnostics.
- Added the `posts-feed` v2 `editorContract` with one writable owner per path.
- Kept one-time Wizard completion deferred to TASK-336-16; this change only
  cleans up mode ownership while Wizard is still visible as an editor tab.

### QA

- Added focused UI ownership coverage for Wizard/Visual/Advanced split and
  strict widget contract validation.
- Preserved Bun runtime coverage for Posts Feed normalization, rendering,
  resolver behavior, pagination, schema rejection, and public route mapping.

### Docs

- Updated Posts Feed widget docs, TASK-336-09 status, task board counts, and the
  Playwright re-audit status.
