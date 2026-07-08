# TASK-524-01-L03: Rebaseline 522 Placement Tests + "Glass+Float Move Together" Render Test

# FileName: TASK-524-01-L03-Placement-Tests-Rebaseline-And-Glass-Float-Test.md

**Parent Task:** TASK-524
**Parent Subtask:** TASK-524-01
**Priority:** High
**Category:** Site Render / Test
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

The OWNED breaking-test change. Update 522's placement assertions in
`tests/vitest/pages/page-renderer-v2.test.tsx` +
`tests/vitest/pages/page-composition-effects.test.ts` to the new (correct)
placement produced by 524-01-L01/L02, and ADD a "glass+float move together" render
test asserting the `data-surface` attribute is on the SAME node as `data-deco`.
This is a DECLARED breaking-test rebaseline (documented in the parent Coordination
+ Hard Invariant 9), NOT drift and NOT a weakened behavior assertion.

## Grounded anchors

- `tests/vitest/pages/page-renderer-v2.test.tsx` — holds the 522 frame-vs-inner
  placement assertions (from 522-03-L02): a `data-surface:"glass"` block → frame
  attr; `decoration.motion:"float"` → `data-deco="float"` on the INNER wrapper;
  `delay`/`duration` → `--deco-delay`/`--deco-duration` on the inner wrapper;
  `hoverEffect:"lift"` → `data-hover="lift"` on the inner wrapper; tilt →
  `data-block-tilt` inner + `data-tilt-parent` frame; anchored-layered-child +
  effect assertions. RE-GREP the exact `test(` / `it(` blocks post-523 (line
  numbers below are the post-523 baseline — re-confirm before editing).

  **The exact 522 tests that FALSE-break from the L02 deco/hover inner→frame move
  — ALL owned here (declared rebaseline, NOT silent drift):**
  1. `~L3275` `"decoration transform motions ride the INNER effect wrapper (not the
     frame)"` — asserts `frameAttrs(block)["data-deco"]` `toBeUndefined` for
     `float`/`drift`/`pulse`/`orbit`. After L02 co-location `data-deco` is ON the
     frame → this flips. Rebaseline per pseudocode **(A)** (deco on the frame).
  2. `~L3296` `"decoration delay/duration emit --deco-* on the INNER wrapper (not
     the frame)"` — asserts `frameVars(block)["--deco-delay"/"--deco-duration"]`
     `toBeUndefined`. L02 empties `INNER_VAR_KEYS` so these seed the FRAME → flips
     (parent Hard Invariant 6; L02 Hard Invariant on `INNER_VAR_KEYS`). Rebaseline
     per pseudocode **(B)** (timing vars ride the frame node).
  3. `~L3371` `"finding 4 — anchored layered child keeps layer on FRAME, effect on
     INNER (decoration)"` — asserts `attrs["data-deco"]` `toBeUndefined` for a
     `float`+`layer` block → flips. Rebaseline per pseudocode **(F)** (layer attrs +
     deco co-locate on the frame; anchor via free `translate:`).
  4. `~L3391` `"finding 4 — anchor + hover lift: layer on frame, hover on inner"` —
     asserts `attrs["data-hover"]` `toBeUndefined` for `lift`+`layer` → flips.
     Rebaseline per pseudocode **(C)**/**(F)** (hover on the frame).

  **One 522 test whose ASSERT survives but whose COMMENT/intent goes stale — also
  rebaselined here (comment only):**
  5. `~L3609` `"block glass/hover presets stamp data-surface / data-hover
     (522-05-L03)"` — the front-render substring assert at `~L3617`
     (`renderComposedBlocks(...)` `toContain('data-hover="lift-glow"')`) STILL
     passes (`data-hover="lift-glow"` is present somewhere in the front render), but
     the accompanying comment at `~L3615-3616` ("lift-glow is a transform hover →
     rides the inner effect wrapper") is now FALSE after co-location. Rewrite that
     comment so the assertion's documented intent matches co-location (lift-glow
     rides the FRAME, same node as `data-surface`). Do NOT weaken the assert.
- `tests/vitest/pages/page-composition-effects.test.ts` — the anchor CSS string
  form. GROUNDED: this file has NO assertion of the literal
  `[data-layer-anchor="…"]{transform:translate(` form, so there is nothing to
  rebaseline — L03 ADDS the new positive `translate:`-property assertion + a
  negative "no `transform:translate` on any anchor rule" assertion (see the
  page-composition-effects pseudocode below). The two anchor-adjacent tests that
  DO exist are contract-PRESERVED and MUST keep passing untouched:
  - `~L53` `"includes all 9 layer-anchor transform rules"` — substring-checks only
    `[data-layer-anchor="${anchor}"]` (the SELECTOR, unchanged by the property
    swap), so it survives. Title is now a misnomer — OPTIONAL cosmetic rename
    `transform rules` → `anchor rules`.
  - `~L37` `"surface presets + base rules + layer-anchor transforms are OUTSIDE the
    gate (static)"` — checks selector-vs-`@media` index ordering (the anchor rules
    stay static, outside `@media … no-preference`), NOT the transform token → keeps
    passing. This is the reduced-motion / static-offset guard (parent Hard
    Invariant 2) — do NOT modify it.
  - Do NOT touch `~L224` `[data-hover="lift"]:hover,…{transform:translateY(-6px)}`
    — that is an UNRELATED hover keyframe rule, not an anchor rule; the `translate:`
    swap is anchor-only.
- The render path helper the 522 tests use (e.g. rendering via
  `renderPageBlockWithFrame` / `toPageBlockRenderProps` and querying the resulting
  DOM for `[data-surface]` / `[data-deco]` node identity) — reuse it.

## Implementation pseudocode

```ts
// page-renderer-v2.test.tsx — REBASELINE the 522 placement assertions to co-location:

// (A) transform decoration now on the FRAME (same node as surface), NOT the inner wrapper:
test("glass + float decoration co-locate on the frame (surface animates)", () => {
  const block = mkBlock({ style: { surfacePreset: "glass", decoration: { motion: "float" } } });
  const el = renderFrame(block);                 // the [data-block-id] frame element
  expect(el.getAttribute("data-surface")).toBe("glass");
  expect(el.getAttribute("data-deco")).toBe("float");   // ← was inner in 522; now SAME node
  expect(queryInnerWrapper(el)).toBeNull();             // ← no inner wrapper for plain deco+glass
});

// (B) THE NEW co-location proof — surface and deco are literally the same DOM node:
test("glass + float move together — data-surface and data-deco on ONE node", () => {
  const block = mkBlock({ style: { surfacePreset: "glass", decoration: { motion: "float" } } });
  const surfaceNode = renderFrame(block).querySelector?.("[data-surface]") ?? renderFrame(block);
  const decoNode    = renderFrame(block).querySelector?.("[data-deco]") ?? renderFrame(block);
  expect(surfaceNode).toBe(decoNode);            // ← the guarantee: one node, so both animate
  // timing vars ride the frame node too:
  const el = renderFrame(mkBlock({ style: { surfacePreset:"glass",
    decoration:{ motion:"float", delay:1500, duration:8000 } } }));
  expect(el.style.getPropertyValue("--deco-delay")).toBe("1500ms");
  expect(el.style.getPropertyValue("--deco-duration")).toBe("8000ms");
});

// (C) transform HOVER now on the frame:
test("glass + lift hover co-locate on the frame", () => {
  const el = renderFrame(mkBlock({ style: { surfacePreset:"glass", hoverEffect:"lift" } }));
  expect(el.getAttribute("data-hover")).toBe("lift");   // ← was inner in 522
});

// (D) TILT unchanged — still inner node + perspective parent on frame (regression guard):
test("tilt stays on the inner node with a perspective parent frame", () => {
  const frame = renderFrame(mkBlock({ style: { tilt:"subtle", tiltGlare:true } }));
  expect(frame.getAttribute("data-tilt-parent")).toBe("");
  const inner = queryInnerWrapper(frame)!;
  expect(inner.getAttribute("data-block-tilt")).toBe("subtle");
  expect(inner.querySelector(".cx-glare")).not.toBeNull();
});

// (E) radiate (box-shadow) unchanged — always frame, no inner wrapper (regression guard):
test("radiate decoration stays on the frame with no inner wrapper", () => {
  const el = renderFrame(mkBlock({ style: { decoration:{ motion:"radiate" } } }));
  expect(el.getAttribute("data-deco")).toBe("radiate");
  expect(queryInnerWrapper(el)).toBeNull();
});

// (F) anchored floating badge — layer + deco co-locate on the frame; anchor via translate:
test("anchored float badge keeps layer attrs + deco on the frame", () => {
  const el = renderFrame(mkBlock({ style: {
    surfacePreset:"glass", decoration:{ motion:"float" },
    layer:{ x:80, y:80, anchor:"bottom-right" } } }));
  expect(el.getAttribute("data-layer-anchor")).toBe("bottom-right");
  expect(el.getAttribute("data-deco")).toBe("float");
  expect(el.style.getPropertyValue("--layer-x")).toBe("80%");   // per-device seam reaches frame
  expect(queryInnerWrapper(el)).toBeNull();
});

// (G) present-only regression — unstyled block byte-identical (no attrs, no inner wrapper):
test("unstyled block: no composition attrs, no inner wrapper", () => {
  const el = renderFrame(mkBlock({}));
  expect(el.getAttribute("data-surface")).toBeNull();
  expect(el.getAttribute("data-deco")).toBeNull();
  expect(queryInnerWrapper(el)).toBeNull();
});

// (H) STALE-COMMENT rebaseline of the surviving ~L3609 test
//     ("block glass/hover presets stamp data-surface / data-hover (522-05-L03)"):
//     the lift-glow front-render assert STILL passes, but its ~L3615-3616 comment
//     ("lift-glow ... rides the inner effect wrapper") is now false. REWRITE the
//     comment (assert unchanged); optionally strengthen with a same-node check:
test("block glass/hover presets stamp data-surface / data-hover (522-05-L03)", () => {
  // Surface preset stays on the FRAME (static, non-transform).
  expect(frameAttrs(composedBlock({ surfacePreset: "glass" }))["data-surface"]).toBe("glass");
  // lift-glow is a transform hover → after 524-01 co-location it rides the SAME
  // node as the surface (the frame), so the front render carries data-hover on the frame.
  expect(renderComposedBlocks([composedBlock({ hoverEffect: "lift-glow" })]))
    .toContain('data-hover="lift-glow"');
});
```

```ts
// page-composition-effects.test.ts — GROUNDED: the old `transform:translate(` anchor
// form is NOT asserted anywhere in this file, so there is nothing to rebaseline.
// ADD a new positive assertion (the `translate:` property) + a negative assertion
// (no `transform:translate(` on ANY anchor rule). Do NOT delete/weaken the existing
// L37 (static-gate ordering) or L53 (all-9-selectors) guards — they still pass.
expect(css).toContain('[data-layer-anchor="bottom-right"]{translate:-100% -100%}');
expect(css).not.toMatch(/\[data-layer-anchor="[^"]+"\]\{transform:translate\(/);
// (the L01 lane also asserts a couple more of the nine `translate:` rules; this file
//  owns the negative "no transform:translate on any anchor rule" guard.)
```

- The existing `~L37` static-gate guard and `~L53` all-9-selectors guard are
  PRESERVED and must stay green (they check the selector + reduced-motion ordering,
  not the swapped property). `~L53`'s title `"...transform rules"` may be cosmetically
  renamed to `"...anchor rules"`. The unrelated `~L224` hover `transform:translateY`
  line is NOT touched.

## Security note

Test-only leaf — no runtime surface. Asserts the co-location outcome, including the
reduced-motion regression (glass static, surface+deco still on one node). Colors are
524-02; no color assertion here beyond the untouched fallback.

## Vitest test lane

- `tests/vitest/pages/page-renderer-v2.test.tsx`
- `tests/vitest/pages/page-composition-effects.test.ts`

## Regression / breaking-test ownership

- OWNS the rebaseline of every 522 placement assertion invalidated by 524-01-L02
  (deco/hover moving from inner→frame). The four HARD-FLIPPING tests are named
  explicitly in **Grounded anchors** (`~L3275`, `~L3296`, `~L3371`, `~L3391`) and
  each maps to a pseudocode block: `~L3275`→(A), `~L3296`→(B), `~L3371`→(F),
  `~L3391`→(C)/(F). This is the declared breaking-test change — documented, no
  behavior assertion weakened (each old assertion is replaced by the equivalent
  new-placement assertion, plus the strictly-STRONGER "same node" proof).
- OWNS the STALE-COMMENT rebaseline of the surviving `~L3609` test (block H): its
  lift-glow front-render assert still passes, but the `~L3615-3616` "rides the inner
  effect wrapper" comment is rewritten to match co-location (frame, same node).
- ADDS the new "glass+float move together" node-identity test (the primary owner-intent
  guarantee).
- For `page-composition-effects.test.ts`: GROUNDED that the old
  `transform:translate(` anchor form is NOT asserted, so L03 ADDS (does not
  rebaseline) the positive `translate:` assertion + the negative "no
  `transform:translate` on any anchor rule" assertion. The anchor CSS property swap
  itself is 524-01-L01.
- PRESERVES (does not touch) the tilt-inner, `data-tilt-parent`, glare, ambient-orbs,
  and present-only regression assertions, AND the composition-effects `~L37`
  static-gate + `~L53` all-9-selectors guards (which stay green) and the unrelated
  `~L224` hover `transform:translateY` line.

## Hard Invariants

1. Every rebaselined assertion is REPLACED by the correct new-placement assertion, not
   deleted; the "same node" identity test is added. The four hard-flipping
   renderer tests (`~L3275`/`~L3296`/`~L3371`/`~L3391`) are each rebaselined, and the
   surviving `~L3609` test's stale comment is rewritten (assert untouched).
2. Tilt / radiate / present-only regression guards remain and still pass, as do the
   composition-effects `~L37` static-gate + `~L53` all-9-selectors guards (the
   reduced-motion / static-offset invariant is preserved — anchor rules stay static,
   outside `@media … no-preference`).
3. The `page-composition-effects.test.ts` anchor change is an ADD (positive
   `translate:` + negative no-`transform:translate`), NOT a rebaseline, because the
   old form was never asserted. The unrelated `~L224` hover transform line is not
   touched.
4. No source edit here — tests only (source is L01/L02).
</content>
