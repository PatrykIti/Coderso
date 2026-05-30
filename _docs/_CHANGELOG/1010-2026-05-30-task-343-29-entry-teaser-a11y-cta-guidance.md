# 1010 - TASK-343-29 Entry Teaser a11y and CTA guidance

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-29

## Key Changes

- Added accessible naming for public Entry Teaser sections through
  `aria-labelledby` when a section heading exists and `aria-label` when it does
  not.
- Added a shared Entry Teaser CTA render-state helper so runtime non-link
  output and Visual editor guidance use the same safe-link decision.
- Marked non-link CTA output explicitly and added editor guidance for missing
  auto detail routes and missing selected-page destinations.
- Verified Entry Teaser clear actions expose field-scoped accessible names,
  including shared color controls and CTA destination clears.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/ui/link-destination-field.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-29
  drift review: no blockers)
