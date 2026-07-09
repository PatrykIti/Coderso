# TASK-534-03: Interactivity Composition CSS (switcher / filter-chip / magnetic / crossfade)

# FileName: TASK-534-03-Interactivity-Composition-CSS.md

**Parent Task:** TASK-534
**Priority:** Medium
**Category:** Site Render / Accessibility
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

CSS subtask. Edits ONLY a labelled `// ── TASK-534 ──` region of
`core/services/pages/pageCompositionEffects.tsx`: exports `PAGE_INTERACTIVITY_CSS`
(the switcher tablist + `pill`/`underline` variants, tab-panel crossfade,
filter-chip bar + `.is-hidden` fade, magnetic `will-change`/transition) and any
resolver the renderer imports (the noise/scroll-hint keyframes live in
`pageInteractivityGlyphs.tsx`, 534-02; this file owns the switcher/filter/magnetic
static CSS). Every transition is `motion-safe:` / reduced-motion guarded. Depends
on 534-01 (imports enum/type read-only). Consumed by `pageRendererV2.tsx` (534-02).

## Leaves

| Leaf | Scope |
|------|-------|
| **534-03-L01** | `PAGE_INTERACTIVITY_CSS` string (switcher/filter/magnetic CSS + reduced-motion guards) |
| **534-03-L02** | CSS static-shape Vitest tests |

## Grounded anchors

- `PAGE_COMPOSITION_EFFECTS_CSS` template literal `:25` (the static-CSS-string
  precedent; emitted present-only at `pageRendererV2.tsx:3087-3091`). Add
  `PAGE_INTERACTIVITY_CSS` as a SIBLING export in a labelled 534 region.
- Reduced-motion precedent inside the composition CSS: the existing
  `@media (prefers-reduced-motion: …)` / `motion-safe` guards in
  `PAGE_COMPOSITION_EFFECTS_CSS`.
- DOM contract to style (from 534-02): `[data-switcher]`,
  `[data-switcher-variant="pill"|"underline"]`, `[role=tab][data-switcher-tab]`
  (`aria-selected`), `[data-switcher-panel][data-active]`/`[hidden]`,
  `[data-gallery-filter] .cx-filter-chip[aria-selected]`, `[data-filter-item].is-hidden`,
  `[data-magnetic]`.

## Implementation pseudocode

```ts
// ── TASK-534 ── declarative-interactivity CSS (switcher / filter / magnetic).
export const PAGE_INTERACTIVITY_CSS = [
  // switcher tab bar (scrolls horizontally on mobile — MEMORY: segmented controls
  // must scroll, not wrap awkwardly):
  "[data-switcher] .cx-switcher-tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}",
  "[data-switcher] [data-switcher-tab]{cursor:pointer;white-space:nowrap}",
  // pill vs underline variant:
  "[data-switcher-variant='pill'] [data-switcher-tab][aria-selected='true']{background:var(--primary);color:#fff;border-radius:999px}",
  "[data-switcher-variant='underline'] [data-switcher-tab][aria-selected='true']{border-bottom:2px solid var(--primary)}",
  // panel crossfade — motion-safe only; reduce users get instant show/hide:
  "[data-switcher-panel][hidden]{display:none}",
  "@media (prefers-reduced-motion: no-preference){[data-switcher-panel]{opacity:0;transition:opacity .25s ease}[data-switcher-panel][data-active='true']{opacity:1}}",
  // filter chips + hide:
  "[data-gallery-filter]{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}",
  "[data-gallery-filter] .cx-filter-chip[aria-selected='true']{background:var(--primary);color:#fff}",
  "[data-filter-item].is-hidden{display:none}",
  "@media (prefers-reduced-motion: no-preference){[data-filter-item]{transition:opacity .2s ease}}",
  // magnetic — transform transition on leave (runtime sets transform on move):
  "@media (prefers-reduced-motion: no-preference){[data-magnetic]{transition:transform .15s ease;will-change:transform}}",
].join("");
```

**Reduced-motion:** every animated rule is inside
`@media (prefers-reduced-motion: no-preference)`; the FUNCTIONAL rules
(`[hidden]{display:none}`, `.is-hidden{display:none}`) sit OUTSIDE the guard so
tabs/filters still WORK (instant) for reduce users. Emitted present-only from the
renderer (534-02), so a no-interactivity page carries none of this.

## Security note

Pure STATIC CSS string — no author input, no interpolation. The only dynamic values
it reacts to are DOM `data-*`/`aria-*` attributes set by the renderer from validated
data (bounded enums / booleans). `var(--primary)` is a design token, not author
input. No `url()` with author data, no `sanitizeAuthoringCssBackground` path (noise
overlay's data-URI lives in `pageInteractivityGlyphs.tsx`, 534-02, also static).

## Test lane

**Vitest** (`tests/vitest/pages/`, static string) — 534-03-L02: assert
`PAGE_INTERACTIVITY_CSS` is a string, contains the switcher/filter/magnetic
selectors, wraps every ANIMATED rule in `prefers-reduced-motion: no-preference`
while keeping `[hidden]`/`.is-hidden` display rules OUTSIDE the guard (reduce users
keep working toggles), and contains no `${` interpolation.

## Coordination

- Sole 534 writer of `pageCompositionEffects.tsx`, confined to the labelled 534
  region (disjoint from 531/532/533 regions). Consumed read-only by 534-02.

## Hard Invariants

1. Static CSS; present-only emit; no author interpolation.
2. Functional show/hide rules OUTSIDE the reduced-motion guard (accessible toggles);
   all MOTION rules inside `prefers-reduced-motion: no-preference`.
3. Horizontal-scroll tab bar (owner UX finding); token colors only.
