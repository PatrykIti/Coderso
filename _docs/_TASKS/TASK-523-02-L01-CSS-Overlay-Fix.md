# TASK-523-02-L01: Cursor-Spotlight Occlusion Fix — `PAGE_SPOTLIGHT_CSS` + Overlay

# FileName: TASK-523-02-L01-CSS-Overlay-Fix.md

**Parent Task:** TASK-523
**Parent Subtask:** TASK-523-02
**Priority:** High
**Category:** Site Render / Accessibility
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY `PAGE_SPOTLIGHT_CSS` (`pageRendererV2.tsx:2700`) and the
spotlight overlay `<div>` (`:2879-2883`): the overlay is raised ABOVE opaque section
backgrounds and blended additively (`mix-blend-mode: screen`), while keeping
`pointer-events: none`; the static positioning moves into a NON-gated base rule and
only the moving radial-gradient stays inside the reduced-motion gate. Disjoint from
523-01-L02's `rootStyle`/`<Root>`.

## Grounded anchors

`PAGE_SPOTLIGHT_CSS` (`:2700-2707`) — a single
`@media (prefers-reduced-motion: no-preference){ [data-page-spotlight]
[data-page-spotlight-overlay]{ background:radial-gradient(var(--spotlight-size,400px)
at var(--spotlight-x,50%) var(--spotlight-y,50%),
var(--spotlight-color,color-mix(in srgb,var(--primary) 14%,transparent)),
transparent 70%)} }` (module-scope `export const` STRING, emitted at `:2878` inside a
`<style data-page-spotlight-css>`; committed single-path discipline — a static string,
NOT a Tailwind arbitrary variant, because the radial-gradient carries raw commas +
multiple `var()` refs, a fragile JIT case). The overlay `<div aria-hidden="true"
data-page-spotlight-overlay className="pointer-events-none fixed inset-0 z-0" />`
(`:2879-2883`), emitted only when `spotlightOn` (`:2876`). The runtime updates
`--spotlight-x`/`--spotlight-y` on pointermove (521-01 runtime, `PAGE_EFFECTS_RUNTIME_SOURCE`).
The front sticky navigation renders at `sticky z-40` (`core/widgets/core/navigation.tsx:1728`
`navOwnsSticky && "sticky z-40"`; `core/widgets/renderers/widgetRenderer.tsx:276`
`stickyNavigationSurface && "sticky z-40"`) — the one concrete fixed-chrome case in
the codebase. Recipe (self-contained, CSS first principles — NOT an external asset;
the `_docs/projekty-domow-wow-site/assets/styles.css` `.cursor-glow` reference cited
in earlier drafts is ABSENT from this worktree): a `position:fixed` full-viewport
overlay at a `z-index` ABOVE opaque section content but STRICTLY BELOW the `z-40`
sticky nav, `mix-blend-mode:screen` (adds light, occlusion-proof), `pointer-events:none`.
**BUG:** `z-0` paints the overlay BEHIND opaque section backgrounds, so the glow only
shows through translucent SVG/glass.

## Implementation pseudocode

```ts
// (1) SPLIT PAGE_SPOTLIGHT_CSS into (a) a NON-GATED base rule that layers the overlay
//     ABOVE opaque section backgrounds and blends additively, and (b) the EXISTING
//     reduced-motion-gated radial-gradient background. The overlay carries the fixed
//     full-viewport positioning; a HIGH z-index lifts it over section content; screen
//     blend ADDS light (opaque sections no longer occlude); pointer-events:none keeps
//     clicks passing through. Reduce users get the base (correctly layered, but with
//     NO gradient painted ⇒ transparent overlay ⇒ no visible glow, nothing moves).
export const PAGE_SPOTLIGHT_CSS =
  // (a) base rule — UNGATED static positioning/layer/blend (occlusion fix):
  "[data-page-spotlight] [data-page-spotlight-overlay]{" +
  "position:fixed;inset:0;" +
  "z-index:30;" +                 // ABOVE opaque section content (was z-0), STRICTLY BELOW the front sticky nav (z-40, navigation.tsx:1728 / widgetRenderer.tsx:276) so screen-blend never composites over the menu
  "mix-blend-mode:screen;" +      // ADD light, never occlude/hide content
  "pointer-events:none" +         // never block clicks
  "}" +
  // (b) motion rule — the MOVING radial-gradient stays reduced-motion-gated:
  "@media (prefers-reduced-motion: no-preference){" +
  "[data-page-spotlight] [data-page-spotlight-overlay]{" +
  "background:radial-gradient(var(--spotlight-size,400px) at " +
  "var(--spotlight-x,50%) var(--spotlight-y,50%)," +
  "var(--spotlight-color,color-mix(in srgb,var(--primary) 14%,transparent))," +
  "transparent 70%)}" +
  "}";

// (2) Overlay <div> (:2879): DROP the `z-0` utility (the base rule now owns
//     position/inset/z-index/mix-blend-mode/pointer-events). Keep `aria-hidden` +
//     the stable `data-page-spotlight-overlay` selector hook the CSS targets. Keep
//     `pointer-events-none` on the element as belt-and-suspenders (it also matches
//     the CSS declaration), OR rely on the base rule — either way pointer-events:none
//     must be effective. Remove `fixed inset-0 z-0` from className since the base
//     rule sets position/inset/z-index (avoids a z-0 utility fighting the z-index:30
//     base rule):
<div
  aria-hidden="true"
  data-page-spotlight-overlay
  className="pointer-events-none"   // base rule owns fixed/inset/z-index/mix-blend-mode
/>
```

**Layering note (grounded):** `z-index:30` is chosen to sit ABOVE page-section
content (opaque backgrounds are in normal flow at auto/low z) while staying STRICTLY
BELOW the front sticky navigation, which renders at `sticky z-40`
(`navigation.tsx:1728`, `widgetRenderer.tsx:276`). This matters because
`mix-blend-mode:screen` is a COMPOSITING operation: at EQUAL z-index (e.g. overlay
also z-40) stacking is DOM-order dependent and the screen blend would LIGHTEN/tint the
nav bar wherever the moving glow overlaps it — a real visual regression on the primary
front menu. `pointer-events:none` still passes all clicks, and screen-blend can never
HIDE content, but it CAN recolor it; pinning the overlay one layer below the nav
(z-30 < z-40) guarantees the glow never composites over the menu. (If any future
fixed chrome shares z-30, isolate it with its own stacking context /
`isolation:isolate` + higher `z-index`.)

**Fragility of the z-30 < z-40 guarantee (nav-safety invariant — held in a test, not
just prose).** The inequality only protects the nav if the overlay's
`position:fixed;z-index:30` resolves against the SAME (viewport root) stacking context
as the nav's `sticky z-40`. That holds today because `<Root>` (className
`min-h-screen bg-white text-slate-950`, `:2856`) forms NO stacking context and the
front tree renders SiteHeader-nav and `PageDocumentRender` as sibling fragment
children with no isolating wrapper (`core/site/pageRuntimeV2.tsx:42-66`). It is
FRAGILE: any future ancestor between `<Root>` and the overlay gaining
`transform`/`filter`/`opacity<1`/`will-change`/`isolation` (522 already emits
`will-change-transform` on the parallax-inner at `:2667`) would trap the fixed overlay
in a CHILD stacking context and could float it ABOVE the nav despite z-30<z-40 —
`mix-blend-mode:screen` itself forms no stacking context but makes such a regression a
visible tint on the primary chrome. Do NOT set `isolation:isolate` on `<Root>` (it
would trap the overlay and DEFEAT this fix — the correct NON-choice). Preferred
hardening (belt-and-suspenders): pin the z-40 contract at the nav surface
(`navigation.tsx:1728` / `widgetRenderer.tsx:276`) so a future nav refactor cannot
silently lower it — either document the `z-40 > page-overlay z-30` contract at those
lines or give the nav surface its own `isolation:isolate`. AT MINIMUM, 523-02-L02
keeps the `sticky z-40` grep anchors AND a `z-index:30 < 40` inequality assertion AND
a "no stacking-context-forming style on `<Root>`" assertion in a test, so any nav
z-index change or a stacking-context regression on `<Root>` breaks a test.

## Security

No new data path — the spotlight color/size still come ONLY from the validated
`--spotlight-color`/`--spotlight-size` custom props set on the `<Root>` (521-05-L03,
`sanitizeAuthoringCssColor` at write + render). `PAGE_SPOTLIGHT_CSS` remains a STATIC
literal string (no interpolation), so this leaf introduces no injection surface. No
color/gradient reaches CSS except through the existing sanitize boundaries.

## Vitest test lane

`tests/vitest/pages/page-renderer-v2.test.tsx` (the `renderToString` SSR suite).
Delegated to 523-02-L02; asserted here.

## Regression-test shape (delegated to L02, asserted here)

- The `<style data-page-spotlight-css>` `__html` === the new `PAGE_SPOTLIGHT_CSS` and
  CONTAINS `mix-blend-mode:screen`, a raised `z-index` (> 0 but < 40 — the front
  sticky nav's z-40, e.g. `z-index:30`), `pointer-events:none`, and
  `position:fixed;inset:0` in a NON-gated base rule.
- The radial-gradient `background:` declaration remains INSIDE `@media
  (prefers-reduced-motion: no-preference)` (the moving glow stays gated).
- The overlay `<div data-page-spotlight-overlay>` no longer carries `z-0`; it is
  effectively `pointer-events:none` (className and/or the base rule).
- `cursorSpotlight` OFF ⇒ NO overlay div, NO `<style data-page-spotlight-css>`
  (byte-identical vs post-522).
- Nav-safety layering guard (fragility held in a test, not just prose): the front
  sticky nav's `sticky z-40` grep anchors (`navigation.tsx:1728` /
  `widgetRenderer.tsx:276`) are asserted so a future nav z-index drop breaks a test;
  the overlay `z-index` value is asserted STRICTLY `< 40`; and `<Root>` carries NO
  stacking-context-forming utility (no `transform`/`filter`/`opacity-`/`will-change`/
  `isolate`) between it and the fixed overlay (`isolation:isolate` is the deliberate
  NON-choice on `<Root>`).

## Hard Invariants

1. Overlay renders ABOVE opaque section backgrounds (raised z-index, e.g. `z-index:30`)
   but STRICTLY BELOW the front sticky nav (`sticky z-40`, `navigation.tsx:1728` /
   `widgetRenderer.tsx:276`) so `mix-blend-mode:screen` never tints the menu; screen
   blend adds light, never hides content; `pointer-events:none` stays. The z-30 < z-40
   guarantee depends on `<Root>` (`:2856`) forming NO stacking context (correct today);
   `isolation:isolate` is the deliberate NON-choice on `<Root>` (it would trap the
   fixed overlay). 523-02-L02 pins this in a test (nav `z-40` grep anchors +
   `z-index:30 < 40` + no-stacking-context-on-`<Root>`) so a future ancestor
   `transform`/`filter`/`opacity`/`will-change`/`isolation` regression breaks a test.
2. Static positioning (position/inset/z-index/mix-blend-mode/pointer-events) is a
   NON-gated base rule; the moving radial-gradient stays inside `@media (prefers-
   reduced-motion: no-preference)` — reduce users get a layered but MOTIONLESS
   overlay.
3. `PAGE_SPOTLIGHT_CSS` stays a STATIC string (single-path, no interpolation); the
   overlay keeps the stable `data-page-spotlight-overlay` hook + `aria-hidden`.
4. Present-only: `cursorSpotlight` OFF ⇒ byte-identical (no overlay, no style).
