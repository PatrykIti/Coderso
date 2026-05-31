# TASK-331: Shared Stats KPI Split-Highlight Secondary Grid Truthfulness

# FileName: TASK-331_Shared_Stats_KPI_Split_Highlight_Secondary_Grid_Truthfulness.md

**Priority:** High
**Category:** Shared Widgets + Stats KPI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-06-01, TASK-287
**Status:** Done (2026-05-23)

---

## Overview

Reopen the shared Stats KPI split-highlight truthfulness residual that still
exists on the current branch: the secondary metric grid remains hardcoded to
`sm:grid-cols-2`, so odd secondary counts still render an imbalanced layout even
though `TASK-256-06-01` is already closed.

This task owns the shared renderer fix so TASK-287 can keep report ownership
honest instead of patching the residual locally inside a widget-only family.

## Scope Boundary

In scope:

- make split-highlight secondary metric layout truthful for current secondary
  counts instead of hardcoding `sm:grid-cols-2`;
- keep existing `cards` and `inline` behavior unchanged;
- add focused renderer/runtime tests for odd and even secondary metric counts;
- update Stats KPI report/task ownership docs to route this residual to
  `TASK-331` instead of the already-closed `TASK-256-06-01`.

Out of scope:

- new product-facing column controls or advanced layout settings for Stats KPI;
- TASK-287-owned Wizard, links, typography, or editor IA work;
- any cross-widget layout abstraction beyond the current Stats KPI renderer.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:73,154-163,242,284-298` - W11/R6
  still describe the imbalanced split-highlight secondary grid.
- `_docs/_TASKS/TASK-287_Stats_KPI_Widget_Playwright_Product_Followups.md` - the
  current drift audit moves W11/R6 to a dedicated shared owner so TASK-287 can
  remain widget-local.
- `core/widgets/core/statsKpi.tsx:441-446` - split-highlight secondary metrics
  still render through a hardcoded `grid-cols-1 sm:grid-cols-2` path.
- `tests/vitest/widgets/statsKpi.test.tsx` and
  `tests/vitest/widgets/renderer.test.tsx` - current coverage does not assert a
  truthful secondary-grid class for odd secondary counts.

## Sub-Tasks

- [ ] Define the truthful split-highlight secondary-grid contract for the
  current metric-count shapes supported by Stats KPI.
- [ ] Update `statsKpi.tsx` to compute the secondary-grid classes from the
  current secondary metric count instead of hardcoding `sm:grid-cols-2`.
- [ ] Add focused widget/renderer tests for odd and even secondary metric
  counts.
- [ ] Update Stats KPI report/task ownership docs to route this residual to
  `TASK-331`.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/statsKpi.tsx` | Compute split-highlight secondary-grid classes truthfully from the current secondary metric count. |
| `tests/vitest/widgets/statsKpi.test.tsx` | Add focused coverage for odd/even split-highlight secondary metric counts. |
| `tests/vitest/widgets/renderer.test.tsx` | Add shared renderer markers/assertions if the runtime class contract changes. |
| `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` | Route W11/R6 to `TASK-331` instead of the already-closed shared owner. |
| `_docs/_TASKS/TASK-287_Stats_KPI_Widget_Playwright_Product_Followups.md` | Keep the shared-exclusion matrix truthful after the reopened residual split. |
| `_docs/_TASKS/README.md` | Add the new shared task row and update statistics. |

## Implementation Pseudocode

```tsx
function getStatsKpiSplitSecondaryGridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2";
}
```

Error handling:

- Keep `cards` and `inline` layout classes unchanged.
- Do not invent a new persisted style field just to hide the residual.
- If the truthful layout requires new runtime markers, keep them deterministic
  and testable without screenshot evidence.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless the task deliberately adds a new
  persisted field, which is not expected.
- Anti-abuse: no raw HTML, scripts, or unsafe user-authored CSS entry.
- Secret handling: no secrets in widget output, tests, or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md`.
- Update `_docs/_TASKS/TASK-287_Stats_KPI_Widget_Playwright_Product_Followups.md`.
- Update `_docs/_TASKS/README.md`.

## Acceptance Criteria

- Split-highlight secondary metrics no longer rely on a hardcoded
  `sm:grid-cols-2` path for all counts.
- Focused tests prove the truthful secondary-grid contract for odd and even
  secondary metric counts.
- Stats KPI planning/report docs route W11/R6 to `TASK-331` rather than the
  already-closed `TASK-256-06-01`.
