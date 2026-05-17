# TASK-260-01: Compare Timeline Renderer Truthfulness and Accessibility

# FileName: TASK-260-01_Compare_Timeline_Renderer_Truthfulness_and_Accessibility.md

**Priority:** High
**Category:** Widgets + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-260, TASK-256-07
**Status:** Done (2026-05-17)

---

## Overview

Repair Compare Timeline renderer findings from
`_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` that are local to
`core/widgets/core/compareTimeline.tsx`.

This leaf covers R1-R9 plus W11 where the implementation can stay inside
Compare Timeline owners. Shared accessibility helpers, global runtime contracts,
and cross-widget token semantics remain TASK-256 scope.

## Sub-Tasks

- [ ] Replace hardcoded desktop `lg:grid-cols-3` axis and track grids with a
  deterministic grid model that reflects the normalized step count.
- [ ] Make `guides.enabled=false` remove guide borders instead of rendering a
  solid fallback border.
- [ ] Add Compare Timeline-local semantic labels for the section, track rows,
  active/inactive markers, and segment badges.
- [ ] Keep marker semantics static: markers are rendered state indicators, not
  interactive controls, so use readable labels/status text instead of
  `aria-pressed` or `aria-selected` unless the renderer is changed to real
  buttons.
- [ ] Add a `color-mix()` fallback for highlighted segment backgrounds without
  changing the shared color-token contract.
- [ ] Add renderer-safe min-height and overflow handling for empty or long-label
  track rows.
- [ ] Preserve mobile single-column behavior and backward compatibility for
  existing saved pages.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/compareTimeline.tsx` | Add step-count grid resolver, fixed guide-off style, Compare Timeline-local semantic attributes, color fallback, min-height, and overflow handling. |
| `tests/vitest/widgets/compareTimeline.test.tsx` | Add focused SSR assertions for 4/5/6-step grids, guide disabled style, section/track labels, static marker state labels, segment labels, color fallback, and long/empty-track layout safety. |
| `tests/vitest/widgets/renderer.test.tsx` | Update only if shared widget renderer snapshots/assertions depend on compare-timeline output. |

## Implementation Pseudocode

```tsx
function resolveCompareGridStyle(stepCount: number): CSSProperties {
  return {
    "--compare-step-count": String(Math.max(compareAxisStepMin, stepCount)),
  } as CSSProperties;
}

function resolveGuideStyle(guides: CompareGuides, guideColor: string): CSSProperties {
  if (!guides.enabled) {
    return { borderStyle: "none", borderColor: "transparent" };
  }
  return { borderStyle: guides.style, borderColor: guideColor };
}

function getSegmentBackground(highlightColor: string): CSSProperties {
  return {
    backgroundColor: highlightColor,
    backgroundImage: `linear-gradient(color-mix(in oklab, ${highlightColor} 18%, transparent), color-mix(in oklab, ${highlightColor} 18%, transparent))`,
  };
}
```

Renderer flow:

1. Normalize data with the existing `normalizeCompareTimelineData()`.
2. Resolve grid style from `steps.length`.
3. Apply mobile-first classes that stay `grid-cols-1` on mobile and
   `sm:grid-cols-2` on tablet, then use a static Tailwind arbitrary class such
   as `lg:[grid-template-columns:repeat(var(--compare-step-count),minmax(0,1fr))]`
   on the axis and track grids. Do not set inline `gridTemplateColumns` directly
   because that would override the mobile single-column contract.
4. Generate readable labels from current track and step labels; do not expose
   raw normalized IDs as primary copy.
5. Label active/inactive marker state as static output. Do not add interactive
   ARIA state attributes unless marker cells become actual controls.
6. Render hidden/disabled guide state as no border.

Error handling:

- Empty or invalid step arrays still normalize to the current minimum count.
- Invalid segment ranges remain clamped by the existing normalizer.
- Missing labels use existing fallback labels before aria text is built.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless this leaf adds persisted renderer
  fields, which must update `compareTimelineSchema` and validator tests.
- Anti-abuse: semantic labels must be derived from sanitized React text output;
  do not add raw HTML, scripts, or untrusted style/class fields.
- Secret handling: no secrets in widget data or DOM attributes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if shared
  renderer assertions change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` rows R1-R9 and
  W11 with fixed/deferred evidence after validation.
- Update `_docs/_WIDGETS/COMPARE_TIMELINE.md` runtime behavior notes if grid,
  guide, accessibility, or compatibility behavior changes.

## Changelog Policy

- Covered by the TASK-260 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Six-step desktop output no longer renders as a two-row three-column grid.
- `guides.enabled=false` removes the guide border in SSR/admin preview/frontend.
- Compare Timeline runtime output has meaningful section, track, marker, and
  segment semantics without introducing shared helper drift.
- Static marker output does not claim button/toggle semantics.
- Highlighted segment backgrounds keep a browser-compatible fallback before the
  `color-mix()` enhancement.
- Existing saved payloads render without migration.
