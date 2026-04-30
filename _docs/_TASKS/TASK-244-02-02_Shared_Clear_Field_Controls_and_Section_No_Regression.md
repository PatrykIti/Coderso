# TASK-244-02-02: Shared Clear Field Controls and Section No-Regression

# FileName: TASK-244-02-02_Shared_Clear_Field_Controls_and_Section_No_Regression.md

**Priority:** High
**Category:** Widgets + Editor Helpers
**Estimated Effort:** Medium
**Dependencies:** TASK-244-02-01
**Status:** To Do

---

## Overview

Create a reusable clear-field editor pattern only after Hero proves the behavior.
Use it for color/background/overlay fields where reuse is straightforward, and
add no-regression coverage around `section` because it already has the desired
empty-gradient runtime behavior.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- shared editor helper file only if an existing local pattern supports it
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `core/admin/ui/widgets/editors/SectionEditors.tsx` only if it adopts the shared
  helper
- `core/widgets/core/section.tsx` only if helper/runtime behavior requires it
- `tests/vitest/widgets/section.test.tsx` or the current Section test owner if
  available
- relevant editor-wave tests if Section editor UI changes

## Implementation Notes

Do not create a generic abstraction before at least two editor surfaces use it.
The helper should be small:

- label;
- color/text input;
- optional color picker;
- `Clear` button;
- `onClear` callback that removes a field.

The helper must not know about route saves, DB, settings, or runtime adapters.

## Implementation Pseudocode

```tsx
type ClearableColorFieldProps = {
  label: string;
  value?: string;
  placeholder: string;
  pickerFallback: string;
  onChange: (next: string) => void;
  onClear: () => void;
};

function ClearableColorField(props: ClearableColorFieldProps) {
  const hasValue = typeof props.value === "string" && props.value.trim().length > 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{props.label}</p>
        <Button type="button" variant="ghost" size="sm" onClick={props.onClear} disabled={!hasValue}>
          Clear
        </Button>
      </div>
      {/* existing color input + text input */}
    </div>
  );
}
```

Section no-regression should keep this contract:

```ts
const hasGradient =
  (style.gradientFrom ?? "").trim().length > 0 &&
  (style.gradientTo ?? "").trim().length > 0;
```

## Testing Requirements

- Hero tests from TASK-244-02-01 must remain green.
- If Section editor/runtime changes:
  - targeted Section runtime test proving empty gradient fields omit
    `backgroundImage`;
  - targeted Section editor test proving clear removes gradient/color fields.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SECTION.md` only if Section editor behavior changes
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Any shared clear-field helper stays Bun-free and editor-only.
2. Section keeps its current no-gradient-when-empty runtime behavior.
3. Clear buttons remove fields rather than writing transparent values.
4. Helper adoption reduces duplication without forcing all editors into a new
   abstraction.
