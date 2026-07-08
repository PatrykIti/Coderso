# TASK-521-03-L03: Hero Tilt Front Render + Runtime Script

# FileName: TASK-521-03-L03-Hero-Tilt-Render-And-Script.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-03
**Priority:** Medium
**Category:** Site Render / Accessibility / Security
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the render region of `core/widgets/core/hero.tsx`:
applies the CSS perspective/`motion-safe:` tilt scaffolding on the hero wrapper
when `style.tilt` is set, stamps the `data-hero-tilt` contract, and emits a tiny
static runtime IIFE (via `renderSharedWidgetRuntimeScript`) that drives the 3D
rotation on `mousemove`, guarded by reduced-motion + pointer:fine. Disjoint from
L01/L02.

**Surface-gate (front/preview ONLY — satisfies parent Hard Invariant 7):** the
tilt `<script>` is emitted ONLY when the render carries a runtime-scripts registry
(`renderContext?.runtimeScripts != null`), which is the exact signal of the
front/preview page-render path — `renderPublicPage.tsx:249-253`/`:317-321` builds
`renderContext.runtimeScripts = createWidgetRuntimeScriptRegistry()` and emits the
collected scripts before `</body>`, whereas the admin builder canvas renders the
hero via the widget renderer with NO `runtimeScripts` registry (the fallback
context at `widgetRenderer.tsx:114`/`:216` has none). Gating on the registry means
the canvas NEVER binds the `pointermove` listener (so the hero does NOT tilt while
being edited/hovered in the editor) AND there is no per-hero inline-`<script>`
fallback. The CSS perspective/attr scaffolding may remain on the canvas (inert
without the script) for front/canvas DOM parity.

## Grounded anchors

`HeroBlock` render (`:814`+), `motionPreset` resolve (`:910`), `motionClassMap`
applied at `:1016`; `motionClassMap` def `:444-450` (`motion-safe:`/`motion-reduce:`
guard). Runtime emit: `renderSharedWidgetRuntimeScript({ renderContext, id, source })`
(`runtimeScripts.tsx:27-49`). **Grounded correction — hero has NO `renderContext`
today:** `HeroBlock` (`:814`) destructures ONLY `{ data, variant, slots,
previewDevice }` and `hero.tsx` contains ZERO existing `renderContext` /
`runtimeScripts` / `renderSharedWidgetRuntimeScript` usage — the hero has no other
runtime-script needs. This leaf INTRODUCES `renderContext`: the widget render
contract already exposes it as an optional prop (`types.ts:211`
`renderContext?: WidgetRenderContext`) and the widget renderer already passes it to
render components (`widgetRenderer.tsx:236`/`:249`), so the wiring is small but MUST
be added — it is NOT "already carried." **The emit is GUARDED on
`renderContext?.runtimeScripts != null` (see Surface-gate + pseudocode step 2):**
on the front/preview path that registry is present and
`renderSharedWidgetRuntimeScript` registers by id and dedupes to ONE `<script>`
across all heroes; on the admin builder canvas the widget renderer supplies NO
`runtimeScripts` registry (the fallback context at `widgetRenderer.tsx:114`/`:216`
has none), so the guard emits NOTHING — the canvas gets the inert CSS
perspective/attr scaffolding only and NEVER binds the `pointermove` listener.
**We deliberately do NOT rely on `renderSharedWidgetRuntimeScript`'s
registry-absent inline-`<script>` fallback (`runtimeScripts.tsx:36-48`)** — without
the guard that fallback WOULD inline a tilt script on the canvas and the hero would
tilt while being edited/hovered in the builder, violating parent Hard Invariant 7.
The guard makes the two paths unambiguous: front/preview => single deduped emit;
canvas => no script. `HERO_TILT_MAX_DEG` from L01.

## Implementation pseudocode

```tsx
// (0) REQUIRED wiring — extend HeroBlock's props to accept the optional renderContext
//     the widget renderer already passes (types.ts:211; widgetRenderer.tsx:236/:249),
//     and import the emit helper. This threads the front/preview registry through;
//     on the canvas `renderContext?.runtimeScripts` is absent and the guarded emit
//     (step 2) skips entirely — NO inline fallback on the canvas:
import { renderSharedWidgetRuntimeScript } from "../runtimeScripts";
import type { WidgetRenderContext } from "../types";
export function HeroBlock({ data, variant, slots, previewDevice, renderContext }: {
  data: HeroData; variant: string; slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget; renderContext?: WidgetRenderContext;   // NEW
}) { /* … */ }

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

// Emit the tilt runtime ONLY on the front/preview render path — the presence of a
// runtime-scripts registry (`renderContext?.runtimeScripts != null`) is the exact
// signal of that path (renderPublicPage.tsx builds it; the builder canvas has none).
// GUARD on the registry so the canvas NEVER receives a script (no inline fallback):
// front/preview => the shared registry dedupes to ONE <script> across all heroes;
// canvas (registry absent) => NOTHING is emitted, satisfying parent Hard Invariant 7
// (inert CSS perspective/attr scaffolding only, no pointermove listener bound):
{tiltEnabled && renderContext?.runtimeScripts != null
  && renderSharedWidgetRuntimeScript({
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

- **Vitest render** (`renderToString`, `tests/vitest/widgets/hero.test.tsx` — there
  is NO Bun `tests/unit/widgets/hero*` file; the hero render suite lives only in
  Vitest, matching 521-03-L04): hero with `tilt:"subtle"` renders
  `data-hero-tilt="subtle"` + `data-hero-tilt-max="5"` + the `motion-safe:`
  perspective class + a `[data-hero-tilt-inner]` element; hero with no tilt
  renders NONE of these (byte-identity). **Surface-gate assertions:** rendered WITH
  a `renderContext.runtimeScripts` registry (front/preview) the tilt `<script>` is
  emitted ONCE (deduped by the `"hero-tilt"` id even across multiple heroes) and its
  source contains the reduced-motion + pointer:fine guards and no interpolation
  marker; rendered WITHOUT a registry (the builder-canvas shape) NO `<script>` is
  emitted at all (the CSS perspective/`data-hero-tilt` scaffolding still renders,
  inert) — this is the guard that keeps the canvas tilt-free (Hard Invariant 7).
- **Vitest jsdom**: pointermove sets a clamped `rotateX/Y` transform;
  reduced-motion/coarse-pointer ⇒ no transform.

## Hard Invariants

1. Present-only + reduced-motion/touch OFF (CSS `motion-safe:` + runtime guards).
2. Static script, no interpolation; deduped id; transforms only; rotation clamped
   ≤12deg.
3. Unset tilt = byte-identical hero (no wrapper attr, no script).
