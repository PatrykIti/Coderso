# TASK-287-03: Stats KPI Wizard Variant Cards and Guidance

# FileName: TASK-287-03_Stats_KPI_Wizard_Variant_Cards_and_Guidance.md

**Priority:** High
**Category:** Widgets + Stats KPI + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-06-01, TASK-287, TASK-287-01
**Status:** To Do

---

## Overview

Polish the Stats KPI Wizard after TASK-256-06-01 adds the baseline missing
header and metric content fields. This leaf owns visual variant cards, header
clear affordance, icon guidance, spacing help, and TASK-287-01 product-field
guidance that is safe to show in Wizard after the expanded data model lands.

This leaf must build on TASK-256-01 editor update semantics. It must not
reintroduce duplicate generic variant selectors, the shared update race fixed by
TASK-256, or the baseline Wizard content-field work owned by TASK-256-06-01.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:41-45` - current Wizard/Visual/
  Advanced mode ownership.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:57,115-124,254` - C3, Wizard
  lacks label/description/icon/header content; TASK-256-06-01 owns the baseline
  content-field additions, so this leaf treats them as a prerequisite.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:80,117-118` - U1, Wizard uses a
  dropdown instead of variant cards.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:83-84` - U4 and U5 for header
  clear and icon input guidance.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:88` - U9 for spacing option
  guidance.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:317-321` - suggested Wizard
  expansion; TASK-287 only owns the Stats KPI-local guidance and variant-card
  polish after shared baseline fields land.
- `_docs/_TASKS/TASK-256-06-01_Feature_Grid_and_Stats_KPI_Truthful_Controls.md:25-29,68,72`
  - current TASK-256 owner for missing Stats KPI Wizard header and metric
  content fields.
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:101-133,315-377` - existing
  variant card component and Wizard owner.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Reuse `VariantCards` in Wizard, add clear-header action around TASK-256-owned header fields, add icon guidance near TASK-256-owned icon fields, and add spacing help text/tooltips without global editor changes. Do not add baseline Wizard content fields here. |
| `core/widgets/core/statsKpi.tsx` | Update normalizer only if header clear needs a pure helper export. Do not add baseline Wizard content fields here. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Cover Wizard variant-card selection, header clear, icon guidance, count synchronization, and spacing guidance presence after baseline fields exist. |
| `tests/vitest/widgets/statsKpi.test.tsx` | Update only if helper exports or normalization behavior changes. |
| `_docs/_WIDGETS/STATS_KPI.md` | Document beginner-safe variant onboarding and guidance after TASK-256 baseline fields land. |
| `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` | Mark U1/U4/U5/U9 fixed or record deferral evidence; leave C3 baseline status to TASK-256-06-01/TASK-256-08. |

## Implementation Pseudocode

```tsx
function StatsKpiWizardEditor(props: WidgetEditorProps<StatsKpiData>) {
  const normalized = normalizeStatsKpiData(props.value);
  const items = normalizeStatsKpiItems(normalized.items);

  return (
    <>
      <VariantCards
        value={resolveStatsKpiVariant(props.variant)}
        onChange={props.onVariantChange}
      />
      <WizardHeaderGuidance
        header={normalized.header}
        onClear={() => clearStatsKpiHeader(props.value, props.onChange)}
      />
      <WizardSpacingHelp spacing={normalized.style?.spacing} />
      <WizardIconGuidance items={items} />
    </>
  );
}
```

Data flow:

- Wizard keeps using `normalizeStatsKpiItems(current.items, count)` for count
  changes so it remains synchronized with Visual and runtime.
- Variant changes flow through the existing `onVariantChange` path and any
  TASK-256-01 atomic update helper available at that point.
- Header clear works only after TASK-256-06-01 exposes the baseline header
  fields, and patches both `header.title` and `header.description` to empty
  strings or the normalized omitted state chosen by the existing owner.
- Wizard may show TASK-287-01 product-field guidance after those fields exist,
  but it must not create Wizard-only payloads or duplicate TASK-256-owned field
  controls.

Error handling:

- Do not hide existing metrics when the count changes except through the
  existing normalizer/count behavior.
- Icon helper copy must be guidance only. Do not accept raw SVG/HTML or class
  strings unless a later bounded icon picker task implements and tests it.
- Header clear must not delete unrelated style/item fields.
- If TASK-256-06-01 has not landed the baseline header/metric fields, keep this
  leaf blocked or limit implementation to variant cards and guidance around
  existing fields.
- If TASK-256 changes the editor update API, adapt the Wizard to that API rather
  than keeping parallel patch behavior.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: no new persisted field is required by this leaf.
  Any TASK-287-01 fields surfaced as guidance or controls must use the owner
  schema after they land.
- Anti-abuse: Wizard text/icon fields render as escaped text only and must not
  introduce raw HTML, script, inline handlers, or class-name entry.
- Secret handling: no secrets or privileged settings in Wizard state, browser
  cache, diagnostics, Playwright evidence, or changelog notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx` if normalizer
  helpers change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` with U1/U4/U5/U9 evidence or
  deferral notes. C3 baseline content fields remain TASK-256-owned.
- `_docs/_TASKS/TASK-287-03_Stats_KPI_Wizard_Variant_Cards_and_Guidance.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Wizard variant selection uses the same visual variant-card model as Visual or
  an equally explicit bounded control approved by TASK-256-01.
- Header clear, icon guidance, and spacing help are present and covered by tests
  after TASK-256 baseline fields exist.
- Wizard data writes the canonical Stats KPI schema, not a parallel onboarding
  payload.
- C3 baseline missing content fields remain owned by TASK-256-06-01 and are not
  silently reimplemented in TASK-287.
