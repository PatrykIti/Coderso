# TASK-525-02: Per-Block Staggered Reveal

# FileName: TASK-525-02-Per-Block-Staggered-Reveal.md

**Parent Task:** TASK-525
**Priority:** High
**Category:** Site Render / Schema (JSON model) / Admin UI / Accessibility
**Estimated Effort:** Small
**Status:** ✅ Done
**Depends on:** TASK-525-01 (lands after; branched from post-523 HEAD).

---

## Goal

Let a revealing section's child blocks cascade in sequence instead of all fading in
as one unit. Add a present-only per-block `PageBlockStyleV2.revealDelay?: number`
(ms, `readNumber`-clamped) emitting `--reveal-delay`, consumed by the reveal
`transition-delay`, so children of a `scrollEffect:"reveal-fade"|"reveal-up"`
section stagger in — matching the reference `[data-reveal][data-delay] → --delay`
cascade. Optionally a cheap section/page auto-stagger convenience.

Grounded: reveal is SECTION-level only today (`scrollEffect` toggles
`data-revealed` on the `<section>` via the 521 runtime); NO per-block delay/stagger
exists anywhere. `--reveal-delay` is a pure inherited custom property — no new
runtime, no new keyframe.

## Approach (minimal)

- **Explicit per-block `revealDelay`** (composes with existing controls;
  present-only byte-identity) is the primary deliverable.
- **Optional section auto-stagger** (each direct child gets an incremental
  `--reveal-delay`) ONLY if it composes for free behind an opt-in flag; DEFER to a
  follow-up if adding the flag is not cheap.
- Reuse 521's landed reveal contract verbatim (`data-page-effect` /
  `data-revealed` / `[data-reveal-armed]` / `PAGE_REVEAL_MOTION_CSS` /
  `motion-safe:`). Reuse the 522 `toPageBlockRenderProps` → `frameVars` emit seam.

## Sole-writer file ownership

- `core/services/pages/pageDocumentV2.ts` — `PageBlockStyleV2.revealDelay` +
  `pageBlockStyleKeys` allowlist + block-style JSON schema + block-style normalizer
  (525-02-L01).
- `core/services/pages/pageRendererV2.tsx` — `toPageBlockRenderProps`
  `--reveal-delay` frame-var emit + `PAGE_REVEAL_MOTION_CSS` /reveal
  `transition-delay` (525-02-L02). DISJOINT from 525-01's section content-wrapper
  region.
- `core/services/pages/pageEditorControlRegistry.ts` — `block.style.revealDelay`
  control (525-02-L03). DISJOINT id namespace.
- `tests/vitest/pages/page-document-v2.test.ts` +
  `tests/vitest/pages/page-renderer-v2.test.tsx` — coverage (525-02-L04).

## Leaves (land order)

| Leaf | Title | Notes |
|------|-------|-------|
| 525-02-L01 | `revealDelay` model + allowlist + JSON schema + normalizer | present-only `readNumber` clamp (`PAGE_REVEAL_DELAY_CLAMP`) |
| 525-02-L02 | `--reveal-delay` frame-var emit + reveal `transition-delay` (+ optional section auto-stagger) | inside existing `motion-safe:`/`[data-reveal-armed]` gate; `var(--reveal-delay,0ms)` default |
| 525-02-L03 | `block.style.revealDelay` editor control | mirrors `block.decoration.delay` |
| 525-02-L04 | Reveal delay tests (round-trip / reject-unknown / present-only / delay applied) | OWNS `PAGE_REVEAL_MOTION_CSS` snapshot + control-count +1 updates |

## Hard Invariants

1. Present-only: `revealDelay` + `--reveal-delay` emitted ONLY when authored
   (byte-identical when unset; `var(--reveal-delay,0ms)` default preserves current
   timing).
2. `prefers-reduced-motion` unchanged — delay added inside the existing
   `motion-safe:` + `[data-reveal-armed]` gate; no new runtime/keyframe/`@media`.
3. Number ONLY via `readNumber` (clamped); reject-unknown + `additionalProperties:
   false` in lockstep.
4. No schemaVersion bump, no migration, no dependency.
5. Optional auto-stagger is opt-in + present-only; DEFER if not cheap.
