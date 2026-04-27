# TASK-220-02-03: Analytics Memoization and KPI Derived State
# FileName: TASK-220-02-03_Analytics_Memoization_and_KPI_Derived_State.md

**Priority:** High
**Category:** Analytics + React Compiler
**Estimated Effort:** Medium
**Dependencies:** TASK-220-02
**Status:** To Do

---

## Overview

Clean up Analytics page findings, including both mount loader state and
`preserve-manual-memoization` failures around KPI derivation.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/analytics/AnalyticsPage.tsx | 64 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/analytics/AnalyticsPage.tsx | 67 | react-hooks/preserve-manual-memoization (manual memo dependencies cannot be preserved) | `const metrics = useMemo((): KpiCard[] => {` | Remove cheap memoization or depend on exact scalar values read by the memo callback. |
| core/admin/ui/analytics/AnalyticsPage.tsx | 67 | react-hooks/preserve-manual-memoization (manual memo dependencies cannot be preserved) | `const metrics = useMemo((): KpiCard[] => {` | Remove cheap memoization or depend on exact scalar values read by the memo callback. |
| core/admin/ui/analytics/AnalyticsPage.tsx | 67 | react-hooks/preserve-manual-memoization (manual memo dependencies cannot be preserved) | `const metrics = useMemo((): KpiCard[] => {` | Remove cheap memoization or depend on exact scalar values read by the memo callback. |

## Sub-Tasks

- [ ] Refactor the analytics mount refresh so synchronous loading/error state is
  not set from the effect body.
- [ ] Remove unnecessary `useMemo` around cheap KPI mapping or narrow
  dependencies to the scalar values read inside the memo.
- [ ] Preserve range selection, chart, KPI, and top-content behavior.

## Files to Change

- `core/admin/ui/analytics/AnalyticsPage.tsx`
- `core/admin/ui/analytics/AnalyticsCharts.tsx` only if prop contracts change.
- `core/admin/ui/analytics/KpiCards.tsx` only if prop contracts change.
- `core/admin/ui/analytics/TopContentTable.tsx` only if prop contracts change.
- Nearest existing analytics Vitest suites under `tests/vitest/ui/**` or add
  focused coverage if none exists.

## Security Contract

- Visibility: internal analytics admin UI.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: existing analytics read permission.
- CSRF: no writes.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse: avoid mount request amplification and keep range clamping in the
  existing client/route contract.
- Secret handling: analytics payloads must not expose privileged settings.

## Pseudocode

```ts
const metrics = overview
  ? buildAnalyticsMetrics(overview)
  : [];

// If memoization is still needed, depend on exact scalar reads instead of the
// broad object when React Compiler reports a mismatch.
```

## Testing Requirements

- KPI values and trend labels remain stable for current/previous inputs.
- Range changes still trigger one analytics refresh.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `AnalyticsPage.tsx` has no `set-state-in-effect` or
   `preserve-manual-memoization` findings.
2. KPI calculations remain deterministic.
3. No route/API contract changes are introduced.
