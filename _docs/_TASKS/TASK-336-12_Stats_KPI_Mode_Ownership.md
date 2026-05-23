# TASK-336-12: Stats KPI Mode Ownership

# FileName: TASK-336-12_Stats_KPI_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Stats KPI + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03, TASK-287, TASK-331
**Status:** To Do

---

## Overview

Remove residual Stats KPI Visual/Advanced duplication while preserving the
recent Stats KPI product and split-highlight fixes.

Stats KPI is a P1 widget because visual metric controls can drift back into
Advanced after earlier follow-up work. This task makes Visual the single owner
for daily metric presentation and keeps Advanced focused on technical/read-only
diagnostics.

## Ownership Decision

- `Wizard` owns starter variant, metric seed, and initial header guidance.
- `Visual` owns metric values/copy, value typography, icons, metric links,
  layout, section surface, spacing, card styling, alignment, and display
  presentation.
- `Advanced` owns read-only resolved metric summary, split-highlight diagnostics,
  technical ids, accessibility notes, and runtime/static-animation policy.

## Sub-Tasks

- [ ] Compare current Stats KPI editor with TASK-287 and TASK-331 closure.
- [ ] Add or update `stats-kpi` `editorContract` metadata.
- [ ] Remove duplicated Visual controls from Advanced.
- [ ] Add read-only summaries for resolved metrics/layout diagnostics.
- [ ] Preserve split-highlight secondary-grid behavior.
- [ ] Add tests that fail if Advanced regains metric/style write controls.
- [ ] Run existing Stats KPI suites before closure.
- [ ] Capture Playwright admin/public smoke evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/statsKpi.tsx` | Add/update `editorContract`; preserve runtime and split-highlight behavior. |
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Remove/downgrade duplicate Advanced controls and add metadata. |
| `tests/vitest/widgets/statsKpi.test.tsx` | Preserve runtime/product regression coverage. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Add mode ownership and Advanced read-only assertions. |
| `_docs/_WIDGETS/STATS_KPI.md` | Document final ownership. |

## Implementation Pseudocode

```tsx
function StatsKpiAdvancedEditor({ value }: WidgetEditorProps<StatsKpiData>) {
  const summary = resolveStatsKpiDiagnostics(value);
  return (
    <WidgetEditorModeRoot mode="advanced" widgetType="stats-kpi">
      <WidgetEditorSection mode="advanced" sectionId="stats-runtime" role="diagnostics" title="Runtime diagnostics">
        <ReadonlyWidgetSummaryRow label="Metric count" value={String(summary.metricCount)} />
        <ReadonlyWidgetSummaryRow label="Variant" value={summary.variantLabel} />
        <ReadonlyWidgetSummaryRow label="Animation policy" value="Static, no count-up animation" />
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
```

Data flow:

- Visual edits metric and presentation data.
- Advanced derives and displays summaries from normalized data.
- Runtime remains static and deterministic.

Error handling:

- Do not reintroduce count-up animation while editing Advanced diagnostics.
- Do not break existing safe metric-link behavior.
- Missing metric data should show editor guidance and safe public fallback.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve strict Stats KPI schema.
- Anti-abuse: no public write changes.
- Secret handling: no secrets in diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for `stats-kpi` admin modes and public fixture.

Regression-test shape:

- Advanced has no writable paths for metric copy/value/icon/style/layout.
- Visual remains the single daily owner.
- Split-highlight grid behavior remains covered.
- Runtime remains static.

## Documentation Updates Required

- Update Stats KPI widget docs.
- Update Playwright report rows for Stats KPI P1 closure.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Stats KPI Advanced is diagnostic/read-only for daily visual fields.
- Existing Stats KPI product fixes remain green.
- Tests prevent reintroduction of duplicated metric/style controls.

