# 1053 - Grid Columns widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-363, TASK-363-01

## Key Changes

- Added stable action metadata to Grid Columns `Reapply asymmetric desktop
  widths` with path `columns.desktopSpan`.
- Added shared repeatable-slot metadata paths for non-Section Structure
  add/row actions, including Grid Columns `slots.column`.
- Preserved the Section region metadata contract on `regions` and
  `regions.<instanceId>.label`.
- Updated Grid Columns docs, the 31-05 Playwright report, task board, and task
  closure notes.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts --testTimeout=10000 tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
