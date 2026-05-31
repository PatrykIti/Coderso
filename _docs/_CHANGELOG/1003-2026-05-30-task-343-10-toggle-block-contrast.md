# 1003 - TASK-343-10 Toggle Block contrast

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-10

## Key Changes

- Restored Toggle Block active-trigger contrast by removing inline accent text
  color from the active trigger while preserving inactive accent text styling.
- Made `Accent contrast color` effective again for active trigger text and
  aligned the editor contrast advisory with the rendered active text/background
  pair.
- Dedupe pane utility classes so Contrast surface plus Strong border emits one
  `shadow-sm`, and documented the static editor preview boundary.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-10
  drift review: no blockers)
