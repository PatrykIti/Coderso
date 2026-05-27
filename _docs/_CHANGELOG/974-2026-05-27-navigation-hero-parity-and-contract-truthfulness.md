# 974 - Navigation hero parity and contract truthfulness

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-02

## Key Changes

- Rebuilt the Navigation widget editor so its daily `Visual` mode now uses the
  same practical sectioning model as Hero instead of two broad buckets.
- Split Navigation into stable widget-owned sections for structure, brand,
  links, CTA, mobile behavior, colors/typography, and surface/runtime
  behavior, and synchronized the `editorContract` to those real UI sections.
- Switched Navigation daily colors to the same swatch-first editing shape used
  by Hero, removing the visible raw value inputs while preserving clear actions
  and saved custom-color state.
- Kept `Advanced` read-only with explicit runtime, layout-token, and behavior
  summary sections instead of a second editable design panel.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
- Claude Playwright review (snapshot-based, browser-only) returned `NO BLOCKERS`
