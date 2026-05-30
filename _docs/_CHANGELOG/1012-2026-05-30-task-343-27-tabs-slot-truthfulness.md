# 1012 - TASK-343-27 Tabs slot truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-27, TASK-343

## Key Changes

### Widgets / Runtime

- Made Tabs overflow handling explicit: legacy `triggerOverflow=scroll` is still
  accepted by schema, but normalizes to `wrap` through a named helper and is
  reported as legacy in Advanced.
- Made all six Tabs color fields clearable and preserved the active trigger
  border when only active background is cleared.

### Admin UI

- Changed Tabs Wizard count from a writable control to a read-only summary of
  Structure-owned rendered panel slots and saved starter labels.
- Added shared repeatable-slot removal confirmation in `BlockSettings`,
  including nested block impact in the prompt.

### QA / Docs

- Added renderer/editor/shared builder coverage for overflow normalization,
  slot-owned counts, repeatable-slot removal confirmation, and full color Clear
  behavior.
- Updated Tabs widget docs, the Tabs Playwright report status, and task board
  closure records.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/block-layout-shared-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/widget-template-editor.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-27
  drift review: no blockers)
