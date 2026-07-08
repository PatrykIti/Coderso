/**
 * TASK-521-01-L04 — shared, dependency-free front-only runtime-effects script.
 *
 * Exports a single STATIC IIFE source string (`PAGE_EFFECTS_RUNTIME_SOURCE`)
 * plus a stable id (`PAGE_EFFECTS_RUNTIME_ID`) and a reduced-motion guard
 * helper. The script drives section reveal (IntersectionObserver), section
 * parallax (rAF scroll) and the per-page cursor spotlight (rAF pointermove),
 * reading ALL config from validated DOM data-attributes / CSS custom properties.
 *
 * HARD INVARIANTS (see TASK-521-01-L04):
 *  1. STATIC string — zero interpolation of any caller / stored value.
 *  2. The reduced-motion early-return is the FIRST executable statement, and
 *     the reveal-hide marker (`data-reveal-armed`) is set ONLY after it, BEFORE
 *     any observe loop (JS-required-to-HIDE — never permanently hidden).
 *  3. Dependency-free; `passive` listeners + rAF; `try/catch` guard; transforms
 *     only (composited, no layout thrash — rect reads batched inside rAF).
 *  4. Idempotent (single id); safe to include when no effect element exists
 *     (every `querySelectorAll` returns empty → no-op).
 *
 * Consumers: 521-02 (section render stamps the data-attrs) and 521-05
 * (PageDocumentRender emits this once + the spotlight overlay). Hero tilt has
 * its OWN small script in 521-03 — this module does NOT handle hero.
 */

/** Stable dedupe id for the runtime-script registry / single emit site. */
export const PAGE_EFFECTS_RUNTIME_ID = "page-motion-effects";

/**
 * The media query the runtime early-returns on. Exported so consumers /tests
 * can reference the exact same string (no drift between guard and source).
 */
export const PAGE_EFFECTS_REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Server/consumer-side reduced-motion guard helper. Mirrors the runtime's own
 * first-statement check so a caller can also decide (e.g. skip arming) — but
 * the source itself is fully self-guarding regardless. SSR-safe: returns
 * `false` when `window`/`matchMedia` are absent.
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(PAGE_EFFECTS_REDUCED_MOTION_QUERY).matches;
};

// STATIC literal — never interpolate caller data. Config comes from the DOM:
//   [data-page-effect="reveal-fade"|"reveal-up"]   → IO toggles data-revealed
//   [data-page-effect="parallax"][data-parallax="<clampedPx>"] → rAF translateY
//   [data-page-spotlight] on root + CSS vars --spotlight-x/y (px) updated on move
export const PAGE_EFFECTS_RUNTIME_SOURCE = [
  "(function(){",
  "try{",
  'var RM=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)");',
  "if(RM&&RM.matches)return;",
  // ---- ARM the reveal-hide: JS-required-to-HIDE. The reveal opacity:0 rule is
  //      scoped under [data-reveal-armed] (521-02-L02), set HERE and only here.
  //      If this script never runs (JS off, CSP blocks it, or any earlier
  //      page-JS exception), the marker is absent → reveal content stays VISIBLE
  //      (never permanently hidden). Set it BEFORE observing so IO can hide→reveal.
  'var pm=document.querySelector("[data-page-motion]");',
  'if(pm)pm.setAttribute("data-reveal-armed","true");',
  // ---- reveal via IntersectionObserver ----
  'var rv=document.querySelectorAll(\'[data-page-effect="reveal-fade"],[data-page-effect="reveal-up"]\');',
  'if("IntersectionObserver"in window&&rv.length){',
  " var io=new IntersectionObserver(function(es){es.forEach(function(e){",
  '  if(e.isIntersecting){e.target.setAttribute("data-revealed","true");io.unobserve(e.target);}});},',
  '  {rootMargin:"0px 0px -10% 0px",threshold:0.12});',
  " rv.forEach(function(el){io.observe(el);});",
  '}else{rv.forEach(function(el){el.setAttribute("data-revealed","true");});}',
  // ---- parallax via rAF scroll ----
  "var px=[].slice.call(document.querySelectorAll('[data-page-effect=\"parallax\"]'));",
  "var pending=false;",
  "function frame(){pending=false;var vh=window.innerHeight||1;",
  " px.forEach(function(el){var r=el.getBoundingClientRect();",
  '  var amt=Math.max(0,Math.min(40,parseFloat(el.getAttribute("data-parallax"))||0));',
  "  var prog=(r.top+r.height/2-vh/2)/vh;",
  "  var y=Math.max(-amt,Math.min(amt,-prog*amt));",
  '  var inner=el.querySelector("[data-parallax-inner]")||el;',
  '  inner.style.transform="translate3d(0,"+y.toFixed(1)+"px,0)";});}',
  "function onScroll(){if(!pending){pending=true;requestAnimationFrame(frame);}}",
  'if(px.length){window.addEventListener("scroll",onScroll,{passive:true});',
  ' window.addEventListener("resize",onScroll,{passive:true});frame();}',
  // ---- cursor spotlight (pointer:fine only) ----
  'var sp=document.querySelector("[data-page-spotlight]");',
  'if(sp&&window.matchMedia&&window.matchMedia("(pointer:fine)").matches){',
  " var sx=0,sy=0,sPending=false;",
  ' function sFrame(){sPending=false;sp.style.setProperty("--spotlight-x",sx+"px");',
  '  sp.style.setProperty("--spotlight-y",sy+"px");}',
  // TASK-529 — the vars feed a position:fixed inset:0 overlay's radial-gradient
  // (523 screen-blend z-30), so they MUST be VIEWPORT coords. `sp` is the ROOT
  // (full page height; after scroll r.top = -scrollY), so subtracting its rect
  // ADDED scrollY → the glow "fell" below the viewport past the first screenful.
  // Use pure clientX/clientY (already viewport-relative); no rect read needed.
  ' sp.addEventListener("pointermove",function(ev){',
  "  sx=Math.round(ev.clientX);sy=Math.round(ev.clientY);",
  "  if(!sPending){sPending=true;requestAnimationFrame(sFrame);}},{passive:true});",
  "}",
  // ---- TASK-522-01-L05 generalized block tilt ([data-block-tilt]) ----
  // Top-level (NOT nested in the spotlight `sp` block, else it is dead on any
  // spotlight-less page). Reuses ONLY the global reduced-motion early-return at
  // the top; opens its OWN (pointer:fine) gate. The ~4-line normalized pointer
  // math is a small DOCUMENTED duplication of hero.tsx's HERO_TILT_SCRIPT (which
  // 522 does not edit/import). Reads ALL config from validated data-*; no stored
  // data is interpolated into the static source.
  'var bt=document.querySelectorAll("[data-block-tilt]");',
  'if(bt.length&&window.matchMedia&&window.matchMedia("(pointer:fine)").matches){',
  " bt.forEach(function(el){",
  '  var s=el.getAttribute("data-block-tilt")==="strong"?10:7;',
  '  var gl=el.querySelector(".cx-glare");',
  "  var bPend=false,brx=0,bry=0,bgx=50,bgy=50;",
  "  function bf(){bPend=false;",
  '   el.style.transform="rotateX("+brx.toFixed(2)+"deg) rotateY("+bry.toFixed(2)+"deg) translateY(-2px)";',
  '   if(gl){gl.style.setProperty("--glare-x",bgx.toFixed(1)+"%");gl.style.setProperty("--glare-y",bgy.toFixed(1)+"%");}}',
  '  el.addEventListener("pointermove",function(e){var r=el.getBoundingClientRect();',
  "   var px=(e.clientX-r.left)/r.width-0.5,py=(e.clientY-r.top)/r.height-0.5;",
  "   bry=px*s;brx=-py*s;bgx=(px+0.5)*100;bgy=(py+0.5)*100;",
  "   if(!bPend){bPend=true;requestAnimationFrame(bf);}},{passive:true});",
  '  el.addEventListener("pointerleave",function(){el.style.transform="";',
  '   if(gl){gl.style.removeProperty("--glare-x");gl.style.removeProperty("--glare-y");}},{passive:true});',
  " });",
  "}",
  "}catch(e){}",
  "})();",
].join("");
