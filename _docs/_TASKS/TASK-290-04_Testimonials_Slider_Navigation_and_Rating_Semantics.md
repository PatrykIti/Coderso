# TASK-290-04: Testimonials Slider Navigation and Rating Semantics

# FileName: TASK-290-04_Testimonials_Slider_Navigation_and_Rating_Semantics.md

**Priority:** High
**Category:** Widgets + Testimonials + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-03, TASK-290
**Status:** To Do

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

- Decide whether the product keeps `slider-static` as a horizontal scroll strip
  with a truthful label or adds a separate interactive carousel variant/control.
- Add bounded Prev/Next and optional dot indicators only if they can be scoped
  to the Testimonials widget root and respect reduced motion.
- Add `ratingDisplay` semantics for hiding unknown ratings or showing a
  clearly labeled "No rating" state.
- Use explicit `TestimonialsData.behavior` schema ownership for slider and
  rating display options, for example `behavior.sliderControls` and
  `behavior.ratingDisplay`.
- Preserve existing non-zero rating `aria-label` behavior.

Out of scope:

- Shared runtime script registry or generic carousel component unless TASK-256
  has already introduced it.
- Autoplay by default.
- Cross-widget slider behavior.
- Scroll-snap baseline repair owned by TASK-256.

## Sub-Tasks

- [ ] Classify final `slider-static` product direction after TASK-256: rename,
  keep as scroll strip, or add opt-in navigation.
- [ ] Add schema/defaults/normalizer fields only for the chosen Testimonials
  product behavior under the chosen `behavior` namespace.
- [ ] Render navigation controls with root-scoped selectors and keyboard-safe
  buttons when enabled.
- [ ] Add rating-zero policy: hide stars, render "No rating", or expose an
  explicit editor setting.
- [ ] Add editor controls and tests for rating semantics and any slider options.

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
  resolvedVariant === "slider-static" && normalizedData.behavior?.sliderControls === "buttons";

return (
  <section data-testimonials-slider-controls={enableNavigation ? "buttons" : "none"}>
    {enableNavigation ? <button type="button" data-testimonials-prev>Previous</button> : null}
    <div data-testimonials-list>{items}</div>
    {enableNavigation ? <button type="button" data-testimonials-next>Next</button> : null}
  </section>
);
```

Error handling:

- Unknown slider option values normalize to the current static behavior.
- Rating display unknown values normalize to the current non-zero star behavior.
- Runtime script, if needed, must no-op when the DOM root is missing and must
  scope all queries to the current Testimonials instance.

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
- If runtime-kernel script binding is introduced, add/run a Bun-owned runtime
  test selected by the final owner path.
- If committed separately from TASK-290-08, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

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
- Runtime output remains accessible, reduced-motion safe, and instance scoped.
