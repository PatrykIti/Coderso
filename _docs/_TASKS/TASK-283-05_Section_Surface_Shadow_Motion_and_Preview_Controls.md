# TASK-283-05: Section Surface Shadow Motion and Preview Controls

# FileName: TASK-283-05_Section_Surface_Shadow_Motion_and_Preview_Controls.md

**Priority:** Medium
**Category:** Widgets + Section + Style + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-256-05-01, TASK-283, TASK-283-02
**Status:** To Do

---

## Overview

Add Section-owned surface styling controls for shadows, reduced-motion-safe
effects, and visual preview controls for gradient and overlay values.

This leaf covers report findings W2, W3, U2, and U5. It must build on TASK-256
for clear/token behavior and duplicate Advanced cleanup.

## Scope Boundary

In scope:

- bounded `style.shadow` tokens beyond the current `contained` hardcoded
  `shadow-sm`;
- bounded `style.motion` tokens such as `none`, `fade`, and `slide-up` that
  respect reduced-motion preferences and do not require scroll observers or
  unsafe inline scripts;
- slider/stepper style controls for `gradientAngle` and `overlayOpacity` once
  TASK-256 removes duplicate Advanced ownership;
- a small editor preview swatch for gradient/overlay composition;
- renderer output through class maps and safe inline styles only.

Out of scope:

- cross-widget animation framework;
- scroll observers, parallax, or viewport-triggered runtime effects;
- TASK-256 gradient Clear and token-aware color picker fixes.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:66,170,281,319,359` - configurable
  shadow controls are missing beyond the current `contained` hardcoded
  `shadow-sm` output.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:67` - W3 animation/scroll effects
  missing.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:92,141,146,355` - U2 numeric-only angle and
  opacity controls.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:95` - U5 gradient/overlay preview
  missing.

## Sub-Tasks

- [ ] Extend `SectionData.style` with bounded shadow and motion/effect tokens.
- [ ] Add resolver helpers that default to current output for legacy payloads.
- [ ] Render shadows through class maps and motion through bounded classes or
  inert data markers owned by `section.tsx`; keep W3 explicitly CSS-only and do
  not introduce observer-backed behavior in this leaf.
- [ ] Replace or augment number inputs for gradient angle and overlay opacity
  with slider/stepper controls in the owning editor section.
- [ ] Add a preview swatch that derives from normalized Section data rather than
  storing extra preview-only payload.
- [ ] Add tests for normalization, SSR class output, slider updates, preview
  rendering, and reduced-motion-safe behavior.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Extend style schema/types/defaults/normalizer and render bounded shadow/motion classes. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Add shadow/motion controls, slider controls, and derived gradient/overlay preview. |
| `tests/vitest/widgets/section.test.tsx` | Add render and normalization assertions for shadow/motion tokens and legacy defaults. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Add editor interaction coverage for sliders, preview, shadow, and motion controls. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Run if this leaf touches clear/none/token-adjacent style behavior. |

## Implementation Pseudocode

Style tokens:

```ts
type SectionShadow = "none" | "sm" | "md" | "lg" | "xl";
type SectionMotion = "none" | "fade" | "slide-up";

const sectionShadowClassMap: Record<SectionShadow, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};

const sectionMotionClassMap: Record<SectionMotion, string> = {
  none: "",
  fade: "motion-safe:animate-in motion-safe:fade-in",
  "slide-up": "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
};
```

Preview data:

```ts
function resolveSectionSurfacePreview(style: SectionData["style"]): CSSProperties {
  const normalized = normalizeSectionData({ style }).style;
  return compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized?.backgroundColor),
    backgroundImage: hasGradient(normalized)
      ? `linear-gradient(${normalized.gradientAngle}deg, ${normalized.gradientFrom}, ${normalized.gradientTo})`
      : undefined,
  }) ?? {};
}
```

Error handling:

- Unknown shadow/motion values normalize to current defaults.
- Motion must use `motion-safe:*` classes or become `none` when reduced-motion
  support cannot be proven in tests.
- Scroll-triggered effects are intentionally out of scope here; if the closure
  report mentions them, record an explicit no-action/rejection rather than
  widening the runtime contract during implementation.
- Preview controls must not persist preview-only keys.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new style fields must be listed in `sectionSchema`
  with `additionalProperties: false`.
- Anti-abuse: no raw CSS animations, JavaScript snippets, arbitrary classes,
  inline event handlers, or unsafe scroll observers.
- Secret handling: no secrets in style data, preview state, or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token-adjacent behavior changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/SECTION.md` with shadow, motion, and preview behavior.
- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` rows W2, W3, U2, and U5
  after validation.

## Acceptance Criteria

- Section shadows and motion effects are bounded and backward compatible.
- Motion remains CSS-only, reduced-motion safe, and free of viewport observers.
- Angle/opacity controls are easier to operate without duplicating Advanced
  ownership.
- Gradient/overlay preview is derived from normalized data and writes no extra
  persisted state.
- Tests cover widget output and editor interactions.
