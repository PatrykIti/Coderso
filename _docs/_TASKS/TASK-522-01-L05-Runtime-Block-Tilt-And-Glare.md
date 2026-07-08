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
a GENERALIZED block-tilt binding (`[data-block-tilt]`, generalizing 521-03's
hero-only tilt) + an optional glare-position update — reusing 521's exact pointer
math + `matchMedia('(pointer:fine)')` + reduced-motion guards (Hard Invariant:
reuse, not duplicate). Lands AFTER 521. Does NOT touch 521's hero-tilt or spotlight
bindings.

## Grounded anchors (VERIFY LIVE at implement time — 521 lands first)

- 521-01-L04 creates `pageEffectsRuntime.ts` (a dependency-free IIFE string with a
  reduced-motion early-return); 521-03-L03 adds the hero pointermove tilt using the
  reference math (`app.js:41-52`): `x=(clientX-left)/width-0.5; y=(clientY-top)/height-0.5;
  transform=rotateX(-y*deg) rotateY(x*deg) translateY(-2px)`, reset on `pointerleave`,
  gated to `matchMedia('(pointer:fine)')`. **Read the landed 521 file first** and match
  its selector/guard/export naming exactly; adapt this append to its actual shape.
- Emit point: `PageDocumentRender` (`pageRendererV2.tsx:2331`) already emits the 521
  runtime once (521-05-L03). 522-05-L01 conditions the emit to ALSO include this file
  when a 522 tilt is present (present-only).

## Implementation pseudocode

```ts
// Appended INSIDE the existing pointer-fine + reduced-motion guarded block of
// pageEffectsRuntime.ts (reuse 521's guards; do NOT re-open a second matchMedia):
//
//   if (reduceMotion) return;                       // 521's existing early-return
//   if (window.matchMedia('(pointer:fine)').matches) {
//     … 521 hero tilt + spotlight …
//     // --- 522 APPEND: generalized block tilt ---
document.querySelectorAll('[data-block-tilt]').forEach((el) => {
  const strength = el.getAttribute('data-block-tilt') === 'strong' ? 10 : 7; // subtle=7deg
  const glare = el.querySelector('.cx-glare');
  let raf = 0;
  el.addEventListener('pointermove', (event) => {
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.style.transform =
        `rotateX(${(-py * strength).toFixed(2)}deg) rotateY(${(px * strength).toFixed(2)}deg) translateY(-2px)`;
      if (glare) {
        glare.style.setProperty('--glare-x', `${((px + 0.5) * 100).toFixed(1)}%`);
        glare.style.setProperty('--glare-y', `${((py + 0.5) * 100).toFixed(1)}%`);
      }
    });
  }, { passive: true });
  el.addEventListener('pointerleave', () => {
    if (raf) cancelAnimationFrame(raf);
    el.style.transform = '';
    if (glare) { glare.style.removeProperty('--glare-x'); glare.style.removeProperty('--glare-y'); }
  });
});
//   }
```

**Reuse discipline.** This binding uses the SAME normalized pointer math as 521's
hero tilt (`x/y` offset −0.5..0.5, `rotateX(-y) rotateY(x)`); the ONLY additions are
(a) a per-element strength (`subtle=7deg`, `strong=10deg` from the validated
`data-block-tilt` enum value), (b) an `rAF` throttle, and (c) the optional glare
custom-prop update. It runs behind 521's existing `prefers-reduced-motion` early
return AND `matchMedia('(pointer:fine)')` gate (coarse/touch → no tilt). The parent
perspective + `.cx-glare` element are supplied by the 522-03 block-frame render
(perspective wrapper) + the 522-01-L04 CSS. No stored data is interpolated into the
script (values read from validated `data-*`). Static string; `dangerouslySetInnerHTML`
mechanism unchanged; no `eval`/`new Function` in shipped source.

## Regression-test shape (delegated to 522-01-L06, asserted here)

- The runtime source string contains `data-block-tilt` and a `matchMedia` / reduced-
  motion guard (assert the guard is NOT bypassed).
- Exercising the IIFE in jsdom (via a test-only `new Function(source)` in the TEST
  file, never shipped) with a `[data-block-tilt="subtle"]` element + a synthetic
  `pointermove` sets a `transform` containing `rotateX`/`rotateY`; `pointerleave`
  clears it; a `.cx-glare` child gets `--glare-x`/`--glare-y`; under emulated
  `matchMedia('(pointer:fine)') = false` NO listener/transform is attached.
- **Lane:** Vitest (extend the 521 runtime suite,
  `tests/vitest/pages/page-effects-runtime.test.ts` — jsdom).

## Hard Invariants

1. Reuse 521's pointer math + guards (no duplicate runtime module, no second
   `matchMedia` reduced-motion open).
2. Coarse pointer / reduced-motion → no tilt; `rAF`-throttled, `passive`.
3. Static literal; no stored-data interpolation; no `eval`/`new Function` shipped.
4. Append-only seam; 521's hero-tilt + spotlight bindings untouched.
</content>
