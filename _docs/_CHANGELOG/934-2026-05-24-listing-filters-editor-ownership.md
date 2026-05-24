# 934 - Listing Filters editor ownership

Date: 2026-05-24
Version: Unreleased
Tasks: TASK-336-06

## Key Changes

### Widgets

- Split `listing-filters` so Wizard owns listing query and facet setup, Visual
  owns daily copy/layout/surface plus facet presentation, and Advanced is
  read-only diagnostics.
- Added the `listing-filters` v2 `editorContract` and marked the widget Visual
  editor as the owner of variant selection.

### QA

- Added focused Vitest coverage for mode ownership metadata, duplicate writable
  path prevention, and strict widget contract validation.
- Verified targeted Playwright smoke for `listing-filters` with zero admin,
  metadata, and public failures.

### Docs

- Updated Listing Filters widget docs, TASK-336-06 closure notes, task board
  counts, and the Playwright re-audit status.
