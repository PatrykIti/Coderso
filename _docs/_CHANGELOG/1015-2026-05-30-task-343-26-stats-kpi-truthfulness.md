# 1015 - TASK-343-26 Stats KPI truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-26, TASK-343

## Key Changes

### Admin UI

- Made `Card background` and `Card border` read-only in the `inline` variant
  with visible copy explaining that Inline has no card boxes.
- Changed non-inline divider controls to show no checked inactive state and to
  explain that divider output only renders in Inline.
- Added inline feedback after `Normalize now` and `Reset to defaults` repair
  actions.
- Updated `Reset to defaults` to restore the default `cards` variant through
  the block/variant patch path as well as default widget data.

### Widgets / Runtime

- Added domain helpers for Stats KPI effective card-surface and divider state.
- Changed `data-stats-kpi-divider` to report effective rendered divider output,
  with `data-stats-kpi-divider-saved` preserving saved divider intent.

### QA / Docs

- Added Stats KPI regression coverage for inline card-surface gating, effective
  divider output, reset semantics, and normalize feedback.
- Updated Stats KPI widget docs and Playwright report notes, including the
  deferred `120++` fixture seed cleanup classification.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-26
  drift review: no blockers)
