# TASK-522-05: Layered Canvas + Glass/Glow Presets + Hover Effects + Ticker

# FileName: TASK-522-05-Layered-Canvas-Glass-Glow-Hover-Ticker.md

**Parent Task:** TASK-522
**Priority:** High
**Category:** Site Render / Admin UI / Accessibility
**Estimated Effort:** Large
**Status:** ⏳ To Do
**Depends on:** TASK-522-01, TASK-522-03, TASK-522-04.

---

## Scope

The composition surface: layered canvas, glass/glow surface presets, block hover
presets, and the ticker/marquee — plus the page-root composition `<style>` + tilt
runtime emit. Owns DISJOINT seam regions: `pageRendererV2.tsx` `PageSectionRender`
(`:2381`) surface/ambient-orbs/canvas attrs (DISJOINT from 521-02's `scrollEffect`
attrs on the same symbol — additive, after 521-02), the layout-block canvas render,
the `group`-block marquee wrapper, and the `PageDocumentRender` (`:2459`) composition
`<style>`+runtime emit (adjacent to 521-05's runtime emit, present-only);
`pageEditorControlRegistry.ts` `pageUniversalSectionControls` surface/composition
group (`section.surface.*`, DISJOINT from 521-02's `section.scrollEffect`),
`pageUniversalBlockControls` glass/hover/layer group (`block.surface.*` /
`block.hover.*` / `block.layer.*`, DISJOINT from 522-03/04 groups), and
`pageBlockControlRegistry.group` marquee group (`group.marquee.*`).

## Leaves

- **522-05-L01** — section surface preset + ambient-orbs render + section surface
  control + the page-root composition `<style>`/runtime emit.
- **522-05-L02** — layered-canvas container render (absolute children + z-index +
  per-device) + layer position controls.
- **522-05-L03** — block glass/hover/surface controls (render via 522-03 frame
  resolver).
- **522-05-L04** — marquee/ticker group render + control.
- **522-05-L05** — canvas / glass / hover / ticker tests.

## Hard Invariants (subtask)

1. Surface presets are STATIC styling (apply under reduced-motion); only the
   ANIMATED bits (ambient-orb drift, hover transition, ticker) gate on
   `prefers-reduced-motion: no-preference`.
2. `composition:"flow"`/unset = normal flex/grid flow (byte-identical).
3. Page-root `<style>`/runtime emit is present-only (nothing when no 522 effect
   authored) and front/preview-only (never the builder canvas).
4. Layer offsets ride the existing responsive-override channel (per-device).

## Definition of done

Sections/containers compose layered children; glass/glow + hover presets one click;
ticker auto-scrolls; page-root emit present-only + gated; tests green.
</content>
