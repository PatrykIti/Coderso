# 1007 - TASK-343-21 shared block layout and visibility

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-21

## Key Changes

- Preserved `inherit` layout tokens in shared block controls and labelled their
  effective page section defaults in Visual and Advanced summaries.
- Passed page section defaults into block settings and editor live preview so
  inherited layout copy matches the canvas renderer.
- Aligned Device Visibility semantics: `visibility.devices: []` now hides public
  SSR output and is labelled as hidden on all devices in the editor.

## Validation

- `bun run test:vitest -- tests/vitest/ui/block-layout-shared-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-21
  drift review: no blockers in final compact pass)
