# TASK-287-02: Stats KPI Section Surface Layout and Icon Styling

# FileName: TASK-287-02_Stats_KPI_Section_Surface_Layout_and_Icon_Styling.md

**Priority:** Medium
**Category:** Widgets + Stats KPI + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-256-06-01, TASK-287, TASK-287-01
**Status:** To Do

---

## Overview

Add Stats KPI-owned section surface/layout controls and icon presentation
controls: inner section background, max-width, padding, sparse-section
min-height/density behavior, icon size, icon surface, icon border, and optional
divider intensity after TASK-256 makes divider behavior truthful.

This leaf must not replace global block wrapper controls or page-shell layout.
It only owns the inner Stats KPI `<section>` and per-metric icon presentation.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:66-69` - W4, W5, W6, W7 for
  section background, max-width, padding, and icon styling.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:100-101` - R7/R8 for sparse
  min-height and divider opacity.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:185-188` - current Advanced block
  controls are wrapper-level and do not replace the hardcoded inner section
  padding.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:216-222,260` - mobile behavior is
  acceptable today, but section width/padding remain fixed.
- `core/widgets/core/statsKpi.tsx:38-56,299-360,383-463` - current spacing,
  alignment, card/icon, and section class owners.
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:527-619` - current mixed
  typography/surface/layout controls.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/statsKpi.tsx` | Add bounded flat style fields: `sectionBackground`, `maxWidth`, `padding`, `minHeight`, `iconSize`, `iconSurface`, `iconBorderColor`, and optional `dividerIntensity`. Map them through explicit class/style maps. |
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Add Visual controls for section surface/layout and icon styling, separated from text color controls. |
| `tests/vitest/widgets/statsKpi.test.tsx` | Cover section surface styles, max-width/padding/min-height class output, icon style output, and divider-intensity fallback if added. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Cover editor updates for section surface/layout and icon presentation controls. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Update if padding/min-height uses existing `none` token conventions. |
| `tests/unit/widgets/validator.test.ts` | Add schema accept/reject coverage for new bounded fields. |
| `_docs/_WIDGETS/STATS_KPI.md` | Document inner section layout and icon presentation controls. |
| `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` | Mark W4/W5/W6/W7/R7/R8 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
type StatsKpiMaxWidth = "sm" | "md" | "lg" | "xl" | "full";
type StatsKpiPadding = "none" | "sm" | "md" | "lg";
type StatsKpiIconSize = "sm" | "md" | "lg";
type StatsKpiMinHeight = "none" | "compact" | "default";

const sectionWidthClassMap: Record<StatsKpiMaxWidth, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

function resolveStatsKpiSectionStyle(style: StatsKpiStyle): CSSProperties | undefined {
  return compactStyle({
    backgroundColor: resolveClearableStyleValue(style.sectionBackground),
  });
}
```

Data flow:

- Visual editor writes section-level fields and icon fields as flat `style`
  properties. Do not introduce a nested `style.icon` object unless a separate
  schema migration task explicitly changes the Stats KPI style shape.
- Normalizer applies bounded enum defaults and omits cleared surface colors.
- `StatsKpiBlock` applies width/padding/min-height classes to the inner section,
  not to the page builder wrapper.
- `StatsKpiCard` applies icon size/surface/border fields only when an icon is
  present.

Error handling:

- Unknown enum values normalize to current defaults and are rejected by schema
  validation for persisted payloads.
- Cleared section/icon surface values are omitted, not serialized as empty
  strings or `transparent`.
- Mobile one-column behavior from the report must remain unchanged unless tests
  document a deliberate improvement.
- Divider intensity must not be added until TASK-256 divider behavior is
  truthful; otherwise defer it in TASK-287-06.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: every new layout/icon field must be schema-bound.
- Anti-abuse: layout/icon fields must not accept raw class names, arbitrary style
  objects, scripts, inline handlers, or remote assets.
- Secret handling: no secrets or privileged settings in widget JSON, DOM markers,
  diagnostics, Playwright evidence, or changelog notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  `none` tokens or clearable surface behavior changes.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` with W4/W5/W6/W7/R7/R8 evidence
  or deferral notes.
- `_docs/_TASKS/TASK-287-02_Stats_KPI_Section_Surface_Layout_and_Icon_Styling.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Stats KPI can configure its inner section width, padding, background, and
  sparse-section density without duplicating global page-builder wrapper
  controls.
- Metric icons can use bounded size/surface/border options with safe fallbacks.
- Cleared surface values do not force inline fallback styles.
- Existing saved Stats KPI payloads keep rendering with compatible defaults.
