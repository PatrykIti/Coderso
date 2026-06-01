# 1065 - Stats KPI widget 31-05 UI audit UX guard

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-375, TASK-375-01

## Key Changes

- Added Visual help copy explaining that per-metric `Metric accent color`
  overrides global `Value color` for that metric's value, trend, icon, and
  metric link.
- Added UI regression coverage for the help copy.
- Added renderer regression coverage for the existing accent-over-global color
  precedence.
- Updated Stats KPI docs, the 31-05 report, task board, and task closure notes.

## Validation

- Focused UI regression failed before the help copy: `Value color` lacked the
  accent precedence note.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/stats-kpi-editor-wave.test.tsx -t "explains metric accent precedence"`
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `timeout 240s claude -p --dangerously-skip-permissions --max-budget-usd 1.2 "Review the current staged TASK-375 Stats KPI diff only..."` - no blockers
