# 982 - Rich Text Section contract truthfulness

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-10

## Key Changes

- Synchronized the Rich Text Section widget contract to the richer sectioned
  Wizard, Visual, and Advanced editor UI that now ships in the admin.
- Replaced the old mutating Advanced flow with Hero-style read-only output,
  sanitizer, saved-content, and contract diagnostics.
- Upgraded Wizard into a real layout seed and aligned main Rich Text control
  naming plus background transparent affordances with the Hero review pattern.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
- Claude Playwright snapshot review returned `NO BLOCKERS`
