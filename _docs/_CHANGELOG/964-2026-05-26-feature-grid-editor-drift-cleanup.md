# 964 - Feature Grid editor drift cleanup

Date: 2026-05-26
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Cleaned the `feature-grid` editor contract after helper-agent and Claude
  audits flagged remaining Wizard/Visual/Advanced drift.
- Kept Wizard setup-only and retargeted its temporary duplicate ownership
  allowances to the active TASK-336-19 cleanup policy.
- Kept Visual as the daily owner for card copy, media, actions, layout,
  spacing, and style with explicit `data-widget-control-path` metadata.
- Converted Visual color controls to swatch-only authoring with saved-custom
  replace/clear state instead of visible raw CSS/token text inputs.
- Replaced Advanced raw payload and normalization controls with read-only
  layout, content, presentation, and authoring-boundary summaries.

### QA

- Updated Feature Grid editor-wave, widget, and editor-contract coverage for
  swatch-only color controls, read-only Advanced summaries, metadata paths,
  and setup-only Wizard ownership.
- Added strict Feature Grid Playwright evidence with zero admin failures,
  public failures, fixture gaps, or metadata gaps.
- Added a focused Feature Grid probe proving no Wizard tab/root before explicit
  `Run setup again`, Visual raw color inputs `0`, Advanced writable paths `0`,
  Advanced raw controls `0`, and Wizard writes limited to starter setup paths.

### Docs

- Updated Feature Grid widget docs, the historical Feature Grid Playwright
  report, TASK-336-19 status notes, shared widget contract notes, and the
  changelog index.
