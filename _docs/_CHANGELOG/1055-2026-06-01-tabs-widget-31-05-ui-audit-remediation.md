# 1055 - Tabs widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-365, TASK-365-01, TASK-365-02

## Key Changes

- Sanitized all six Tabs clearable color fields through the shared bounded CSS
  color resolver before normalization and public inline style rendering.
- Preserved safe imported color values such as hex, `rgb/rgba`, `hsl/hsla`,
  `transparent`, `currentColor`, and `var(--color-*)` while dropping unsafe
  strings such as `javascript:`, `expression(`, `data:`, and style injection
  fragments.
- Added stable repeatable Structure metadata for Tabs panel row actions:
  `tabs.slot.panel:<id>.move-up`, `.move-down`, and `.remove` on path
  `slots.panel`.
- Updated Tabs docs, the 31-05 Playwright report, task board, and task closure
  notes.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/tabs.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/tabs.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/ui-integration/tabs-preview-activation.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/ui/block-layout-shared-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `git diff --cached --check`
- Claude staged-diff review: no blockers.
