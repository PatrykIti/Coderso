/**
 * TASK-539-07-L01 — shared, dependency-free front-only runtime-effects script.
 *
 * Exports a single STATIC IIFE source string (`PAGE_EFFECTS_RUNTIME_SOURCE`)
 * plus a stable id (`PAGE_EFFECTS_RUNTIME_ID`), a compatibility observation flag
 * (`PAGE_EFFECTS_RUNTIME_INIT_FLAG`) and a reduced-motion guard helper. The script
 * drives section reveal (IntersectionObserver), section parallax (rAF scroll),
 * the per-page cursor spotlight (rAF pointermove), block tilt + magnetic
 * (custom-property writes on the TASK-539-04 transform host) and the declarative
 * switcher / gallery-filter toggles, reading ALL config from validated DOM
 * data-attributes / CSS custom properties.
 *
 * HARD INVARIANTS (TASK-521-01-L04, TASK-535, TASK-539-07-L01):
 *  1. STATIC string — zero interpolation of any caller / stored value. Only the
 *     fixed vocabulary owned by `pageCompositionEffects.tsx` is serialized into
 *     the source at module-build time (single source of truth, no respelling).
 *  2. The reduced-motion branch returns from `init` ONLY, and the reveal-hide
 *     marker (`data-reveal-armed`) is set ONLY after it, BEFORE any observe loop
 *     (JS-required-to-HIDE — never permanently hidden). Switcher and gallery
 *     toggles are bound BEFORE the branch and stay functional for reduce users.
 *  3. Dependency-free; `passive` listeners + rAF; `try/catch` guards; per-binder
 *     and per-element failure isolation (one missing API or malformed node cannot
 *     block later binders).
 *  4. Root-scoped binding: every emitted copy calls `init(document)` on a shared
 *     controller (`window.__codersoPageEffectsV2`); a repeated scan skips only
 *     elements already in that binder's WeakSet, so the parser-order second copy
 *     (footer document) discovers and binds footer nodes exactly once. No
 *     whole-document MutationObserver, no global strong element collections.
 *  5. Replica safety: every binder rejects a candidate whose element or closest
 *     ancestor matches `PAGE_MARQUEE_REPLICA_SELECTOR` before any listener,
 *     observer or state is attached, so an inert marquee replica keeps its visual
 *     hooks but never becomes interactive.
 *  6. Transform ownership: tilt/magnetic write ONLY their own custom properties
 *     (never `style.transform`, never another effect's variable); parallax keeps
 *     its separate `[data-parallax-inner]` channel; spotlight sets only
 *     `--spotlight-x`/`--spotlight-y` on the matched root.
 *
 * Consumers: 521-05 / 534-02 / 539-05 (PageDocumentRender emits this once per
 * main/footer document when motion or interactivity is authored).
 */

import {
  PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE,
  PAGE_BLOCK_TRANSFORM_VARIABLES,
  PAGE_MARQUEE_REPLICA_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_SELECTOR,
} from "./pageCompositionEffects";

/** Stable dedupe id for the runtime-script registry / single emit site. */
export const PAGE_EFFECTS_RUNTIME_ID = "page-motion-effects";

/**
 * TASK-539-07 — legacy window observation flag. A page renders TWO
 * `PageDocumentRender` documents (the `<main>` page + a `SiteFooter` template),
 * each of which emits its own copy of the runtime `<script>`. Both scripts share
 * one `window` and one controller. The flag is WRITTEN by every copy for
 * compatibility with older observers/tests, but the source NEVER reads it and
 * never early-returns because it is true: each copy must call `init(document)`
 * so parser-order rescan discovers footer nodes. Keyed on a stable literal; the
 * STATIC source hardcodes the SAME string (invariant #1 forbids interpolating
 * any value into the source), and this export lets consumers/tests reference the
 * exact key without drift.
 */
export const PAGE_EFFECTS_RUNTIME_INIT_FLAG = "__codersoPageMotionEffectsInit";

/**
 * The media query the runtime's reduced-motion branch uses. Exported so
 * consumers/tests can reference the exact same string (no drift).
 */
export const PAGE_EFFECTS_REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Server/consumer-side reduced-motion guard helper. Mirrors the runtime's own
 * check so a caller can also decide (e.g. skip arming) — but the source itself
 * is fully self-guarding regardless. SSR-safe: returns `false` when
 * `window`/`matchMedia` are absent.
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(PAGE_EFFECTS_REDUCED_MOTION_QUERY).matches;
};

// ── Fixed vocabulary serialization (single source of truth: pageCompositionEffects).
// The emitted IIFE stays dependency-free: only these compile-time literals are
// interpolated at module-build time, never caller/stored data (invariant #1).
const serialize = (value: string): string => JSON.stringify(value);

const REPLICA_SELECTOR_LITERAL = serialize(PAGE_MARQUEE_REPLICA_SELECTOR);
const REPLICA_ATTRIBUTE_LITERAL = serialize(PAGE_MARQUEE_REPLICA_ATTRIBUTE);
const HOST_ATTRIBUTE_LITERAL = serialize(PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE);
// Only the transform variables this runtime may write: tilt X/Y (deg) and
// magnetic X/Y (px). The host formula composes them; nothing else is touched.
const TRANSFORM_VARIABLES_LITERAL = JSON.stringify({
  tiltX: PAGE_BLOCK_TRANSFORM_VARIABLES.tiltX,
  tiltY: PAGE_BLOCK_TRANSFORM_VARIABLES.tiltY,
  magneticX: PAGE_BLOCK_TRANSFORM_VARIABLES.magneticX,
  magneticY: PAGE_BLOCK_TRANSFORM_VARIABLES.magneticY,
});
const REDUCED_MOTION_QUERY_LITERAL = serialize(PAGE_EFFECTS_REDUCED_MOTION_QUERY);

// STATIC literal — never interpolate caller data. Config comes from the DOM:
//   [data-page-effect="reveal-fade"|"reveal-up"]   → IO toggles data-revealed
//   [data-page-effect="parallax"][data-parallax="<clampedPx>"] → rAF translateY
//   [data-page-spotlight] on root + CSS vars --spotlight-x/y (px) updated on move
//   [data-switcher] / [data-gallery-filter]        → declarative interaction toggles
//   [data-block-tilt] / [data-magnetic]            → custom-property writes on the
//     TASK-539-04 transform host (never style.transform, never another effect's var)
export const PAGE_EFFECTS_RUNTIME_SOURCE = [
  "(function(){",
  "try{",
  // ── TASK-539-07 fixed vocabulary serialized from pageCompositionEffects.tsx ──
  `var REPLICA_SEL=${REPLICA_SELECTOR_LITERAL};`,
  `var REPLICA_ATTR=${REPLICA_ATTRIBUTE_LITERAL};`,
  `var HOST_ATTR=${HOST_ATTRIBUTE_LITERAL};`,
  `var TV=${TRANSFORM_VARIABLES_LITERAL};`,
  `var RM_QUERY=${REDUCED_MOTION_QUERY_LITERAL};`,
  'var SEL_SWITCHER="[data-switcher]";',
  'var SEL_GALLERY="[data-gallery-filter]";',
  'var SEL_REVEAL=\'[data-page-effect="reveal-fade"],[data-page-effect="reveal-up"]\';',
  "var SEL_PARALLAX='[data-page-effect=\"parallax\"]';",
  'var SEL_PARALLAX_INNER="[data-parallax-inner]";',
  'var SEL_SPOTLIGHT="[data-page-spotlight]";',
  'var SEL_TILT="[data-block-tilt]";',
  'var SEL_MAGNETIC="[data-magnetic]";',
  'var SEL_MOTION="[data-page-motion]";',
  // rAF with a fail-soft synchronous fallback (missing-API documents complete
  // without exception or console error).
  "function raf(cb){",
  " if(window.requestAnimationFrame){window.requestAnimationFrame(cb);}else{cb();}",
  "}",
  // Replica rejection: the candidate itself matches the marquee-replica selector
  // OR its closest ancestor does (closest() covers both; a manual ancestor walk
  // is the no-closest fallback). Checked BEFORE any listener/observer/state
  // attachment and BEFORE the WeakSet mark, so an inert replica keeps visual
  // hooks but never becomes interactive. The primary segment remains eligible.
  "function isReplica(el){",
  " if(!el)return false;",
  " if(el.closest)return !!el.closest(REPLICA_SEL);",
  " var n=el;",
  " while(n){",
  "  if(n.nodeType===1&&n.hasAttribute(REPLICA_ATTR))return true;",
  "  n=n.parentNode;",
  " }",
  " return false;",
  "}",
  // Root-scoped candidate scan: query fixed selectors within the supplied root
  // AND include the root itself when it matches. Local only — the returned array
  // is never retained by the controller (detached elements stay collectible).
  "function collect(root,sel){",
  " var out=[];",
  " if(root&&root.querySelectorAll){",
  "  var list=root.querySelectorAll(sel);",
  "  for(var i=0;i<list.length;i++)out.push(list[i]);",
  " }",
  " if(root&&root.nodeType===1&&root.matches&&root.matches(sel))out.push(root);",
  " return out;",
  "}",
  // Per-element listener attach with partial-rollback: if any addEventListener in
  // the spec list throws, the already-attached listeners are removed and the
  // caller leaves the element unmarked, so a retry can never duplicate them.
  "function bindOne(specs){",
  " var attached=[];",
  " var ok=true;",
  " for(var i=0;i<specs.length;i++){",
  "  try{",
  "   specs[i][0].addEventListener(specs[i][1],specs[i][2],{passive:true});",
  "   attached.push(specs[i]);",
  "  }catch(e){ok=false;break;}",
  " }",
  " if(!ok){",
  "  for(var j=0;j<attached.length;j++){",
  "   try{attached[j][0].removeEventListener(attached[j][1],attached[j][2]);}catch(e2){}",
  "  }",
  " }",
  " return ok;",
  "}",
  // ══════════════════════════════════════════════════════════════════════════
  // createController() owns ONE WeakSet per binder (reveal, parallax, spotlight,
  // switcher, gallery, tilt, magnetic) plus the scroll/resize install boolean,
  // the rAF throttle and the reusable IntersectionObserver. No Element[],
  // NodeList, Set<Element> or element-keyed Map is retained, so detached
  // elements stay collectible. No whole-document MutationObserver: parser-order
  // script execution supplies the rescan.
  // ══════════════════════════════════════════════════════════════════════════
  "function createController(){",
  " var seenSwitcher=new WeakSet();",
  " var seenGallery=new WeakSet();",
  " var seenReveal=new WeakSet();",
  " var seenParallax=new WeakSet();",
  " var seenSpotlight=new WeakSet();",
  " var seenTilt=new WeakSet();",
  " var seenMagnetic=new WeakSet();",
  " var scrollBound=false;",
  " var pending=false;",
  " var io=null;",
  // ── TASK-534 switcher toggle — bound BEFORE the reduced-motion branch. ──
  " function switcherOne(rootEl){",
  "  if(seenSwitcher.has(rootEl))return;",
  "  if(isReplica(rootEl))return;",
  "  var tabs=[].slice.call(rootEl.querySelectorAll('[data-switcher-tab]'));",
  "  var panels=[].slice.call(rootEl.querySelectorAll('[data-switcher-panel]'));",
  "  if(!tabs.length)return;",
  "  var specs=[];",
  "  var activate=function(k){",
  "   tabs.forEach(function(t,j){var on=j===k;",
  "    t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;});",
  "   panels.forEach(function(p,j){var on=j===k;p.hidden=!on;",
  "    p.setAttribute('data-active',on?'true':'false');});",
  "  };",
  "  tabs.forEach(function(t,k){",
  "   specs.push([t,'click',function(){activate(k);t.focus();}]);",
  "   specs.push([t,'keydown',function(e){var n=null;",
  "    if(e.key==='ArrowRight'||e.key==='ArrowDown')n=(k+1)%tabs.length;",
  "    else if(e.key==='ArrowLeft'||e.key==='ArrowUp')n=(k-1+tabs.length)%tabs.length;",
  "    else if(e.key==='Home')n=0;else if(e.key==='End')n=tabs.length-1;",
  "    if(n!==null){e.preventDefault();activate(n);tabs[n].focus();}}]);",
  "  });",
  "  if(!bindOne(specs))return;",
  "  seenSwitcher.add(rootEl);",
  " }",
  " function bindSwitcher(root){",
  "  var list=collect(root,SEL_SWITCHER);",
  "  for(var i=0;i<list.length;i++){try{switcherOne(list[i]);}catch(e){}}",
  " }",
  // ── TASK-534 gallery filter — bound BEFORE the reduced-motion branch. ──
  " function galleryOne(bar){",
  "  if(seenGallery.has(bar))return;",
  "  if(isReplica(bar))return;",
  "  var chips=[].slice.call(bar.querySelectorAll('[data-filter]'));",
  "  if(!chips.length)return;",
  "  var scope=bar.closest('[data-gallery]')||document;",
  "  var items=[].slice.call(scope.querySelectorAll('[data-filter-item]'));",
  "  var specs=[];",
  "  var select=function(c){var f=c.getAttribute('data-filter')||'all';",
  "   chips.forEach(function(x){x.setAttribute('aria-pressed',x===c?'true':'false');});",
  "   items.forEach(function(it){var cat=it.getAttribute('data-category')||'';",
  "    var hide=f!=='all'&&cat.split(' ').indexOf(f)===-1;",
  "    it.classList.toggle('is-hidden',hide);it.hidden=hide;});};",
  "  var rove=function(k){chips.forEach(function(x,j){x.tabIndex=j===k?0:-1;});chips[k].focus();};",
  "  chips.forEach(function(c,k){",
  "   specs.push([c,'click',function(){select(c);}]);",
  "   specs.push([c,'keydown',function(e){var n=null;",
  "    if(e.key==='ArrowRight'||e.key==='ArrowDown')n=(k+1)%chips.length;",
  "    else if(e.key==='ArrowLeft'||e.key==='ArrowUp')n=(k-1+chips.length)%chips.length;",
  "    else if(e.key==='Home')n=0;else if(e.key==='End')n=chips.length-1;",
  "    if(n!==null){e.preventDefault();rove(n);}}]);",
  "  });",
  "  if(!bindOne(specs))return;",
  "  seenGallery.add(bar);",
  " }",
  " function bindGallery(root){",
  "  var list=collect(root,SEL_GALLERY);",
  "  for(var i=0;i<list.length;i++){try{galleryOne(list[i]);}catch(e){}}",
  " }",
  // ── reveal: arm the JS-required-to-HIDE marker, then observe. ──
  " function ioCb(es){",
  "  for(var i=0;i<es.length;i++){",
  "   try{",
  "    if(es[i].isIntersecting){",
  "     es[i].target.setAttribute('data-revealed','true');",
  "     if(io)io.unobserve(es[i].target);",
  "    }",
  "   }catch(e){}",
  "  }",
  " }",
  " function revealOne(el){",
  "  if(seenReveal.has(el))return;",
  "  if(isReplica(el))return;",
  "  if(!('IntersectionObserver' in window)){",
  "   el.setAttribute('data-revealed','true');",
  "   seenReveal.add(el);",
  "   return;",
  "  }",
  "  try{",
  "   if(!io)io=new window.IntersectionObserver(ioCb,{rootMargin:'0px 0px -10% 0px',threshold:0.12});",
  "   io.observe(el);",
  "  }catch(e){",
  "   el.setAttribute('data-revealed','true');",
  "  }",
  "  seenReveal.add(el);",
  " }",
  " function bindReveal(root){",
  "  var roots=collect(root,SEL_MOTION);",
  "  for(var a=0;a<roots.length;a++){",
  "   try{if(!isReplica(roots[a]))roots[a].setAttribute('data-reveal-armed','true');}catch(e){}",
  "  }",
  "  var list=collect(root,SEL_REVEAL);",
  "  for(var i=0;i<list.length;i++){try{revealOne(list[i]);}catch(e){}}",
  " }",
  // ── parallax: global scroll/resize once, frame re-queries the document so the
  // infra never retains a strong element array; [data-parallax-inner] is the
  // separate channel and a transform host is never overwritten. ──
  " function frame(){",
  "  pending=false;",
  "  var vh=window.innerHeight||1;",
  "  var list=document.querySelectorAll(SEL_PARALLAX);",
  "  for(var i=0;i<list.length;i++){",
  "   var el=list[i];",
  "   try{",
  "    if(isReplica(el))continue;",
  "    var inner=el.querySelector(SEL_PARALLAX_INNER)||el;",
  "    if(inner.getAttribute&&inner.getAttribute(HOST_ATTR)!=null)continue;",
  "    var r=el.getBoundingClientRect();",
  "    var amt=Math.max(0,Math.min(40,parseFloat(el.getAttribute('data-parallax'))||0));",
  "    var prog=(r.top+r.height/2-vh/2)/vh;",
  "    var y=Math.max(-amt,Math.min(amt,-prog*amt));",
  "    inner.style.transform='translate3d(0,'+y.toFixed(1)+'px,0)';",
  "   }catch(e){}",
  "  }",
  " }",
  " function onScroll(){",
  "  if(pending)return;",
  "  pending=true;",
  "  raf(frame);",
  " }",
  " function parallaxOne(el){",
  "  if(seenParallax.has(el))return;",
  "  if(isReplica(el))return;",
  "  seenParallax.add(el);",
  " }",
  " function bindParallax(root){",
  "  if(!scrollBound){",
  "   if(bindOne([[window,'scroll',onScroll],[window,'resize',onScroll]]))scrollBound=true;",
  "  }",
  "  var list=collect(root,SEL_PARALLAX);",
  "  for(var i=0;i<list.length;i++){try{parallaxOne(list[i]);}catch(e){}}",
  "  onScroll();",
  " }",
  // ── cursor spotlight: fine-pointer local gate; writes ONLY --spotlight-x/y on
  // the matched root; the overlay merely inherits. No leave/reset behavior. ──
  " function spotlightOne(sp){",
  "  if(seenSpotlight.has(sp))return;",
  "  if(isReplica(sp))return;",
  "  if(!window.matchMedia||!window.matchMedia('(pointer:fine)').matches)return;",
  "  var specs=[];",
  "  var sx=0,sy=0,sPending=false;",
  "  var sFrame=function(){",
  "   sPending=false;",
  "   sp.style.setProperty('--spotlight-x',sx+'px');",
  "   sp.style.setProperty('--spotlight-y',sy+'px');",
  "  };",
  // TASK-529 — the vars feed a position:fixed inset:0 overlay's radial-gradient,
  // so they MUST be VIEWPORT coords (raw clientX/clientY; no rect read needed).
  "  specs.push([sp,'pointermove',function(ev){",
  "   sx=Math.round(ev.clientX);sy=Math.round(ev.clientY);",
  "   if(!sPending){sPending=true;raf(sFrame);}}]);",
  "  if(!bindOne(specs))return;",
  "  seenSpotlight.add(sp);",
  " }",
  " function bindSpotlight(root){",
  "  var list=collect(root,SEL_SPOTLIGHT);",
  "  for(var i=0;i<list.length;i++){try{spotlightOne(list[i]);}catch(e){}}",
  " }",
  // ── TASK-522-01-L05 / TASK-539-04 block tilt: writes ONLY TV.tiltX/tiltY in
  // degrees; leave resets ONLY those to 0deg. Never touches style.transform or
  // another effect's variable. Glare keeps only its own --glare-* vars. ──
  " function tiltOne(el){",
  "  if(seenTilt.has(el))return;",
  "  if(isReplica(el))return;",
  "  if(!window.matchMedia||!window.matchMedia('(pointer:fine)').matches)return;",
  "  var specs=[];",
  "  var gl=el.querySelector('.cx-glare');",
  "  var s=el.getAttribute('data-block-tilt')==='strong'?10:7;",
  "  var bPend=false,brx=0,bry=0,bgx=50,bgy=50;",
  "  var bf=function(){",
  "   bPend=false;",
  "   el.style.setProperty(TV.tiltX,brx.toFixed(2)+'deg');",
  "   el.style.setProperty(TV.tiltY,bry.toFixed(2)+'deg');",
  "   if(gl){gl.style.setProperty('--glare-x',bgx.toFixed(1)+'%');gl.style.setProperty('--glare-y',bgy.toFixed(1)+'%');}",
  "  };",
  "  specs.push([el,'pointermove',function(e){",
  "   var r=el.getBoundingClientRect();",
  "   var px=(e.clientX-r.left)/r.width-0.5,py=(e.clientY-r.top)/r.height-0.5;",
  "   bry=px*s;brx=-py*s;bgx=(px+0.5)*100;bgy=(py+0.5)*100;",
  "   if(!bPend){bPend=true;raf(bf);}}]);",
  "  specs.push([el,'pointerleave',function(){",
  "   brx=0;bry=0;",
  "   el.style.setProperty(TV.tiltX,'0deg');",
  "   el.style.setProperty(TV.tiltY,'0deg');",
  "  }]);",
  "  if(!bindOne(specs))return;",
  "  seenTilt.add(el);",
  " }",
  " function bindTilt(root){",
  "  var list=collect(root,SEL_TILT);",
  "  for(var i=0;i<list.length;i++){try{tiltOne(list[i]);}catch(e){}}",
  " }",
  // ── TASK-534 magnetic: writes ONLY TV.magneticX/magneticY in px; leave resets
  // ONLY those to 0px. Never touches style.transform. ──
  " function magneticOne(el){",
  "  if(seenMagnetic.has(el))return;",
  "  if(isReplica(el))return;",
  "  if(!window.matchMedia||!window.matchMedia('(pointer:fine)').matches)return;",
  "  var specs=[];",
  "  var mPend=false,mx=0,my=0;",
  "  var mf=function(){",
  "   mPend=false;",
  "   el.style.setProperty(TV.magneticX,mx.toFixed(1)+'px');",
  "   el.style.setProperty(TV.magneticY,my.toFixed(1)+'px');",
  "  };",
  "  specs.push([el,'pointermove',function(e){",
  "   var r=el.getBoundingClientRect();",
  "   mx=Math.max(-14,Math.min(14,(e.clientX-(r.left+r.width/2))*0.3));",
  "   my=Math.max(-14,Math.min(14,(e.clientY-(r.top+r.height/2))*0.3));",
  "   if(!mPend){mPend=true;raf(mf);}}]);",
  "  specs.push([el,'pointerleave',function(){",
  "   mx=0;my=0;",
  "   if(!mPend){mPend=true;raf(mf);}}]);",
  "  if(!bindOne(specs))return;",
  "  seenMagnetic.add(el);",
  " }",
  " function bindMagnetic(root){",
  "  var list=collect(root,SEL_MAGNETIC);",
  "  for(var i=0;i<list.length;i++){try{magneticOne(list[i]);}catch(e){}}",
  " }",
  // ── init order: switcher + gallery toggles FIRST (functional for reduce
  // users), then the reduced-motion branch; motion binders run only after it.
  // Per-binder isolation: one failing binder cannot block the next. ──
  " function init(root){",
  "  try{bindSwitcher(root);}catch(e){}",
  "  try{bindGallery(root);}catch(e){}",
  "  var RM=null;",
  "  try{RM=window.matchMedia&&window.matchMedia(RM_QUERY);}catch(e){}",
  "  if(RM&&RM.matches)return;",
  "  try{bindReveal(root);}catch(e){}",
  "  try{bindParallax(root);}catch(e){}",
  "  try{bindSpotlight(root);}catch(e){}",
  "  try{bindTilt(root);}catch(e){}",
  "  try{bindMagnetic(root);}catch(e){}",
  " }",
  " return {init:init};",
  "}",
  // ── entry: reuse the shared controller when present, otherwise create it.
  // Every emitted main/footer copy calls init(document). The legacy flag is
  // WRITTEN for compatibility observation but never read / never early-returns.
  "var state=window.__codersoPageEffectsV2;",
  "if(!state||typeof state.init!=='function'){",
  " state=window.__codersoPageEffectsV2=createController();",
  "}",
  "state.init(document);",
  "window.__codersoPageMotionEffectsInit=true;",
  "}catch(e){}",
  "})();",
].join("");
