# TASK-290-05: Testimonials Section Surface Typography and Card Styles

# FileName: TASK-290-05_Testimonials_Section_Surface_Typography_and_Card_Styles.md

**Priority:** Medium
**Category:** Widgets + Testimonials + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-256-06-03, TASK-290
**Status:** To Do

---

## Overview

Add Testimonials-owned section surface, header typography, card radius, card
border width, background image support, and local color contrast guidance while
keeping TASK-256 shared token and accessibility repairs out of scope.

This leaf covers:

- `REPORT_TESTIMONIALS_WIDGET.md:206-212` BF-02/BF-03 section background
  color/gradient/image and header typography controls.
- `REPORT_TESTIMONIALS_WIDGET.md:224-226` BF-06 contrast validation.
- `REPORT_TESTIMONIALS_WIDGET.md:232-234` BF-08 card radius and border-width
  controls.

It does not own hardcoded heading-level repair, section/article ARIA, or generic
clear-control behavior; those remain TASK-256 scope.

## Scope Boundary

In scope:

- Add bounded section background controls such as color, gradient preset,
  background tone, and optional Media Library-backed background image.
- Add header alignment and title-size controls without changing the shared
  heading hierarchy contract.
- Add bounded card radius and border-width tokens.
- Add non-blocking Testimonials-local contrast warnings for text/card and
  accent/card pairs. Do not create or imply a reusable shared contrast validator
  in this leaf.
- Keep all class names tokenized through maps.

Out of scope:

- Raw custom CSS, arbitrary class strings, or unbounded gradients.
- Shared color picker clear semantics owned by TASK-256-02.
- Shared heading/ARIA baseline owned by TASK-256-04 and TASK-256-06-03.
- New media upload routes or provider-backed image transforms; background image
  selection must use existing Media Library picker/cache patterns.

## Sub-Tasks

- [ ] Extend `TestimonialsData.style` with bounded section/card/header style
  fields.
- [ ] Add resolver helpers and class/style maps for every token.
- [ ] Add Visual controls for section surface, header alignment/size, card
  radius, border width, and optional background image.
- [ ] Add contrast warning copy near the affected controls without blocking
  existing saved pages.
- [ ] Add renderer and editor tests for legacy defaults and every new token.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/testimonials.tsx` | Extend schema/types/defaults/normalizer and render bounded style tokens. |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Add Visual controls, Media Library background image picking, and contrast warnings. |
| `tests/vitest/widgets/testimonials.test.tsx` | Add normalization and SSR render tests for new style fields. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Add editor control coverage. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Run/update when radius, spacing, or clear adjacency changes. |
| `tests/vitest/ui/media-picker.test.tsx` | Run if background image picker props or shared Media Picker cache behavior change. |
| `tests/unit/widgets/validator.test.ts` | Run/update when schema/defaults change. |

## Implementation Pseudocode

Token maps:

```ts
type TestimonialsHeaderAlign = "left" | "center" | "right";
type TestimonialsTitleSize = "sm" | "md" | "lg";
type TestimonialsCardRadius = "none" | "sm" | "md" | "lg" | "xl";
type TestimonialsBorderWidth = "none" | "sm" | "md";

const headerAlignClassMap: Record<TestimonialsHeaderAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};
```

Normalizer flow:

```ts
function normalizeTestimonialsStyle(style: TestimonialsData["style"]) {
  return {
    ...style,
    headerAlign: resolveHeaderAlign(style?.headerAlign),
    titleSize: resolveTitleSize(style?.titleSize),
    cardRadius: resolveCardRadius(style?.cardRadius),
    borderWidth: resolveBorderWidth(style?.borderWidth),
  };
}
```

Error handling:

- Unknown enum tokens normalize to current visual defaults.
- Empty color strings are omitted or handled through TASK-256 clear semantics.
- Contrast warnings are advisory and must not reject legacy payloads.
- Background image URLs or asset IDs normalize through explicit schema fields
  and never through arbitrary CSS strings.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: every new style field must be schema-owned with
  `additionalProperties: false`.
- Anti-abuse: no arbitrary CSS, arbitrary class names, raw HTML, scripts, or
  unvalidated background-image URLs.
- Secret handling: no signed/private media URLs, provider tokens, secrets in
  style data, contrast diagnostics, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx` if Media
  Picker integration changes.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If committed separately from TASK-290-08, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/TESTIMONIALS.md` with style token names and behavior.
- Update `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` BF-02, BF-03, BF-06,
  and BF-08 status after implementation.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if this changes engagement pack
  readiness/completeness.

## Changelog Policy

- Covered by the TASK-290 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Testimonials section and card styling are configurable through bounded tokens.
- Header typography controls do not duplicate shared heading hierarchy repair.
- Contrast warnings make unsafe combinations visible without breaking legacy
  pages.
