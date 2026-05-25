# 951 - Split Layout Editor Ownership

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets/Admin UI

- Split Layout Wizard now only seeds the one-time starter split.
- Visual owns daily layout controls with explicit ownership metadata for pane
  ratios, phone behavior, pane order, spacing, and content-height alignment.
- Advanced now renders read-only human layout summaries instead of
  developer-facing saved-data dumps, implementation labels, or editable
  controls.

### QA/Docs

- Added focused Vitest coverage for the new mode split and strict Playwright
  evidence for Visual/Advanced metadata plus public CSS smoke.
- Updated Split Layout docs, shared widget contract notes, task status, and
  legacy changelog wording to reflect the superseded support-details policy.
