# 953 - Accordion editor drift cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Cleaned the `accordion` editor contract so Visual no longer rewrites
  Wizard-owned `options.defaultOpenIds` while changing open mode.
- Replaced visible raw CSS/token color value fields with swatch-only Visual
  controls that preserve saved custom colors as replace/clear state.
- Converted Accordion Advanced from raw JSON payload and technical DOM id
  suffix diagnostics to behavior, saved item, and saved display summaries.

### QA

- Added focused Vitest coverage for swatch-only color authoring, all-collapsed
  setup preservation, and Advanced read-only human summaries.
- Refreshed Accordion Playwright evidence for the TASK-336-19 cleanup.

### Docs

- Updated Accordion widget docs, TASK-336 task synchronization notes, and the
  shared widget contract documentation.
