# TASK-267-04: Feature Grid Card Layout, Density, and Alignment Controls

# FileName: TASK-267-04_Feature_Grid_Card_Layout_Density_and_Alignment_Controls.md

**Priority:** High
**Category:** Widgets + Feature Grid + Schema + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-267-01, TASK-267-03
**Status:** To Do

---

## Overview

Add bounded Feature Grid card layout controls for text alignment, card padding,
icon/image sizing, horizontal card layout, and the low-priority hero-card-above
grid variant if product review confirms it should be part of this widget.

This leaf changes schema/defaults/normalizer/render/editor/tests together. Do
not add unbounded CSS class fields.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:294-307` - BF-01, BF-02,
  BF-03, BF-04, BF-05.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:390-407` - priority summary
  for missing product controls.
- `_docs/_WIDGETS/tmp/feature-grid/MATRIX.md:6-7,11-13` - alternating feature
  rows are Keep when renderer supports media; bento is Adapt; duplicate feature
  widgets and long prose cards are Reject.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/featureGrid.tsx` | Add bounded style fields for card alignment, padding, media size, and layout mode; optionally add a new hero-top variant only with schema/registry tests. |
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Add Visual controls using existing widget editor sections and stable `data-widget-control` metadata. |
| `tests/vitest/widgets/featureGrid.test.tsx` | Cover schema normalization, legacy defaults, class output, and data markers for new layout fields. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Cover controls and update flow for each new field. |
| `tests/vitest/widgets/renderer.test.tsx` | Update if renderer output markers or variant behavior change. |
| `tests/unit/widgets/validator.test.ts` | Update if new schema fields or variant ids are introduced. |
| `_docs/_WIDGETS/FEATURE_GRID.md` | Document new layout controls. |
| `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md` | Record fixed/deferred status for BF-01/BF-02/BF-03/BF-04/BF-05. |

## Implementation Pseudocode

```tsx
type FeatureGridCardLayout = "vertical" | "horizontal";
type FeatureGridTextAlign = "left" | "center" | "right";
type FeatureGridCardPadding = "compact" | "default" | "spacious";
type FeatureGridMediaSize = "sm" | "md" | "lg";

type FeatureGridStyle = NonNullable<FeatureGridData["style"]> & {
  cardLayout?: FeatureGridCardLayout;
  textAlign?: FeatureGridTextAlign;
  cardPadding?: FeatureGridCardPadding;
  mediaSize?: FeatureGridMediaSize;
};

function normalizeFeatureGridStyle(style: Partial<FeatureGridStyle> | undefined): FeatureGridStyle {
  const styleDefaults = featureGridDefaults.style!;
  return {
    columns: resolveFeatureGridColumns(style?.columns, styleDefaults.columns ?? "3"),
    gap: resolveFeatureGridGap(style?.gap),
    surfaceColor: resolveClearableStyleValue(style?.surfaceColor),
    borderColor: resolveString(style?.borderColor, styleDefaults.borderColor ?? "var(--color-border)"),
    borderWidth: resolveFeatureGridBorderWidth(style?.borderWidth),
    radius: resolveFeatureGridRadius(style?.radius),
    cardLayout: style?.cardLayout === "horizontal" ? "horizontal" : "vertical",
    textAlign: ["center", "right"].includes(style?.textAlign ?? "") ? style.textAlign : "left",
    cardPadding: resolveCardPadding(style?.cardPadding),
    mediaSize: resolveMediaSize(style?.mediaSize),
  };
}

function getFeatureGridCardClass(style: FeatureGridStyle, highlighted: boolean) {
  return joinClasses(
    "flex h-full border",
    style.cardLayout === "horizontal" ? "flex-row items-start" : "flex-col",
    cardPaddingClassMap[style.cardPadding ?? "default"],
    textAlignClassMap[style.textAlign ?? "left"],
    highlighted && "md:col-span-2"
  );
}
```

Error handling:

- Unknown enum values fall back to existing output-preserving defaults.
- New layout fields must extend the current `FeatureGridData["style"]` contract;
  they must not replace or drop existing `columns`, `gap`, `surfaceColor`,
  `borderColor`, `borderWidth`, or `radius` behavior.
- Existing saved pages without new fields must keep their current visual output.
- If adding `hero-top` as a variant, update widget variant registration and
  validator tests in the same commit. If the design is deferred, TASK-267-08 must
  record the reason instead of leaving BF-02 implicit.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new schema fields must reject unknown values and
  normalize legacy payloads.
- Anti-abuse: controls must map to fixed enum class maps only. No raw class,
  style, script, or HTML field may be introduced.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if output
  markers/variant behavior change.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`
- `_docs/_TASKS/TASK-267-04_Feature_Grid_Card_Layout_Density_and_Alignment_Controls.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Card alignment, density, and media sizing are bounded enum controls with
  backward-compatible defaults.
- Horizontal card layout is available without creating a second widget type.
- BF-02 is either implemented as a tested variant or explicitly deferred with
  product/design rationale.
- Runtime and editor tests prove the new controls are not inert.
