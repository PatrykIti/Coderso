# TASK-287-01: Stats KPI Value Typography and Metric Semantics

# FileName: TASK-287-01_Stats_KPI_Value_Typography_and_Metric_Semantics.md

**Priority:** High
**Category:** Widgets + Stats KPI + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-256-04, TASK-256-06-01, TASK-287
**Status:** To Do

---

## Overview

Add Stats KPI-owned value semantics and text styling: value-size presets,
description color, prefix/suffix fields, per-metric accent overrides, and static
trend indicators.

This leaf must not reimplement TASK-256 baseline color-picker behavior,
runtime ARIA, or grid/divider truthfulness. It only expands the Stats KPI data
model and renderer/editor surface after the shared contract is stable.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:63-65` - W1, W2, W3 for value
  size, description color, and prefix/suffix.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:70-72` - W8 and W10 for
  per-metric accent and trend indicator.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:256-263` - priority summary for
  value-size, per-metric accent, prefix/suffix, and trend.
- `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md:6-8` - research decisions for
  prefix/suffix, icon, and trend fields.
- `core/widgets/core/statsKpi.tsx:10-32,67-110,112-155,299-360` - current item,
  style, schema, defaults, and card render owners.
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:527-559,624-703` - current
  text/color controls and Advanced token controls.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/statsKpi.tsx` | Extend `StatsKpiItem`, `StatsKpiData.style`, schema, defaults, normalizer, and renderer for `prefix`, `suffix`, `trend`, `valueSize`, `descriptionColor`, and optional item accent fields using bounded enums/token maps. |
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Add Visual controls for value-size, description color, prefix/suffix, trend, and metric accent. Keep raw token editing in Advanced only where TASK-256-01 allows it. |
| `tests/vitest/widgets/statsKpi.test.tsx` | Cover normalization, backward-compatible legacy values, value-size class output, description color style, prefix/suffix rendering, trend output, and item accent fallback. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Cover editing value-size, description color, prefix/suffix, trend fields, and per-metric accent controls. |
| `tests/vitest/widgets/renderer.test.tsx` | Update only if shared renderer assertions need the new Stats KPI output markers. |
| `tests/unit/widgets/validator.test.ts` | Add accept/reject coverage for new item/style fields and enum bounds. |
| `_docs/_WIDGETS/STATS_KPI.md` | Document value semantics, trend fields, and text/accent controls. |
| `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` | Mark W1/W2/W3/W8/W10 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
type StatsKpiValueSize = "sm" | "md" | "lg" | "xl";
type StatsKpiTrendDirection = "up" | "down" | "neutral";

type StatsKpiTrend = {
  label?: string;
  direction?: StatsKpiTrendDirection;
};

type StatsKpiItem = {
  value?: string;
  prefix?: string;
  suffix?: string;
  label?: string;
  description?: string;
  icon?: string;
  accentColor?: string;
  trend?: StatsKpiTrend;
};

function normalizeStatsKpiTrend(input: StatsKpiItem["trend"]): StatsKpiTrend | undefined {
  if (!input || typeof input !== "object") return undefined;
  const label = normalizeOptionalText(input.label);
  const direction = isTrendDirection(input.direction) ? input.direction : "neutral";
  return label ? { label, direction } : undefined;
}
```

Data flow:

- Visual editor patches `items[index].prefix`, `items[index].suffix`,
  `items[index].trend`, `items[index].accentColor`, and shared style fields such
  as `style.valueSize` and `style.descriptionColor`.
- `normalizeStatsKpiData` keeps legacy `items[].value` payloads working and only
  emits new optional fields when they contain meaningful data.
- `StatsKpiCard` composes `prefix + value + suffix` at render time without
  rewriting the stored `value` string.
- Renderer emits stable markers such as `data-stats-kpi-value-size` and
  `data-stats-kpi-trend-direction` so tests do not rely on screenshots.

Error handling:

- Unknown enum values normalize to deterministic defaults and fail persisted
  schema validation.
- Empty prefix/suffix/trend/accent fields are omitted from normalized output.
- Item accent values are text tokens only. Do not accept raw style objects,
  class names, scripts, or inline event handlers.
- Existing saved payloads without the new fields must render identically except
  for changes already required by TASK-256 accessibility/truthfulness fixes.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: new item and style fields must use
  `additionalProperties: false` and explicit enums where applicable.
- Anti-abuse: no raw HTML, script, inline handlers, user-authored class names,
  or arbitrary style maps. Trend labels render as escaped React text only.
- Secret handling: no secrets or privileged settings in item data, DOM markers,
  diagnostics, Playwright evidence, or changelog notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if shared
  renderer output assertions change.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` with W1/W2/W3/W8/W10 evidence or
  deferral notes.
- `_docs/_TASKS/TASK-287-01_Stats_KPI_Value_Typography_and_Metric_Semantics.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Value-size and description-color controls are schema-owned, normalized, and
  rendered through bounded maps.
- Prefix/suffix are stored separately from `value` and render without breaking
  legacy payloads.
- Per-metric accent and trend fields render as safe text/style tokens and are
  covered by editor, renderer, and validator tests.
- TASK-256 color-picker, ARIA, grid, and divider fixes remain out of this leaf.
