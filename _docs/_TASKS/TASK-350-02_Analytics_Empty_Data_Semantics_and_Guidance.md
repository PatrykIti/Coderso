# TASK-350-02: Analytics Empty Data Semantics and Guidance
# FileName: TASK-350-02_Analytics_Empty_Data_Semantics_and_Guidance.md

**Priority:** Medium
**Category:** Analytics + Admin UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-350
**Status:** To Do

---

## Overview

Make Analytics empty data understandable. Claude found that empty data renders
as `0` and `0%`, which can mean "no data yet" or "no change". The page also
does not explain how users can generate meaningful analytics.

## Sub-Tasks

- Add explicit "no baseline" and "no data yet" state to KPI derivation.
- Render `-` or "No data yet" instead of `0%` when there is no previous/current
  baseline.
- Add concise empty-state guidance for Top Content and dashboard sections.
- Keep real zero values available when data exists and the value is actually
  zero.
- Ensure range changes do not flash misleading stale metrics during loading.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/analytics/AnalyticsPage.tsx` | Derive no-baseline metric state and pass it to KPI/table components. |
| `core/admin/ui/analytics/KpiCards.tsx` | Render no-data labels without fake trend arrows/percentages. |
| `core/admin/ui/analytics/AnalyticsCharts.tsx` | Add or preserve empty chart guidance without one-note filler copy. |
| `core/admin/ui/analytics/TopContentTable.tsx` | Add next-action empty copy that references publishing content or widening date range. |
| `core/admin/ui/analytics/TopContentDrawer.tsx` | Match drawer empty state to table semantics. |
| `tests/vitest/ui/analytics.test.tsx` | Cover no-baseline, populated, and range-loading states. |

## Implementation Pseudocode

```ts
function calcChange(input: {
  current: number;
  previous: number;
  totalKnownItems: number;
}): AnalyticsChange {
  if (input.totalKnownItems === 0) {
    return { kind: "no-workspace-data", label: "No data yet", trend: "neutral" };
  }
  if (input.current === 0 && input.previous === 0) {
    return { kind: "no-period-activity", label: "No activity in range", trend: "neutral" };
  }
  if (input.previous === 0) {
    return { kind: "new-data", label: "New", trend: "up" };
  }
  const delta = ((input.current - input.previous) / input.previous) * 100;
  return { kind: "change", label: `${Math.abs(Math.round(delta))}%`, trend: delta >= 0 ? "up" : "down" };
}

const emptyTopContentMessage =
  topRows.length === 0
    ? "No content activity yet. Publish content or widen the date range."
    : null;
```

Data flow:

- Service still returns counts.
- UI derives display state from `current`, `previous`, and workspace/content
  totals so an existing site with no period activity is not labeled as empty.
- Components render display state rather than recomputing ambiguous percentages.

Error handling:

- During range changes, keep the loading skeleton/message visible until the new
  overview and top content both settle.
- If overview fails but top content succeeds, show the error and avoid rendering
  stale KPI change labels as current.

Regression-test shape:

- Mock overview with zero current/previous/totals and assert `No data yet`.
- Mock totals > 0 with current = 0 and previous = 0 and assert
  `No activity in range`, not `No data yet`.
- Mock current > 0 and previous = 0 and assert a non-percentage new-data label.
- Mock populated top content and assert existing rows remain unchanged.
- Mock empty top content and assert next-action guidance appears in table and
  drawer.

## Security Contract

No route changes are required.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.
- Data handling: no additional analytics data is exposed.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/analytics.test.tsx`
- `bun test tests/unit/analytics/analyticsService.test.ts` only if service
  semantics change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Analytics report with empty-state resolution.
- Update user guide only if no-data labels become documented product copy.

## Acceptance Criteria

- Empty Analytics does not imply a stalled or measured 0% trend.
- Top Content empty states tell users what to do next.
- Populated Analytics remains compact and scannable.
