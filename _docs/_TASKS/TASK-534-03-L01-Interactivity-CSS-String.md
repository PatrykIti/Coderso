# TASK-534-03-L01: `PAGE_INTERACTIVITY_CSS` String

# FileName: TASK-534-03-L01-Interactivity-CSS-String.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-03
**Priority:** Medium
**Category:** Site Render / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds the `PAGE_INTERACTIVITY_CSS` export (and, if the renderer
needs it, a trivial re-export) to the labelled `// ── TASK-534 ──` region of
`core/services/pages/pageCompositionEffects.tsx`. See the parent
(TASK-534-03) for the full grounded pseudocode of the switcher/filter/magnetic CSS
and the reduced-motion partitioning — this leaf realizes it exactly.

## Grounded anchors

`PAGE_COMPOSITION_EFFECTS_CSS` `:25` (sibling static-CSS export; emit precedent
`pageRendererV2.tsx:3087`). DOM contract from 534-02 (`[data-switcher]`,
`[data-switcher-variant]`, `[data-switcher-tab][aria-selected]`,
`[data-switcher-panel][data-active]/[hidden]`, `[data-gallery-filter]`,
`.cx-filter-chip`, `[data-filter-item].is-hidden`, `[data-magnetic]`).

## Implementation pseudocode

See parent TASK-534-03 "Implementation pseudocode" (the `PAGE_INTERACTIVITY_CSS`
literal). Key rules: FUNCTIONAL `[hidden]{display:none}` / `.is-hidden{display:none}`
OUTSIDE the reduced-motion guard; ALL transition/opacity MOTION rules inside
`@media (prefers-reduced-motion: no-preference)`; horizontal-scroll `.cx-switcher-tabs`;
`pill`/`underline` selected-state via token `var(--primary)`.

## Security note

Static string; no author input; the only dynamic inputs are renderer-set bounded
`data-*`/`aria-*` attributes. No `url()`-with-author-data, no
`sanitizeAuthoringCssBackground` path, no interpolation (`${`). Design-token colors
only.

## Test lane

**Vitest** static-shape — delegated to 534-03-L02.

## Hard Invariants

1. Static CSS; present-only emit.
2. Toggle-functional rules accessible under reduced-motion; motion rules guarded.
