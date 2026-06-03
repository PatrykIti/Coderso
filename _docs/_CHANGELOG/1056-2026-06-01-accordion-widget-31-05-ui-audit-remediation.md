# 1056 - Accordion widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-366, TASK-366-01, TASK-366-02, TASK-366-03

## Key Changes

- Resolved Accordion default-open identity drift by mapping custom item IDs and
  legacy positional slot IDs to the same normalized selection while keeping
  public DOM and slot markers stable on `item:<id>`.
- Sanitized Accordion surface, border, summary text, and description text
  colors before public inline style output, preserving bounded CSS colors,
  theme defaults, and safe legacy hyphenated tokens.
- Added Accordion-specific regression coverage for shared repeatable Structure
  metadata on `slots.item` add, row, move, and remove actions.
- Updated Accordion docs, the 31-05 Playwright report, task board, and task
  closure notes.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/ui/block-layout-shared-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `git diff --cached --check`
- Claude staged-diff review: no blockers.
