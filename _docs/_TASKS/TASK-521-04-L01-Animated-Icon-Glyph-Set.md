# TASK-521-04-L01: Curated Glyph Set + CSS Keyframes

# FileName: TASK-521-04-L01-Animated-Icon-Glyph-Set.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-04
**Priority:** Medium
**Category:** Site Render / Widgets / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Creates the NEW file
`core/services/pages/animatedIconGlyphs.tsx`: a curated map of inline-SVG glyph
components keyed by `AnimatedIconName`, plus the CSS-keyframe definitions for each
`AnimatedIconAnimation`, and a single presentational `<AnimatedIcon>` component
that composes them. NO npm dependency; all SVGs are static hand-authored literals.

## Grounded anchors

Precedent SSR-safe inline lucide set: `lucideKebabIconComponents`
(`core/widgets/core/timelineLucideIcons.ts:17`) — a `Record<string, IconComponent>`
resolved by name (`resolveTimelineDotIconValue`, `timeline.tsx:494-501`); the page
renderer already imports a small lucide subset directly
(`pageRendererV2.tsx:2` — `Check, Heart, Shield, Sparkles, Star, Zap`). Import
`animatedIconNames` / `animatedIconAnimations` / `AnimatedIconName` /
`AnimatedIconAnimation` from `pageDocumentV2.ts` (521-01). Reduced-motion CSS:
`@media (prefers-reduced-motion: reduce)` (or Tailwind `motion-safe:`/
`motion-reduce:`).

## Implementation pseudocode

```tsx
// core/services/pages/animatedIconGlyphs.tsx
import { Sparkles, Star, Heart, Zap, Check, Shield, ArrowRight, Bell, Rocket, Loader }
  from "lucide-react";                 // existing dep — reuse curated marks (no new dep)
import { animatedIconNames, type AnimatedIconName, type AnimatedIconAnimation }
  from "./pageDocumentV2";

// (1) Glyph map — EXACTLY the animatedIconNames set (compile-time exhaustive):
export const animatedIconGlyphs: Record<AnimatedIconName, LucideIcon> = {
  sparkles: Sparkles, star: Star, heart: Heart, zap: Zap, check: Check,
  shield: Shield, "arrow-right": ArrowRight, bell: Bell, rocket: Rocket, loader: Loader,
};

// (2) Per-animation class (keyframes live in a static CSS string, reduced-motion gated):
export const ANIMATED_ICON_KEYFRAMES_CSS = `
@keyframes ci-spin{to{transform:rotate(360deg)}}
@keyframes ci-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.75}}
@keyframes ci-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-18%)}}
@keyframes ci-draw{to{stroke-dashoffset:0}}
[data-anim-icon]{display:inline-flex}
@media (prefers-reduced-motion: no-preference){
  [data-anim-icon="spin"] svg{animation:ci-spin var(--anim-speed,1600ms) linear infinite}
  [data-anim-icon="pulse"] svg{animation:ci-pulse var(--anim-speed,1600ms) ease-in-out infinite}
  [data-anim-icon="bounce"] svg{animation:ci-bounce var(--anim-speed,1600ms) ease-in-out infinite}
  [data-anim-icon="draw"] svg{stroke-dasharray:64;stroke-dashoffset:64;animation:ci-draw var(--anim-speed,1600ms) ease forwards}
}`;                                    // reduce users: NO animation block matches ⇒ static glyph

// (3) Presentational component:
export function AnimatedIcon({ name, animation, size, color, speed }: {
  name: AnimatedIconName; animation: AnimatedIconAnimation;
  size: number; color: string; speed: number;
}) {
  const Glyph = animatedIconGlyphs[name] ?? animatedIconGlyphs.sparkles;   // fallback
  return (
    <span data-anim-icon={animation === "none" ? undefined : animation}
          style={{ ["--anim-speed" as string]: `${speed}ms`, color, lineHeight: 0 }}>
      <Glyph width={size} height={size} aria-hidden="true" />
    </span>
  );
}
```

**No dependency:** reuses the already-installed `lucide-react` marks (the owner's
"curated inline-SVG set"); the ANIMATION is pure CSS keyframes (self-hosted, no
Lottie). **`color`** applied via `currentColor`/inline `color` from the validated
`readSafeColor` value (521-01) — never a raw declaration. **`speed`** via the
`--anim-speed` custom property (bounded number). **Reduced-motion:** the keyframes
are inside `@media (prefers-reduced-motion: no-preference)` — reduce users get the
static glyph automatically.

## Regression-test shape (delegated to L04, asserted here)

- Glyph map keys === `animatedIconNames` (import-and-compare, guards drift);
  `ANIMATED_ICON_KEYFRAMES_CSS` contains a `prefers-reduced-motion: no-preference`
  guard and the four keyframe names; `<AnimatedIcon>` renders an `<svg>` at the
  given size + `--anim-speed`; unknown name → sparkles fallback.

## Hard Invariants

1. Glyph map exhaustive over `animatedIconNames` (compile-time `Record`).
2. Keyframes gated by `prefers-reduced-motion: no-preference` (reduce = static).
3. No new npm dependency; `color`/`speed` from validated values only.
