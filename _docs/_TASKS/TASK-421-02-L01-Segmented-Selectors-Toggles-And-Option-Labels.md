# TASK-421-02-L01: Segmented Selectors Toggles And Option Labels
# FileName: TASK-421-02-L01-Segmented-Selectors-Toggles-And-Option-Labels.md

**Parent Subtask:** TASK-421-02
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-421-02
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Implement segmented controls and toggle controls for small finite option sets.
This leaf removes native selects for controls like section variant, columns,
alignment, justify, shadow, background type, button variant, button size,
visibility, auth-only, wrap, autoplay, and muted when the option count is small.
The registry does not need to relabel every small `select` as `segmented`; the
UI-model adapter owns the threshold and renders a segmented control when the
option count and value shape are appropriate.

---

## Implementation Pseudocode

```tsx
function SegmentedOptionControl({ label, value, options, labels, onChange }) {
  return (
    <fieldset aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          aria-pressed={option === value}
          data-page-editor-segmented-option={option}
          onClick={() => onChange(option)}
        >
          {labels[option] ?? option}
        </button>
      ))}
    </fieldset>
  );
}

function ToggleControl({ label, checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span>{label}</span>
    </button>
  );
}

function resolveFiniteOptionModel(control) {
  if (control.input === "switch") return { kind: "toggle" };
  if (control.options.length <= SMALL_SEGMENTED_OPTION_LIMIT) {
    return {
      kind: "segmented",
      labels: pageEditorOptionLabels[control.id] ?? fallbackHumanLabels(control.options)
    };
  }
  return { kind: "select" };
}
```

Expected data flow:

- Add user-facing labels for registry options while preserving stored enum
  values.
- Own labels in an English UI catalog today, with room for future localization;
  do not render raw enum tokens as the primary label.
- Upgrade these small sets to segmented controls at minimum:
  section `variant`, section `columns`, vertical/horizontal alignment, shadow,
  background type, heading level, text format, button variant, button size,
  button target, image fit, divider tone, columns distribution, group direction,
  media placement, and other Page v2 atom options with small finite values.
- Keep a compact select/menu only for long or unknown lists after the adapter
  threshold says segmented buttons would be too wide.
- Keep keyboard/focus accessibility for all buttons.
- Switches render with `role="switch"` and `aria-checked`; native yes/no selects
  are not acceptable for booleans.

Regression-test shape:

- Tests assert `data-page-editor-segmented-option` and `role="switch"` appear.
- Existing save payload tests still match stored enum/boolean values.
- Tests assert native select does not appear for the small required option sets
  listed above.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only registry-owned option values can be emitted.
- **Anti-abuse controls:** no dynamic HTML in labels.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- None beyond the parent family docs; TASK-421-05 owns board/changelog sync.

---

## Completion Notes

Completed 2026-06-11: SegmentedControl (aria-pressed, data-page-editor-segmented-option, horizontally scrollable strip with snap + arrow-key navigation per owner feedback) and ToggleSwitch (role=switch); English label catalog in the adapter.
