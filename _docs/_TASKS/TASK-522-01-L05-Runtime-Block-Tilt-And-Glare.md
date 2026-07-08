# TASK-522-01-L05: Runtime Block-Tilt Generalization + Glare (521 APPEND Seam)

# FileName: TASK-522-01-L05-Runtime-Block-Tilt-And-Glare.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-01
**Priority:** High
**Category:** Site Render / Security / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. APPENDS to the 521-owned `core/services/pages/pageEffectsRuntime.ts`
a SELF-CONTAINED block-tilt binding (`[data-block-tilt]`) + an optional glare-position
update. It reproduces the reference/hero pointer-math PATTERN (the hero tilt itself
lives in a separate script in `hero.tsx` — see Grounded anchors — so it is NOT
importable/reusable from the runtime module; this binding writes its OWN copy of the
~4-line math). Lands AFTER 521. Does NOT touch 521's spotlight binding; the module has
no hero tilt to touch.

## Grounded anchors (VERIFIED LIVE against the LANDED 521 code — re-verify at implement time)

- **The runtime module is a joined ES5 string array, NOT a template literal.**
  `pageEffectsRuntime.ts` (verified live, ~94 lines) is
  `export const PAGE_EFFECTS_RUNTIME_SOURCE = [ "(function(){", "try{", … ].join("")`
  built from `var`/`function`/string-concat fragments. Arrow-fn / `const` / backtick
  pseudocode CANNOT be pasted verbatim — the append MUST be authored as new `"…"`
  array-fragment lines in the same ES5 style.
- **The module contains NO hero tilt.** Its header comment states verbatim: *"Hero
  tilt has its OWN small script in 521-03 — this module does NOT handle hero."* Its
  IIFE contains only reveal (IntersectionObserver), parallax (rAF scroll) and the
  cursor spotlight. There is therefore NO in-module tilt primitive to "reuse".
- **The tilt primitive actually lives in `core/widgets/core/hero.tsx`** as a SEPARATE
  IIFE `HERO_TILT_SCRIPT` (verified `hero.tsx:1311-1325`, registered with id
  `"hero-tilt"`): selector `[data-hero-tilt]`, inner `[data-hero-tilt-inner]`, math
  `px=(clientX-left)/width-0.5; py=(clientY-top)/height-0.5; ry=px*max*2; rx=-py*max*2`
  → `inner.style.transform="rotateX("+rx+"deg) rotateY("+ry+"deg)"`, reset on
  `pointerleave`, with its OWN `prefers-reduced-motion` return AND its OWN
  `matchMedia('(pointer:fine)')` return. **`hero.tsx` is a file 522 explicitly does
  NOT edit and does not import**, so 522 cannot call this primitive — it copies the
  pattern.
- **There is NO module-wide `pointer:fine` gate to piggyback on.** The ONLY
  `matchMedia('(pointer:fine)')` block in the runtime is `if(sp&&window.matchMedia&&
  window.matchMedia("(pointer:fine)").matches){…}` (verified `pageEffectsRuntime.ts:84`)
  where `sp = document.querySelector("[data-page-spotlight]")`. Appending the tilt
  binding INSIDE that block would make block-tilt run ONLY on pages that also have a
  spotlight element — silently DEAD otherwise. The tilt binding MUST open its OWN
  `matchMedia('(pointer:fine)')` gate.
- **The only reusable guard is the global reduced-motion early-return**
  `if(RM&&RM.matches)return;` (verified `pageEffectsRuntime.ts:53`, first executable
  statement inside `try{`). The new binding sits AFTER it, so reduced-motion is already
  covered — do NOT open a second reduced-motion check.
- Emit point: `PageDocumentRender` (`pageRendererV2.tsx`) already emits the 521 runtime
  once (521-05-L03). 522-05-L01 documents the shared emit-predicate co-edit seam so the
  runtime is emitted when a 522 tilt is present (present-only) — see 522-05-L01.

## Implementation pseudocode (ES5 array-fragment append — match the module style)

Append these fragments to the `PAGE_EFFECTS_RUNTIME_SOURCE` array, placed AFTER the
spotlight block and BEFORE the closing `"}catch(e){}",` / `"})();"` — i.e. at top level
inside the IIFE, NOT nested in the `sp`-gated spotlight block. The binding opens its OWN
`(pointer:fine)` gate (a SECOND `pointer:fine` gate is fine — only a second
reduced-motion open is discouraged, and the global `if(RM&&RM.matches)return;` at
line 53 already covers reduce):

```js
// ---- 522 generalized block tilt ([data-block-tilt]); own pointer:fine gate ----
'var bt=document.querySelectorAll("[data-block-tilt]");',
'if(bt.length&&window.matchMedia&&window.matchMedia("(pointer:fine)").matches){',
' bt.forEach(function(el){',
'  var s=el.getAttribute("data-block-tilt")==="strong"?10:7;',      // subtle=7deg
'  var gl=el.querySelector(".cx-glare");',
'  var bPend=false,brx=0,bry=0,bgx=50,bgy=50;',
'  function bf(){bPend=false;',
'   el.style.transform="rotateX("+brx.toFixed(2)+"deg) rotateY("+bry.toFixed(2)+"deg) translateY(-2px)";',
'   if(gl){gl.style.setProperty("--glare-x",bgx.toFixed(1)+"%");gl.style.setProperty("--glare-y",bgy.toFixed(1)+"%");}}',
'  el.addEventListener("pointermove",function(e){var r=el.getBoundingClientRect();',
'   var px=(e.clientX-r.left)/r.width-0.5,py=(e.clientY-r.top)/r.height-0.5;',
'   bry=px*s;brx=-py*s;bgx=(px+0.5)*100;bgy=(py+0.5)*100;',   // same normalized math as hero
'   if(!bPend){bPend=true;requestAnimationFrame(bf);}},{passive:true});',
'  el.addEventListener("pointerleave",function(){el.style.transform="";',
'   if(gl){gl.style.removeProperty("--glare-x");gl.style.removeProperty("--glare-y");}},{passive:true});',
' });',
'}',
```

**IMPLEMENT-TIME VERIFY.** Re-read the landed `pageEffectsRuntime.ts` and confirm (a)
it is still the joined-array shape, (b) the global reduced-motion return is still the
first statement, (c) the append lands at IIFE top level (not inside the spotlight `sp`
block). Match the exact quoting/`var`/`function` idiom of the surrounding fragments.

**Duplication decision (resolves the reuse/no-duplicate tension — option (a)).** The
~4-line normalized pointer math (`px/py` offset −0.5..0.5 → `rotateX(-py*s)
rotateY(px*s)`) is a SMALL, DOCUMENTED, DELIBERATE duplication of `HERO_TILT_SCRIPT`'s
math, because that primitive lives in `hero.tsx` (unimportable from the runtime module)
and 522 does not edit `hero.tsx`. This is the accepted resolution; Hard Invariant 6 in
the parent is softened accordingly (see parent). *Optional future refactor (NOT required
by this leaf, would be a 521-03 co-edit): extract the math into a shared exported runtime
helper so both hero and block tilt call it — deferred, out of scope here.* The only
deltas over the hero math are (a) per-element strength (`subtle=7deg`, `strong=10deg`
from the validated `data-block-tilt` enum), (b) `rAF` throttle, (c) optional glare
custom-prop update. The parent perspective wrapper + `.cx-glare` element are supplied by
the 522-03 block-frame render + 522-01-L04 CSS. No stored data is interpolated into the
script (values read from validated `data-*`). Static string; the
`dangerouslySetInnerHTML` emit mechanism is unchanged; no `eval`/`new Function` in
shipped source.

## Regression-test shape (delegated to 522-01-L06, asserted here)

- The runtime source string contains `data-block-tilt` and (verifiable) its OWN
  `matchMedia("(pointer:fine)")` gate distinct from the spotlight `sp` block; assert the
  global reduced-motion early-return is still present and NOT bypassed.
- Exercising the IIFE in jsdom (via a test-only `new Function(source)` in the TEST file,
  never shipped) with a `[data-block-tilt="subtle"]` element + a synthetic `pointermove`
  sets a `transform` containing `rotateX`/`rotateY`; `pointerleave` clears it; a
  `.cx-glare` child gets `--glare-x`/`--glare-y`; under emulated
  `matchMedia('(pointer:fine)') = false` NO listener/transform is attached; and a page
  WITHOUT a spotlight element still tilts (guards the "dead without spotlight" regression).
- **Lane:** Vitest — extend the ACTUAL landed 521 runtime suite,
  `tests/vitest/pages/pageEffectsRuntime.test.ts` (camelCase, matches the source
  filename; the kebab `page-effects-runtime.test.ts` does NOT exist). jsdom.

## Hard Invariants

1. Self-contained binding: its OWN `matchMedia('(pointer:fine)')` gate at IIFE top level
   (NOT nested inside the spotlight `sp` block); reuses ONLY the global reduced-motion
   early-return (no second reduced-motion open).
2. Coarse pointer / reduced-motion → no tilt; `rAF`-throttled, `passive`.
3. Static literal ES5 array fragments (match module idiom); no stored-data
   interpolation; no `eval`/`new Function` shipped.
4. Append-only seam; 521's spotlight/reveal/parallax bindings untouched. The pointer
   math is a small documented duplication of `hero.tsx`'s `HERO_TILT_SCRIPT` (unimportable
   from the runtime), NOT a claimed reuse of an in-module primitive.
