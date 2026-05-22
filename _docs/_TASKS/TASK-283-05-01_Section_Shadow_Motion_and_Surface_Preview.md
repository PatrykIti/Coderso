# TASK-283-05-01: Section Shadow Motion and Surface Preview

# FileName: TASK-283-05-01_Section_Shadow_Motion_and_Surface_Preview.md

**Priority:** Medium
**Category:** Widgets + Section + Style + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-283, TASK-283-02, TASK-283-04, TASK-283-05
**Status:** Done (2026-05-21)

---

## Overview

Implement the unblocked widget-local subset of `TASK-283-05`: bounded Section
shadow controls, CSS-only reduced-motion-safe motion presets, and a derived
gradient/overlay surface preview.

This subtask closes report findings W2, the CSS-only bounded part of W3, and
U5. It intentionally excluded the U2 slider/stepper work until the duplicate
`gradientAngle` / `overlayOpacity` ownership cleanup landed in shared `TASK-326`.

## Scope Boundary

In scope:

- optional bounded `style.shadow` control that preserves the current
  variant-derived `contained -> shadow-sm` legacy output until authors choose an
  explicit override;
- bounded `style.motion` presets such as `none`, `fade`, and `slide-up` using
  only `motion-safe:*` / `motion-reduce:*` classes;
- an editor-owned gradient/overlay preview swatch derived from normalized
  Section data and current variant fallback behavior;
- focused runtime/editor tests for normalization, SSR classes, deterministic
  markers, and preview rendering.

Out of scope:

- slider/stepper controls for `gradientAngle` and `overlayOpacity`;
- removing duplicate Visual/Advanced ownership for existing surface number
  controls;
- scroll observers, viewport-triggered animations, parallax, or JavaScript
  motion runtimes.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:66` - W2 configurable shadows are
  missing beyond the current `contained` hardcoded `shadow-sm`.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:67` - W3 animation/scroll effects
  are missing; this subtask lands only the bounded CSS-only reveal subset.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:95` - U5 gradient/overlay preview
  is missing.
- `_docs/_TASKS/TASK-326_Section_Shared_Structural_Truthfulness_Followup.md` -
  shared duplicate owner cleanup for `gradientAngle` / `overlayOpacity` stays
  external to this subtask.

## Sub-Tasks

- [x] Extend `SectionData.style` with optional bounded `shadow` and bounded
  `motion` tokens.
- [x] Preserve the legacy contained shadow through variant fallback when
  `style.shadow` is unset.
- [x] Render motion via bounded `motion-safe:*` class maps on the Section
  surface wrapper without observers or preview-only persisted state.
- [x] Add a derived surface preview swatch to the Section editor that reflects
  current gradient, overlay, border, radius, and effective shadow values.
- [x] Add focused Section runtime and editor tests for the new tokens and
  preview rendering.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Extend style schema/types/defaults/normalizer, add shadow/motion resolvers, and render bounded classes/markers. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Add bounded shadow/motion controls and derived surface preview UI. |
| `tests/vitest/widgets/section.test.tsx` | Cover normalization, variant fallback, deterministic markers, and motion/shadow runtime output. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Cover shadow overrides, motion selection, and preview rendering. |

## Implementation Pseudocode

Legacy-safe shadow flow:

```ts
type SectionShadow = "none" | "sm" | "md" | "lg" | "xl";

function resolveOptionalSectionShadow(value: string | undefined): SectionShadow | undefined {
  if (value === undefined) return undefined;
  return isSectionShadow(value) ? value : undefined;
}

function resolveRenderedSectionShadow(variant: SectionVariantId, style: SectionData["style"]) {
  return style?.shadow ?? (variant === "contained" ? "sm" : "none");
}
```

Motion flow:

```ts
type SectionMotion = "none" | "fade" | "slide-up";

const sectionMotionClassMap = {
  none: undefined,
  fade: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none",
  "slide-up": "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none",
};
```

Preview flow:

```ts
function resolveSectionSurfacePreview(value: SectionData, variant: string) {
  const normalized = normalizeSectionData(value);
  return {
    frameClassName: joinClasses(radiusClass, shadowClass),
    surfaceStyle: compactStyle({ ...background, gradient, border }),
    overlayStyle: compactStyle({ backgroundColor, opacity }),
  };
}
```

Error handling:

- Invalid `shadow` values normalize to `undefined`, not to a misleading explicit
  token.
- Motion stays CSS-only and must use `motion-reduce` fallbacks when animation
  classes are present.
- Preview UI must derive from normalized values and may not persist any preview
  metadata back into `SectionData`.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new style fields must be added to `sectionSchema`
  with `additionalProperties: false`.
- Anti-abuse: no arbitrary classes, CSS strings, scripts, or observer-backed
  behavior.
- Secret handling: no secrets in preview UI, style data, or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/SECTION.md` with shadow, motion, and preview behavior.
- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` rows W2, W3, and U5 after
  validation.
- Update `_docs/_TASKS/TASK-283-05_Section_Surface_Shadow_Motion_and_Preview_Controls.md`
  so the parent task stays truthful about the `TASK-326` split.

## Acceptance Criteria

- Section shadows and motion presets are bounded and backward compatible.
- Contained blocks preserve their current `shadow-sm` legacy output until an
  explicit shadow override is chosen.
- Motion remains CSS-only and reduced-motion safe.
- The editor preview is derived from normalized data and persists no extra
  state.
- Focused runtime/editor tests cover the new behavior.
