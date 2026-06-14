# TASK-421: Page Editor Floating Inspector UX Redesign
# FileName: TASK-421_Page_Editor_Floating_Inspector_UX_Redesign.md

**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-418
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Redesign the Page Editor floating inspector so it follows
`_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html` and
`_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` instead of relying
on native number fields, selects, and text inputs for every setting. The editor
already has atomic sections, atomic blocks, a control registry, and a floating
toolbar. This task upgrades the inspector UX: icon categories, hover tooltips,
segmented presets, toggles, sliders, color swatches/pickers, media controls, and
focused section/block presets.

The goal is not to recreate the old advanced widget editors. Section and block
controls must stay beginner-friendly and constrained: a small set of general
layout, style, background, spacing, responsive, visibility, and typography
options shared across Page v2 atoms, with type-specific controls only where the
block contract already owns them.

This task must not be satisfied by wrapping the current raw form surface in a
new shell. The accepted UX is the reference floating inspector adapted to the
current React/Tailwind project:

- panel categories are icon buttons with hover descriptions/tooltips,
- small finite choices use segmented/list buttons,
- booleans use switches,
- bounded numeric values use sliders or slider/stepper controls with visible
  values,
- colors use swatches plus a picker/custom fallback,
- media values use media/source controls,
- raw text inputs are allowed only for genuinely free-form text such as copy,
  alt text, hrefs, anchors, or date values after a date-range toggle is enabled.

Where the reference HTML still uses raw text inputs for `maxWidth` or padding,
the user requirement supersedes the prototype: those values must be edited with
ergonomic bounded controls, not native number arrows or migration-only fields.

The control primitives and UI-model adapter created here must be reusable by
the future TASK-420 Page Templates editor. Page Templates must not reintroduce
legacy widget-template panels or duplicate a separate raw-input inspector.

---

## Sub-Tasks

- [x] TASK-421-01: Reference audit and floating inspector contract.
- [x] TASK-421-02: Control primitives and preset input renderers.
- [x] TASK-421-02-L01: Segmented selectors toggles and option labels.
- [x] TASK-421-02-L02: Sliders swatches color pickers and media controls.
- [x] TASK-421-03: Section and block panel preset coverage.
- [x] TASK-421-03-L01: Section general preset panels.
- [x] TASK-421-03-L02: Atomic block preset panels.
- [x] TASK-421-04: Responsive override tooltip and panel polish.
- [x] TASK-421-05: Validation browser smoke docs and closure.

---

## Implementation Pseudocode

```ts
function redesignFloatingInspector() {
  const reference = auditReferenceHtmlAndSpec({
    html: "_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html",
    spec: "_docs/UI/pages-editor-new-approach/coderso-editor-spec.md"
  });
  const contract = mapReferenceToCurrentEditor({
    toolbar: "core/admin/ui/pages/PageEditor.tsx",
    registry: "core/services/pages/pageEditorControlRegistry.ts",
    adapter: "core/services/pages/pageEditorControlUiModel.ts",
    primitives: "core/admin/ui/pages/editorControls/*",
    tests: "tests/vitest/ui/page-editor-v2-flow.test.tsx"
  });
  return {
    panelCategories: contract.categories,
    controlRenderers: contract.controlRenderers,
    sectionPresets: contract.sectionPresets,
    blockPresets: contract.blockPresets,
    validationPlan: contract.validationPlan
  };
}
```

Expected data flow:

- `pageEditorControlRegistry` remains the source of target/path/type metadata.
- A pure `pageEditorControlUiModel` adapter maps registry controls to
  presentational models: `segmented`, `toggle`, `slider`, `swatch`, `media`, and
  `text`.
- The registry may keep `input: "select"` for compatibility; the adapter
  upgrades small finite option sets to segmented controls through an explicit
  threshold and label catalog.
- Numeric controls use sliders or bounded stepper/slider pairs for common
  ranges instead of raw `type="number"` arrows.
- Columns use segmented `1 / 2 / 3 / 4`; max width and section paddings use
  bounded slider/stepper controls with visible pixel values.
- Colors use swatches plus picker/custom fallback; no free-form color text as
  the primary path.
- Media controls do not fall through to text inputs unless the value is a
  deliberately free-form URL field already owned by the media/source contract.
- Responsive override state, reset actions, and dirty-state behavior continue to
  use existing section/block override helpers.
- TASK-420 Page Templates consumes the same adapter/primitives when it builds
  the Page Editor-like reusable-template editor.

Error handling:

- Unknown control input types fail closed to a non-mutating unsupported-control
  state. Raw text fallback is reachable only when the adapter returns `text` for
  a free-form string field.
- Invalid preset values are rejected through existing normalizers; UI controls
  must not write values outside schema clamps.
- Controls must preserve unsaved edits and not trigger background revalidation
  overwrites.

Mandatory Claude/agent workflow:

- Before implementation, run a read-only Claude UX/contract audit using
  `claude -p --permission-mode plan --effort xhigh --tools Read,Grep,Bash`
  with a 1500-second timeout.
- The prompt must include the repo path, HEAD, dirty-worktree context,
  `TASK-421`, reference HTML/spec paths, current PageEditor/control-registry
  files, no-edit instruction, and severity-ordered findings with concrete
  file/line references.
- Do not send `.env`, credentials, provider keys, raw sensitive logs, or
  unredacted user data to Claude.
- Treat Claude output as review evidence. Verify findings locally before
  changing code or task state.

Regression-test shape:

- Vitest covers the control renderer mapping and key PageEditor flows.
- DOM tests assert segmented controls, toggles, sliders, swatches, tooltips, and
  responsive reset indicators exist for representative section/block selections.
- Tests assert `color`, `media`, bounded `number`, and small enum controls do
  not render as bare text inputs or native number-arrow fields.
- Playwright CLI smoke verifies the real browser floating inspector can select
  a section, switch categories, change layout/style/spacing/visibility presets,
  display hover descriptions, and keep the subpanel visible/scrollable on
  desktop and mobile-sized viewports.

## Preliminary Claude Contract Audit

Read-only Claude UX/contract audit on 2026-06-10 returned **FAIL** for the
earlier loose task wording. The audit found that `PageEditor.tsx` currently
routes `number` to native number inputs, small `select`/`segmented`/`switch`
controls to native selects, and `color`/`media` to raw text fallbacks. This task
contract was tightened from that audit. A fresh read-only audit is still
required before implementation because code and task state may change before
TASK-421 starts.

---

## Security Contract

- **Endpoint visibility:** no new public endpoints.
- **Auth model:** existing admin session only.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write behavior; no route changes expected.
- **Rate-limit bucket:** no new bucket.
- **Validation:** Page v2 schemas and control registry remain the validation
  source; reject unknown fields.
- **Anti-abuse controls:** no secrets or privileged settings in browser state,
  localStorage, debug payloads, tooltip text, or Playwright artifacts.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- Additional Vitest suites for extracted control renderer helpers if introduced.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Real browser smoke through `coderso-dev-core-host` and `playwright-cli` using
  `.env`-loaded local credentials/settings.

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` if the reference
  contract changes.
- `_docs/PAGE_MODEL.md` if Page v2 editor/control behavior changes.
- `_docs/_CHANGELOG/` entry on completion.

---

## Completion Notes

Family completed 2026-06-11. The floating inspector renders dedicated widgets end to end: pageEditorControlUiModel adapter + editorControls primitives (SegmentedControl/ToggleSwitch/SliderControl/SliderStepperControl/ColorSwatchControl/MediaPickerControl), all section and block panels wired through them (zero native selects/number-arrow fields for upgraded kinds, confirmed live by the audit-style classifier on hero + button: switch/swatch/range/segmented > 0 in every panel), metadata-driven tooltips, one-panel-at-a-time, viewport-safe scroll. Owner live-feedback folded in: segmented strips scroll horizontally (no overlap), transparent is a first-class swatch option for nullable block colors, block visual styles land on the element (button/image) instead of the frame. Responsive tab stays shell + readout (content owned by TASK-425). Evidence: .tmp/phase1/phase1-smoke.md; commits b6612c19 + 4dfdba0d.
