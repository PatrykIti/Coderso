# TASK-522-05-L01: Section Surface/Ambient-Orbs Render + Page-Root Composition Emit

# FileName: TASK-522-05-L01-Section-Surface-And-Page-Root-Emit.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-05
**Priority:** High
**Category:** Site Render / Admin UI / Accessibility
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Executable leaf. Three edits: (1) `PageSectionRender` (`pageRendererV2.tsx:2381`) —
stamp `resolveSectionCompositionAttrs(section.style)` (`data-surface`/
`data-composition` + `cssVars` glow retint) + emit ambient-orb children when
`surfacePreset==="ambient-orbs"` (DISJOINT from 521-02's `scrollEffect` attrs on the same
symbol — additive, after 521-02); (2) `PageDocumentRender` (`:2459`) — emit the composition `<style>`
(`PAGE_COMPOSITION_EFFECTS_CSS`) present-only (DISJOINT new node), AND — because the
522 block-tilt append LIVES INSIDE the same `PAGE_EFFECTS_RUNTIME_SOURCE` string that
521-05 already emits once — WIDEN 521-05-L03's single runtime-`<script>` emit PREDICATE
to also fire when a 522 tilt is authored (a DOCUMENTED shared 521<->522 co-edit seam on
the emit predicate — NOT a disjoint region; see "Single-writer reconcile" below and the
parent Coordination carve-out); (3) `pageUniversalSectionControls` (`:212`) — append the
`section.surface.*`/`section.composition.*` group (DISJOINT from 521-02's
`section.scrollEffect`).

## Grounded anchors

- `PageSectionRender` (`:2381`) emits `<section className … {...dataAttributes}>`;
  521-02 added the `scrollEffect` reveal/parallax attrs here — 522 adds
  `data-surface`/`data-composition` + ambient orbs (disjoint additive).
- `PageDocumentRender` (`:2459`) — root `<Root … data-page-v2="true">` (`:2488/:2527`);
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
// spread sc.dataAttrs onto the <section> alongside the existing dataAttributes, AND merge
// sc.cssVars into the section's inline style (the write-validated --surface-glow/--deco-ring/
// --orb-color retint props, 522-01-L04 finding-5) alongside the existing style object;
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
// SINGLE-WRITER RECONCILE (emit predicate = shared 521<->522 co-edit seam):
//  521-05 already emits PAGE_EFFECTS_RUNTIME_SOURCE once, and the 522-01-L05 block-tilt
//  binding is APPENDED INTO that same source string — so a 522 tilt has no runtime unless
//  the SINGLE emit fires. Do NOT add a second <script> (that would double-run reveal/
//  parallax/spotlight). Instead WIDEN 521-05-L03's existing emit predicate:
//     emitRuntime = usesPageEffects(document) || usesCompositionTilt(document)
//  This is a deliberate, documented EDIT to a 521-owned region (the emit predicate),
//  carved out from the parent's "never a region 521 owns" guard (see parent Coordination).
//  VERIFY 521-05's actual predicate name/shape live and OR-extend it in place.

// docUsesCompositionEffects: iterate sections + blocks (incl. slots) and return true
//  if any style carries decoration/tilt/surfacePreset/hoverEffect/composition/marquee
//  /layer, or any customSvg block has drawIn. Present-only ⇒ false ⇒ no <style>/script.
```

```ts
// (3) pageUniversalSectionControls — append (live control({...}) shape: array path,
//     readonly-string-array enum options [enum includes the reset "none"/"flow"],
//     required panel/target/responsive; NO kind/help/{value,label}):
control({ id:"section.surface.preset", panel:"background", target:"section", label:"Surface preset",
  path:["style","surfacePreset"], input:"select", responsive:false, options:pageSurfacePresets }),
  // pageSurfacePresets = ["none","glass","glass-grid","radial-glow","ambient-orbs"]
control({ id:"section.composition.mode", panel:"layout", target:"section", label:"Composition",
  path:["style","composition"], input:"select", responsive:false, options:pageCompositions }),
  // pageCompositions = ["flow","layered"] ("flow" is the reset — normalize omits it)
```

**`responsive:false`** on section surface + composition: both are base-only
`data-surface`/`data-composition` attrs; `pageResponsiveCss.ts` emits per-PROPERTY CSS
only and cannot toggle a data-attr/class per breakpoint against the inline base, so a
per-device override would be a silent no-op (finding-6 fix; matches parent Acceptance #7).

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
2. Composition `<style>` is a DISJOINT new node; the runtime `<script>` is NOT
   duplicated — the SINGLE 521-05 emit is reused by OR-widening its predicate (a
   documented shared 521<->522 co-edit seam, carved out from the parent's
   "never a region 521 owns" guard). One runtime `<script>` total.
3. Surfaces static; ambient-orb drift reduced-motion gated.
</content>
