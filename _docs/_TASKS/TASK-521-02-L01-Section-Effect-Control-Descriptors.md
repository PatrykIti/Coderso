# TASK-521-02-L01: Section Effect Control Descriptors (inspector)

# FileName: TASK-521-02-L01-Section-Effect-Control-Descriptors.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-02
**Priority:** High
**Category:** Admin UI (Pages)
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY `core/services/pages/pageEditorControlRegistry.ts`:
adds two declarative section control descriptors to `pageUniversalSectionControls`
(`:212`) — a segmented "Scroll effect" (writes `style.scrollEffect`) on the
`"style"` panel, and a slider "Parallax intensity" (writes
`style.parallaxIntensity`) shown for the parallax value. These render for free
through `SectionRegistryControlField` (`PageEditor.tsx:3426-3436`) filtered by
`panel`, and write via `onSectionControlChange` (`updateSelectedSectionControl`) —
so NO edit to `PageEditor.tsx` (owned by 521-05) is required.

## Grounded anchors

`pageUniversalSectionControls: readonly PageEditorControlDefinition[]` (`:212`),
built via the `control({...})` factory (`:150`) which fills `overridePath` from
`path`. Descriptor shape `PageEditorControlDefinition` (`:103`): **`input` is a
BARE string union** `PageEditorControlInput` (`:54`) =
`"text"|"number"|"select"|"segmented"|"switch"|"color"|"swatch"|"media"|"items"|"facets"`
— there is **NO `input.kind` object and NO `"slider"` member** (a slider is
`input:"number"` + `clamp:{min,max}` + `step` + `unit`). `options?: readonly
string[]` carries **bare enum values only** (NO `{value,label}` objects; friendly
labels are resolved downstream by the UI model `pageEditorControlUiModel`, NOT the
descriptor). `clamp?:{min,max}`, `step?`, `unit?` are sibling fields (no
`suffix`/`min`/`max` on the descriptor). Existing `"style"`-panel descriptors at
`:274`,`:283`,`:293` (e.g. radius/shadow) are the copy template — **READ them
first**. Rendered by `sectionPanelControls = pageUniversalSectionControls.filter(c => c.panel === panel …)`
(`PageEditor.tsx:3345-3347`) → `SectionRegistryControlField` (`:3427`).

## Implementation pseudocode

```ts
// Append to pageUniversalSectionControls via the control({...}) factory, mirroring
// the :274 style-panel descriptors. `input` is a BARE string; `options` are the
// bare enum values imported from the model (labels come from the UI model, not here):
control({
  id: "section.scrollEffect",
  panel: "style",
  target: "section",
  label: "Scroll effect",
  path: ["style", "scrollEffect"],           // matches the model key (521-01-L01)
  input: "segmented",
  // NO `responsive:true` — DEVICE-UNIFORM (see cross-leaf note below): the front
  // serves ONE desktop-resolved HTML + @media-CSS deltas (pageResponsiveCss.ts),
  // and 02-L02 delivers the effect as a SINGLE JS-driven `data-page-effect`
  // attribute off the desktop-resolved `section.style`. A per-breakpoint override
  // cannot vary a data-attribute inside an `@media` rule, so exposing per-device
  // authoring here would store an INERT value. Section scroll effects are authored
  // (and rendered) device-uniform.
  options: [...pageSectionScrollEffects],    // ["none","reveal-fade","reveal-up","parallax"] — value-only
  // present-only ⇒ "none" is omitted on write; the UI model owns "Fade in"/"Slide up" copy
}),
control({
  id: "section.parallaxIntensity",
  panel: "style",
  target: "section",
  label: "Parallax intensity",
  path: ["style", "parallaxIntensity"],
  input: "number",                           // NO "slider" member — number + clamp/step/unit renders a slider
  // NO `responsive:true` — device-uniform, same reason as scrollEffect above.
  clamp: { min: 0, max: 40 },                // == PAGE_PARALLAX_INTENSITY_CLAMP
  step: 2,
  unit: "px",
  // The registry has no `visibleWhen`; ship unconditionally — harmless when
  // scrollEffect !== "parallax" (the model already ignores it). Note the follow-up.
})
```

## Cross-leaf note — section effects are DEVICE-UNIFORM (stored-only per-breakpoint)

Neither scroll descriptor is `responsive:true`. Verified live, the front render
resolves ONE breakpoint (`PageDocumentRender` defaults `breakpoint="desktop"`,
`resolvePageRenderTree(document, breakpoint)` at `pageRendererV2.tsx:2351`) and
per-device deltas are delivered as generated `@media` CSS by `pageResponsiveCss.ts`
(CSS declarations only — it cannot rewrite a data-attribute inside an `@media`
rule, cf. its own `:474` note). 02-L02 emits `scrollEffect`/`parallaxIntensity` as
a SINGLE JS-driven `data-page-effect`/`data-parallax` attribute off the
desktop-resolved `section.style`, and 521-05-L03 gates the runtime on
`resolved.sections.some(s => s.style.scrollEffect != null)` — both read the single
resolved-breakpoint value. So a per-breakpoint override would be Ajv-valid + stored
(521-01-L01 keeps the `partialSectionStyleJsonSchema` mirror as harmless
defence-in-depth so a hand-authored override still validates) yet render INERT on
the live device. The inspector therefore does NOT expose per-device section
effects. Per-device scroll effects (per-breakpoint attrs + a breakpoint-aware
runtime) are an explicit OPEN follow-up in 521-06, NOT an implied capability here.

Friendly segmented labels (`"Fade in"`, `"Slide up"`) are NOT part of the
descriptor (`options` is `string[]`); they are resolved by the UI model
(`pageEditorControlUiModel`) — add/verify the label copy there if a segmented
control needs display text, matching how the existing segmented descriptors map
their values. This leaf must READ `:274-293` and copy the exact shape (`path` vs
`overridePath`, the bare `input` union, `clamp`/`step`/`unit` siblings).

## Regression-test shape (Vitest — extend `tests/vitest/pages/page-editor-control-registry.test.ts`)

The registry test is a pure-TS descriptor suite → Vitest lane (per
`_docs/TESTING_STRATEGY.md`), extending the existing
`page-editor-control-registry.test.ts` (NOT a new Bun file):

- `pageUniversalSectionControls` contains `section.scrollEffect` (panel `"style"`,
  `input:"segmented"`) and `section.parallaxIntensity` (`input:"number"`,
  `clamp:{min:0,max:40}`, `unit:"px"`); their write paths (`path`) equal the model
  keys; the segmented `options` array is EXACTLY `[...pageSectionScrollEffects]`
  (import-and-compare — guards enum/UI drift).

## Hard Invariants

1. Descriptor option values === `pageSectionScrollEffects` (imported, not
   re-typed).
2. No `PageEditor.tsx` edit (renders through the generic field).
3. Writes `style.scrollEffect` / `style.parallaxIntensity` — the exact model keys.
