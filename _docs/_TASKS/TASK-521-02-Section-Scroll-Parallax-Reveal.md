# TASK-521-02: Section Scroll / Parallax / Reveal — Inspector Control + Front Render + Runtime Binding

# FileName: TASK-521-02-Section-Scroll-Parallax-Reveal.md

**Parent Task:** TASK-521
**Priority:** High
**Category:** Admin UI (Pages) / Site Render / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Depends on:** TASK-521-01 (model + `pageEffectsRuntime.ts`).

---

## Scope

Wires the section scroll effect (`PageSectionStyleV2.scrollEffect` /
`parallaxIntensity`, 521-01-L01) end to end: (1) an ADMIN control in the section
inspector via a declarative descriptor in `pageEditorControlRegistry.ts` (rendered
through the existing `SectionRegistryControlField`), and (2) FRONT + canvas render
in `pageRendererV2.tsx` — the reveal/parallax data-attributes + reduced-motion CSS
classes on `<section>`, consuming the 521-01 runtime (emitted once by 521-05 at the
page root).

**Single-writer:** `pageEditorControlRegistry.ts` (521-02 only).
`pageRendererV2.tsx` is a DOCUMENTED ADDITIVE SEAM — 521-02 owns ONLY the SECTION
region (`toPageSectionRenderProps` `:515-530` + `PageSectionRender` `:2291-2315`),
disjoint from 521-04 (block-content `case`) and 521-05 (`PageDocumentRender` root),
which land after in order.

## Leaves

| Leaf | Title | File / region |
|------|-------|---------------|
| TASK-521-02-L01 | Section effect control descriptors | `pageEditorControlRegistry.ts` — `pageUniversalSectionControls` (`:212`) |
| TASK-521-02-L02 | Section front render + reveal/parallax data-attrs + CSS | `pageRendererV2.tsx` — section region (`:515`, `:2291`) |
| TASK-521-02-L03 | Section-effect tests | `tests/unit/pages/*` (Bun) + `tests/vitest/content*` (Vitest) |

**Land order:** L01 → L02 → L03.

## Coordination

- `pageRendererV2.tsx` section region ONLY (`toPageSectionRenderProps` +
  `PageSectionRender`). Do NOT touch `renderPageBlockContent` (521-04) or
  `PageDocumentRender` (521-05).
- The runtime script itself (`PAGE_EFFECTS_RUNTIME_SOURCE`) is emitted ONCE by
  521-05 at the page root; 521-02 ONLY stamps the DOM contract the script reads
  (`data-page-effect`, `data-parallax`, `[data-parallax-inner]`, `data-revealed`)
  + the reduced-motion-safe CSS.
- Import the enum/clamp read-only from 521-01 (`pageSectionScrollEffects`,
  `PAGE_PARALLAX_INTENSITY_CLAMP`). Any drift = reconcile failure.

## Hard Invariants

1. Present-only: unset `scrollEffect` (or `"none"`) emits NO data-attr, NO class,
   byte-identical `<section>`.
2. Reduced-motion: reveal/parallax CSS is `motion-safe:`-gated AND the runtime
   early-returns; reduce users see content at rest (never hidden).
3. Per-device: the control + render ride the existing
   `responsive[bp].style` override channel (no new machinery).

## Definition of done

Section inspector exposes the scroll-effect control with a visible effect;
front + canvas stamp the correct data-attrs/classes; reveal + parallax work on the
front driven by the 521-01 runtime; reduced-motion disables motion; tests green.
