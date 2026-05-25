# 954 - Spacer editor drift cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Converted `spacer` Advanced from hidden editable height controls and raw JSON
  payload diagnostics to read-only runtime spacing and support summaries.
- Added truthful Wizard/Visual control ownership metadata for Spacer rhythm,
  mode, and editor-guide controls so strict Playwright smoke can detect real
  duplicate ownership.
- Reworked Spacer height authoring copy to use friendly rhythm labels and
  saved-custom compatibility state instead of beginner-facing CSS length/token
  examples.
- Replaced raw spacing values in preset cards, breakpoint help, and editor
  preview guide labels with product-facing rhythm and device-preview wording.

### QA

- Added focused Vitest coverage for Spacer mode ownership metadata, read-only
  Advanced summaries, and hidden raw-payload removal.
- Included the Divider editor wave regression suite because this slice touches
  shared token/preset field copy used by both Spacer and Divider.
- Refreshed strict Spacer Playwright evidence for TASK-336-19 with zero admin,
  public, fixture, or metadata failures.
- Validated with focused Vitest, Playwright smoke helper tests, `git diff --check`,
  Playwright JSON validation, `bun --cwd core lint`, `bun --cwd core lint:types`,
  and `bun run gates:coderso`.

### Docs

- Updated Spacer widget docs, the historical Spacer Playwright report,
  TASK-336-14 supersession notes, TASK-336-19 status notes, and the shared
  widget contract table.
