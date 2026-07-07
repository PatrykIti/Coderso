# TASK-521-03-L03: Hero Tilt Front Render + Runtime Script

# FileName: TASK-521-03-L03-Hero-Tilt-Render-And-Script.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-03
**Priority:** Medium
**Category:** Site Render / Accessibility / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the render region of `core/widgets/core/hero.tsx`:
applies the CSS perspective/`motion-safe:` tilt scaffolding on the hero wrapper
when `style.tilt` is set, stamps the `data-hero-tilt` contract, and emits a tiny
static runtime IIFE (via `renderSharedWidgetRuntimeScript`) that drives the 3D
rotation on `mousemove`, guarded by reduced-motion + pointer:fine. Disjoint from
L01/L02.

## Grounded anchors

`HeroBlock` render (`:814`+), `motionPreset` resolve (`:910`), `motionClassMap`
applied at `:1016`; `motionClassMap` def `:444-450` (`motion-safe:`/`motion-reduce:`
guard). Runtime emit: `renderSharedWidgetRuntimeScript({ renderContext, id, source })`
(`runtimeScripts.tsx:27-49`) — the hero render already carries `renderContext`
(widget render context) for its other runtime needs. `HERO_TILT_MAX_DEG` from L01.

## Implementation pseudocode

```tsx
const tilt = resolveHeroTilt(style.tilt);                 // "none"|"subtle"|"strong"
const tiltEnabled = tilt !== "none";
const maxDeg = HERO_TILT_MAX_DEG[tilt];                   // 5 | 8

// Wrapper: perspective + motion-safe only (reduce users get flat card):
<div
  className={cx(tiltEnabled && "motion-safe:[perspective:1000px]")}
  data-hero-tilt={tiltEnabled ? tilt : undefined}
  data-hero-tilt-max={tiltEnabled ? String(maxDeg) : undefined}
>
  <div data-hero-tilt-inner className={cx(tiltEnabled && "motion-safe:transition-transform motion-safe:duration-150 [transform-style:preserve-3d] will-change-transform")}>
    {/* existing hero card/media */}
  </div>
</div>

// Emit ONCE (deduped by id) when any hero on the page has tilt:
{tiltEnabled && renderSharedWidgetRuntimeScript({
  renderContext, id: "hero-tilt", source: HERO_TILT_SCRIPT,
})}

// STATIC script literal (config read from data-attrs — no interpolation):
const HERO_TILT_SCRIPT = [
  '(function(){try{',
  'if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;',
  'if(!(window.matchMedia&&window.matchMedia("(pointer:fine)").matches))return;',  // no touch
  'var hs=document.querySelectorAll("[data-hero-tilt]");',
  'hs.forEach(function(h){var inner=h.querySelector("[data-hero-tilt-inner]")||h;',
  ' var max=Math.max(0,Math.min(12,parseFloat(h.getAttribute("data-hero-tilt-max"))||6));',
  ' var pend=false,rx=0,ry=0;',
  ' function f(){pend=false;inner.style.transform="rotateX("+rx.toFixed(2)+"deg) rotateY("+ry.toFixed(2)+"deg)";}',
  ' h.addEventListener("pointermove",function(e){var r=h.getBoundingClientRect();',
  '  var px=(e.clientX-r.left)/r.width-0.5,py=(e.clientY-r.top)/r.height-0.5;',
  '  ry=px*max*2;rx=-py*max*2;if(!pend){pend=true;requestAnimationFrame(f);}},{passive:true});',
  ' h.addEventListener("pointerleave",function(){rx=0;ry=0;if(!pend){pend=true;requestAnimationFrame(f);}},{passive:true});',
  '});}catch(e){}})();',
].join("");
```

**No layout shift:** transforms only; `preserve-3d` + `perspective` on wrapper.
**Progressive:** no-JS / reduced-motion / touch ⇒ flat static hero (byte-identical
visual at rest). **Idempotent:** deduped by `"hero-tilt"` id.

## Regression-test shape (delegated to L04, asserted here)

- **Bun render** (`renderToString`): hero with `tilt:"subtle"` renders
  `data-hero-tilt="subtle"` + `data-hero-tilt-max="5"` + the `motion-safe:`
  perspective class + a `[data-hero-tilt-inner]` element; hero with no tilt
  renders NONE of these (byte-identity). If `renderContext` has no registry, the
  `<script>` with the tilt IIFE is inlined; the source contains the reduced-motion
  and pointer:fine guards and no interpolation marker.
- **Vitest jsdom**: pointermove sets a clamped `rotateX/Y` transform;
  reduced-motion/coarse-pointer ⇒ no transform.

## Hard Invariants

1. Present-only + reduced-motion/touch OFF (CSS `motion-safe:` + runtime guards).
2. Static script, no interpolation; deduped id; transforms only; rotation clamped
   ≤12deg.
3. Unset tilt = byte-identical hero (no wrapper attr, no script).
