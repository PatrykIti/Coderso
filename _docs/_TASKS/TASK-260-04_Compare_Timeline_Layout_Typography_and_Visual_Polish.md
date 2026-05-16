# TASK-260-04: Compare Timeline Layout Typography and Visual Polish

# FileName: TASK-260-04_Compare_Timeline_Layout_Typography_and_Visual_Polish.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render + Visual Design
**Estimated Effort:** Large
**Dependencies:** TASK-260, TASK-260-01, TASK-260-03
**Status:** To Do

---

## Overview

Add Compare Timeline-specific layout, typography, and visual polish from
`REPORT_COMPARE_TIMELINE_WIDGET.md`.

This leaf covers W2, W3, W4, W5, W8, W9, W13, W14, U1, U9, and W7 only when
contrast feedback can stay local to this widget. Shared `Clear`, `none`,
duplicated mode controls, and global color validation remain TASK-256 scope.

## Sub-Tasks

- [ ] Add optional heading/subtitle fields for the Compare Timeline block.
- [ ] Add bounded section padding and max-width tokens instead of hardcoded
  `px-4 py-8` and `max-w-6xl`.
- [ ] Add track-label, step-label, and segment-label font-weight tokens if they
  render predictably across existing size tokens.
- [ ] Add optional track background color and marker shape tokens.
- [ ] Add track order controls that swap the two normalized tracks without
  breaking deterministic IDs or legacy payloads.
- [ ] Add optional motion preset with reduced-motion fallback only if it remains
  SSR-safe and does not require a public runtime script.
- [ ] Add visual variant preview cards for `dual-track` and
  `dual-track-highlight`.
- [ ] Add spacing option helper text or tooltips that explain token effect.
- [ ] Add Compare Timeline-local contrast warnings only if they do not create a
  global color-field contract fork.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/compareTimeline.tsx` | Add bounded heading/layout/style/motion/track-order fields only with schema/defaults/normalizer/render support. |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | Add controls for heading, layout, font weight, track background, marker shape, order, motion, previews, and helper text. |
| `tests/vitest/widgets/compareTimeline.test.tsx` | Add SSR/schema/normalizer coverage for new fields and backward compatibility. |
| `tests/vitest/ui/compare-timeline-editor-wave.test.tsx` | Add editor coverage for new controls and variant preview cards. |
| `tests/unit/widgets/validator.test.ts` | Run and update when schema/defaults change. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if pack completeness/readiness changes. |

## Implementation Pseudocode

```ts
type CompareTimelineWidth = "narrow" | "default" | "wide" | "full";
type CompareTimelinePadding = "sm" | "md" | "lg";
type CompareMarkerShape = "rounded" | "circle" | "numbered" | "check";

function normalizeCompareTimelineLayout(input: Partial<CompareLayout> | undefined): CompareLayout {
  return {
    trackSpacing: normalizeEnum(input?.trackSpacing, trackSpacingOptions, "md"),
    labelPosition: normalizeEnum(input?.labelPosition, labelPositionOptions, "top"),
    maxWidth: normalizeEnum(input?.maxWidth, widthOptions, "default"),
    padding: normalizeEnum(input?.padding, paddingOptions, "md"),
  };
}

function swapCompareTracks(data: CompareTimelineData): CompareTimelineData {
  const normalized = normalizeCompareTimelineData(data);
  return {
    ...normalized,
    tracks: [normalized.tracks[1], normalized.tracks[0]].filter(Boolean),
    highlight: remapHighlightAfterTrackSwap(normalized.highlight),
  };
}
```

Editor flow:

1. Keep beginner controls in Wizard/Visual and technical metadata in Advanced.
2. Variant preview cards are decorative summaries of the real variant contract,
   not a second source of variant behavior.
3. Track order control uses one explicit action and re-normalizes markers,
   segments, and highlight target.
4. Motion preset must degrade to static markup for SSR and reduced motion.

Error handling:

- Unknown layout/style tokens fall back to defaults.
- Empty heading/subtitle normalize to `undefined`.
- Track swap must preserve exactly two tracks with deterministic IDs.
- Contrast warnings are advisory and must not block save unless a shared
  contract later makes them blocking.

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
- Run targeted accessibility/release-gate checks if motion, focus, or public
  runtime output changes release-gated behavior.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` rows W2, W3, W4,
  W5, W7, W8, W9, W13, W14, U1, and U9 after validation.
- Update `_docs/_WIDGETS/COMPARE_TIMELINE.md` with the final layout, typography,
  and visual options.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if the new options affect pack
  readiness/completeness.

## Changelog Policy

- Covered by the TASK-260 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Compare Timeline can be configured without hardcoded width/padding being the
  only production option.
- Variant previews, spacing help, marker shapes, and typography controls match
  the runtime output they describe.
- Track order changes do not break normalized IDs, markers, segments, or
  highlight target behavior.
- No shared TASK-256 clear/none/mode contract is duplicated locally.
