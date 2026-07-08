# TASK-525-02-L04: Per-Block Reveal Delay Tests (Round-Trip / Reject-Unknown / Present-Only / Delay Applied)

# FileName: TASK-525-02-L04-Reveal-Delay-Tests.md

**Parent Task:** TASK-525
**Parent Subtask:** TASK-525-02
**Priority:** High
**Category:** Testing / Site Render / Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Vitest coverage for 525-02: model round-trip / reject-unknown / present-only /
clamp (`page-document-v2.test.ts`) and render/CSS wiring — `--reveal-delay`
emitted on the frame + the reveal `transition-delay` rule
(`page-renderer-v2.test.tsx`). Lands after 525-02-L01/L02/L03.

## Grounded anchors (RE-GREP at implement time)

- `tests/vitest/pages/page-document-v2.test.ts` — block-style normalize/round-trip
  suite (the 522 present-only fields' coverage pattern).
- `tests/vitest/pages/page-renderer-v2.test.tsx` — `toPageBlockRenderProps` frame
  style + `PAGE_REVEAL_MOTION_CSS` string assertions.
- Model: `PageBlockStyleV2.revealDelay` (525-02-L01),
  `PAGE_REVEAL_DELAY_CLAMP {min:0,max:4000}`. Render: `--reveal-delay` on the
  `[data-block-id]` frame (525-02-L02), `transition-delay:var(--reveal-delay,0ms)`
  in `PAGE_REVEAL_MOTION_CSS`.

## Test cases

```ts
// page-document-v2.test.ts — MODEL
it("round-trips block.style.revealDelay", () => {
  const doc = normalize(makeDocWithBlockStyle({ revealDelay: 120 }));
  expect(blockStyleOf(doc).revealDelay).toBe(120);
});
it("clamps revealDelay to PAGE_REVEAL_DELAY_CLAMP (fail-soft)", () => {
  expect(blockStyleOf(normalize(makeDocWithBlockStyle({ revealDelay: 1e9 }))).revealDelay).toBe(4000);
  expect(blockStyleOf(normalize(makeDocWithBlockStyle({ revealDelay: -500 }))).revealDelay).toBe(0);
  expect(blockStyleOf(normalize(makeDocWithBlockStyle({ revealDelay: NaN }))).revealDelay).toBe(0); // readNumber fallback
});
it("is present-only: unset block emits NO revealDelay (byte-identical)", () => {
  const style = blockStyleOf(normalize(makeDocWithBlockStyle({})));
  expect("revealDelay" in style).toBe(false);
});
it("rejects an unknown block-style key (reject-unknown)", () => {
  expect(() => normalizeWrite(makeDocWithBlockStyle({ bogusKey: 1 } as any)))
    .toThrow(PageDocumentError);
});

// page-renderer-v2.test.tsx — RENDER / CSS
it("emits --reveal-delay on the block frame when authored", () => {
  const props = toPageBlockRenderProps(makeBlock({ style: { revealDelay: 240 } }));
  expect(props.style["--reveal-delay"]).toBe("240ms");
});
it("omits --reveal-delay when unset (byte-identical frame style)", () => {
  const props = toPageBlockRenderProps(makeBlock({ style: {} }));
  expect("--reveal-delay" in props.style).toBe(false);
});
it("PAGE_REVEAL_MOTION_CSS applies the delay inside the motion-safe/armed gate", () => {
  expect(PAGE_REVEAL_MOTION_CSS).toContain("prefers-reduced-motion: no-preference");
  expect(PAGE_REVEAL_MOTION_CSS).toContain("transition-delay:var(--reveal-delay,0ms)");
  // and the delay rule sits inside [data-reveal-armed] (never a permanent hide).
  expect(PAGE_REVEAL_MOTION_CSS).toContain("[data-reveal-armed]");
});
it("gives revealing CHILDREN their own hide-state + transition (cascade is not inert)", () => {
  // GUARD against the inert path: a bare transition-delay on [data-page-block]
  // with no child transition produces zero visible stagger. Assert the child
  // reveal transition + hide-state actually exist, keyed off the section's
  // data-revealed, so --reveal-delay has a transition to delay.
  // child hide-state while the section is not yet revealed:
  expect(PAGE_REVEAL_MOTION_CSS).toContain(
    ':not([data-revealed]) [data-page-block]',
  );
  // child carries its OWN opacity/transform transition (the thing --reveal-delay delays):
  expect(PAGE_REVEAL_MOTION_CSS).toMatch(
    /\[data-page-block\]\{opacity:0;transition:opacity[^}]*transition-delay:var\(--reveal-delay,0ms\)/,
  );
  // revealed target keyed on the SECTION's data-revealed (runtime toggles section only):
  expect(PAGE_REVEAL_MOTION_CSS).toContain(
    '[data-revealed] [data-page-block]',
  );
});
it("staggers a revealing section's children (per-block delays)", () => {
  // section scrollEffect reveal-up + three blocks revealDelay 0/120/240 →
  // three frames with --reveal-delay 0ms/120ms/240ms (distinct vars) AND the
  // child hide-state/transition rules above (proven by the preceding test) — the
  // combination, not distinct vars alone, is what proves a real cascade. Distinct
  // vars WITHOUT the child transition would be a visual no-op and MUST NOT count
  // as acceptance (see the live cascade gate below).
});
// OPTIONAL (if auto-stagger shipped):
it("section auto-stagger seeds incremental --reveal-delay per direct child (opt-in)", () => { /* … */ });
```

## Security note

Assert the negative-security paths: `revealDelay:NaN/1e9/-500` clamps to the
bounded range (no unbounded delay, no raw value in the emitted `${n}ms`); an
unknown block-style key throws `PageDocumentError`; the emitted value is a bounded
`${n}ms` custom property consumed by a fixed `transition-delay` (never raw CSS).

## Regression / breaking-test ownership

- OWNS any `PAGE_REVEAL_MOTION_CSS` full-string snapshot update (the appended
  per-child hide-state + transition + `transition-delay` rules from 525-02-L02) —
  DECLARED additive update, not a weakened assertion.
- The `pageUniversalBlockControls` count/snapshot +1 AND the `validBlockPaths`
  allowlist Set extension for the new control are owned by **525-02-L03** (see its
  Regression/breaking-test-ownership section for
  `page-editor-control-registry.test.ts`), NOT this leaf.
- All other reveal / block-style tests pass unchanged (present-only byte-identity
  + `var(--reveal-delay,0ms)` default).

## Cascade acceptance (falsifiable — not "distinct vars")

- The "distinct `--reveal-delay` vars" assertion (0/120/240ms) is NECESSARY but
  NOT SUFFICIENT: it passes even under the inert path where children have delays
  but no reveal transition (nothing visually staggers). It MUST be paired with the
  render-lane assertion that the CHILD reveal transition + hide-state exist (the
  `[data-page-block]{opacity:0;transition:…;transition-delay:var(--reveal-delay,
  0ms)}` rule under the armed/motion-safe gate keyed on `:not([data-revealed])`,
  plus the `[data-revealed] [data-page-block]{opacity:1;transform:none}` target).
- **HARD CLOSURE GATE for 525-02:** a LIVE Playwright cascade smoke that measures
  per-CHILD COMPUTED opacity/transform SEQUENCING OVER TIME (child N becomes
  visible after child N-1, staggered) — NOT merely reading computed
  `transition-delay` strings, which a no-op would also report. A green vitest
  suite alone does NOT close 525-02; the live per-child sequencing must be
  observed (parent TASK-525 acceptance #4: "reveals its children in sequence …
  cascading, not one unit").

## Hard Invariants

1. Round-trip, reject-unknown, present-only, clamp all asserted for `revealDelay`.
2. `--reveal-delay` emit + `transition-delay:var(--reveal-delay,0ms)` inside the
   motion-safe/armed gate asserted; unset = byte-identical.
3. Child reveal transition + hide-state asserted in the render lane (cascade is
   falsifiable, not proven by distinct vars alone); live per-child sequencing smoke
   is a hard closure gate for 525-02.
4. Security negatives (clamp + reject-unknown) asserted.
