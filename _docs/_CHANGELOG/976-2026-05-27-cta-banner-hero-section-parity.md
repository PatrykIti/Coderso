# 976 - CTA Banner hero section parity

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-04

## Key Changes

- Replaced CTA Banner's coarse `Copy and actions` / `Presentation` contract
  with truthful section owners that match the real editor UI.
- Aligned the CTA Banner daily color region to the Hero pattern by adding
  palette presets, theme-default state handling, transparent affordances,
  bounded border/radius controls, and contrast guidance.
- Kept Advanced read-only while splitting it into truthful diagnostics and
  support-summary sections instead of a single catch-all contract bucket.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
- Claude Playwright snapshot review returned `NO BLOCKERS`
