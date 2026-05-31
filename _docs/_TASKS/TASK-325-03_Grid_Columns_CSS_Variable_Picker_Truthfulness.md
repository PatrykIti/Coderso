# TASK-325-03: Grid Columns CSS Variable Picker Truthfulness

# FileName: TASK-325-03_Grid_Columns_CSS_Variable_Picker_Truthfulness.md

**Priority:** Medium
**Category:** Shared Widgets + Grid Columns + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-325
**Status:** Done (2026-05-21)

---

## Overview

Preserve and visibly represent CSS-variable color values in the shared Grid
Columns color-control path.

This leaf owns Grid Columns representation truthfulness only. It must not widen
the generic color-input scope beyond what Grid Columns needs to stay truthful.

## Sub-Tasks

- None. This is an execution-ready implementation leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Keep CSS-variable values visible in the Grid Columns global and per-column surface controls. |
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Adjust the shared text/picker seam only if Grid Columns needs a bounded shared fix to keep token text visible. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover Grid Columns token-text preservation and truthful picker fallback behavior. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Add focused shared coverage only if the bounded shared seam changes. |

## Implementation Pseudocode

```ts
function resolveGridColumnsColorFieldState(value: string | undefined) {
  if (value?.startsWith("var(--color-")) {
    return { textValue: value, pickerValue: "", hint: value };
  }
  return { textValue: value ?? "", pickerValue: value ?? "", hint: null };
}
```

## Data Flow

1. Read the current color value from the Grid Columns control.
2. Keep CSS-variable tokens visible in the text input even when the color swatch
   cannot represent them exactly.
3. Show bounded helper copy or a token hint rather than pretending the picker is
   exact.

Error handling:

- Do not erase CSS-variable values when the user focuses the color picker.
- Do not coerce CSS-variable tokens into fake hex values.
- If a shared clearable-field change is needed, keep it narrow and prove it does
  not widen the contract for unrelated widgets.

Regression-test shape:

```ts
test("grid columns keeps CSS variable values visible in the text field", () => {
  expect(resolveGridColumnsColorFieldState("var(--color-border)")).toMatchObject({
    textValue: "var(--color-border)",
  });
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: preserve the existing bounded token-or-hex color
  validation.
- Anti-abuse: no raw CSS functions beyond the already-approved
  `var(--color-*)` tokens.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx` when the
  shared seam changes
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_TASKS/TASK-325*.md`.

## Acceptance Criteria

- CSS-variable values remain visible and truthful in Grid Columns controls.
- The picker never implies a precise swatch value for token-backed colors.
- Any shared clearable-field change stays narrow and tested.

## Completion Notes (2026-05-21)

- The already-landed shared clearable color controls were sufficient for Grid Columns: token text stays visible, swatches fall back truthfully, and no shared seam rewrite was needed.
- TASK-325-03 closes with widget-local regression coverage proving the existing contract on both the global Grid Columns surface controls and per-column override controls.
