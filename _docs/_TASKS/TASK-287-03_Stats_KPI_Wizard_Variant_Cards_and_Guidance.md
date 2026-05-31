# TASK-287-03: Stats KPI Wizard Variant Cards and Guidance

# FileName: TASK-287-03_Stats_KPI_Wizard_Variant_Cards_and_Guidance.md

**Priority:** High
**Category:** Widgets + Stats KPI + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-287, TASK-287-01
**Status:** Done (2026-05-22)

---

## Overview

Complete and polish the Stats KPI Wizard on the current branch. This leaf
owns the missing baseline header and metric content fields (`header.title`,
`header.description`, item `label`, item `description`, item `icon`), visual
variant cards, header clear affordance, icon guidance, spacing help, and
TASK-287-01 product-field guidance that is safe to show in Wizard after the
expanded data model lands.

This leaf must build on TASK-256-01 editor update semantics. It must not
reintroduce duplicate generic variant selectors, the shared update race fixed by
TASK-256, or a parallel Wizard-only payload shape.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:41-45` - current Wizard/Visual/
  Advanced mode ownership.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:57,115-124,254` - C3, Wizard
  still lacks label/description/icon/header content on the current branch, so
  this leaf owns bringing Wizard to canonical Stats KPI content parity.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:80,117-118` - U1, Wizard uses a
  dropdown instead of variant cards.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:83-84` - U4 and U5 for header
  clear and icon input guidance.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:88` - U9 for spacing option
  guidance.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:317-321` - suggested Wizard
  expansion; TASK-287 only owns the Stats KPI-local guidance and variant-card
  polish after shared baseline fields land.
- `_docs/_TASKS/TASK-287_Stats_KPI_Widget_Playwright_Product_Followups.md` -
  current-branch drift audit moved missing Wizard content parity into
  `TASK-287-03` so the family remains executable after `TASK-256-06-01` closed.
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:101-133,315-377` - existing
  variant card component and Wizard owner.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Reuse `VariantCards` in Wizard, add the missing header + metric content fields, add a clear-header action, add icon guidance, and add spacing help text/tooltips without global editor changes. |
| `core/widgets/core/statsKpi.tsx` | Update normalizer only if Wizard header clear or content-field helpers need a pure export. Do not create Wizard-only schema branches. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Cover Wizard content parity, variant-card selection, header clear, icon guidance, count synchronization, and spacing guidance presence. |
| `tests/vitest/widgets/statsKpi.test.tsx` | Update only if helper exports or normalization behavior changes. |
| `_docs/_WIDGETS/STATS_KPI.md` | Document beginner-safe Wizard content parity, variant onboarding, and guidance. |
| `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` | Mark C3/U1/U4/U5/U9 fixed or record deferral evidence. |

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
      <WizardHeaderFields
        header={normalized.header}
        onChange={(patch) => updateStatsKpiHeader(props.value, props.onChange, patch)}
        onClear={() => clearStatsKpiHeader(props.value, props.onChange)}
      />
      <WizardMetricFields
        items={items}
        onItemPatch={(index, patch) => updateStatsKpiItem(props.value, props.onChange, index, patch)}
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
- Header clear patches both `header.title` and `header.description` through
  the same canonical header owner used by Visual.
- Wizard may show TASK-287-01 product-field guidance after those fields exist,
  but it must not create Wizard-only payloads or duplicate Advanced-only
  controls.

Error handling:

- Do not hide existing metrics when the count changes except through the
  existing normalizer/count behavior.
- Icon helper copy must be guidance only. Do not accept raw SVG/HTML or class
  strings unless a later bounded icon picker task implements and tests it.
- Header clear must not delete unrelated style/item fields.
- Wizard content edits must flow through the same header/item helpers as
  Visual so count sync and normalization stay deterministic.
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
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` with C3/U1/U4/U5/U9 evidence
  or deferral notes.
- `_docs/_TASKS/TASK-287-03_Stats_KPI_Wizard_Variant_Cards_and_Guidance.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Wizard exposes the canonical Stats KPI header + metric content fields and
  uses the same visual variant-card model as Visual or an equally explicit
  bounded control approved by TASK-256-01.
- Header clear, icon guidance, and spacing help are present and covered by
  tests.
- Wizard data writes the canonical Stats KPI schema, not a parallel onboarding
  payload.
- TASK-256 shared update semantics remain intact; this leaf only closes the
  current widget-local Wizard parity gap.
