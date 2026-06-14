# TASK-421-02: Control Primitives And Preset Inputs
# FileName: TASK-421-02-Control-Primitives-And-Preset-Inputs.md

**Parent Task:** TASK-421
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-421-01
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Replace the current generic `TextField`, `NumberField`, and native `SelectField`
usage in the floating inspector with Page Editor control primitives that match
the reference: segmented option buttons, toggles, sliders, swatches, color
pickers, and media controls. This subtask deletes the raw rendering paths for
bounded numbers, small enum sets, switches, colors, and media/source controls
instead of wrapping them with new styling.

---

## Implementation Pseudocode

```tsx
function RegistryControlField(props) {
  const normalized = resolveControlUiModel(props.control, props.value);
  return (
    <ResponsiveControlShell {...props.overrideState}>
      <ControlRenderer model={normalized} onChange={props.onChange} />
    </ResponsiveControlShell>
  );
}

function ControlRenderer({ model, onChange }) {
  switch (model.kind) {
    case "segmented":
      return <SegmentedOptionControl options={model.options} value={model.value} />;
    case "toggle":
      return <ToggleControl checked={model.value === true} />;
    case "slider":
      return <SliderControl min={model.min} max={model.max} step={model.step} />;
    case "swatch":
      return <SwatchControl palette={model.palette} allowCustom />;
    case "media":
      return <MediaSourceControl />;
    case "text":
      return <TextControl />;
    default:
      return <UnsupportedControlNotice />;
  }
}
```

Expected data flow:

- Keep `pageEditorControlRegistry` as the metadata owner.
- Add `core/services/pages/pageEditorControlUiModel.ts` as a pure UI-model
  adapter for label mapping, segmented thresholds, ranges, steps, units,
  palettes, and fallback display values.
- Keep registry `input` values stable where possible; the adapter decides when a
  small `select` option set becomes `segmented` so existing schema and registry
  tests do not churn unnecessarily.
- Do not write out-of-range values; clamp through existing control coercion.
- `color` and future `swatch` inputs map to swatches plus a custom picker.
- `switch` inputs map to `role="switch"` controls, not native yes/no selects.
- Bounded `number` inputs map to sliders or slider/stepper pairs, not native
  number-arrow inputs.
- `media` inputs map to a media/source control and must not fall through to a
  generic text field.
- Free-form `text` remains available only for content copy, alt text, href,
  anchor, or similar string fields where typing is the intended UX.
- Export adapter/primitives in a shared path usable by the future TASK-420 Page
  Templates editor.

Error handling:

- Unknown values show a safe "custom" state without losing stored value.
- Unsupported control kinds render a non-mutating notice and get test coverage.
- Slider changes debounce only if needed; saved payloads remain deterministic.

Regression-test shape:

- Unit or component tests for control renderer mapping.
- PageEditor flow tests proving section layout/style/background/visibility
  values still save correctly through the new controls.
- Tests assert no `color`, `media`, bounded `number`, `switch`, or small enum
  control renders through bare `TextField`, native `type="number"`, or native
  yes/no/select UI unless the adapter intentionally returns `text` or a long
  option-list select.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write behavior.
- **Rate-limit bucket:** unchanged.
- **Validation:** all writes go through existing Page v2 normalizers.
- **Anti-abuse controls:** no unsafe style/url passthrough beyond existing media
  and URL validation rules.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- Targeted Vitest for extracted renderer helpers if added.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- TASK-421 implementation notes.

---

## Completion Notes

Completed 2026-06-11: pageEditorControlUiModel.ts adapter (pure, Vitest-owned; segmented threshold, slider ranges, label catalog, fail-closed unsupported model, allowTransparent for nullable block colors) + six editorControls primitives with shared dark-toolbar chrome. Tests: adapter (18) + primitives DOM suites.
