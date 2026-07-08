# TASK-522-05-L01: Section Surface/Ambient-Orbs Render + Page-Root Composition Emit

# FileName: TASK-522-05-L01-Section-Surface-And-Page-Root-Emit.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-05
**Priority:** High
**Category:** Site Render / Admin UI / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Three edits: (1) `PageSectionRender` (`pageRendererV2.tsx:2298`) —
stamp `resolveSectionCompositionAttrs(section.style)` (`data-surface`/
`data-composition`) + emit ambient-orb children when `surfacePreset==="ambient-orbs"`
(DISJOINT from 521-02's `scrollEffect` attrs on the same symbol — additive, after
521-02); (2) `PageDocumentRender` (`:2331`) — emit the composition `<style>`
(`PAGE_COMPOSITION_EFFECTS_CSS`) + include the 522-01-L05 block-tilt runtime, BOTH
present-only (only when a 522 effect is authored anywhere in the doc), adjacent to
521-05's runtime emit; (3) `pageUniversalSectionControls` (`:212`) — append the
`section.surface.*`/`section.composition.*` group (DISJOINT from 521-02's
`section.scrollEffect`).

## Grounded anchors

- `PageSectionRender` (`:2298`) emits `<section className … {...dataAttributes}>`;
  521-02 added the `scrollEffect` reveal/parallax attrs here — 522 adds
  `data-surface`/`data-composition` + ambient orbs (disjoint additive).
- `PageDocumentRender` (`:2331`) — root `<Root … data-page-v2="true">` (`:2367/:2371`);
  521-05-L03 emits its runtime `<script>` here once. 522 adds a `<style>` +
  conditionally the block-tilt runtime. Use `renderSharedWidgetRuntimeScript` /
  static `dangerouslySetInnerHTML __html` (`runtimeScripts.tsx:20/46`).
- `pageUniversalSectionControls` (`:212`); 521-02 owns the `section.scrollEffect`
  group here — 522 appends a disjoint surface/composition group.
- Import (append-only): `PAGE_COMPOSITION_EFFECTS_CSS`, `resolveSectionCompositionAttrs`
  (522-01-L04); the tilt runtime source (522-01-L05, from `pageEffectsRuntime`).

## Implementation pseudocode

```tsx
// (1) PageSectionRender — merge section composition attrs + ambient orbs:
const sc = resolveSectionCompositionAttrs(section.style);
// spread sc.dataAttrs onto the <section> alongside the existing dataAttributes;
// when sc.ambientOrbs, render 2 decorative orb spans BEFORE the section content:
{sc.ambientOrbs ? (<>
  <span className="cx-orb cx-orb-a" aria-hidden="true" data-deco="drift" />
  <span className="cx-orb cx-orb-b" aria-hidden="true" data-deco="drift" style={{ ['--deco-delay']:'1500ms' }} />
</>) : null}
// (.cx-orb / .cx-orb-a / .cx-orb-b base styling — blurred radial circles like
//  .hero-bg-orb — is authored in PAGE_COMPOSITION_EFFECTS_CSS by 522-01-L04, its
//  sole-writer file. This leaf ONLY emits the orb spans; it does NOT add CSS.)

// (2) PageDocumentRender — present-only composition emit:
const usesComposition = docUsesCompositionEffects(document); // pure scan of section/block styles
// … inside the returned <Root>, once, when usesComposition:
{usesComposition ? (<style dangerouslySetInnerHTML={{ __html: PAGE_COMPOSITION_EFFECTS_CSS }} />) : null}
{usesCompositionTilt(document) ? (<script dangerouslySetInnerHTML={{ __html: PAGE_EFFECTS_RUNTIME_SOURCE }} />) : null}
// If 521-05 already emits PAGE_EFFECTS_RUNTIME_SOURCE (which now CONTAINS the 522
//  block-tilt append), do NOT double-emit — reuse the SAME single emit and just widen
//  its trigger predicate to also fire when a 522 tilt is authored. VERIFY 521-05's
//  emit + predicate live and extend it rather than adding a second <script>.

// docUsesCompositionEffects: iterate sections + blocks (incl. slots) and return true
//  if any style carries decoration/tilt/surfacePreset/hoverEffect/composition/marquee
//  /layer, or any customSvg block has drawIn. Present-only ⇒ false ⇒ no <style>/script.
```

```ts
// (3) pageUniversalSectionControls — append (live control({...}) shape: array path,
//     readonly-string-array enum options [enum includes the reset "none"/"flow"],
//     required panel/target/responsive; NO kind/help/{value,label}):
control({ id:"section.surface.preset", panel:"background", target:"section", label:"Surface preset",
  path:["style","surfacePreset"], input:"select", responsive:true, options:pageSurfacePresets }),
  // pageSurfacePresets = ["none","glass","glass-grid","radial-glow","ambient-orbs"]
control({ id:"section.composition.mode", panel:"layout", target:"section", label:"Composition",
  path:["style","composition"], input:"select", responsive:true, options:pageCompositions }),
  // pageCompositions = ["flow","layered"] ("flow" is the reset — normalize omits it)
```

**Present-only + gating.** The `<style>`/runtime emit only when
`docUsesCompositionEffects`/`usesCompositionTilt` is true (a no-effect page emits
NOTHING — byte-identical, Hard Invariant 9). Surfaces are STATIC CSS (apply under
reduced-motion); only the ambient-orb drift animates (gated). Emission is on the
front/preview `PageDocumentRender` ONLY — the builder canvas bypasses it (Hard
Invariant 8).

## Regression-test shape (delegated to 522-05-L05, asserted here)

- A section with `style.surfacePreset:"glass"` → `data-surface="glass"`;
  `"ambient-orbs"` → 2 `.cx-orb` children; `composition:"layered"` →
  `data-composition="layered"`; a doc with ANY 522 effect → the root has ONE
  `<style>` (composition CSS) and (if tilt) ONE runtime `<script>`; a NO-effect doc →
  no `<style>`/extra `<script>`, byte-identical.
- **Lane:** Vitest `tests/vitest/pages/page-renderer-v2.test.tsx` +
  `page-editor-control-registry.test.ts`.

## Hard Invariants

1. Section surface attrs DISJOINT from 521-02's scrollEffect attrs (additive).
2. Composition `<style>`/runtime emit present-only + front-only + de-duplicated with
   521-05's emit (single runtime `<script>`).
3. Surfaces static; ambient-orb drift reduced-motion gated.
</content>
