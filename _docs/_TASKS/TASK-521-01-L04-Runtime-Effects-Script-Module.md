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
  'if(RM&&RM.matches)return;',                       // reduced-motion → do nothing (hide never armed)
  // ---- ARM the reveal-hide: JS-required-to-HIDE. The reveal opacity:0 rule is
  //      scoped under [data-reveal-armed] (521-02-L02), which is set HERE and only
  //      here. If this script never runs (JS off, CSP blocks it, or any earlier
  //      page-JS exception), the marker is absent → reveal content stays VISIBLE
  //      (never permanently hidden). Set it BEFORE observing so IO can then hide→reveal.
  'var pm=document.querySelector("[data-page-motion]");',
  'if(pm)pm.setAttribute("data-reveal-armed","true");',
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
batched inside rAF. **Never-permanently-hidden (JS-required-to-HIDE):** the reveal
`opacity:0` rule is scoped under the runtime-set `[data-reveal-armed]` marker, so
content is hidden ONLY once this script confirms it is running — JS-disabled,
CSP-blocked, reduced-motion, and early-exception paths all leave the marker absent
and content fully visible. **Fallback:** no-IO browsers set `data-revealed`
immediately (visible); `try/catch` swallows to never break the page.

## Regression-test shape

- **Vitest — `tests/vitest/pages/pageEffectsRuntime.test.ts`** (NEW; owned/authored
  by 521-01-L05, referenced here): the static-shape source test is a set of pure
  string assertions on a static literal (no runtime kernel, no DOM), which per
  `_docs/TESTING_STRATEGY.md` ("Vitest for pure TypeScript") belongs in the Vitest
  `tests/vitest/pages/` lane — NOT `tests/unit/pages/*` (Bun, reserved for DB/service
  + Ajv suites). It asserts `PAGE_EFFECTS_RUNTIME_SOURCE` is a string, contains the
  reduced-motion guard `matchMedia("(prefers-reduced-motion: reduce)")` early-return
  BEFORE any observer/listener, sets `data-reveal-armed` on the `[data-page-motion]`
  root AFTER the reduced-motion return but BEFORE the `IntersectionObserver`
  observe loop (JS-required-to-HIDE ordering), contains `IntersectionObserver`,
  clamps parallax to `40`, and contains NO `${` template-interpolation marker and no
  `eval`/`Function(`/`innerHTML=` sink. (Any optional jsdom exec test lives in the
  Vitest `tests/vitest/content*` lane.)

## Hard Invariants

1. STATIC string — zero interpolation of any caller/stored value.
2. Reduced-motion early-return is the FIRST executable statement.
3. Dependency-free; `passive` listeners + rAF; `try/catch` guard; transforms only.
4. Idempotent (single id); safe to include when no effect element is present
   (all `querySelectorAll` return empty → no-op).
