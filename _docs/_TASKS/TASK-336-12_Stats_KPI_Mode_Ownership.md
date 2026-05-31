# TASK-336-12: Stats KPI Mode Ownership

# FileName: TASK-336-12_Stats_KPI_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Stats KPI + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03, TASK-287, TASK-331
**Status:** Done (2026-05-24)

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

Evidence caveat: the re-audit finding is source-backed, not a completed
38-widget browser traversal. TASK-336-03 admin smoke must confirm this widget
before the task can move to Done.

## Current Advanced Writable Paths to Remove

| Current section | Current duplicated writable owner | Final owner |
|---|---|---|
| `stats.technical-spacing` | `style.alignment`, `style.spacing`, `style.valueColor`, `style.labelColor` | Visual |
| `stats.technical-spacing` | `style.cardBackground`, `style.cardBorderColor` | Visual |
| `stats.diagnostics` | normalize/default reset actions that mutate the whole widget | Advanced only if reframed as explicit repair action with confirmation |

## Sub-Tasks

- [x] Compare current Stats KPI editor with TASK-287 and TASK-331 closure.
- [x] Add or update `stats-kpi` `editorContract` metadata.
- [x] Remove duplicated Visual controls from Advanced.
- [x] Add read-only summaries for resolved metrics/layout diagnostics.
- [x] Preserve split-highlight secondary-grid behavior.
- [x] Add tests that fail if Advanced regains metric/style write controls.
- [x] Run existing Stats KPI suites before closure.
- [x] Capture Playwright admin/public smoke evidence.

## Status Notes

- 2026-05-24: Done. Stats KPI now has a v2 editor contract with explicit Wizard
  seed overlap allowances expiring at `TASK-336-16`; Visual owns daily metric,
  style, layout, and link editing; Advanced exposes read-only diagnostics,
  normalized payload, contract summary, and confirmed repair actions only.
  Targeted Playwright evidence:
  `_docs/PLAYWRIGHT/widget-contract-smoke-stats-kpi-2026-05-24.md`.

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
- Append a dated TASK-336-12 status note to the Playwright re-audit report or
  leave source evidence stable and link the final superseding report from
  TASK-336-17.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Stats KPI Advanced is diagnostic/read-only for daily visual fields.
- Existing Stats KPI product fixes remain green.
- Tests prevent reintroduction of duplicated metric/style controls.
