# 955 - Divider editor drift cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Narrowed `divider` Wizard to a read-only separator-style summary while Visual
  owns daily label, line, width, color, visibility, and spacing
  controls.
- Converted Divider Advanced from hidden writable editor groups and raw JSON
  payload diagnostics to read-only runtime divider and support summaries.
- Reworked Divider width, spacing, thickness, and opacity controls to show
  friendly labels or saved-custom compatibility state instead of raw CSS/token
  values in normal authoring.

### QA

- Added focused Vitest coverage for truthful Divider ownership metadata,
  Advanced read-only summaries, hidden mutator removal, and raw payload removal.
- Refreshed strict Divider Playwright evidence for TASK-336-19.
- Verified with `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/widgets/divider.test.tsx tests/vitest/widgets/editorContract.test.ts`,
  `bun test tests/unit/playwright-widget-contract-smoke.test.ts`,
  `git diff --check`,
  `jq empty _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-divider-advanced-readonly-2026-05-25.json`,
  `bun --cwd core lint`, `bun --cwd core lint:types`, and
  `bun run gates:coderso`.

### Docs

- Updated Divider widget docs, the historical Divider Playwright report,
  TASK-336-14 supersession notes, TASK-336-19 status notes, and the shared
  widget contract table.
