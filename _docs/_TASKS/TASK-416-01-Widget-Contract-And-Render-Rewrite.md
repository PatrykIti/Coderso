# TASK-416-01: Widget Contract And Render Rewrite
# FileName: TASK-416-01-Widget-Contract-And-Render-Rewrite.md

**Parent Task:** TASK-416
**Priority:** High
**Category:** CMS Widgets / Timeline / Rendering
**Estimated Effort:** Large
**Dependencies:** None (first in family order)
**Status:** ✅ Done
**Started:** 2026-06-07
**Completed:** 2026-06-07

---

## Overview

Rewrite `core/widgets/core/timeline.tsx` to the new MUI-aligned, preset-driven
contract. Presets become the block `variant`s; `data.mode` is removed. Add axis
position, per-step opposite content, dot filled/outlined variant, and semantic dot
tones mapped to theme tokens. Provide a single exported capability table that
normalize, render, and the editor (TASK-416-02) all consume so every editor option
maps to a field the active preset's renderer honors.

Owns the schema, defaults, `normalize*` helpers, render contract, capability table,
and `createTimelineWidget` (six variants + new `timelineEditorContract`). Must keep
AJV `strict:true` clean and pass `validateWidgetEditorContract`.

## Sub-Tasks

- [ ] Define new types: `TimelineVariantId` (6 presets), `TimelineAxisPosition`,
      `TimelineDotVariant`, `TimelineDotTone`, `TimelineFieldKey`,
      `TimelineVariantCapability`, new `TimelineStep`/`TimelineData`.
- [ ] Add `timelineVariantCapabilities` table (orientation, `visibleFields`,
      `allowedAxisPositions`, step bounds, seed hints, label/description).
- [ ] Write `timelineSchema` (`additionalProperties:false`, `required:["steps"]`,
      enums via spreads, steps 3–8) and `timelineDefaults`.
- [ ] Write `normalizeTimelineData(data, variant)` that deep-resolves every group
      from defaults, clamps/dedupes steps, sanitizes hrefs, coerces fields to the
      active capability's allowed sets, and omits cleared colors.
- [ ] Add the `dotTone → token` map; remove the hardcoded `emerald` status color.
- [ ] Implement `TimelineVerticalLayout` + `TimelineHorizontalLayout`,
      `renderMarker` (filled/outlined/icon), opposite-content cell with `<time>`,
      and a11y/overflow/link-nesting behavior.
- [ ] Implement `TimelineBlock` (signature `{ data, variant }`, layout reads
      `variant`) emitting the renamed `data-timeline-*` diagnostics.
- [ ] `createTimelineWidget`: 6 `variants`, populated `presets`, `editorContract`,
      `editorCapabilities.visualOwnsVariantSelection = true`, `render`.

## Implementation Pseudocode

```ts
export type TimelineVariantId =
  | "vertical-right" | "vertical-left" | "alternating"
  | "alternating-opposite" | "cards" | "compact";
export type TimelineAxisPosition = "left" | "right" | "alternate" | "alternate-reverse";
export type TimelineDotVariant = "filled" | "outlined";
export type TimelineDotTone =
  | "primary" | "secondary" | "success" | "error" | "warning" | "info" | "grey";

export type TimelineFieldKey =
  | "axisPosition" | "oppositeContent" | "dotVariant" | "dotTone" | "dotSize"
  | "connector" | "markerIcon" | "stepStatus" | "stepCta" | "stepLink"
  | "typography" | "spacing" | "background" | "header";

export type TimelineVariantCapability = {
  id: TimelineVariantId; label: string; description: string;
  orientation: "vertical" | "horizontal";
  surface: "plain" | "cards";
  visibleFields: ReadonlySet<TimelineFieldKey>;
  allowedAxisPositions: ReadonlyArray<TimelineAxisPosition>;  // [] when axis side is fixed
  fixedAxisPosition?: TimelineAxisPosition;                   // vertical-left/right
  steps: { min: 3; max: 8; recommended: number };
};

const dotToneToken: Record<TimelineDotTone, string> = {
  primary: "var(--color-primary)", secondary: "var(--color-secondary)",
  success: "var(--color-primary)",  // no front success token — documented alias
  error:   "var(--color-destructive, var(--color-text))",
  warning: "var(--color-accent)", info: "var(--color-secondary)",
  grey:    "var(--color-border)",
};

export function normalizeTimelineData(data: TimelineData, variant: string): TimelineData {
  const cap = resolveTimelineCapability(variant);
  const steps = normalizeTimelineSteps(data.steps);          // clamp 3-8, unique ids, safe hrefs
  return {
    header: compactObject({ title: trim(data.header?.title), description: trim(data.header?.description) }),
    steps,
    axis: { position: coerceAxisPosition(data.axis?.position, cap) },
    dot: { variant: enumOr(data.dot?.variant, ...), tone: enumOr(data.dot?.tone, ...), size: enumOr(...) },
    connector: { show: bool(data.connector?.show), style: enumOr(...), thickness: enumOr(...) },
    typography: { ... }, spacing: { ... },
    background: data.background !== undefined ? compactObject({ color: resolveClearableCssColorValue(...) }) : timelineDefaults.background,
  };
}
```

Data flow: `createTimelineWidget` → registry → `normalizeWidgetBlock` validates
`timelineSchema` → `TimelineBlock` resolves capability + normalized data → vertical
or horizontal layout. Per-step `dotTone`/`dotVariant` override globals; tones resolve
through `dotToneToken`; no hardcoded hex in output.

Error handling: `resolveTimelineCapability` falls back to the first preset for
unknown variants; `coerceAxisPosition` snaps to `fixedAxisPosition` or the first
allowed value; unsafe hrefs dropped; cleared background omitted.

Regression-test shape (implemented in TASK-416-03): per-preset attributes, filled vs
outlined markup, tone→token, opposite `<time>`, capability shown⇒rendered invariant,
safe-href/link-nesting, a11y, contract validity, canvas/public parity.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx` (after TASK-416-03)
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`

## Documentation Updates Required

- Captured under TASK-416-04 (`_docs/_WIDGETS/TIMELINE.md`, changelog, board).
