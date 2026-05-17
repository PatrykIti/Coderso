# TASK-287-03: Stats KPI Wizard Content and Variant Onboarding

# FileName: TASK-287-03_Stats_KPI_Wizard_Content_and_Variant_Onboarding.md

**Priority:** High
**Category:** Widgets + Stats KPI + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-06-01, TASK-287, TASK-287-01
**Status:** To Do

---

## Overview

Expand the Stats KPI Wizard so beginner users can create a complete KPI section
without switching to Visual: visual variant cards, header title/description,
metric value/label/description/icon quick fields, header clear, icon guidance,
and spacing help.

This leaf must build on TASK-256-01 editor update semantics. It must not
reintroduce duplicate generic variant selectors or the shared update race fixed
by TASK-256.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:41-45` - current Wizard/Visual/
  Advanced mode ownership.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:57,115-124,254` - C3, Wizard
  lacks label/description/icon/header content.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:80,117-118` - U1, Wizard uses a
  dropdown instead of variant cards.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:83-84` - U4 and U5 for header
  clear and icon input guidance.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:88` - U9 for spacing option
  guidance.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:317-321` - suggested Wizard
  expansion.
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:101-133,315-377` - existing
  variant card component and Wizard owner.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Reuse `VariantCards` in Wizard, add header title/description quick fields, add metric label/description/icon quick fields, add clear-header action, add icon guidance, and add spacing help text/tooltips without global editor changes. |
| `core/widgets/core/statsKpi.tsx` | Update normalizer only if Wizard needs helper exports for safe header/item patching. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Cover Wizard variant-card selection, header editing/clearing, metric label/description/icon editing, count synchronization, and spacing guidance presence. |
| `tests/vitest/widgets/statsKpi.test.tsx` | Update only if helper exports or normalization behavior changes. |
| `_docs/_WIDGETS/STATS_KPI.md` | Document the expanded Wizard fields and beginner-safe variant onboarding. |
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
      <Input
        value={normalized.header?.title ?? ""}
        onChange={(event) => updateHeader(props.value, props.onChange, { title: event.target.value })}
      />
      {items.map((item, index) => (
        <MetricQuickFields
          item={item}
          onPatch={(patch) => updateItem(props.value, props.onChange, index, patch)}
        />
      ))}
    </>
  );
}
```

Data flow:

- Wizard keeps using `normalizeStatsKpiItems(current.items, count)` for count
  changes so it remains synchronized with Visual and runtime.
- Variant changes flow through the existing `onVariantChange` path and any
  TASK-256-01 atomic update helper available at that point.
- Header clear patches both `header.title` and `header.description` to empty
  strings or the normalized omitted state chosen by the existing owner.
- Metric quick fields write the same item fields consumed by Visual; there is no
  Wizard-only payload.

Error handling:

- Do not hide existing metrics when the count changes except through the
  existing normalizer/count behavior.
- Icon helper copy must be guidance only. Do not accept raw SVG/HTML or class
  strings unless a later bounded icon picker task implements and tests it.
- Header clear must not delete unrelated style/item fields.
- If TASK-256 changes the editor update API, adapt the Wizard to that API rather
  than keeping parallel patch behavior.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: no new persisted field is required unless
  TASK-287-01 fields are edited from Wizard; those fields must use the owner
  schema.
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
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` with C3/U1/U4/U5/U9 evidence or
  deferral notes.
- `_docs/_TASKS/TASK-287-03_Stats_KPI_Wizard_Content_and_Variant_Onboarding.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Wizard users can edit section header, metric value, label, description, and
  icon for all visible metrics.
- Wizard variant selection uses the same visual variant-card model as Visual or
  an equally explicit bounded control approved by TASK-256-01.
- Header clear and icon guidance are present and covered by tests.
- Wizard data writes the canonical Stats KPI schema, not a parallel onboarding
  payload.
