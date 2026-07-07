# TASK-521-01-L04: Shared Runtime-Effects Script Module (`pageEffectsRuntime.ts`)

# FileName: TASK-521-01-L04-Runtime-Effects-Script-Module.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-01
**Priority:** High
**Category:** Site Render (runtime) / Accessibility / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Creates the NEW file
`core/services/pages/pageEffectsRuntime.ts` (or `core/widgets/core/` if colocated
with runtime scripts — keep beside the model it serves,
`core/services/pages/`). Exports a single **static** IIFE source STRING
(`PAGE_EFFECTS_RUNTIME_SOURCE`) + a stable id + a reduced-motion guard helper.
This is the dependency-free front-only runtime that drives section reveal
(IntersectionObserver), section parallax (rAF scroll), and the per-page
cursor-spotlight (rAF pointermove), reading ALL config from validated DOM
data-attributes / CSS custom properties (NO stored data interpolated into the
source). Consumers: 521-02 (section render stamps the data-attrs) and 521-05
(PageDocumentRender emits this script once + the spotlight overlay). Hero tilt has
its OWN small script in 521-03 (self-contained widget) — this module does NOT
handle hero.

## Grounded anchors

Runtime-script mechanism: `renderSharedWidgetRuntimeScript({ renderContext, id,
source })` (`core/widgets/runtimeScripts.tsx:27-49`) registers into
`renderContext.runtimeScripts` (deduped by id) or, when absent, emits an inline
`<script data-coderso-runtime-script={id} dangerouslySetInnerHTML={{__html:source}}>`.
`createWidgetRuntimeScriptRegistry` (`:5-25`) dedupes by id (idempotent). Existing
sibling scripts: `listingRuntimeScript.ts`, `bookingRuntimeScript.ts`,
`formRuntimeScript.ts` (each a dependency-free IIFE string). Reduced-motion
precedent: `hero.tsx:447-450` (`motion-safe:`/`motion-reduce:`). Inline-script
precedent: `renderPublicPage.tsx:168` (`window.addEventListener("load", …)`).

## Implementation pseudocode

```ts
// core/services/pages/pageEffectsRuntime.ts
export const PAGE_EFFECTS_RUNTIME_ID = "page-motion-effects";

// STATIC literal — never interpolate caller data. Config comes from the DOM:
//   [data-page-effect="reveal-fade"|"reveal-up"]   → IO toggles data-revealed
//   [data-page-effect="parallax"][data-parallax="<clampedPx>"] → rAF translateY
//   [data-page-spotlight] on root + CSS vars --spotlight-x/y (px) updated on move
export const PAGE_EFFECTS_RUNTIME_SOURCE = [
  '(function(){',
  'try{',
  'var RM=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)");',
  'if(RM&&RM.matches)return;',                       // reduced-motion → do nothing
  // ---- reveal via IntersectionObserver ----
  'var rv=document.querySelectorAll(\'[data-page-effect="reveal-fade"],[data-page-effect="reveal-up"]\');',
  'if("IntersectionObserver"in window&&rv.length){',
  ' var io=new IntersectionObserver(function(es){es.forEach(function(e){',
  '  if(e.isIntersecting){e.target.setAttribute("data-revealed","true");io.unobserve(e.target);}});},',
  '  {rootMargin:"0px 0px -10% 0px",threshold:0.12});',
  ' rv.forEach(function(el){io.observe(el);});',
  '}else{rv.forEach(function(el){el.setAttribute("data-revealed","true");});}', // no-IO fallback: show
  // ---- parallax via rAF scroll ----
  'var px=[].slice.call(document.querySelectorAll(\'[data-page-effect="parallax"]\'));',
  'var pending=false;',
  'function frame(){pending=false;var vh=window.innerHeight||1;',
  ' px.forEach(function(el){var r=el.getBoundingClientRect();',
  '  var amt=Math.max(0,Math.min(40,parseFloat(el.getAttribute("data-parallax"))||0));',
  '  var prog=(r.top+r.height/2-vh/2)/vh;',            // -1..1 around viewport center
  '  var y=Math.max(-amt,Math.min(amt,-prog*amt));',
  '  var inner=el.querySelector("[data-parallax-inner]")||el;',
  '  inner.style.transform="translate3d(0,"+y.toFixed(1)+"px,0)";});}',
  'function onScroll(){if(!pending){pending=true;requestAnimationFrame(frame);}}',
  'if(px.length){window.addEventListener("scroll",onScroll,{passive:true});',
  ' window.addEventListener("resize",onScroll,{passive:true});frame();}',
  // ---- cursor spotlight (pointer:fine only) ----
  'var sp=document.querySelector("[data-page-spotlight]");',
  'if(sp&&window.matchMedia&&window.matchMedia("(pointer:fine)").matches){',
  ' var sx=0,sy=0,sPending=false;',
  ' function sFrame(){sPending=false;sp.style.setProperty("--spotlight-x",sx+"px");',
  '  sp.style.setProperty("--spotlight-y",sy+"px");}',
  ' sp.addEventListener("pointermove",function(ev){var r=sp.getBoundingClientRect();',
  '  sx=Math.round(ev.clientX-r.left);sy=Math.round(ev.clientY-r.top);',
  '  if(!sPending){sPending=true;requestAnimationFrame(sFrame);}},{passive:true});',
  '}',
  '}catch(e){}',                                       // never break the page
  '})();',
].join("");
```

**Idempotency:** deduped by `PAGE_EFFECTS_RUNTIME_ID` in the registry / by the
single emit site (521-05), so multiple sections sharing one page yield ONE script.
**No layout thrash:** transforms only (composited); `getBoundingClientRect` reads
batched inside rAF. **Fallback:** no-IO browsers reveal immediately (content never
hidden permanently); `try/catch` swallows to never break the page.

## Regression-test shape

- **Bun unit — `tests/unit/pages/pageEffectsRuntime.test.ts`** (`bun:test`, the Bun
  lane per `_docs/TESTING_STRATEGY.md`): assert `PAGE_EFFECTS_RUNTIME_SOURCE` is a
  string, contains the reduced-motion guard `matchMedia("(prefers-reduced-motion:
  reduce)")` early-return BEFORE any observer/listener, contains
  `IntersectionObserver`, clamps parallax to `40`, and contains NO `${`
  template-interpolation marker and no `eval`/`Function(`/`innerHTML=` sink.
  (Optional jsdom exec test lives in Vitest `tests/vitest/content*` if a DOM is
  needed — but keep the static-shape assertion in the Bun lane.)

## Hard Invariants

1. STATIC string — zero interpolation of any caller/stored value.
2. Reduced-motion early-return is the FIRST executable statement.
3. Dependency-free; `passive` listeners + rAF; `try/catch` guard; transforms only.
4. Idempotent (single id); safe to include when no effect element is present
   (all `querySelectorAll` return empty → no-op).
