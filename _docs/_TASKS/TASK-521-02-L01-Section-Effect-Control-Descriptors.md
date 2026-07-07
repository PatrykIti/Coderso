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

`pageUniversalSectionControls: readonly PageEditorControlDefinition[]` (`:212`);
descriptor shape `PageEditorControlDefinition` (`:103`) with `panel`
(`PageEditorControlPanel`, `:45`), `input` (`PageEditorControlInput`, `:54` —
segmented/select/slider/toggle), and an `overridePath`/write path; existing
`"style"`-panel descriptors at `:274`,`:283`,`:293` (e.g. radius/shadow) are the
copy template. Rendered by `sectionPanelControls = pageUniversalSectionControls.filter(c => c.panel === panel …)`
(`PageEditor.tsx:3345-3347`) → `SectionRegistryControlField` (`:3427`).

## Implementation pseudocode

```ts
// Append to pageUniversalSectionControls (mirror the :274 style-panel descriptors):
{
  id: "section.scrollEffect",
  panel: "style",
  label: "Scroll effect",
  target: "section",
  path: ["style", "scrollEffect"],           // matches the model key (521-01-L01)
  input: { kind: "segmented", options: [
    { value: "none",        label: "None" },
    { value: "reveal-fade", label: "Fade in" },
    { value: "reveal-up",   label: "Slide up" },
    { value: "parallax",    label: "Parallax" },
  ] },
  // default resolves to "none" (present-only ⇒ omitted when none)
},
{
  id: "section.parallaxIntensity",
  panel: "style",
  label: "Parallax intensity",
  target: "section",
  path: ["style", "parallaxIntensity"],
  input: { kind: "slider", min: 0, max: 40, step: 2, suffix: "px" },
  // visibleWhen (if the descriptor schema supports it): style.scrollEffect === "parallax";
  //   otherwise render always and let it no-op unless parallax is selected.
}
```

**Match the exact descriptor field names** used by the existing `"style"`
descriptors at `:274-293` (this leaf must READ that block first and copy the shape
precisely — `path` vs `overridePath`, `input.kind` union values). If the registry
lacks a `visibleWhen`/conditional field, ship the intensity slider unconditionally
(harmless when `scrollEffect !== "parallax"` — model already ignores it) and note
the follow-up.

## Regression-test shape (Bun — `tests/unit/pages/pageEditorControlRegistry.test.ts`)

- `pageUniversalSectionControls` contains `section.scrollEffect` (panel `"style"`,
  4 options) and `section.parallaxIntensity` (slider 0..40); their write paths
  equal the model keys; the segmented option values are EXACTLY
  `pageSectionScrollEffects` (import-and-compare — guards enum/UI drift).

## Hard Invariants

1. Descriptor option values === `pageSectionScrollEffects` (imported, not
   re-typed).
2. No `PageEditor.tsx` edit (renders through the generic field).
3. Writes `style.scrollEffect` / `style.parallaxIntensity` — the exact model keys.
