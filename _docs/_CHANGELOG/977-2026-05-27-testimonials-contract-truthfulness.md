# 977 - Testimonials contract truthfulness

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-05

## Key Changes

- Synchronized the Testimonials widget contract with the richer sectioned editor
  UI that was already shipping in Wizard, Visual, and Advanced.
- Added stable widget-owned section ids for every real Testimonials editor
  region instead of leaving the contract on the older `Header and quotes` /
  `Conversion and display` split.
- Kept the Testimonials product behavior unchanged while making the editor
  contract, DOM metadata, tests, and docs tell the truth about the actual UI.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx tests/vitest/widgets/testimonials.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
- Claude Playwright snapshot review returned `NO BLOCKERS`
