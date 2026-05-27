# 973 - Widget daily live preview surface

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-01

## Key Changes

- Removed the shared widget live preview row from the daily `Visual` and
  `Advanced` tabs in the page-builder settings shell.
- Kept the shared preview seam available for unfinished Wizard mode, so setup
  flows can still show the preview-backed renderer without restoring the old
  daily-tab clutter.
- Updated the focused `BlockSettings` Vitest coverage so daily tabs now assert
  the preview is absent after setup completion, while the Wizard preview and
  preview-error fallback remain covered.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/pageBuilder/blockSettings.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
