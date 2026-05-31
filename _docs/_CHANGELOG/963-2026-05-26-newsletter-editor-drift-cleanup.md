# 963 - Newsletter editor drift cleanup

Date: 2026-05-26
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Cleaned the `newsletter` editor contract after helper-agent and Claude
  audits flagged remaining Wizard/Visual/Advanced drift.
- Converted Wizard into a one-time read-only starter summary instead of a
  second copy/consent editing flow.
- Kept Visual as the daily owner for copy, Coderso Form selection, field
  mapping, visitor states, opt-in copy, swatch-only colors, spacing, and layout.
- Removed Advanced technical transport copy and the mutating `Normalize
  payload` action; Advanced now shows only read-only signup-readiness and
  authoring-boundary summaries.

### QA

- Updated Newsletter editor-wave, widget, and editor-contract coverage for
  one-time Wizard behavior, swatch-only Visual colors, metadata paths,
  read-only Advanced summaries, and legacy success-message mirroring.
- Added strict Newsletter Playwright evidence with zero admin failures, public
  failures, fixture gaps, or metadata gaps.
- Added a focused Newsletter probe proving no Wizard tab/root before explicit
  `Run setup again`, Visual raw style inputs `0`, Advanced writable paths `0`,
  Advanced raw controls `0`, Wizard writable paths `0`, and no raw technical
  text.

### Docs

- Updated Newsletter widget docs, TASK-336-19 status notes, shared widget
  contract notes, historical Playwright reports, and the changelog index.
