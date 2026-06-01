# 1062 - Feature Grid widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-372, TASK-372-01

## Key Changes

- Replaced Feature Grid Advanced's local color-summary wording with the shared
  `describeSharedColorControlState()` contract.
- Fixed `style.surfaceColor`, `style.borderColor`, and
  `style.sectionBackground` summaries so `var(...)` and `color-mix(...)` theme
  token states are not described as saved custom colors.
- Added a focused Advanced regression for the token summary contract.
- Updated Feature Grid docs, the 31-05 report, task board, and task closure
  notes.

## Validation

- Focused Advanced regression failed before the fix: all token values rendered
  as `Saved custom color`.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/feature-grid-editor-wave.test.tsx -t "describes theme token colors"`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/feature-grid-editor-wave.test.tsx tests/vitest/widgets/featureGrid.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `timeout 180s claude -p --dangerously-skip-permissions --max-budget-usd 0.6 "Review the current staged TASK-372 Feature Grid diff only..."` - no blockers
