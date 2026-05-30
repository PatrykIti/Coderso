# 1018 - TASK-343-20 Search Box truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-20, TASK-343

## Key Changes

### Widgets / Runtime

- Added stable section naming and `sr-only` input labels across Search Box
  placeholder, listing runtime, route-submit, and global branches.
- Made compact listing mode visibly meaningful with a narrower shell, tighter
  spacing, nowrap input row, and collapsed helper copy.
- Changed global source checkboxes to controlled preview state so source
  updates refresh live checked values without a reload.

### Admin UI

- Classified Search Box saved default color tokens as shared `Theme default`
  values while preserving explicit `No inline color` cleared states.

### QA / Docs

- Added Search Box renderer and UI regression coverage for accessibility,
  compact listing semantics, live source checkbox state, and default color
  labels.
- Updated Search Box widget docs, Playwright report notes, task board, and
  TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/searchBox.test.tsx tests/vitest/ui/search-box-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-20
  drift review: no blockers)
