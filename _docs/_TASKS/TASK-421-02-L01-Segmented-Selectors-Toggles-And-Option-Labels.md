# TASK-421-02-L01: Segmented Selectors Toggles And Option Labels
# FileName: TASK-421-02-L01-Segmented-Selectors-Toggles-And-Option-Labels.md

**Parent Subtask:** TASK-421-02
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-421-02
**Status:** ⏳ To Do

---

## Overview

Implement segmented controls and toggle controls for small finite option sets.
This leaf removes native selects for controls like section variant, columns,
alignment, justify, shadow, background type, button variant, button size,
visibility, auth-only, wrap, autoplay, and muted when the option count is small.

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
```

Expected data flow:

- Add user-facing labels for registry options while preserving stored enum
  values.
- Keep keyboard/focus accessibility for all buttons.
- Continue rendering native select only for long or unknown option lists.

Regression-test shape:

- Tests assert `data-page-editor-segmented-option` and `role="switch"` appear.
- Existing save payload tests still match stored enum/boolean values.

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
