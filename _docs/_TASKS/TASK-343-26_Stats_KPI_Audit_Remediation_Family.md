# TASK-343-26: Stats KPI Audit Remediation Family

# FileName: TASK-343-26_Stats_KPI_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Stats KPI + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Close Stats KPI truthfulness drift where card surface controls are inert in the
`inline` variant, the divider toggle can appear checked/locked in variants that
never render dividers, reset defaults does not reset the variant, and normalize
actions have no visible feedback.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_STATS_KPI_WIDGET.md:222-240`
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx`
- `core/widgets/core/statsKpi.tsx`

## Sub-Tasks

- [x] Disable, hide, or explain Card background/border controls when `inline`
  ignores card styles.
- [x] Make the divider toggle state truthful in variants where divider output is
  impossible.
- [x] Decide whether `Reset to defaults` should also reset the block variant and
  implement/copy-test that decision.
- [x] Add visible feedback for `Normalize now`.
- [x] Record the report's `120++` fixture seed issue as deferred seed cleanup
  unless this family also owns fixture data changes.

## Implementation Notes

- Added domain-owned effective state helpers for card surfaces and dividers.
- In `inline`, Card background/Card border controls now render as read-only
  disabled controls with visible explanatory copy; icon surface controls remain
  active because they still affect Inline output.
- Divider output now reports effective render state through
  `data-stats-kpi-divider`, while saved intent is exposed separately via
  `data-stats-kpi-divider-saved`.
- `Reset to defaults` restores default data and resets the variant to `cards`
  through `onBlockPatch`/`onVariantChange`.
- Advanced repair actions now show inline `role="status"` feedback after
  Normalize and Reset.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Fix inert control gating, divider state, reset behavior, and normalize feedback. |
| `core/widgets/core/statsKpi.tsx` | Touch if data attributes or renderer diagnostics need effective-state alignment. |
| `tests/vitest/widgets/statsKpi.test.tsx` | Cover inline card surface semantics and divider output. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Cover control gating, reset, and normalize feedback. |

## Implementation Pseudocode

```ts
function resolveStatsKpiCardSurfaceState(variant: StatsKpiVariantId) {
  return variant === "inline" ? { writable: false, reason: "inline_has_no_cards" } : { writable: true };
}

function resetStatsKpiToDefaults(options: { resetVariant: boolean }) {
  return options.resetVariant ? { data: statsKpiDefaults, variant: "cards" } : { data: statsKpiDefaults };
}
```

If reset is meant to change the block variant, implement it through the existing
block patch/variant-change pathway; a data-only `onChange(statsKpiDefaults)`
cannot reset `variant`.

## Regression Test Shape

- Inert inline-only card controls cannot look writable without explanation.
- Divider toggle state matches actual divider output.
- Reset/normalize actions produce predictable feedback.

## Security Contract

No API routes are added. Existing safe-link handling for metric links remains
unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_STATS_KPI_WIDGET.md`.
- Update `_docs/_WIDGETS/STATS_KPI.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Stats KPI controls only appear active where their values affect render output.
- Reset and normalize actions have clear, tested semantics.
