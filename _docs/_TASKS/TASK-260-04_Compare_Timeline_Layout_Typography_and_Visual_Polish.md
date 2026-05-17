# TASK-260-04: Compare Timeline Layout Typography and Visual Polish

# FileName: TASK-260-04_Compare_Timeline_Layout_Typography_and_Visual_Polish.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render + Visual Design
**Estimated Effort:** Large
**Dependencies:** TASK-260, TASK-260-01, TASK-260-03
**Status:** Done (2026-05-17)

---

## Overview

Add Compare Timeline-specific layout, typography, and visual polish from
`REPORT_COMPARE_TIMELINE_WIDGET.md`.

This leaf covers W2, W3, W4, W5, W9, W13, W14, U1, U5, U9, and U10. Shared
`none` semantics remain TASK-256-02 scope. `W7` color validation is routed to
`TASK-299`, and `W8` motion remains deferred to `TASK-300`.

TASK-256-02 already landed the shared clearable-color contract and TASK-256-01
already settled shared mode ownership. This leaf consumes those settled
contracts locally in Compare Timeline without reopening the shared family.

## Sub-Tasks

- [ ] Add optional heading/subtitle fields for the Compare Timeline block.
- [ ] Add bounded section padding and max-width tokens instead of hardcoded
  `px-4 py-8` and `max-w-6xl`.
- [ ] Add track-label, step-label, and segment-label font-weight tokens if they
  render predictably across existing size tokens.
- [ ] Add optional track background color and marker shape tokens.
- [ ] Add render-only track order controls with
  `layout.trackOrder: "a-first" | "b-first"` so public display order can change
  without swapping normalized track data or rewriting deterministic IDs.
- [ ] Adopt the landed shared `onClear` behavior for Compare Timeline
  `trackLabelColor`, `stepLabelColor`, and `mutedStepColor` fields.
- [ ] Remove duplicated Visual/Advanced layout controls by keeping one truthful
  editor owner for track spacing and axis label position after TASK-256-01.
- [ ] Leave W8 scroll-triggered motion deferred to `TASK-300`. Do not add a
  motion preset in this leaf.
- [ ] Add visual variant preview cards for `dual-track` and
  `dual-track-highlight`.
- [ ] Add spacing option helper text or tooltips that explain token effect.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/compareTimeline.tsx` | Add bounded heading/layout/style fields and a render-only `layout.trackOrder` token with schema/defaults/normalizer/render support. Do not add runtime script-driven motion in this leaf. |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | Add controls for heading, layout, font weight, track background, marker shape, render order, previews, helper text, local color clear adoption, and local mode-ownership cleanup. |
| `tests/vitest/widgets/compareTimeline.test.tsx` | Add SSR/schema/normalizer coverage for new fields, render-only `trackOrder`, track ID preservation, highlight target preservation, and backward compatibility. |
| `tests/vitest/ui/compare-timeline-editor-wave.test.tsx` | Add editor coverage for new controls, render-order selection, and variant preview cards. |
| `tests/unit/widgets/validator.test.ts` | Run and update when schema/defaults change. |
| `core/widgets/modulePackMatrix.ts`, `_docs/WIDGET_PACK_MATRIX.md` | Update only if pack completeness/readiness changes. |

## Implementation Pseudocode

```ts
type CompareTimelineWidth = "narrow" | "default" | "wide" | "full";
type CompareTimelinePadding = "sm" | "md" | "lg";
type CompareMarkerShape = "rounded" | "circle" | "numbered" | "check";
type CompareTrackOrder = "a-first" | "b-first";

function normalizeCompareTimelineLayout(input: Partial<CompareLayout> | undefined): CompareLayout {
  return {
    // Preserve existing trackSpacing/labelPosition legacy handling unless this
    // leaf explicitly hardens those fields and updates existing tests.
    trackSpacing: normalizeExistingLayoutToken(input?.trackSpacing, "trackSpacing"),
    labelPosition: normalizeExistingLayoutToken(input?.labelPosition, "labelPosition"),
    maxWidth: normalizeEnum(input?.maxWidth, widthOptions, "default"),
    padding: normalizeEnum(input?.padding, paddingOptions, "md"),
    trackOrder: normalizeEnum(input?.trackOrder, trackOrderOptions, "a-first"),
  };
}

function resolveOrderedCompareTracks(data: CompareTimelineData): CompareTrack[] {
  const normalized = normalizeCompareTimelineData(data);
  if (normalized.layout?.trackOrder !== "b-first") return normalized.tracks;
  return [normalized.tracks[1], normalized.tracks[0]].filter(Boolean);
}
```

Editor flow:

1. Keep beginner controls in Wizard/Visual and technical metadata in Advanced.
2. Variant preview cards are decorative summaries of the real variant contract,
   not a second source of variant behavior.
3. Track order control changes only `layout.trackOrder`; it does not mutate the
   `tracks` array, track IDs, markers, segments, or highlight target.
4. W8 motion remains out of scope; runtime output stays static SSR-safe markup.

Error handling:

- New layout/style tokens introduced by this leaf fall back to defaults.
- Existing `trackSpacing` and `labelPosition` legacy behavior stays unchanged
  unless this leaf explicitly hardens them and updates the current tests that
  preserve unknown tokens.
- Empty heading/subtitle normalize to `undefined`.
- Render-order changes must preserve exactly two tracks with deterministic IDs.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: every new layout/style/content token must be
  represented in schema and tests.
- Anti-abuse: no raw HTML, public runtime script, unsafe inline event handler,
  unbounded class-name field, or secret-bearing style value is allowed.
- Secret handling: no secrets in widget data, preview cards, diagnostics, or
  Playwright evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  output changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Run targeted accessibility/release-gate checks if focus or public runtime
  output changes release-gated behavior.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` rows W2, W3, W4,
  W5, W9, W13, W14, U1, U5, U9, and U10 after validation. Mark W7 routed to
  `TASK-299` and W8 routed to `TASK-300`.
- Update `_docs/_WIDGETS/COMPARE_TIMELINE.md` with the final layout, typography,
  and visual options.
- Update `core/widgets/modulePackMatrix.ts` and `_docs/WIDGET_PACK_MATRIX.md`
  only if the new options affect pack readiness/completeness.

## Changelog Policy

- Covered by the TASK-260 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Compare Timeline can be configured without hardcoded width/padding being the
  only production option.
- Variant previews, spacing help, marker shapes, and typography controls match
  the runtime output they describe.
- Track order changes affect render order only and do not rewrite normalized
  IDs, markers, segments, or highlight target behavior.
- Compare Timeline consumes the landed shared clear/mode contracts locally
  without reintroducing duplicated Visual/Advanced controls.
