# TASK-522-01-L04: Composition Effects CSS + Attr/Class Resolvers

# FileName: TASK-522-01-L04-Composition-CSS-And-Resolvers.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-01
**Priority:** High
**Category:** Site Render / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Creates NEW `core/services/pages/pageCompositionEffects.tsx`: the
static CSS string for every 522 CSS effect (float/drift/pulse/orbit keyframes,
glass/glass-grid/radial-glow/ambient-orbs surface presets, glow-reveal/lift/scale/
lift-glow hover presets, ticker keyframes, layered-canvas base, tilt glare, draw-in)
+ the pure resolvers that map a normalized `style` into class names + `data-*` +
inline CSS custom properties. NO npm dependency; mirrors 521-04's
`ANIMATED_ICON_KEYFRAMES_CSS` shape (static string + `@media (prefers-reduced-motion:
no-preference)` gating).

## Grounded anchors

- Precedent: `ANIMATED_ICON_KEYFRAMES_CSS` (521-04-L01,
  `core/services/pages/animatedIconGlyphs.tsx`) — static CSS string with the
  reduced-motion `no-preference` gate; emitted once on the front.
- Reference keyframes to replicate (`_docs/projekty-domow-wow-site/assets/styles.css`):
  `@keyframes floatChip{50%{transform:translateY(-12px)}}` (`:74`);
  `@keyframes floatOrb{50%{transform:translate3d(34px,-28px,0) scale(1.08)}}` (`:71`);
  `@keyframes pulseRing{50%{transform:scale(1.12);opacity:.68}}` (`:73`) /
  `@keyframes mapPulse{…box-shadow rings…}` (`:79`);
  `@keyframes draw{to{stroke-dashoffset:0}}` (`:72`);
  `@keyframes ticker{to{transform:translateX(-260px)}}` (`:76`).
- Glass surface: `.service-card` gradient + border + `backdrop-filter:blur` +
  box-shadow (`:77`). Grid overlay: `.blueprint-card:before` linear-gradient grid +
  radial mask (`:72`). Radial glow hover: `.service-card:after` + `:hover:after`
  (`:77`). Lift: `.project-card:hover{translateY(-6px)}` + inner `:after` scale
  (`:79`). Ambient orbs: `.hero-bg-orb` blurred radial circles (`:71`).
- Reduced-motion: `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`
  (`:83`).

## Implementation pseudocode

```tsx
// core/services/pages/pageCompositionEffects.tsx  (no runtime deps)
import type { PageBlockStyleV2, PageSectionStyleV2 } from "./pageDocumentV2";

// (1) Static CSS — emitted once by PageDocumentRender (522-05-L01), present-only.
export const PAGE_COMPOSITION_EFFECTS_CSS = `
/* layered canvas base (static; applies under reduced-motion) */
[data-composition="layered"]{position:relative}
/* SCOPED: a block carrying style.layer only goes absolute INSIDE a layered ancestor —
   outside one it stays in normal flow (matches the 522-03-L01 "inert otherwise" note). */
[data-composition="layered"] [data-layer]{position:absolute}
/* per-layer position consumes CSS custom props so pageResponsiveCss can retarget them
   per-device (522-05-L02); base props come from the frame resolver's cssVars. */
[data-composition="layered"] [data-layer]{left:var(--layer-x,auto);top:var(--layer-y,auto);z-index:var(--layer-z,auto)}
/* layered layout-block CONTENT (rendered by 522-05-L02 inside the framed
   [data-composition="layered"] ancestor): a plain, non-flex/grid pass-through with a
   min-height so an all-absolute canvas still has size. cx-layered-slot must NOT be a new
   positioned/flex context, so absolute [data-layer] children anchor to the framed ancestor. */
.cx-layered-canvas{min-height:220px}
.cx-layered-slot{display:block}
/* layer anchor → fixed translate (badges anchor right/bottom like the reference chips).
   NOTE: this transform would be OVERWRITTEN if a transform-writing effect shared the node.
   522-03-L01 keeps data-layer-anchor + data-layer + --layer-* ON THE FRAME ([data-block-id],
   so pageResponsiveCss per-device --layer-* reaches it) and moves the transform-writing
   EFFECT (tilt/float·drift·pulse·orbit/lift·scale) to an INNER descendant — so the frame's
   anchor translate here and the inner effect transform never collide (finding 4). */
[data-layer-anchor="top-left"]{transform:translate(0,0)}
[data-layer-anchor="top"]{transform:translate(-50%,0)}
[data-layer-anchor="top-right"]{transform:translate(-100%,0)}
[data-layer-anchor="left"]{transform:translate(0,-50%)}
[data-layer-anchor="center"]{transform:translate(-50%,-50%)}
[data-layer-anchor="right"]{transform:translate(-100%,-50%)}
[data-layer-anchor="bottom-left"]{transform:translate(0,-100%)}
[data-layer-anchor="bottom"]{transform:translate(-50%,-100%)}
[data-layer-anchor="bottom-right"]{transform:translate(-100%,-100%)}
/* ambient-orb base (static blurred radial circles, like .hero-bg-orb) — DRIFT animates below */
.cx-orb{position:absolute;border-radius:50%;filter:blur(46px);pointer-events:none;opacity:.55}
.cx-orb-a{width:340px;height:340px;left:-60px;top:-40px;background:radial-gradient(circle,var(--orb-color,rgba(142,232,255,.5)),transparent 66%)}
.cx-orb-b{width:300px;height:300px;right:-40px;bottom:-60px;background:radial-gradient(circle,var(--orb-color-2,rgba(199,183,255,.42)),transparent 66%)}
/* marquee viewport + track base (static; the TRACK animates below) */
.cx-marquee-viewport{overflow:hidden;width:100%}
.cx-marquee-track{display:inline-flex;flex-wrap:nowrap;white-space:nowrap;will-change:transform}
/* surface presets (STATIC — apply even under reduced-motion) */
/* Use background-IMAGE (not the `background` shorthand) for the glass gradient so an
   author-set inline `style.background`/`background-color` (which wins on specificity vs
   this attribute selector) shows THROUGH as the glass tint instead of clobbering the
   preset. --surface-glow (threaded from the section `accent` / a plain-color block
   `background` by the resolvers) retints the sheen. */
[data-surface="glass"]{background-image:linear-gradient(145deg,var(--surface-glow,rgba(255,255,255,.11)),rgba(255,255,255,.045));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.16)}
[data-surface="glass-grid"]{position:relative}
[data-surface="glass-grid"]::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(142,232,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(142,232,255,.06) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(circle at 50% 45%,#000 0 42%,transparent 78%);pointer-events:none}
[data-surface="radial-glow"]{position:relative;overflow:hidden}
[data-surface="radial-glow"]::after{content:"";position:absolute;inset:auto -30% -50% -30%;height:200px;background:radial-gradient(circle,var(--surface-glow,rgba(142,232,255,.16)),transparent 66%);pointer-events:none}
[data-surface="ambient-orbs"]{position:relative;overflow:hidden}
/* hover presets — glow-reveal opacity transition + lift/scale (motion-gated below).
   BOTH glow-reveal AND lift-glow need the positioning context + a content-bearing
   ::after so lift-glow renders its GLOW half (not just the transform lift) — the base
   rule must name lift-glow too, else its :hover::after{opacity:1} toggles an inert
   pseudo-element (no content/background/position) and the glow never appears (finding 1). */
[data-hover="glow-reveal"],[data-hover="lift-glow"]{position:relative;overflow:hidden}
[data-hover="glow-reveal"]::after,[data-hover="lift-glow"]::after{content:"";position:absolute;inset:auto -30% -50% -30%;height:160px;background:radial-gradient(circle,var(--surface-glow,rgba(142,232,255,.15)),transparent 66%);opacity:0}
/* tilt glare overlay (position driven by runtime custom props) */
[data-block-tilt] .cx-glare{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at var(--glare-x,50%) var(--glare-y,0%),rgba(255,255,255,.22),transparent 45%);opacity:0}
@media (prefers-reduced-motion: no-preference){
  @keyframes cx-float{50%{transform:translateY(-12px)}}
  @keyframes cx-drift{50%{transform:translate3d(30px,-26px,0) scale(1.06)}}
  @keyframes cx-pulse{50%{transform:scale(1.12);opacity:.7}}   /* .sun-ring/pulseRing */
  @keyframes cx-radiate{50%{box-shadow:0 0 0 26px var(--deco-ring,rgba(142,232,255,.08)),0 0 0 54px var(--deco-ring-2,rgba(142,232,255,.035))}}  /* .map-pulse/mapPulse concentric ring */
  @keyframes cx-orbit{to{transform:rotate(360deg)}}
  @keyframes cx-ticker{to{transform:translateX(-50%)}}
  @keyframes cx-draw{to{stroke-dashoffset:0}}
  [data-deco="float"]{animation:cx-float var(--deco-duration,6000ms) ease-in-out var(--deco-delay,0ms) infinite}
  [data-deco="drift"]{animation:cx-drift var(--deco-duration,12000ms) ease-in-out var(--deco-delay,0ms) infinite}
  [data-deco="pulse"]{animation:cx-pulse var(--deco-duration,5000ms) ease-in-out var(--deco-delay,0ms) infinite}
  [data-deco="radiate"]{box-shadow:0 0 0 16px var(--deco-ring,rgba(142,232,255,.12)),0 0 0 34px var(--deco-ring-2,rgba(142,232,255,.06));animation:cx-radiate var(--deco-duration,2200ms) ease-in-out var(--deco-delay,0ms) infinite}
  [data-deco="orbit"]{animation:cx-orbit var(--deco-duration,16000ms) linear var(--deco-delay,0ms) infinite}
  /* animate the TRACK, not the block-frame wrapper (which is the overflow:hidden
     viewport's parent) — 522-05-L04 renders .cx-marquee-viewport > .cx-marquee-track,
     so target the track by class or [data-marquee] would translate the clip window. */
  [data-marquee] .cx-marquee-track{animation:cx-ticker var(--marquee-speed,18s) linear infinite}
  [data-marquee][data-marquee-dir="right"] .cx-marquee-track{animation-direction:reverse}
  /* length-INDEPENDENT draw-in: renderer/sanitizer inject pathLength="1" on stroke
     shapes (522-02-L01 + L02 allowlist), so dasharray/offset:1 completes for ANY
     pasted SVG regardless of true path length (CSS cannot call getTotalLength). */
  [data-draw-in] path,[data-draw-in] line,[data-draw-in] polyline{stroke-dasharray:1;stroke-dashoffset:1;animation:cx-draw var(--draw-speed,2400ms) ease forwards}
  [data-block-tilt]{transition:transform .18s ease}
  [data-block-tilt] .cx-glare{transition:opacity .2s ease}
  [data-block-tilt]:hover .cx-glare{opacity:1}
  [data-hover="glow-reveal"]::after,[data-hover="lift-glow"]::after{transition:opacity .25s ease}
  [data-hover="glow-reveal"]:hover::after,[data-hover="lift-glow"]:hover::after{opacity:1}
  [data-hover="lift"],[data-hover="lift-glow"]{transition:transform .25s ease,border-color .25s ease}
  [data-hover="lift"]:hover,[data-hover="lift-glow"]:hover{transform:translateY(-6px)}
  [data-hover="scale"]{transition:transform .25s ease}
  [data-hover="scale"]:hover{transform:scale(1.03)}
}
/* tilt needs a perspective parent + preserve-3d (STATIC, safe under reduce) */
[data-tilt-parent]{perspective:1200px}
[data-block-tilt]{transform-style:preserve-3d;position:relative}
`;

// (2) Resolver — pure; maps normalized block.style → wrapper props. Present-only:
//     returns {} when no composition field is set (byte-identity).
export function resolveBlockCompositionAttrs(style?: PageBlockStyleV2): {
  className?: string; dataAttrs: Record<string,string>; cssVars: Record<string,string>;
  perspectiveParent: boolean; glare: boolean; ambientOrbs: boolean;
} {
  const dataAttrs: Record<string,string> = {}; const cssVars: Record<string,string> = {};
  if (!style) return { dataAttrs, cssVars, perspectiveParent:false, glare:false, ambientOrbs:false };
  // Author retint (BLOCKS): PageBlockStyleV2 has NO `accent` field — accent is section-only
  // (pageDocumentV2.ts:444). A block retints off its EXISTING `style.background`, which is
  // write-validated by readOptionalSafeBackground (pageDocumentV2.ts), so reading it here
  // injects only a whitelisted value, never raw CSS (parent Security Contract §2). BUT
  // `background` may be a GRADIENT/image URL, and threading a gradient into the color slot of
  // `radial-gradient(circle, <glow>, …)` is INVALID CSS (silently drops the glow). So only a
  // PLAIN-color background seeds the glow; a gradient/url background is left OUT and the CSS
  // falls back to the reference aqua/violet literal (finding 4). Sections use their real
  // `accent` (resolveSectionCompositionAttrs below); blocks use background.
  const bg = style.background ?? undefined;                      // write-validated (may be gradient)
  const glow = bg && !/gradient|url\(/i.test(bg) ? bg : undefined; // plain-color only → safe in radial-gradient()
  const needsGlow = !!style.surfacePreset || !!style.hoverEffect
    || style.decoration?.motion === "radiate" || style.decoration?.motion === "pulse"
    || style.decoration?.motion === "drift" || style.decoration?.motion === "float";
  if (glow && needsGlow) {
    cssVars["--surface-glow"] = glow;                            // radial-glow/glow-reveal/glass sheen
    cssVars["--deco-ring"] = glow;                               // cx-radiate concentric ring
    cssVars["--orb-color"] = glow;                               // ambient-orb / drift orb
  }
  if (style.decoration) {
    dataAttrs["data-deco"] = style.decoration.motion;
    if (style.decoration.delay != null) cssVars["--deco-delay"] = `${style.decoration.delay}ms`;
    if (style.decoration.duration != null) cssVars["--deco-duration"] = `${style.decoration.duration}ms`;
  }
  if (style.surfacePreset) dataAttrs["data-surface"] = style.surfacePreset;
  if (style.hoverEffect) dataAttrs["data-hover"] = style.hoverEffect;
  if (style.composition === "layered") dataAttrs["data-composition"] = "layered";
  if (style.marquee) {
    dataAttrs["data-marquee"] = "";                     // presence attr
    if (style.marquee.direction === "right") dataAttrs["data-marquee-dir"] = "right";
    if (style.marquee.speed != null) cssVars["--marquee-speed"] = `${style.marquee.speed}s`;
  }
  if (style.layer) {
    dataAttrs["data-layer"] = "";
    // Emit position as CSS CUSTOM PROPS (not raw left/top/zIndex) so pageResponsiveCss
    // (522-05-L02) can retarget them per-device with `!important` deltas; the base CSS
    // `[data-composition="layered"] [data-layer]{left:var(--layer-x)…}` consumes them.
    if (style.layer.x != null) cssVars["--layer-x"] = `${style.layer.x}%`;
    if (style.layer.y != null) cssVars["--layer-y"] = `${style.layer.y}%`;
    if (style.layer.z != null) cssVars["--layer-z"] = String(style.layer.z);
    // anchor → a fixed translate via data-layer-anchor (CSS rules in the static block).
    // NOTE: data-layer/data-layer-anchor/--layer-* stay on the FRAME ([data-block-id]) in
    // 522-03-L01 (so pageResponsiveCss's per-device --layer-* on [data-block-id] reaches
    // them); the transform-writing effect is moved to an INNER descendant instead, so the
    // frame's anchor translate is never clobbered by the effect transform (finding 4).
    if (style.layer.anchor) dataAttrs["data-layer-anchor"] = style.layer.anchor;
  }
  const tilt = style.tilt && style.tilt !== "none" ? style.tilt : undefined;
  if (tilt) { dataAttrs["data-block-tilt"] = tilt; }
  // ambient-orbs on a BLOCK needs injected child spans (glass/glass-grid/radial-glow
  // self-paint via ::before/::after, but orbs are real .cx-orb elements). The frame
  // render (522-03-L01) emits 2 aria-hidden .cx-orb spans when this flag is true,
  // mirroring the section emit (522-05-L01). Without the spans a block ambient-orbs
  // surface would render inert (empty), contradicting parent Acceptance #5.
  return {
    dataAttrs, cssVars, perspectiveParent: !!tilt,
    glare: !!style.tiltGlare && !!tilt,
    ambientOrbs: style.surfacePreset === "ambient-orbs",
  };
}

// (3) Section resolver (surface + composition + ambient-orb count) — symmetric to the
//     block resolver, INCLUDING the same write-validated color threading so a themed
//     section retints its glass/glow/orb surfaces (parent Security Contract §2). Present-only.
export function resolveSectionCompositionAttrs(style?: PageSectionStyleV2): {
  dataAttrs: Record<string,string>; cssVars: Record<string,string>; ambientOrbs: boolean;
} {
  const dataAttrs: Record<string,string> = {}; const cssVars: Record<string,string> = {};
  if (!style) return { dataAttrs, cssVars, ambientOrbs:false };
  if (style.surfacePreset) dataAttrs["data-surface"] = style.surfacePreset;
  if (style.composition === "layered") dataAttrs["data-composition"] = "layered";
  // SECTIONS have a real `accent` field (readSafeColor-validated at write,
  // normalizeSectionStyle) — thread it directly. (No `?? style.background` fallback: section
  // `background` is readOptionalSafeBackground-validated and may be a GRADIENT, invalid in
  // radial-gradient()'s color slot — same hazard the block resolver guards. accent is
  // defaulted on every full section style, so this always retints a themed section.)
  const glow = style.accent;
  if (glow && style.surfacePreset) {
    cssVars["--surface-glow"] = glow; cssVars["--deco-ring"] = glow; cssVars["--orb-color"] = glow;
  }
  return { dataAttrs, cssVars, ambientOrbs: style.surfacePreset === "ambient-orbs" };
}

// (4) Draw-in attr for the customSvg block (used by 522-02-L01):
export function resolveDrawInAttrs(drawIn?: boolean, drawSpeed?: number) {
  if (!drawIn) return { dataAttrs:{}, cssVars:{} };
  return { dataAttrs:{ "data-draw-in":"" }, cssVars: drawSpeed != null ? { "--draw-speed":`${drawSpeed}ms` } : {} };
}
// NOTE: length-independent draw-in relies on `pathLength="1"` being present on the
// customSvg's stroke shapes. 522-02-L01's renderer injects `pathLength="1"` onto every
// <path>/<line>/<polyline> of the sanitized SVG when drawIn is on (pathLength is
// allowlisted in 522-01-L02) so the CSS `stroke-dasharray:1;stroke-dashoffset:1`
// completes for ARBITRARY pasted SVGs (a fixed dash of 900 only worked for the
// reference-sized paths). Degrade: without pathLength the draw is still bounded.
```

**Design notes.** Surface/glass/grid/glow are STATIC (apply under reduced-motion —
only the ambient-orb DRIFT, hover TRANSITION, ticker, decoration, draw-in, and tilt
transition sit inside the `no-preference` block). All animated bindings gate on
`prefers-reduced-motion: no-preference` (reduce users → static). **Color threading is
DELIVERED, not just promised:** BOTH resolvers thread a write-validated color into
`--surface-glow` / `--deco-ring` / `--orb-color` whenever a surface/hover/glow/radiate/
pulse/drift/float effect is set — SECTIONS use their real `accent` field
(`readSafeColor`-validated, `pageDocumentV2.ts:444/2249`); BLOCKS (which have NO `accent`
field) use their `style.background`, but ONLY when it is a plain color — a gradient/url
background is left out (threading a gradient into `radial-gradient(circle,<glow>,…)` is
invalid CSS). The glass/grid/radial-glow/orb/radiate CSS consumes those custom props with
the reference aqua/violet literals as FALLBACKS, so an unthemed block is byte-identical
while a themed page retints its premium surfaces. `style.accent` (section) is
`readSafeColor`-validated and `style.background` (block) is `readOptionalSafeBackground`-
validated at the write boundary, so only whitelisted values reach the custom prop — never
raw declarations (parent Security Contract §2). The glass preset paints its gradient via
`background-image` (not the `background` shorthand) so an author's inline `background`
tints through the glass instead of clobbering it. The resolvers are present-only: an
unstyled block/section yields empty attrs+vars → byte-identical wrapper.

## Regression-test shape (delegated to 522-01-L06, asserted here)

- `PAGE_COMPOSITION_EFFECTS_CSS` contains the `prefers-reduced-motion: no-preference`
  gate and every keyframe (`cx-float/drift/pulse/radiate/orbit/ticker/draw`); the
  surface preset blocks, `.cx-orb`/`.cx-marquee-*`/`.cx-layered-canvas`/`.cx-layered-slot`
  base rules, `[data-layer-anchor=…]` transforms, and the scoped
  `[data-composition="layered"] [data-layer]` rule are
  OUTSIDE the `no-preference` gate (static); the marquee animation targets
  `.cx-marquee-track` (NOT `[data-marquee] > *`); draw-in uses `stroke-dasharray:1`.
- The CSS includes all 9 `[data-layer-anchor="…"]` transform rules.
- `resolveBlockCompositionAttrs(undefined)` → empty attrs/vars (byte-identity);
  a decoration/tilt/marquee/layer/surface/hover style → the expected `data-*` +
  vars (`layer` → `--layer-x/y/z` custom props + `data-layer` + `data-layer-anchor`,
  NOT raw left/top); `perspectiveParent`/`glare`/`ambientOrbs` flags correct
  (`surfacePreset:"ambient-orbs"` → `ambientOrbs:true`; other/undefined surfaces →
  `ambientOrbs:false`).
- **Hover glow both halves (finding 1):** the CSS defines a `content`-bearing
  `::after` (with `position:absolute` + `radial-gradient` background) for BOTH
  `[data-hover="glow-reveal"]::after` AND `[data-hover="lift-glow"]::after`, and BOTH
  carry `position:relative;overflow:hidden` — so `lift-glow` renders its glow half, not
  just the transform lift (assert the base `::after` selector list names `lift-glow`,
  not only `glow-reveal`).
- **Color threading (finding 4/5):** a BLOCK with `surfacePreset:"radial-glow"` +
  a PLAIN-color `background:"#ff0088"` → `cssVars["--surface-glow"]==="#ff0088"` (and
  `--deco-ring`/`--orb-color`); same block with a GRADIENT background
  (`"linear-gradient(...)"`) → NO `--surface-glow` key (invalid in `radial-gradient()`;
  CSS falls back to the literal); a block with NO background → NO `--surface-glow` key.
  A SECTION threads its real `accent` (`accent:"#ff0088"` → `--surface-glow`). Blocks have
  NO `accent` field, so the resolver reads `style.background` (typecheck-safe). `[data-surface="glass"]`
  CSS uses `background-image` (asserted) so an inline `background` does not clobber it.
- **Lane:** Vitest `tests/vitest/pages/page-composition-effects.test.ts`.

## Hard Invariants

1. Static CSS string + pure resolvers; no dependency; no runtime work here.
2. Animated bindings gated by `prefers-reduced-motion: no-preference`; surfaces
   static.
3. Present-only resolvers (empty in → empty out).
4. Colors only via validated custom props.
</content>
