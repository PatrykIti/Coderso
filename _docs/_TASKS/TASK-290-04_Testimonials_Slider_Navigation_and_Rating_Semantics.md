# TASK-290-04: Testimonials Slider Navigation and Rating Semantics

# FileName: TASK-290-04_Testimonials_Slider_Navigation_and_Rating_Semantics.md

**Priority:** High
**Category:** Widgets + Testimonials + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-03, TASK-290
**Status:** Done (2026-05-22)

---

## Overview

Add Testimonials-only product behavior around slider navigation and rating
display semantics after TASK-256 has repaired the shared static-vs-interactive
baseline.

This leaf covers:

- `REPORT_TESTIMONIALS_WIDGET.md:199-204` BF-01 slider-static has no
  navigation.
- `REPORT_TESTIMONIALS_WIDGET.md:173-175,263` UX-03/A6 rating `0` renders
  as five empty stars with unclear meaning.

BUG-01 scroll-snap itself is excluded because TASK-256 owns the baseline
runtime truthfulness for the existing `slider-static` variant.

## Scope Boundary

In scope:

- Keep the backward-compatible `slider-static` variant id and render it as an
  SSR-only horizontal scroll strip with root-scoped dot navigation links. No
  client-side carousel runtime or generic slider registry is introduced here.
- Add bounded dot navigation only under `behavior.sliderNavigation =
  "none" | "dots"`, defaulting to `dots` for `slider-static`.
- Add `ratingDisplay` semantics for hiding unknown ratings or showing a
  clearly labeled "No rating" state.
- Use explicit `TestimonialsData.behavior` schema ownership for slider and
  rating display options, specifically `behavior.sliderNavigation` and
  `behavior.ratingDisplay`.
- Preserve existing non-zero rating `aria-label` behavior.

Out of scope:

- Shared runtime script registry or generic carousel component unless TASK-256
  has already introduced it.
- Autoplay by default.
- Cross-widget slider behavior.
- Scroll-snap baseline repair owned by TASK-256.

## Sub-Tasks

- [x] Add `behavior.sliderNavigation` and `behavior.ratingDisplay` to the
  Testimonials owner schema/defaults/normalizer under a local `behavior`
  namespace.
- [x] Render root-scoped dot navigation links for `slider-static` when
  navigation is enabled and more than one testimonial is visible.
- [x] Default rating-zero policy to `hide-empty`, while allowing an explicit
  `"label-empty"` editor option for teams that want visible "No rating" copy.
- [x] Add editor controls and tests for rating semantics and any slider options.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/testimonials.tsx` | Add `behavior` schema/types/defaults/normalizer ownership, rating display policy, and any Testimonials-only slider navigation output. |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Add Visual/Advanced controls for rating semantics and slider product options. |
| `tests/vitest/widgets/testimonials.test.tsx` | Add SSR assertions for rating-zero and slider/navigation output. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Add editor tests for new controls. |
| `tests/vitest/widgets/renderer.test.tsx` | Run/update if shared renderer output markers change. |

## Implementation Pseudocode

Rating policy:

```ts
type TestimonialsRatingDisplay = "stars" | "hide-empty" | "label-empty";

function shouldRenderRating(rating: number, display: TestimonialsRatingDisplay) {
  if (rating > 0) return true;
  return display === "stars" || display === "label-empty";
}
```

Slider control flow:

```tsx
const enableNavigation =
  resolvedVariant === "slider-static" &&
  normalizedData.behavior?.sliderNavigation === "dots" &&
  items.length > 1;

return (
  <section data-testimonials-slider-navigation={enableNavigation ? "dots" : "none"}>
    <div data-testimonials-list>{items}</div>
    {enableNavigation ? (
      <nav aria-label="Testimonials navigation">
        {items.map((item, index) => (
          <a key={item.id ?? index} href={`#${resolveTestimonialAnchorId(rootId, item, index)}`}>
            <span className="sr-only">Jump to testimonial {index + 1}</span>
          </a>
        ))}
      </nav>
    ) : null}
  </section>
);
```

Error handling:

- Unknown slider option values normalize to the current static behavior.
- Rating display unknown values normalize to `hide-empty`.
- Navigation remains SSR-only; no runtime script or global selector binding is
  introduced by this leaf.

Regression test shape:

- `tests/vitest/widgets/testimonials.test.tsx`
  - `slider-static` emits dot-navigation markup only when enabled and when more
    than one testimonial is visible.
  - Rating `0` hides stars by default and can switch to a visible "No rating"
    label through `behavior.ratingDisplay = "label-empty"`.
- `tests/vitest/ui/testimonials-editor-wave.test.tsx`
  - Visual/Advanced controls update `behavior.sliderNavigation` and
    `behavior.ratingDisplay` without mutating non-slider variants.
- `tests/vitest/widgets/renderer.test.tsx`
  - Run when renderer markers or root-scoped navigation attrs change.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new behavior fields must be explicit in schema.
- Anti-abuse: no user-authored scripts or arbitrary selectors; runtime binding
  must be root-scoped and idempotent.
- Secret handling: no secrets in behavior fields or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  markers or variant output changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/TESTIMONIALS.md` with final slider and rating-zero
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` BF-01 and UX-03/A6
  status after implementation.

## Changelog Policy

- Covered by the TASK-290 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- The slider-like Testimonials variant exposes truthful navigation behavior or
  truthful non-interactive copy.
- Rating `0` no longer reads as an accidental negative rating.
- Runtime output remains accessible, reduced-motion safe, instance scoped, and
  free of new client-side carousel JS.

## Completion Notes (2026-05-22)

- Testimonials now owns `behavior.sliderNavigation` and
  `behavior.ratingDisplay`, with `slider-static` exposing truthful SSR dot
  navigation and rating-zero output no longer defaulting to five empty stars.
- The runtime default stays `hide-empty`, while labeled and explicit star modes
  remain available through bounded editor controls.
- Widget and editor tests now prove navigation markers, zero-rating semantics,
  and the synchronized control surface for these behavior fields.
