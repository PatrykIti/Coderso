# 1009 - TASK-343-31 MediaPicker dialog description

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-31

## Key Changes

- Added an accessible `DialogDescription` to the shared MediaPicker `Media
  library` dialog so Radix wires `aria-describedby` and stops warning about a
  missing description.
- Added a MediaPicker regression that opens the dialog from two representative
  widget-field contexts and asserts no missing-description warning is emitted.
- Updated Hero, Logo Cloud, and Footer audit reports to route the warning to the
  shared MediaPicker owner instead of widget-local fixes.

## Validation

- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-31
  drift review: no blockers)
