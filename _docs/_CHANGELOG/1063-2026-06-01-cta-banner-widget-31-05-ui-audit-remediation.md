# 1063 - CTA Banner widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-373, TASK-373-01

## Key Changes

- Added a CTA Banner Advanced `Background gradient` diagnostic so gradient-only
  backgrounds no longer look like theme-default background color state.
- Kept the diagnostic bounded to `Configured` / `Not configured` and avoided
  printing raw CSS gradient strings in the admin diagnostics panel.
- Preserved the existing runtime renderer path; `background.gradient` continues
  to render through the normalized CTA Banner background style contract.
- Added a focused Advanced regression for configured gradient diagnostics and
  updated the CTA Banner widget docs, Playwright report, and task board.

## Validation

- Focused Advanced regression failed before the fix: no `Background gradient`
  row was rendered while `background.gradient` was active.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/cta-banner-editor-wave.test.tsx -t "advanced keeps style diagnostics"`
- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/widgets/ctaBanner.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `timeout 180s claude -p --dangerously-skip-permissions --max-budget-usd 0.6 "Review the current staged TASK-373 CTA Banner diff only..."` - no blockers
