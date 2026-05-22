# TASK-283-05: Section Surface Shadow Motion and Preview Controls

# FileName: TASK-283-05_Section_Surface_Shadow_Motion_and_Preview_Controls.md

**Priority:** Medium
**Category:** Widgets + Section + Style + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-256-05-01, TASK-283, TASK-283-02, TASK-326
**Status:** In Progress (2026-05-21)

---

## Overview

Add Section-owned surface styling controls for shadows, reduced-motion-safe
effects, and visual preview controls for gradient and overlay values.

This parent leaf covers report findings W2, W3, U2, and U5 and is now
split between `TASK-283-05-01` and `TASK-283-05-02`.

`TASK-283-05-01` closes the widget-local shadow, CSS-only motion, and preview
owners. `TASK-283-05-02` keeps the remaining angle/opacity slider UX behind
shared `TASK-326` duplicate-owner cleanup.

## Scope Boundary

In scope:

- bounded `style.shadow` tokens beyond the current `contained` hardcoded
  `shadow-sm`;
- bounded `style.motion` tokens such as `none`, `fade`, and `slide-up` that
  respect reduced-motion preferences and do not require scroll observers or
  unsafe inline scripts;
- slider/stepper style controls for `gradientAngle` and `overlayOpacity` only
  after `TASK-326` removes duplicate Visual/Advanced ownership;
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

## Execution Split

- `TASK-283-05-01` (Done, 2026-05-21) closes W2, the bounded CSS-only W3
  scope, and U5 with widget-local shadow, motion, and preview owners.
- `TASK-283-05-02` (To Do) keeps U2 for the final angle/opacity slider
  contract after shared `TASK-326` removes the duplicate Visual/Advanced owner.

## Sub-Tasks

- [x] `TASK-283-05-01` extends `SectionData.style` with bounded `shadow` and
  `motion` tokens plus legacy-safe resolver helpers.
- [x] `TASK-283-05-01` renders shadow and motion through bounded class maps and
  deterministic data markers without observers or preview-only persisted state.
- [x] `TASK-283-05-01` adds a derived preview swatch that reflects normalized
  Section background, gradient, overlay, border, radius, and effective shadow
  values.
- [ ] `TASK-283-05-02` replaces the remaining `gradientAngle` /
  `overlayOpacity` number inputs with slider/stepper controls after `TASK-326`.
- [x] `TASK-283-05-01` adds focused runtime/editor tests for normalization, SSR
  class output, contained shadow fallback, preview rendering, and
  reduced-motion-safe behavior.
- [ ] `TASK-283-05-02` adds the final slider interaction coverage once the
  shared owner cleanup lands.

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
- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` rows W2, W3, and U5
  after `TASK-283-05-01`, and keep U2 explicitly mapped to
  `TASK-283-05-02` after `TASK-326`.

## Acceptance Criteria

- Section shadows and motion effects are bounded and backward compatible.
- Motion remains CSS-only, reduced-motion safe, and free of viewport observers.
- Angle/opacity controls are easier to operate without duplicating Advanced
  ownership.
- Gradient/overlay preview is derived from normalized data and writes no extra
  persisted state.
- Tests cover widget output and editor interactions.
