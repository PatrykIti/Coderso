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
 *  4. Idempotent. The IIFE self-guards on a window init flag
 *     (`PAGE_EFFECTS_RUNTIME_INIT_FLAG`): a SECOND copy of this script (a footer
 *     document emits its own when it authors motion) returns early and does
 *     nothing — no re-arm, no double-observe, no double-listener. Also safe to
 *     include when no effect element exists (every `querySelectorAll` returns
 *     empty → no-op).
 *
 * Consumers: 521-02 (section render stamps the data-attrs) and 521-05
 * (PageDocumentRender emits this once + the spotlight overlay). Hero tilt has
 * its OWN small script in 521-03 — this module does NOT handle hero.
 */

/** Stable dedupe id for the runtime-script registry / single emit site. */
export const PAGE_EFFECTS_RUNTIME_ID = "page-motion-effects";

/**
 * TASK-535 — window init flag the IIFE self-guards on. A page can render TWO
 * `PageDocumentRender` documents (the `<main>` page + a `SiteFooter` template),
 * each of which emits its own runtime `<script>` when its OWN document authors
 * motion. Both scripts share one `window`; without a guard the SECOND copy would
 * re-arm reveal, double-bind scroll/pointer listeners and re-observe the same
 * nodes. The IIFE sets this flag on first init and returns early if already set,
 * so any later copy is a total no-op. Keyed on the runtime id (a stable literal);
 * the STATIC source hardcodes the SAME string (invariant #1 forbids interpolating
 * any value into the source), and this export lets consumers/tests reference the
 * exact key without drift.
 */
export const PAGE_EFFECTS_RUNTIME_INIT_FLAG = "__codersoPageMotionEffectsInit";

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
  // ---- TASK-535 idempotence self-guard: a page may emit this same script TWICE
  //      (the <main> page document AND the SiteFooter template document each emit
  //      their own copy when they author motion). Both share one `window`. Set a
  //      window flag on first init and NO-OP any later copy so we never re-arm
  //      reveal, double-observe the same nodes, or double-bind scroll/pointer
  //      listeners. FIRST executable statement — before arming, observing or
  //      binding anything. The key literal MUST equal PAGE_EFFECTS_RUNTIME_INIT_FLAG
  //      (invariant #1: no interpolation into the static source).
  "if(window.__codersoPageMotionEffectsInit)return;",
  "window.__codersoPageMotionEffectsInit=true;",
  // ══════════════════════════════════════════════════════════════════════════
  // ── TASK-534 ── switcher + gallery-filter INTERACTION TOGGLES. Placed HERE —
  //   AFTER the idempotence guard, BEFORE the reduced-motion early-return below —
  //   because that early-return (`if(RM&&RM.matches)return;`) is an UNCONDITIONAL
  //   whole-IIFE return: anything after it is skipped for reduce users. Tabs and
  //   filters are accessibility interactions that MUST work for reduce users
  //   (Hard Invariants #2/#9), so they cannot sit below the return. They perform
  //   NO motion themselves (click/keyboard/aria/hidden toggles only); the visual
  //   crossfade/fade is CSS `motion-safe:`-guarded (534-03). All config from
  //   validated `data-*` — zero interpolation of stored data.
  //
  // (1) SWITCHER — tablist toggle (reproduces app.js:72-86 styleData swap).
  'var sw534=document.querySelectorAll("[data-switcher]");',
  "sw534.forEach(function(root){",
  ' var tabs=[].slice.call(root.querySelectorAll("[data-switcher-tab]"));',
  ' var panels=[].slice.call(root.querySelectorAll("[data-switcher-panel]"));',
  " if(!tabs.length)return;",
  " function activate(i){tabs.forEach(function(t,j){var on=j===i;",
  '  t.setAttribute("aria-selected",on?"true":"false");t.tabIndex=on?0:-1;});',
  "  panels.forEach(function(p,j){var on=j===i;p.hidden=!on;",
  '   p.setAttribute("data-active",on?"true":"false");});}',
  " tabs.forEach(function(t,i){",
  '  t.addEventListener("click",function(){activate(i);t.focus();});',
  '  t.addEventListener("keydown",function(e){var n=null;',
  '   if(e.key==="ArrowRight"||e.key==="ArrowDown")n=(i+1)%tabs.length;',
  '   else if(e.key==="ArrowLeft"||e.key==="ArrowUp")n=(i-1+tabs.length)%tabs.length;',
  '   else if(e.key==="Home")n=0;else if(e.key==="End")n=tabs.length-1;',
  "   if(n!==null){e.preventDefault();activate(n);tabs[n].focus();}});",
  " });",
  "});",
  // (2) GALLERY FILTER — chip show/hide (reproduces app.js:88-100 data-category).
  //   `data-category` is a SPACE-SEPARATED SET of single kebab tokens; each chip's
  //   `data-filter` is ONE token — matched via `cat.split(" ").indexOf(f)` (no
  //   innerHTML/eval, no substring false-positive). The bar is a role="toolbar" of
  //   `aria-pressed` toggle buttons (NOT a tablist) with roving tabindex (active=0,
  //   rest=-1) + ArrowLeft/Right/Home/End roving, mirroring the toolbar APG.
  'var gf534=document.querySelectorAll("[data-gallery-filter]");',
  "gf534.forEach(function(bar){",
  ' var chips=[].slice.call(bar.querySelectorAll("[data-filter]"));',
  " if(!chips.length)return;",
  ' var scope=bar.closest("[data-gallery]")||document;',
  ' var items=[].slice.call(scope.querySelectorAll("[data-filter-item]"));',
  ' function select(c){var f=c.getAttribute("data-filter")||"all";',
  '  chips.forEach(function(x){x.setAttribute("aria-pressed",x===c?"true":"false");});',
  '  items.forEach(function(it){var cat=it.getAttribute("data-category")||"";',
  '   var hide=f!=="all"&&cat.split(" ").indexOf(f)===-1;',
  '   it.classList.toggle("is-hidden",hide);it.hidden=hide;});}',
  " function rove(i){chips.forEach(function(x,j){x.tabIndex=j===i?0:-1;});chips[i].focus();}",
  " chips.forEach(function(c,i){",
  '  c.addEventListener("click",function(){select(c);});',
  '  c.addEventListener("keydown",function(e){var n=null;',
  '   if(e.key==="ArrowRight"||e.key==="ArrowDown")n=(i+1)%chips.length;',
  '   else if(e.key==="ArrowLeft"||e.key==="ArrowUp")n=(i-1+chips.length)%chips.length;',
  '   else if(e.key==="Home")n=0;else if(e.key==="End")n=chips.length-1;',
  "   if(n!==null){e.preventDefault();rove(n);}});",
  " });",
  "});",
  // ── END TASK-534 pre-early-return toggles ──
  // ══════════════════════════════════════════════════════════════════════════
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
  // ── TASK-534 ── MAGNETIC pointer-attract (reproduces app.js .magnetic). Placed
  //   HERE — AFTER the 522 block-tilt clause, BEFORE `}catch(e){}` — so it INHERITS
  //   the reduced-motion early-return above (magnetic IS motion → correctly
  //   suppressed for reduce) and opens its OWN `pointer:fine` gate (no magnet on
  //   touch). Transforms only, rect reads batched in rAF, `passive` listeners; all
  //   config from validated `data-*` — zero interpolation of stored data.
  'var mg534=document.querySelectorAll("[data-magnetic]");',
  'if(mg534.length&&window.matchMedia&&window.matchMedia("(pointer:fine)").matches){',
  " mg534.forEach(function(el){var mPend=false,mx=0,my=0;",
  '  function mf(){mPend=false;el.style.transform="translate("+mx.toFixed(1)+"px,"+my.toFixed(1)+"px)";}',
  '  el.addEventListener("pointermove",function(e){var r=el.getBoundingClientRect();',
  "   mx=Math.max(-14,Math.min(14,(e.clientX-(r.left+r.width/2))*0.3));",
  "   my=Math.max(-14,Math.min(14,(e.clientY-(r.top+r.height/2))*0.3));",
  "   if(!mPend){mPend=true;requestAnimationFrame(mf);}},{passive:true});",
  '  el.addEventListener("pointerleave",function(){mx=0;my=0;',
  "   if(!mPend){mPend=true;requestAnimationFrame(mf);}},{passive:true});",
  " });",
  "}",
  // ── END TASK-534 magnetic clause ──
  "}catch(e){}",
  "})();",
].join("");
