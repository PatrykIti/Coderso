# 956 - Stack editor drift cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Narrowed `stack` Wizard to guidance-only setup framing and slot guidance
  while Visual owns preset choice plus daily responsive flow, spacing, alignment, distribution, and
  wrapping controls.
- Preset changes now normalize saved Stack data before persistence and disclose
  that the preset updates desktop, tablet, and mobile flow directions.
- Converted Stack Advanced from hidden writable responsive controls and raw
  payload diagnostics to read-only runtime stack and support summaries.
- Reworked Stack option copy to use beginner-facing labels instead of raw
  layout/token labels in normal authoring.

### QA

- Updated focused Vitest coverage for Wizard one-time ownership, Visual control
  metadata, Advanced read-only summaries, hidden mutator removal, and raw
  payload removal.
- Refreshed strict Stack Playwright evidence for TASK-336-19 after restarting
  `coderso-dev-core-host` twice so the admin bundle loaded the latest editor.
- Added a focused Playwright CLI `Run setup again` probe for the post-setup
  Stack fixture to verify Wizard mode directly.
- Verified with `bun run test:vitest -- tests/vitest/ui/stack-editor-wave.test.tsx tests/vitest/widgets/stack.test.tsx tests/vitest/widgets/editorContract.test.ts`,
  `bun test tests/unit/playwright-widget-contract-smoke.test.ts`,
  `git diff --check`,
  `jq empty _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-stack-advanced-readonly-2026-05-25.json`,
  `bun --cwd core lint`, `bun --cwd core lint:types`, and
  `bun run gates:coderso`.

### Docs

- Updated Stack widget docs, the historical Stack Playwright report, TASK-336-19
  status notes, and the shared widget contract table.
