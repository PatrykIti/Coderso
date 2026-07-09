# TASK-534-01-L03: Runtime Clauses — Switcher Toggle, Gallery Filter, Magnetic Hover (`pageEffectsRuntime.ts`)

# FileName: TASK-534-01-L03-Runtime-Switcher-Filter-Magnetic-Clauses.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-01
**Priority:** High
**Category:** Site Render (runtime) / Accessibility / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits `core/services/pages/pageEffectsRuntime.ts` — three NEW
top-level clauses inside the SAME `PAGE_EFFECTS_RUNTIME_SOURCE` IIFE — (1) switcher tab
toggle (click + roving keyboard + `aria-selected` + panel show/hide, reproducing
`app.js:72-86`), (2) gallery filter chips show/hide (`data-category` includes,
reproducing `app.js:88-100`), (3) magnetic-button pointer-attract (reproducing `app.js`
`.magnetic`).

**Placement is SPLIT to satisfy accessibility (corrected 2026-07-09).** The
first-statement early-return `if(RM&&RM.matches)return;` (`:52-53`) is an UNCONDITIONAL
return from the WHOLE IIFE — everything after `:53` (including the 522 block-tilt at
`:97-120`) is skipped entirely under `prefers-reduced-motion: reduce`. The switcher and
gallery-filter clauses are INTERACTION TOGGLES that MUST work for reduce users
(parent Hard Invariants #2/#9; 534-05-L01), so they CANNOT sit below the early-return.

- **(1) switcher toggle + (2) gallery filter → placed BEFORE the early-return** (`:53`),
  immediately after the `try{` (`:51`). These are pure click/keyboard/`aria`/`hidden`
  toggles (no motion of their own; the crossfade is CSS `motion-safe:`-guarded in 534-03),
  so they run for ALL users including reduce.
- **(3) magnetic pointer-attract → placed AFTER the block-tilt clause** (`:120`), BEFORE
  `}catch(e){}` (`:121`), inheriting the reduced-motion early-return (magnetic IS motion →
  correctly suppressed for reduce) and opening its own `pointer:fine` gate.

All config read from validated `data-*` — zero interpolation.

## Grounded anchors

`PAGE_EFFECTS_RUNTIME_SOURCE` array literal `:49-123`; `try{` open `:51`;
reduced-motion first statement `:52-53` (`var RM=…;if(RM&&RM.matches)return;` — an
UNCONDITIONAL whole-IIFE return, so everything after `:53` is skipped under reduce);
existing clauses (all below the early-return, MOTION only): reveal IO `:61-68`, parallax
rAF `:69-81`, spotlight `pointer:fine` `:82-96`, the 522 `[data-block-tilt]` block-tilt
clause `:97-120` (the exact "new top-level clause with its own `pointer:fine` gate,
transforms only, `pointerleave` reset, rAF-batched" precedent to copy for MAGNETIC).
Closing `}catch(e){}` `:121`, `})()` `:122`, `.join("")` `:123`. **The switcher/filter
TOGGLE clauses go between `try{` (`:51`) and the early-return (`:53`) so they run for
reduce users; the magnetic MOTION clause goes after `:120` (inheriting the early-return).**
DOM contract stamped by the renderer (534-02):
`[data-switcher]` host, `[role="tab"][data-switcher-tab]` + `[data-switcher-panel]`
children; `[data-gallery-filter]` chip host + `[data-filter-item][data-category]`;
`[data-magnetic]` element.

## Implementation pseudocode

```ts
// ══════════════════════════════════════════════════════════════════════════════
// PART A — INTERACTION TOGGLES placed BEFORE the reduced-motion early-return, i.e.
// between `try{` (:51) and `if(RM&&RM.matches)return;` (:53). These run for ALL
// users (including prefers-reduced-motion: reduce) because the whole-IIFE return at
// :53 would otherwise skip them. They perform NO motion themselves — click/keyboard/
// aria/hidden toggles only; the VISUAL crossfade/fade is CSS motion-safe:-guarded
// (534-03), so reduce users get working, INSTANT tabs/filters. Config from data-*.
// ── TASK-534 ── switcher + gallery filter (accessible toggles, pre-early-return) ──

// (1) SWITCHER — tablist toggle (reproduces app.js:72-86 styleData swap)
'var sw=document.querySelectorAll("[data-switcher]");',
'sw.forEach(function(root){',
' var tabs=[].slice.call(root.querySelectorAll("[data-switcher-tab]"));',
' var panels=[].slice.call(root.querySelectorAll("[data-switcher-panel]"));',
' function activate(i){tabs.forEach(function(t,j){var on=j===i;',
'  t.setAttribute("aria-selected",on?"true":"false");t.tabIndex=on?0:-1;});',
'  panels.forEach(function(p,j){var on=j===i;p.hidden=!on;',
'   p.setAttribute("data-active",on?"true":"false");});}',
' tabs.forEach(function(t,i){',
'  t.addEventListener("click",function(){activate(i);t.focus();});',
'  t.addEventListener("keydown",function(e){var n=null;',       // roving arrow keys
'   if(e.key==="ArrowRight"||e.key==="ArrowDown")n=(i+1)%tabs.length;',
'   else if(e.key==="ArrowLeft"||e.key==="ArrowUp")n=(i-1+tabs.length)%tabs.length;',
'   else if(e.key==="Home")n=0;else if(e.key==="End")n=tabs.length-1;',
'   if(n!==null){e.preventDefault();activate(n);tabs[n].focus();}});',
' });',
'});',

// (2) GALLERY FILTER — chip show/hide (reproduces app.js:88-100 data-category)
'var gf=document.querySelectorAll("[data-gallery-filter]");',
'gf.forEach(function(bar){',
' var chips=[].slice.call(bar.querySelectorAll("[data-filter]"));',
' var scope=bar.closest("[data-gallery]")||document;',
' var items=[].slice.call(scope.querySelectorAll("[data-filter-item]"));',
' chips.forEach(function(c){c.addEventListener("click",function(){',
'  var f=c.getAttribute("data-filter")||"all";',
'  chips.forEach(function(x){x.setAttribute("aria-selected",x===c?"true":"false");});',
'  items.forEach(function(it){var cat=it.getAttribute("data-category")||"";',
// String.includes on a data-attr token (never innerHTML/eval); .is-hidden toggle:
'   var hide=f!=="all"&&cat.split(" ").indexOf(f)===-1;',
'   it.classList.toggle("is-hidden",hide);it.hidden=hide;});',
' });});',
'});',
// ── END TASK-534 pre-early-return toggles ──

// … then the EXISTING reduced-motion early-return (:53 `if(RM&&RM.matches)return;`)
//    and the existing MOTION clauses (reveal :61-68, parallax :69-81, spotlight
//    :82-96, 522 block-tilt :97-120) — all UNCHANGED …

// ══════════════════════════════════════════════════════════════════════════════
// PART B — MAGNETIC MOTION clause placed AFTER the 522 block-tilt clause (:120) and
// BEFORE `}catch(e){}` (:121). This INHERITS the reduced-motion early-return (it is
// motion → correctly suppressed for reduce) and opens its own pointer:fine gate.
// ── TASK-534 ── magnetic pointer-attract (motion, post-early-return) ──
// (3) MAGNETIC — pointer-attract (reproduces app.js .magnetic; pointer:fine + reduce)
'var mg=document.querySelectorAll("[data-magnetic]");',
'if(mg.length&&window.matchMedia&&window.matchMedia("(pointer:fine)").matches){',
' mg.forEach(function(el){var mPend=false,mx=0,my=0;',
'  function mf(){mPend=false;el.style.transform="translate("+mx.toFixed(1)+"px,"+my.toFixed(1)+"px)";}',
'  el.addEventListener("pointermove",function(e){var r=el.getBoundingClientRect();',
// attract toward cursor, clamped to a small radius (transforms only, no layout):
'   mx=Math.max(-14,Math.min(14,(e.clientX-(r.left+r.width/2))*0.3));',
'   my=Math.max(-14,Math.min(14,(e.clientY-(r.top+r.height/2))*0.3));',
'   if(!mPend){mPend=true;requestAnimationFrame(mf);}},{passive:true});',
'  el.addEventListener("pointerleave",function(){mx=0;my=0;',
'   if(!mPend){mPend=true;requestAnimationFrame(mf);}},{passive:true});',
' });',
'}',
// ── END TASK-534 magnetic clause ──

// … existing '}catch(e){}' (:121), '})()' (:122) …
```

**Why NOT append all three after block-tilt.** The earlier plan ("append after the 522
block-tilt clause, reuse the single early-return, toggles still work for reduce") is
internally impossible: the `:53` early-return skips everything below it, so appended
toggles would NOT run for reduce users — a real a11y regression on tabs/filters. The split
above (toggles pre-return, magnetic post-return) is the only placement that makes all of
"reuse the single first-statement early-return", "toggles work for reduce", and "magnetic
suppressed for reduce" simultaneously true.

**No second `<script>`:** these clauses live in the ONE
`PAGE_EFFECTS_RUNTIME_SOURCE`; the single emit in `PageDocumentRender`
(`pageRendererV2.tsx:3100`) carries them (534-02 OR-widens `anyMotion` so the emit
fires when a switcher/filter/magnetic surface is authored). **Idempotent** (single
`PAGE_EFFECTS_RUNTIME_ID`). **No layout thrash:** magnetic uses transforms only,
rect reads batched in rAF; switcher/filter toggle classes/`hidden`.

## Security note

STATIC string literals — ZERO interpolation of caller/stored data. Every clause
reads config via `getAttribute` / `querySelectorAll` on validated `data-*` set by
the renderer from already-normalized values; `data-category` is a SPACE-SEPARATED SET of
single-token categories (each token `^[\w-]{1,48}$`, NO space — 534-01-L01 write sanitize
+ 534-02-L02 render re-sanitize), and each chip's `data-filter` is ONE such token, so the
runtime match `cat.split(" ").indexOf(f)!==-1` is CONSISTENT with the write/render grammar
(a category never contains a space, so a token is never accidentally split). No `innerHTML`,
no `eval`, no `Function(`. Contains NO `${` template marker. The magnetic clause
is `pointer:fine` gated + inherits the reduced-motion early-return (touch/reduce →
static). The switcher/filter TOGGLE clauses are placed BEFORE the reduced-motion early-return
(`:53`) so they run for ALL users (accessibility — reduce users still get working tabs);
they perform no motion, and the VISUAL crossfade/fade is CSS `motion-safe:`-guarded
(534-03), so no motion for reduce users. The magnetic clause is placed AFTER the
early-return (motion → suppressed for reduce) + `pointer:fine`-gated. Emitted via the ONE
existing `<script data-coderso-runtime-script>` (static `__html`), CSP-nonce compatible,
`passive` listeners, `try/catch` guard.

## Test lane

**Behavioral** (jsdom exec, `tests/vitest/content*` lane per parent 521-01-L04
precedent) + **static-shape Vitest** — delegated to 534-01-L04, asserted here.
Static: `PAGE_EFFECTS_RUNTIME_SOURCE` contains the reduced-motion first-statement
return; the `data-switcher` + `data-gallery-filter` toggle markers appear BEFORE that
return's index in the joined string (they run for reduce users) while `data-magnetic`
appears AFTER it (motion, suppressed for reduce); opens a `pointer:fine` gate for
magnetic; contains NO `${` and no `eval`/`Function(`/`innerHTML=` sink. Behavioral
(534-05-L01): eval the IIFE against a jsdom fixture, simulate tab click ⇒ `aria-selected`
+ panel `hidden` flip; ArrowRight roves; filter chip click ⇒ `.is-hidden` on non-matching
items; pointermove on `[data-magnetic]` sets a clamped `translate` transform;
**reduced-motion ⇒ tabs + filters STILL toggle (they precede the early-return) but the
magnetic transform does NOT apply** (it follows the early-return).

## Regression / owned-breaking-test notes

- **Owned breaking test:** `tests/vitest/pages/pageEffectsRuntime.test.ts` (the
  521 static-shape suite) asserts the EXACT set of clauses / a source snapshot. It
  OWNS updates for the three new clause markers — extend its assertions in this
  commit: add `data-switcher`/`data-gallery-filter` presence checks AND assert their
  index is BEFORE the `if(RM&&RM.matches)return;` substring index, add `data-magnetic`
  AND assert its index is AFTER that return (locking the split placement); if it
  snapshots the whole string, re-baseline the snapshot. Keep the existing
  reveal/parallax/spotlight/block-tilt assertions intact.

## Hard Invariants

1. STATIC string — zero interpolation; the single reduced-motion early-return (`:53`)
   is reused UNCHANGED (not duplicated).
2. ONE `<script>` (single id). SPLIT placement: switcher + gallery-filter TOGGLE clauses
   go BETWEEN `try{` (`:51`) and the early-return (`:53`) so they run for reduce users;
   the magnetic MOTION clause goes AFTER the 522 block-tilt (`:120`), before `}catch(e){}`
   (`:121`), inheriting the early-return.
3. Dependency-free; `passive` + rAF (magnetic); transforms only for motion;
   `pointer:fine` gate for magnetic; `try/catch` guard.
4. Toggles (switcher/filter) accessible for reduce users BECAUSE they precede the
   early-return; their VISUAL crossfade is CSS `motion-safe:`-guarded (534-03); magnetic
   motion is suppressed for reduce by the runtime early-return it sits below. The
   "append all three after block-tilt + reuse the single early-return + toggles work for
   reduce" triple is impossible and is explicitly rejected.
