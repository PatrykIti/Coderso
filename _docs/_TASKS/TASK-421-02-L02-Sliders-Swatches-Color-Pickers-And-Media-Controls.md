# TASK-421-02-L02: Sliders Swatches Color Pickers And Media Controls
# FileName: TASK-421-02-L02-Sliders-Swatches-Color-Pickers-And-Media-Controls.md

**Parent Subtask:** TASK-421-02
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-421-02-L01
**Status:** ⏳ To Do

---

## Overview

Implement bounded slider controls for numeric values and swatch/picker controls
for colors. Preserve text/media fallbacks only where the underlying value is not
well represented by presets.

---

## Implementation Pseudocode

```tsx
function SliderControl({ label, value, min, max, step, unit, onChange }) {
  const clamped = clamp(value, min, max);
  return (
    <label>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={clamped} />
      <output>{clamped}{unit}</output>
    </label>
  );
}

function ColorSwatchControl({ value, palette, onChange }) {
  return (
    <div>
      {palette.map((color) => (
        <button type="button" aria-pressed={color === value} onClick={() => onChange(color)} />
      ))}
      <input type="color" value={toSafeColor(value)} />
    </div>
  );
}
```

Expected data flow:

- Numeric controls use clamp metadata and sensible steps.
- Spacing/radius/gap/opacity/thickness/column gap use sliders.
- Accent/background/text/border colors use swatches plus custom picker.
- Media controls continue to avoid storing secrets or privileged paths.

Regression-test shape:

- Tests assert sliders render for numeric controls and swatches/pickers render
  for color controls.
- Saved Page v2 payloads still store numbers/colors at the same paths.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** clamp numeric writes; sanitize/validate color values through
  existing style rules.
- **Anti-abuse controls:** media/url controls must not expose secret storage
  details in browser state.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- Targeted renderer helper tests if introduced.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
