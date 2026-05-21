# 887. TASK-321 shared clear undo feedback contract

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-321

## Key Changes

### Shared editor clear contract

- `ClearableInputField` now emits shared toast feedback with an `Undo` action
  when the helper can restore the exact prior value.
- The undo path restores the previous field value through the same shared input
  contract instead of forcing widget-local one-off clear recovery patterns.

### Tests and documentation

- Added focused shared proof in the `clearable-fields` Vitest suite and kept
  Posts Feed editor coverage green against the new shared helper behavior.
- Updated the widget spec, Posts Feed report matrix, task board, and TASK-321
  closure notes so the old shared clear/undo gap no longer routes to an open
  follow-up.

## Validation

- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run precommit`
