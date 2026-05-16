# TASK-256-06-01: Feature Grid and Stats KPI Truthful Controls

# FileName: TASK-256-06-01_Feature_Grid_and_Stats_KPI_Truthful_Controls.md

**Priority:** High
**Category:** Widgets + Marketing Content + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06
**Status:** To Do

---

## Overview

Repair truthful-control drift in `feature-grid` and `stats-kpi`. Both reports
show controls that are visible and persisted but not honored by the renderer, or
runtime output that is semantically incomplete.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:72-83,157-176` for columns
  control drift and variant/card-count desync.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:177-189,247-276,289-294` for
  CTA link security, image URL feedback, missing clear, and ARIA/performance.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:42-58,170-187` for divider
  controls without effect, fixed cards grid, and limited Wizard content.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:63-74,90-101,181-206` for
  value-size/layout/split-grid, section and
  article ARIA, emoji semantics, and heading hierarchy.
- `REPORT_STATS_KPI_WIDGET.md` is still marked `W toku`; this leaf may use the
  current report ranges for planning, but TASK-256-08 must refresh final
  admin/frontend evidence before closure.

## Scope Decision Matrix

| Finding | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| Feature Grid columns dropdown has no runtime effect | Fix or disable with explicit variant explanation | `FeatureGridEditors.tsx`, `featureGrid.tsx` | None |
| Feature Grid variant/card count desync | Fix through TASK-256-01 atomic variant+data update | `FeatureGridEditors.tsx` | None |
| Feature Grid external CTA missing rel | Fix through safe link renderer | `featureGrid.tsx`, `widgetSafeHref.test.ts` | None |
| Feature Grid image media picker, drag/drop, rich text | Future product scope unless needed for broken existing control | Widget editor future task | TASK-256-08 creates task if retained |
| Stats KPI divider toggle only affects inline | Hide/disable outside inline or make renderer honor it | `StatsKpiEditors.tsx`, `statsKpi.tsx` | None |
| Stats KPI cards grid holes | Fix deterministic grid class or expose a real columns option | `statsKpi.tsx` | None |
| Stats KPI value-size, split secondary grid, section/article ARIA, and emoji semantics | Fix ARIA here; fix grid truthfulness here; defer typography controls if they add new schema scope | `statsKpi.tsx`, `StatsKpiEditors.tsx` | TASK-256-08 records typography follow-up if not fixed |
| Stats KPI count-up/trend/per-item accent/CTA | Future product scope | Future task | TASK-256-08 records deferral |

## Sub-Tasks

- [ ] Align feature-grid variant, visible item count, and columns controls with
  renderer behavior.
- [ ] Add missing `borderColor` clear behavior for feature-grid.
- [ ] Keep blocked feature-grid CTA URLs visible as editor validation errors
  rather than silently disappearing.
- [ ] Add safe external-link attributes where feature-grid renders external CTA
  links.
- [ ] Make stats-kpi divider controls variant-aware and truthful.
- [ ] Fix stats-kpi cards grid classes for non-4 item counts or expose a real
  columns control.
- [ ] Add stats-kpi section/article/emoji accessibility semantics.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | 435-467, 619-684 | Variant/count sync, truthful columns control, image URL validation feedback, and `borderColor` clear. |
| `core/widgets/core/featureGrid.tsx` | 266-347, 410-418 | Deterministic columns behavior, safe CTA link output, image fallback/lazy/alt semantics. |
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | 315-624 | Wizard content additions required for truthful setup, divider variant gating, and clearer color/token controls. |
| `core/widgets/core/statsKpi.tsx` | 299-450 | Dynamic grid behavior, section/article labels, emoji `aria-hidden`, and divider semantics. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | existing suite | Add variant/count, columns, URL validation, and clear regressions. |
| `tests/vitest/widgets/featureGrid.test.tsx` | existing suite | Add columns/link/alt/lazy regressions. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | existing suite | Add divider variant and Wizard content regressions. |
| `tests/vitest/widgets/statsKpi.test.tsx` | existing suite | Add grid/ARIA/emoji regressions. |

## Implementation Pseudocode

```tsx
function handleFeatureGridVariantChange(nextVariant: FeatureGridVariantId) {
  const nextData = normalizeFeatureGridData({
    ...value,
    items: normalizeFeatureGridItems(value.items, visibleItemCountForVariant(nextVariant)),
    style: {
      ...value.style,
      columns: columnsForVariant(nextVariant),
    },
  });
  onVariantChange?.(nextVariant, nextData);
}

function shouldShowStatsDividerControl(variant: StatsKpiVariantId) {
  return variant === "inline";
}
```

Stats KPI runtime shape:

```tsx
function getStatsKpiCardsGridClass(count: number) {
  if (count <= 2) return "lg:grid-cols-2";
  if (count === 3) return "lg:grid-cols-3";
  if (count <= 6) return "lg:grid-cols-3";
  return "lg:grid-cols-4";
}
```

Error handling:

- Do not delete hidden feature-grid items silently. Preserve extras until the
  editor user explicitly normalizes to the active variant.
- Invalid CTA/image URLs show editor feedback and remain normalized safely at
  runtime.
- Stats KPI divider values saved on non-inline variants remain in data but are
  marked inactive in the editor.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update schema/validator tests if fields change.
- Anti-abuse: external CTA links must use existing safe-href normalization and
  safe `rel` behavior; no user-authored scripts.
- Secret handling: no secrets in widget payloads, DOM datasets, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when link
  semantics change.
- Run `tests/unit/widgets/validator.test.ts` and `tests/unit/widgets/registry.test.ts`
  if schemas/defaults change.
- Run `bun --cwd core lint` and `bun --cwd core lint:types`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md` and
  `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md`.
- Update `_docs/_WIDGETS/FEATURE_GRID.md` and `_docs/_WIDGETS/STATS_KPI.md`
  when behavior changes.
- Update `_docs/WIDGETS.md` only if shared truthful-control contracts change.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Feature Grid controls either affect runtime or are disabled with truthful
  variant context.
- Feature Grid card count and renderer output cannot diverge after variant
  changes.
- Stats KPI divider and cards grid behavior are truthful.
- Both widgets have accessibility and safe-link regressions covered.
