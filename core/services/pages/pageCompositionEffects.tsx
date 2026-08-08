/**
 * TASK-522-01-L04 — composition-effects static CSS + pure attr/class resolvers.
 *
 * The static CSS string (`PAGE_COMPOSITION_EFFECTS_CSS`) carries every 522 CSS
 * effect (float/drift/pulse/radiate/orbit keyframes, glass/glass-grid/
 * radial-glow/ambient-orbs surface presets, glow-reveal/lift/scale/lift-glow
 * hover presets, ticker keyframes, layered-canvas base, tilt glare, draw-in) —
 * emitted once by `PageDocumentRender` (522-05-L01), present-only. It mirrors
 * 521-04's `ANIMATED_ICON_KEYFRAMES_CSS` shape: a static string whose ANIMATED
 * bindings sit inside a `@media (prefers-reduced-motion: no-preference)` gate
 * (surfaces stay static, so reduce users keep the premium look minus motion).
 *
 * The resolvers are PURE and PRESENT-ONLY: they map a normalized `style` into
 * class names + `data-*` + inline CSS custom properties, returning empty output
 * when no composition field is set (byte-identity). Colors reach CSS only as
 * validated custom properties (parent Security Contract §2): sections thread
 * their `readSafeColor`-validated `accent`; blocks thread a PLAIN-color
 * `readOptionalSafeBackground`-validated `background` (a gradient/url background
 * is left out — invalid inside `radial-gradient()`).
 */

import { sanitizeAuthoringCssColor } from "./pageAuthoringSanitizers";
import type {
  PageBlockStyleV2,
  PageBlockV2,
  PageDocumentV2,
  PageSectionStyleV2,
} from "./pageDocumentV2";

// (1) Static CSS — emitted once by PageDocumentRender (522-05-L01), present-only.
export const PAGE_COMPOSITION_EFFECTS_CSS = `
/* layered canvas base (static; applies under reduced-motion) */
[data-composition="layered"]{position:relative}
/* SCOPED: a block carrying style.layer only goes absolute INSIDE a layered
   ancestor — outside one it stays in normal flow. */
[data-composition="layered"] [data-layer]{position:absolute}
[data-composition="layered"] [data-layer]{left:var(--layer-x,auto);top:var(--layer-y,auto);z-index:var(--layer-z,auto)}
/* layered layout-block CONTENT (rendered by 522-05-L02 inside the framed
   [data-composition="layered"] ancestor): a plain pass-through with a min-height
   so an all-absolute canvas still has size. cx-layered-slot must NOT be a new
   positioned/flex context. */
.cx-layered-canvas{min-height:220px}
.cx-layered-slot{display:block}
/* layer anchor -> fixed self-offset on the independent CSS translate PROPERTY
   (524-01-L01). Using the translate property (not transform:translate()) frees the
   anchor offset from the transform channel so a transform-based EFFECT (float/lift
   keyframe) can co-locate on the SAME node without clobbering the offset — the
   glass surface floats WITH its content (524-01-L02). Offsets are identical. */
[data-layer-anchor="top-left"]{translate:0 0}
[data-layer-anchor="top"]{translate:-50% 0}
[data-layer-anchor="top-right"]{translate:-100% 0}
[data-layer-anchor="left"]{translate:0 -50%}
[data-layer-anchor="center"]{translate:-50% -50%}
[data-layer-anchor="right"]{translate:-100% -50%}
[data-layer-anchor="bottom-left"]{translate:0 -100%}
[data-layer-anchor="bottom"]{translate:-50% -100%}
[data-layer-anchor="bottom-right"]{translate:-100% -100%}
/* ambient-orb base (static blurred radial circles, like .hero-bg-orb) — DRIFT animates below */
.cx-orb{position:absolute;border-radius:50%;filter:blur(46px);pointer-events:none;opacity:.55}
.cx-orb-a{width:340px;height:340px;left:-60px;top:-40px;background:radial-gradient(circle,var(--orb-color,rgba(142,232,255,.5)),transparent 66%)}
.cx-orb-b{width:300px;height:300px;right:-40px;bottom:-60px;background:radial-gradient(circle,var(--orb-color-2,rgba(199,183,255,.42)),transparent 66%)}
/* marquee viewport + track base (static; the TRACK animates below) */
.cx-marquee-viewport{overflow:hidden;width:100%}
.cx-marquee-track{display:inline-flex;flex-wrap:nowrap;white-space:nowrap;will-change:transform}
/* surface presets (STATIC — apply even under reduced-motion). Use
   background-IMAGE (not the shorthand) so an author-set inline background shows
   THROUGH as the glass tint instead of clobbering the preset.
   524-03 radius-clip: the surface node carries the inline border-radius
   (style.radius / section radius) AND, after 524-01-L02, the transform-writing
   effect (float/lift/tilt). A backdrop-filter/::before grid layer paints to the
   node's SQUARE box, so the moment the node tilts/floats it exposes SHARP corners
   past the rounded card. overflow:hidden clips the node's own box to its inline
   border-radius throughout the transform. Safe for anchored chips: those are
   [data-layer] SIBLINGS inside .cx-layered-canvas, NOT DOM children of this
   glass card, so they are never clipped (radial-glow/ambient-orbs already clip
   this way with their bleeding ::after). */
[data-surface="glass"]{background-image:linear-gradient(145deg,var(--surface-glow,rgba(255,255,255,.11)),rgba(255,255,255,.045));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.16);overflow:hidden}
[data-surface="glass-grid"]{position:relative;overflow:hidden}
[data-surface="glass-grid"]::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(142,232,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(142,232,255,.06) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(circle at 50% 45%,#000 0 42%,transparent 78%);pointer-events:none}
[data-surface="radial-glow"]{position:relative;overflow:hidden}
[data-surface="radial-glow"]::after{content:"";position:absolute;inset:auto -30% -50% -30%;height:200px;background:radial-gradient(circle,var(--surface-glow,rgba(142,232,255,.16)),transparent 66%);pointer-events:none}
[data-surface="ambient-orbs"]{position:relative;overflow:hidden}
/* hover presets — glow-reveal opacity transition + lift/scale (motion-gated
   below). BOTH glow-reveal AND lift-glow need the positioning context + a
   content-bearing ::after so lift-glow renders its GLOW half. */
[data-hover="glow-reveal"],[data-hover="lift-glow"]{position:relative;overflow:hidden}
[data-hover="glow-reveal"]::after,[data-hover="lift-glow"]::after{content:"";position:absolute;inset:auto -30% -50% -30%;height:160px;background:radial-gradient(circle,var(--surface-glow,rgba(142,232,255,.15)),transparent 66%);opacity:0}
/* tilt glare overlay (position driven by runtime custom props) */
[data-block-tilt] .cx-glare{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at var(--glare-x,50%) var(--glare-y,0%),rgba(255,255,255,.22),transparent 45%);opacity:0}
@media (prefers-reduced-motion: no-preference){
  @keyframes cx-float{50%{transform:translateY(-12px)}}
  @keyframes cx-drift{50%{transform:translate3d(30px,-26px,0) scale(1.06)}}
  @keyframes cx-pulse{50%{transform:scale(1.12);opacity:.7}}
  @keyframes cx-radiate{50%{box-shadow:0 0 0 26px var(--deco-ring,rgba(142,232,255,.08)),0 0 0 54px var(--deco-ring-2,rgba(142,232,255,.035))}}
  @keyframes cx-orbit{to{transform:rotate(360deg)}}
  @keyframes cx-ticker{to{transform:translateX(-50%)}}
  @keyframes cx-draw{to{stroke-dashoffset:0}}
  [data-deco="float"]{animation:cx-float var(--deco-duration,6000ms) ease-in-out var(--deco-delay,0ms) infinite}
  [data-deco="drift"]{animation:cx-drift var(--deco-duration,12000ms) ease-in-out var(--deco-delay,0ms) infinite}
  [data-deco="pulse"]{animation:cx-pulse var(--deco-duration,5000ms) ease-in-out var(--deco-delay,0ms) infinite}
  [data-deco="radiate"]{box-shadow:0 0 0 16px var(--deco-ring,rgba(142,232,255,.12)),0 0 0 34px var(--deco-ring-2,rgba(142,232,255,.06));animation:cx-radiate var(--deco-duration,2200ms) ease-in-out var(--deco-delay,0ms) infinite}
  [data-deco="orbit"]{animation:cx-orbit var(--deco-duration,16000ms) linear var(--deco-delay,0ms) infinite}
  /* animate the TRACK, not the overflow:hidden viewport */
  [data-marquee] .cx-marquee-track{animation:cx-ticker var(--marquee-speed,18s) linear infinite}
  [data-marquee][data-marquee-dir="right"] .cx-marquee-track{animation-direction:reverse}
  /* length-INDEPENDENT draw-in: the renderer/sanitizer inject pathLength="1" on
     stroke shapes so dasharray/offset:1 completes for ANY pasted SVG. */
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
/* tilt frame needs preserve-3d (STATIC, safe under reduce); the perspective
   PARENT gets an inline perspective:1200px on the [data-tilt-parent] wrapper
   in pageRendererV2 (withTiltParent), so no CSS rule is needed for it here. */
[data-block-tilt]{transform-style:preserve-3d;position:relative}
`;

export type PageBlockCompositionAttrs = {
  dataAttrs: Record<string, string>;
  cssVars: Record<string, string>;
  perspectiveParent: boolean;
  glare: boolean;
  ambientOrbs: boolean;
};

export type PageSectionCompositionAttrs = {
  dataAttrs: Record<string, string>;
  cssVars: Record<string, string>;
  ambientOrbs: boolean;
};

const isGradientOrUrl = (value: string): boolean => /gradient|url\(/i.test(value);

// (2) Block resolver — pure; present-only (empty in → empty out).
export function resolveBlockCompositionAttrs(style?: PageBlockStyleV2): PageBlockCompositionAttrs {
  const dataAttrs: Record<string, string> = {};
  const cssVars: Record<string, string> = {};
  if (!style) {
    return { dataAttrs, cssVars, perspectiveParent: false, glare: false, ambientOrbs: false };
  }
  // Author retint (BLOCKS): TASK-524-02 lets a block seed the glow from an
  // INDEPENDENT `style.surfaceTint` (sanitized plain color at write). It takes
  // PRECEDENCE; the 522 `style.background`-derived value stays a FALLBACK only
  // when no `surfaceTint` is authored. Only a PLAIN color seeds the glow (a
  // gradient/url is invalid inside radial-gradient() and is left out → CSS
  // falls back to the reference literal); the `isGradientOrUrl` guard on the
  // sanitized tint is defence-in-depth (a `var(--x)`/hex/rgba tint passes it).
  const bg = style.background ?? undefined;
  const bgGlow = bg && !isGradientOrUrl(bg) ? bg : undefined;
  const tintGlow =
    style.surfaceTint && !isGradientOrUrl(style.surfaceTint) ? style.surfaceTint : undefined;
  // DEFENCE-IN-DEPTH render parity (TASK-535): the glow source is validated at
  // WRITE (readOptionalSafeColor / readOptionalSafeBackground), but these resolvers
  // run at RENDER and thread the value straight into a `style` CSS custom prop.
  // Re-sanitize here exactly as the spotlight color / canvas background do at
  // render (pageRendererV2 `sanitizeAuthoringCssColor(effects?.spotlightColor)`),
  // so a value that somehow bypassed the write boundary cannot reach the DOM as a
  // `;`-delimited CSS injection. A write-sanitized plain color passes unchanged
  // (behaviour identical for valid input); an unexpected value drops the glow.
  const glow = sanitizeAuthoringCssColor(tintGlow ?? bgGlow) ?? undefined;
  const motion = style.decoration?.motion;
  const needsGlow =
    !!style.surfacePreset ||
    !!style.hoverEffect ||
    motion === "radiate" ||
    motion === "pulse" ||
    motion === "drift" ||
    motion === "float";
  if (glow && needsGlow) {
    cssVars["--surface-glow"] = glow;
    cssVars["--deco-ring"] = glow;
    cssVars["--orb-color"] = glow;
  }
  if (style.decoration) {
    dataAttrs["data-deco"] = style.decoration.motion;
    if (style.decoration.delay != null) cssVars["--deco-delay"] = `${style.decoration.delay}ms`;
    if (style.decoration.duration != null) {
      cssVars["--deco-duration"] = `${style.decoration.duration}ms`;
    }
  }
  if (style.surfacePreset) dataAttrs["data-surface"] = style.surfacePreset;
  if (style.hoverEffect) dataAttrs["data-hover"] = style.hoverEffect;
  if (style.composition === "layered") dataAttrs["data-composition"] = "layered";
  if (style.marquee) {
    dataAttrs["data-marquee"] = ""; // presence attr
    if (style.marquee.direction === "right") dataAttrs["data-marquee-dir"] = "right";
    if (style.marquee.speed != null) cssVars["--marquee-speed"] = `${style.marquee.speed}s`;
  }
  if (style.layer) {
    dataAttrs["data-layer"] = "";
    // Emit position as CSS CUSTOM PROPS (not raw left/top/zIndex) so
    // pageResponsiveCss (522-05-L02) can retarget them per-device; the base CSS
    // `[data-composition="layered"] [data-layer]{left:var(--layer-x)…}` consumes.
    if (style.layer.x != null) cssVars["--layer-x"] = `${style.layer.x}%`;
    if (style.layer.y != null) cssVars["--layer-y"] = `${style.layer.y}%`;
    if (style.layer.z != null) cssVars["--layer-z"] = String(style.layer.z);
    if (style.layer.anchor) dataAttrs["data-layer-anchor"] = style.layer.anchor;
  }
  const tilt = style.tilt && style.tilt !== "none" ? style.tilt : undefined;
  if (tilt) dataAttrs["data-block-tilt"] = tilt;
  return {
    dataAttrs,
    cssVars,
    perspectiveParent: !!tilt,
    glare: !!style.tiltGlare && !!tilt,
    ambientOrbs: style.surfacePreset === "ambient-orbs",
  };
}

// (3) Section resolver — symmetric; sections have a real `accent` field.
export function resolveSectionCompositionAttrs(
  style?: PageSectionStyleV2
): PageSectionCompositionAttrs {
  const dataAttrs: Record<string, string> = {};
  const cssVars: Record<string, string> = {};
  if (!style) return { dataAttrs, cssVars, ambientOrbs: false };
  if (style.surfacePreset) dataAttrs["data-surface"] = style.surfacePreset;
  if (style.composition === "layered") dataAttrs["data-composition"] = "layered";
  // SECTIONS thread their real `accent` (readSafeColor-validated at write). No
  // `?? background` fallback: section background may be a GRADIENT (invalid in
  // radial-gradient()'s color slot). DEFENCE-IN-DEPTH render parity (TASK-535):
  // re-sanitize at RENDER exactly as spotlight/canvas-bg do (this resolver threads
  // the value into a `style` custom prop). A write-sanitized color passes
  // unchanged; an unexpected value drops the glow (present-only).
  const glow = sanitizeAuthoringCssColor(style.accent) ?? undefined;
  if (glow && style.surfacePreset) {
    cssVars["--surface-glow"] = glow;
    cssVars["--deco-ring"] = glow;
    cssVars["--orb-color"] = glow;
  }
  return { dataAttrs, cssVars, ambientOrbs: style.surfacePreset === "ambient-orbs" };
}

// (4) Draw-in attrs for the customSvg block (used by 522-02-L01).
export function resolveDrawInAttrs(
  drawIn?: boolean,
  drawSpeed?: number
): { dataAttrs: Record<string, string>; cssVars: Record<string, string> } {
  if (!drawIn) return { dataAttrs: {}, cssVars: {} };
  return {
    dataAttrs: { "data-draw-in": "" },
    cssVars: drawSpeed != null ? { "--draw-speed": `${drawSpeed}ms` } : {},
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ── TASK-534 ── declarative-interactivity CSS + runtime-surface resolver.
//
// PAGE_INTERACTIVITY_CSS is a STATIC string (no author input, no interpolation) —
// the only dynamic values it reacts to are renderer-set bounded `data-*`/`aria-*`
// attributes (validated enums/booleans). `var(--primary)` is a design token, not
// author input. The FUNCTIONAL show/hide rules (`[hidden]`/`.is-hidden` →
// `display:none`) sit OUTSIDE the reduced-motion guard so tabs/filters still WORK
// (instant) for reduce users; every ANIMATED (transition/opacity) rule is inside
// `@media (prefers-reduced-motion: no-preference)`. Emitted present-only by the
// renderer (534-02), so a no-interactivity page carries none of this.
// ══════════════════════════════════════════════════════════════════════════════
export const PAGE_INTERACTIVITY_CSS = [
  // switcher tab bar — scrolls horizontally on mobile (segmented controls must
  // scroll, not wrap awkwardly), no visible scrollbar chrome.
  "[data-switcher] .cx-switcher-tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}",
  "[data-switcher] .cx-switcher-tabs::-webkit-scrollbar{display:none}",
  "[data-switcher] [data-switcher-tab]{cursor:pointer;white-space:nowrap;border:0;background:transparent;padding:6px 14px;color:inherit;font:inherit}",
  "[data-switcher] [data-switcher-tab]:focus-visible{outline:2px solid var(--primary);outline-offset:2px}",
  // pill vs underline selected state (token color only).
  "[data-switcher-variant='pill'] [data-switcher-tab][aria-selected='true']{background:var(--primary);color:#fff;border-radius:999px}",
  "[data-switcher-variant='underline'] [data-switcher-tab][aria-selected='true']{border-bottom:2px solid var(--primary)}",
  // FUNCTIONAL show/hide (OUTSIDE the reduced-motion guard — tabs work for reduce).
  "[data-switcher-panel][hidden]{display:none}",
  // panel crossfade — motion-safe only; reduce users get instant show/hide.
  "@media (prefers-reduced-motion: no-preference){[data-switcher-panel]{opacity:0;transition:opacity .25s ease}[data-switcher-panel][data-active='true']{opacity:1}}",
  // Pointer lift is a visible affordance for authored switcher controls. Keep
  // the transform and its transition entirely motion-gated; keyboard focus is
  // represented by the non-motion outline above.
  "@media (prefers-reduced-motion: no-preference){[data-switcher] [data-switcher-tab]{transition:transform .15s ease}[data-switcher] [data-switcher-tab]:hover{transform:translateY(-2px)}}",
  "@media (prefers-reduced-motion: reduce){[data-switcher] [data-switcher-tab]{transform:none}}",
  // filter chip bar.
  "[data-gallery-filter]{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}",
  "[data-gallery-filter] .cx-filter-chip{cursor:pointer;border:1px solid var(--primary);background:transparent;color:inherit;border-radius:999px;padding:4px 12px;font:inherit}",
  "[data-gallery-filter] .cx-filter-chip[aria-pressed='true']{background:var(--primary);color:#fff}",
  // FUNCTIONAL hide (OUTSIDE the reduced-motion guard — filters work for reduce).
  "[data-filter-item].is-hidden{display:none}",
  "@media (prefers-reduced-motion: no-preference){[data-filter-item]{transition:opacity .2s ease}}",
  // magnetic — transform transition on leave (runtime sets transform on move).
  "@media (prefers-reduced-motion: no-preference){[data-magnetic]{transition:transform .15s ease;will-change:transform}}",
].join("");

/**
 * TASK-534 — whether a block authors a RUNTIME-BEARING interactivity surface (a
 * `switcher`, a filterable `gallery`, or `style.magnetic`). Recurses through nested
 * slots (incl. the new `panel:N` switcher slots). scrollHint + noiseOverlay are NOT
 * runtime-bearing (CSS keyframe / static overlay), so they do NOT count here. Mirrors
 * `blockUsesCompositionTilt`. Drives the SINGLE runtime `<script>` emit predicate +
 * the present-only `PAGE_INTERACTIVITY_CSS` emit.
 */
const blockUsesInteractivityRuntime = (block: PageBlockV2): boolean => {
  if (block.type === "switcher") return true;
  if (block.type === "gallery" && block.props.filterable === true) return true;
  if (block.style?.magnetic === true) return true;
  if (block.slots) {
    for (const children of Object.values(block.slots)) {
      if (children) {
        for (const child of children) {
          if (blockUsesInteractivityRuntime(child)) return true;
        }
      }
    }
  }
  return false;
};

/**
 * TASK-534 — document-level scan for any RUNTIME-BEARING interactivity surface. A
 * no-interactivity document returns false ⇒ nothing emitted ⇒ byte-identical
 * (Hard Invariant #1). Consumed read-only by `pageRendererV2.tsx` (534-02) to
 * OR-widen the single `anyMotion` runtime-emit predicate.
 */
export const usesInteractivityRuntime = (document: PageDocumentV2): boolean => {
  for (const section of document.sections) {
    for (const block of section.blocks) {
      if (blockUsesInteractivityRuntime(block)) return true;
    }
  }
  return false;
};
