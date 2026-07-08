# TASK-525-02-L02: `--reveal-delay` Frame-Var Emit + Reveal `transition-delay` (+ Optional Section Auto-Stagger)

# FileName: TASK-525-02-L02-Reveal-Delay-Render-CSS-Wiring.md

**Parent Task:** TASK-525
**Parent Subtask:** TASK-525-02
**Priority:** High
**Category:** Site Render / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Two edits in `core/services/pages/pageRendererV2.tsx`: (1) emit a present-only
`--reveal-delay: ${revealDelay}ms` on the block frame in `toPageBlockRenderProps`;
(2) give the REVEALING BLOCK CHILDREN their own hide-state + opacity/transform
transition (keyed off the section's `data-revealed`) that reads `--reveal-delay` as
`transition-delay`, so each child fades independently with its own delay and the
section reveals as a genuine per-block CASCADE (not one unit) — added to
`PAGE_REVEAL_MOTION_CSS` (`:591-595`), inside the EXISTING `motion-safe:` /
`[data-reveal-armed]` gate. OPTIONALLY (if cheap) a section auto-stagger that seeds
an incremental `--reveal-delay` per direct child. DISJOINT from 525-01's section
content-wrapper region (same file, different symbols). Lands after 525-02-L01
(needs `PageBlockStyleV2.revealDelay`).

**Why per-child hide-state is REQUIRED (not optional):** today the ONLY reveal
opacity/transform hide-state + transition is keyed to the `<section>` — the
`motion-safe:transition-[opacity,transform] … data-[revealed=true]:…` utility on
the section className (`:553-554`) and the
`[data-reveal-armed] [data-page-effect^="reveal"]:not([data-revealed]){opacity:0}`
/ `translateY(1rem)` static rules (`:593-594`), with `data-page-effect` emitted
ONLY on the section (`:2636`). The blocks (`[data-page-block]`, `:822`) have NO
reveal hide-state and NO reveal transition of their own; the whole section fades as
ONE unit. A `transition-delay` on the block (the naive path) is therefore INERT —
it delays a transition the child does not have, producing ZERO visible stagger.
Delivering target #2 (per-block cascade, mirroring the reference
`[data-reveal]{…transition-delay:var(--delay,0ms)}` where each child independently
fades — `_docs/projekty-domow-wow-site/styles.css:80`, `index.html`
service-card/project-card/steps-grid `data-delay=80/160/210`) MANDATES giving the
children their own hide-state + transition. This is a HARD requirement of this
leaf, not a "DECIDE at implement time" option.

## Grounded anchors (RE-GREP post-523)

- **`toPageBlockRenderProps`** (`pageRendererV2.tsx:809`) — merges
  `splitBlockComposition(block.style).frameVars` (present-only composition vars,
  e.g. `--deco-delay`) onto the `[data-block-id]` frame `style`
  (`:820`: `style: { ...toPageBlockStyle(block), ...(s.frameVars as
  CSSProperties) }`). The natural home for `--reveal-delay` — a custom property
  that INHERITS down into the block's children.
- **Reveal transition utility** (`toPageSectionRenderProps`, `:551-555`): the
  `<section>` gains
  `"motion-safe:transition-[opacity,transform] motion-safe:duration-700
  motion-safe:data-[revealed=true]:opacity-100
  motion-safe:data-[revealed=true]:translate-y-0"` when
  `scrollEffect ∈ {reveal-fade, reveal-up}`.
- **`PAGE_REVEAL_MOTION_CSS`** (`:591-595`) — the STATIC hide-state string emitted
  once at the page root (`:2866`), scoped under
  `@media (prefers-reduced-motion: no-preference)` + `[data-reveal-armed]`:
  ```
  [data-reveal-armed] [data-page-effect^="reveal"]:not([data-revealed]){opacity:0}
  [data-reveal-armed] [data-page-effect="reveal-up"]:not([data-revealed]){transform:translateY(1rem)}
  ```
  NOTE the hide-state + transition today target ONLY the `<section>` (the
  `motion-safe:transition-[opacity,transform]` utility on the section className,
  `:553-554`; `data-page-effect` emitted only on the section, `:2636`). The blocks
  (`[data-page-block]`, `:822`) have no reveal transition — this leaf ADDS one to
  the children so the per-block cascade is real, not inert.
- The 521 runtime (`pageEffectsRuntime.ts`, NOT edited) sets `data-reveal-armed`
  on the root + `data-revealed` on the section when it intersects.

## Implementation pseudocode

```tsx
// pageRendererV2.tsx

// (1) EMIT --reveal-delay on the block frame (toPageBlockRenderProps, present-only):
const revealDelay = block.style?.revealDelay;
const revealVar: Record<string, string> =
  typeof revealDelay === "number" ? { "--reveal-delay": `${revealDelay}ms` } : {};
return {
  className: /* …unchanged… */,
  style: { ...toPageBlockStyle(block), ...(s.frameVars as CSSProperties), ...revealVar },
  //                                    ^ present-only: empty object when unset → byte-identical
  dataAttributes: { /* …unchanged… */ },
};

// (2) CASCADE: give the revealing block CHILDREN their own hide-state + transition
//   that reads --reveal-delay. A bare `transition-delay` on [data-page-block] is
//   INERT (the child has no reveal transition of its own — the transition today is
//   on the <section>, so the delay delays nothing → zero visible stagger). To get a
//   real per-block cascade the children MUST carry their own opacity/transform
//   hide-state + transition, keyed off the SECTION's data-revealed (so the runtime
//   still only toggles data-revealed on the section — no new runtime/attr), with
//   the per-child transition-delay reading the inherited --reveal-delay. Mirror the
//   reference [data-reveal]/.is-visible pair (styles.css:80). Add these static
//   rules to PAGE_REVEAL_MOTION_CSS, ALL inside the armed + motion-safe gate:
export const PAGE_REVEAL_MOTION_CSS =
  "@media (prefers-reduced-motion: no-preference){" +
  // section-level hide-state (UNCHANGED — the section still composes its own reveal):
  '[data-reveal-armed] [data-page-effect^="reveal"]:not([data-revealed]){opacity:0}' +
  '[data-reveal-armed] [data-page-effect="reveal-up"]:not([data-revealed]){transform:translateY(1rem)}' +
  // NEW (525-02): per-CHILD hide-state + transition so each block fades on its own
  // delay → genuine cascade. Hidden while the section is NOT yet revealed; the
  // transition + delay live on the child so the delay actually applies:
  '[data-reveal-armed] [data-page-effect^="reveal"]:not([data-revealed]) [data-page-block]' +
    '{opacity:0;transition:opacity .7s,transform .7s;transition-delay:var(--reveal-delay,0ms)}' +
  '[data-reveal-armed] [data-page-effect="reveal-up"]:not([data-revealed]) [data-page-block]' +
    '{transform:translateY(1rem)}' +
  // revealed target — keyed on the SECTION's data-revealed (runtime toggles it on
  // the section only); the child transitions to its shown state after its delay:
  '[data-reveal-armed] [data-page-effect^="reveal"][data-revealed] [data-page-block]' +
    '{opacity:1;transform:none}' +
  "}";
// The child transition (opacity/transform) is what makes --reveal-delay produce a
//   visible stagger. var(--reveal-delay,0ms) default keeps blocks WITHOUT the var
//   at delay 0ms — but note the children now DO carry a hide-state, so confirm the
//   composed timing for a non-authored revealing section still matches today's
//   whole-section fade (all children delay 0 → they reveal together, visually
//   equivalent to the one-unit reveal). Keep everything under
//   @media (prefers-reduced-motion: no-preference) + [data-reveal-armed] — NEVER a
//   permanent hide, NEVER outside the JS gate; under reduced-motion the children
//   have no hide-state applied (rule is inside the motion-safe @media) so content
//   is always visible.

// (3) OPTIONAL section auto-stagger (only if it composes for free):
//   when section.style.scrollEffect is a reveal AND an auto-stagger toggle is on,
//   seed each direct child block's frame with an incremental --reveal-delay
//   (index * step, clamped) in PageSectionContent's per-child render, WITHOUT
//   requiring per-block revealDelay authoring. Present-only: off → no --reveal-delay
//   → byte-identical. Gate the auto-stagger behind an explicit flag (page-settings
//   or section toggle) so it is opt-in; if adding a flag is NOT cheap, DEFER the
//   auto-stagger to a follow-up and ship the explicit per-block revealDelay only.
```

- **Default fallback `var(--reveal-delay,0ms)`** guarantees byte-identical
  behavior for blocks without the var (delay 0 = today's timing).
- Keep the whole change inside `@media (prefers-reduced-motion: no-preference)` +
  `[data-reveal-armed]` (existing gate) — a `transition-delay` on a transition
  that never runs under reduced-motion is inert.
- Do NOT add a runtime, keyframe, or new `data-*` attribute; `--reveal-delay` is a
  pure inherited custom property.

## Security note

`--reveal-delay` is emitted from the already-clamped `block.style.revealDelay`
(525-02-L01 `readNumber`) as a bounded `${n}ms` custom property; the render injects
it ONLY as a CSS custom property consumed by a fixed `transition-delay` declaration
(with a `0ms` literal fallback) — never a raw declaration, markup, or URL. No
author string reaches CSS, no interpolation. The reveal stays JS-gated
(`[data-reveal-armed]`) + `motion-safe:`, so content is never permanently hidden.

## Vitest test lane

- `tests/vitest/pages/page-renderer-v2.test.tsx` — `--reveal-delay` emitted on the
  frame for a block with `revealDelay` (and absent when unset); `PAGE_REVEAL_MOTION_CSS`
  contains the `transition-delay:var(--reveal-delay,0ms)` rule inside the
  motion-safe/armed gate; section auto-stagger seeds incremental delays if shipped.
  Authored in 525-02-L04.

## Regression / breaking-test ownership

- No breaking change: the `var(--reveal-delay,0ms)` default preserves the exact
  current reveal timing for blocks without the var; existing reveal tests
  (`data-page-effect`, hide-state string) pass unchanged EXCEPT any test that
  snapshots the FULL `PAGE_REVEAL_MOTION_CSS` string — that snapshot is an OWNED
  update (the new rule is appended). Grep the suite for `PAGE_REVEAL_MOTION_CSS` /
  `data-reveal-armed` before editing.

## Hard Invariants

1. `--reveal-delay` emitted present-only on the block frame (absent when unset →
   byte-identical).
2. Revealing block CHILDREN carry their own opacity/transform hide-state +
   transition (keyed off the section's `data-revealed`) with
   `transition-delay:var(--reveal-delay,0ms)` — so per-block delays produce a REAL
   visible cascade, NOT an inert delay on a non-existent transition. All rules sit
   inside the EXISTING `motion-safe:` + `[data-reveal-armed]` gate — no new runtime,
   keyframe, `@media`, or `data-*` attribute (runtime still toggles `data-revealed`
   on the section only).
3. `prefers-reduced-motion` behavior unchanged: the child hide-state lives inside
   the `no-preference` `@media`, so under reduced-motion no block is ever hidden.
4. A non-authored revealing section composes byte-equivalent to today's one-unit
   fade (all children default to `--reveal-delay:0ms` → reveal together); the
   section's own reveal still composes.
5. Optional auto-stagger is opt-in + present-only (off → byte-identical); DEFER if
   not cheap.
