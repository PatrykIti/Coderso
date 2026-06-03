# 1054 - Split Layout widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-364, TASK-364-01, TASK-364-02

## Key Changes

- Updated Split Layout Visual ratio disclosure so stacked phone mode reports the
  effective `phone stacked` layout instead of presenting saved `ratio.mobile`
  as active.
- Kept saved phone ratios non-destructive and dormant while phones stack,
  including active metadata and badge handling for phone-only dormant values.
- Prevented desktop split card changes from creating a tablet override only
  because a dormant phone split exists.
- Removed inert Move up / Move down controls from fixed Split Layout Structure
  rows while preserving `slots.left` / `slots.right` row metadata.
- Updated Split Layout docs, the 31-05 Playwright report, task board, and task
  closure notes.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/splitLayout.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `git diff --cached --check`
- Claude staged-diff review: no blockers.
