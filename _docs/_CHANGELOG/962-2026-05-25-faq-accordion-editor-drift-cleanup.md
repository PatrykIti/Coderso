# 962 - FAQ Accordion editor drift cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Cleaned the `faq-accordion` Advanced contract after the TASK-336-19
  re-audit and user-reported Wizard re-entry concern.
- Confirmed `Run setup again` is the intentional one-time Wizard re-entry path;
  completed widgets expose daily `Visual` and `Advanced` tabs only.
- Replaced Advanced raw payload JSON with human read-only runtime, style, and
  saved-data summaries.
- Removed the mutating Advanced normalization/repair action so Advanced is
  read-only.

### QA

- Updated FAQ Accordion editor-wave and widget contract coverage for read-only
  Advanced summaries, no raw payload snapshot, no mutating Advanced controls,
  and no technical repair copy.
- Added strict FAQ Accordion Playwright evidence with zero admin failures,
  public failures, fixture gaps, or metadata gaps.
- Added a focused FAQ Accordion probe proving no Wizard tab/root before
  explicit `Run setup again`, Advanced writable paths `0`, Advanced raw
  controls `0`, and no raw payload/repair text.

### Docs

- Updated FAQ widget docs, TASK-336-19 status notes, shared widget contract
  notes, the historical Playwright report, and the Playwright targeted rerun
  index.
