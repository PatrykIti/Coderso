# 1067 - Pricing Plans widget 31-05 UI audit contract copy

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-377, TASK-377-01

## Key Changes

- Renamed the Pricing Plans billing editor contract from `Billing toggle` to
  `Billing cycle display`.
- Updated Visual and Advanced admin copy so it describes the public read-only
  billing cycle status instead of promising a visitor-side toggle.
- Preserved persisted `billingToggle.*` keys and the existing static public SSR
  behavior for backward compatibility.
- Added UI and renderer/contract regression coverage for the static billing
  cycle display contract.
- Updated Pricing Plans docs, the 31-05 report, task board, and task closure
  notes.

## Validation

- Focused widget/UI regressions failed before the copy fix because admin output
  still contained `Billing toggle` / `Enable billing toggle`.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/pricingPlans.test.tsx -t "visual renders section-based IA|annual cycle"`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/pricing-plans-editor-wave.test.tsx -t "billing as a static cycle display"`
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-template-editor.test.tsx -t "pricing plans visual sections"`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Carver sidecar inspection: public renderer was already static; remaining
  drift was admin/docs copy and is covered by this change.
- Claude staged re-review after fixing the stale widget-template assertion:
  no blockers.
