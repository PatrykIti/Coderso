# TASK-523-02-L02: Occlusion-Proof Spotlight Tests

# FileName: TASK-523-02-L02-Tests.md

**Parent Task:** TASK-523
**Parent Subtask:** TASK-523-02
**Priority:** High
**Category:** Tests
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Regression tests for the spotlight occlusion fix (523-02-L01). The
spotlight overlay + `PAGE_SPOTLIGHT_CSS` are `renderToString` assertions, which live
in **Vitest** (`tests/vitest/pages/page-renderer-v2.test.tsx`, the established render
suite — `tests/unit/pages/` is reserved for Bun DB/service + the Ajv
`validation.test.ts`).

## Test shape

**Vitest — `tests/vitest/pages/page-renderer-v2.test.tsx`** (extend; `renderToString`):

```ts
it("spotlight overlay CSS contains mix-blend-mode:screen (occlusion-proof)", () => {}); // PAGE_SPOTLIGHT_CSS __html
it("spotlight overlay CSS raises z-index above 0 but below the sticky nav z-40 (base rule, e.g. z-index:30)", () => {}); // NOT z-0, NOT z-index:40
it("spotlight overlay CSS keeps pointer-events:none (never blocks clicks)", () => {});
it("spotlight overlay static positioning (position:fixed;inset:0;z-index;mix-blend-mode;pointer-events) lives in a NON-gated base rule", () => {}); // outside @media
it("spotlight radial-gradient background stays inside @media (prefers-reduced-motion: no-preference)", () => {}); // moving glow gated
it("overlay <div data-page-spotlight-overlay> no longer carries z-0 and is pointer-events:none", () => {});
it("cursorSpotlight OFF ⇒ no overlay div, no <style data-page-spotlight-css> (byte-identical vs post-522)", () => {});
```

**NAV-SAFETY LAYERING GUARD (the z-30 < z-40 contract held in a test, not just
prose).** The occlusion fix relies on `position:fixed;z-index:30` on the overlay
comparing DIRECTLY against the front sticky nav's `sticky z-40` — which only holds if
NO stacking-context-forming style sits between the page `<Root>` and the overlay
(`<Root>` className `min-h-screen bg-white text-slate-950`, `pageRendererV2.tsx:2856`,
creates none; a fixed z-30 child of Root resolves against the viewport root context
and sits below z-40). This is FRAGILE — any future ancestor gaining
`transform`/`filter`/`opacity<1`/`will-change`/`isolation:isolate` would trap the
fixed overlay in a child stacking context and could float it ABOVE the nav despite
z-30<z-40, letting `mix-blend-mode:screen` tint the primary menu chrome (522 already
emits `will-change-transform` on the parallax-inner at `:2667`). So HOLD the contract
in tests, not prose:

```ts
// The z-30 overlay vs z-40 nav contract — assert BOTH ends of the inequality by grep,
// so a future nav z-index drop OR an overlay z-index change breaks a test.
it("front sticky nav is z-40 (navigation.tsx:1728 / widgetRenderer.tsx:276) — the ceiling the overlay stays below", () => {});
// grep the two nav sources for `sticky z-40` (navOwnsSticky && "sticky z-40" / stickyNavigationSurface && "sticky z-40")
it("spotlight overlay z-index (30) is strictly LESS than the nav z-40 (screen-blend never composites over the menu)", () => {}); // assert PAGE_SPOTLIGHT_CSS z-index value < 40
// Fragility guard: nothing between <Root> and the overlay may form a stacking context.
it("<Root> className carries no stacking-context-forming utility (no transform/filter/opacity/will-change/isolation) between it and the fixed overlay", () => {}); // rootClassName default "min-h-screen bg-white text-slate-950" — assert none of transform|filter|opacity-|will-change|isolate present
it("isolation:isolate is NOT set on <Root> (would trap the fixed overlay in a child stacking context and defeat z-30<z-40)", () => {}); // deliberate NON-choice, pinned
```

**COUPLED EXISTING ASSERTIONS TO UPDATE (mandatory — grounded, exact lines).** The
D2 change removes the pre-fix overlay className shape and splits the CSS, so two
existing assertions in `page-renderer-v2.test.tsx` MUST be edited in this leaf (a
fixer that only ADDS the new `it(...)` bullets above would leave these red/misleading):

- **`page-renderer-v2.test.tsx:2941`** currently
  `expect(html).toContain("pointer-events-none fixed inset-0 z-0")`. The overlay
  className drops `fixed inset-0 z-0` (the base rule now owns position/inset/z-index),
  so REPLACE it with:
  ```ts
  expect(html).toContain("pointer-events-none");        // overlay keeps click-through
  expect(html).not.toContain("pointer-events-none fixed inset-0 z-0"); // old coupled shape gone
  expect(html).not.toContain('data-page-spotlight-overlay class="pointer-events-none fixed inset-0 z-0"');
  ```
  (Assert the overlay is NO LONGER emitted with `fixed inset-0 z-0`.)
- **`page-renderer-v2.test.tsx:2954`** (`"PAGE_SPOTLIGHT_CSS is reduced-motion-gated
  radial-gradient reading --spotlight-*"`) currently asserts (`:2955`) that the string
  CONTAINS `@media (prefers-reduced-motion: no-preference)`. After the split the gate
  no longer wraps the WHOLE rule (only the gradient), so RENAME the test to
  `"PAGE_SPOTLIGHT_CSS base layer ungated + radial-gradient gated"` and SPLIT the
  assertions: `mix-blend-mode:screen`, `z-index:30`, `position:fixed;inset:0`,
  `pointer-events:none` must appear in the segment BEFORE the `@media` token, while
  `background:radial-gradient(...)` (and the `--spotlight-*` reads) must appear AFTER
  it:
  ```ts
  const gateIdx = PAGE_SPOTLIGHT_CSS.indexOf("@media (prefers-reduced-motion: no-preference)");
  const base = PAGE_SPOTLIGHT_CSS.slice(0, gateIdx);
  const gated = PAGE_SPOTLIGHT_CSS.slice(gateIdx);
  expect(base).toContain("mix-blend-mode:screen");
  expect(base).toContain("z-index:30");
  expect(base).toContain("position:fixed;inset:0");
  expect(base).toContain("pointer-events:none");
  expect(gated).toContain("radial-gradient(var(--spotlight-size,400px)");
  // keep the existing default-tint assertion (translucent color-mix default)
  ```

## Assertion detail (grounded)

- Locate the `<style data-page-spotlight-css>` node from the `renderToString` output
  for a doc with `settings.effects.cursorSpotlight:true`; assert its `__html` ===
  the exported `PAGE_SPOTLIGHT_CSS` (import the const) and that the string:
  - CONTAINS `mix-blend-mode:screen`, a `z-index:` with a value `> 0` but `< 40` (the
    front sticky nav's z-40 — e.g. `z-index:30`), `pointer-events:none`, and
    `position:fixed;inset:0` in a segment that is NOT wrapped by the `@media
    (prefers-reduced-motion: no-preference)` block (split the string on the `@media`
    token and assert these appear in the base segment).
  - Still CONTAINS the `radial-gradient(...)` `background:` declaration INSIDE the
    `@media (prefers-reduced-motion: no-preference)` segment.
- Assert the overlay `<div data-page-spotlight-overlay>` className does NOT contain
  `z-0` and that `pointer-events:none` is effective (className `pointer-events-none`
  and/or the base CSS rule).
- Byte-identity: a doc with `cursorSpotlight` OFF (and no other effect) emits NO
  `data-page-spotlight-overlay` div and NO `data-page-spotlight-css` style
  (byte-identical vs post-522).

## Definition of done

Vitest spotlight-occlusion tests pass; regressions to the additive layering
(`mix-blend-mode:screen`), the raised-but-below-nav z-index (`z-index:30` < the sticky
nav's z-40 — so the screen blend never tints the menu), the click-through
(`pointer-events:none`), the base-rule-vs-reduced-motion-gate split, the two coupled
updated assertions (`:2941` old className shape gone, `:2954` base-ungated/gradient-
gated split), the nav-safety layering guard (the `sticky z-40` grep anchors at
`navigation.tsx:1728` / `widgetRenderer.tsx:276`, the `z-index:30 < 40` inequality,
the NO-stacking-context-on-`<Root>` guard, and the deliberate `isolation:isolate` NON-
choice on `<Root>`), or the spotlight-off byte-identity fail a test. A runtime smoke
asserts the moving spotlight does NOT visibly tint the front sticky nav.
