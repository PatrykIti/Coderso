# 983 - Entry Teaser contract truthfulness

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-11

## Key Changes

- Synchronized the Entry Teaser widget contract to the richer sectioned Wizard,
  Visual, and Advanced editor UI that now ships in the admin.
- Added the Hero-style read-only Advanced banner and contract summary so the
  ownership split is explicit in-browser instead of only implied by the code.
- Tightened accessible naming for the main source/presentation fields used by
  the Entry Teaser editor review flow.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/widgets/entryTeaser.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/ui/link-destination-field.test.tsx`
- Claude Playwright snapshot review returned `NO BLOCKERS`
