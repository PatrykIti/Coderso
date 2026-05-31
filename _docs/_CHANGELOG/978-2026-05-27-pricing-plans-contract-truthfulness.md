# 978 - Pricing Plans contract truthfulness

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-06

## Key Changes

- Synchronized the Pricing Plans widget contract to the richer sectioned editor
  UI already shipping in Visual and Advanced.
- Added stable widget-owned section ids for Billing toggle, plan/action
  editing, comparison-row behavior, layout notes, colors/emphasis, and the
  split Advanced diagnostics sections.
- Cleaned the remaining Pricing Plans color-row drift against the Hero authoring
  shape so default color states, clear behavior, and diagnostics now read
  consistently across widgets.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts`
- Claude Playwright snapshot review returned `NO BLOCKERS`
