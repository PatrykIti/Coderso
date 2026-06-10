# TASK-421-02: Control Primitives And Preset Inputs
# FileName: TASK-421-02-Control-Primitives-And-Preset-Inputs.md

**Parent Task:** TASK-421
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-421-01
**Status:** ⏳ To Do

---

## Overview

Replace the current generic `TextField`, `NumberField`, and native `SelectField`
usage in the floating inspector with Page Editor control primitives that match
the reference: segmented option buttons, toggles, sliders, swatches, color
pickers, and media controls.

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
    default:
      return <TextControl />;
  }
}
```

Expected data flow:

- Keep `pageEditorControlRegistry` as the metadata owner.
- Add a small UI-model adapter for label mapping, ranges, steps, palettes, and
  fallback display values.
- Do not write out-of-range values; clamp through existing control coercion.

Error handling:

- Unknown values show a safe "custom" state without losing stored value.
- Unsupported control kinds fall back visibly and get test coverage.
- Slider changes debounce only if needed; saved payloads remain deterministic.

Regression-test shape:

- Unit or component tests for control renderer mapping.
- PageEditor flow tests proving section layout/style/background/visibility
  values still save correctly through the new controls.

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
