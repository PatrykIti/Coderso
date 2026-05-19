# TASK-305: Shared Color Control Text and Swatch Contract

# FileName: TASK-305_Shared_Color_Control_Text_and_Swatch_Contract.md

**Priority:** High
**Category:** Widgets + Admin UI + Design Tokens + Shared Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-256, TASK-256-02
**Status:** Done (2026-05-18)

---

## Overview

Repair the missing shared color-control owner that downstream widget tasks now
assume exists.

`TASK-256-02` closed shared clear/token semantics, but the live repo still has
no shared swatch-plus-text owner that preserves CSS variables and rgba text
authority. Widgets such as Entry Teaser therefore still depend on raw
`ClearableInputField` controls and repeated widget-local picker logic. This task
defines the shared admin control contract so adoption tasks such as
`TASK-265-06` can wire one shared component instead of cloning another local
picker.

## Scope Boundary

In scope:

- Add a shared color-control owner for text input plus optional swatch input.
- Preserve existing clear semantics through the current shared clear helpers.
- Keep text authority for CSS variables and rgba values when the swatch cannot
  represent them exactly.
- Add focused shared UI tests for configured, fallback, and clear behavior.
- Update dependent task docs that currently reference a shared color-control API
  that does not yet exist in the live repo.

Out of scope:

- Entry Teaser- or widget-specific adoption wiring.
- Broad redesign of all token editors or arbitrary CSS input.
- Public runtime routes or server-side API changes.

## Files To Create Or Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Extend shared clear helpers if needed for color-control state and clear affordances. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Add a shared text-plus-swatch color control that keeps text authority for non-hex values. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Add or update shared tests for configured vs fallback state and clear behavior if helper state changes. |
| `tests/vitest/ui/shared-color-control.test.tsx` | Add focused shared color-control tests for CSS vars, rgba text, hex swatch updates, and clear. |
| `_docs/_TASKS/TASK-265_Entry_Teaser_Widget_Playwright_Product_Followups.md` | Repoint Entry Teaser shared color-control dependency from closed TASK-256 docs to this physical shared task. |
| `_docs/_TASKS/TASK-265-06_Entry_Teaser_Shared_Color_Control_Adoption.md` | Repoint dependency and shared-control wording to this physical shared task. |
| `_docs/_TASKS/README.md` | Add the shared task row and keep statistics/status tables synchronized. |
| `_docs/WIDGETS.md` | Update only if the shared control changes the documented clear/token contract wording. |

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: shared UI state must not widen persisted widget
  schemas by itself.
- Anti-abuse: shared control must not accept raw style objects, scripts, or
  arbitrary CSS beyond the current string-based color/token fields already owned
  by widget schemas.
- Secret handling: control state, tests, and docs must not store secrets,
  signed URLs, or privileged tokens.

## Implementation Pseudocode

```tsx
type SharedColorControlProps = {
  label: string;
  value: string | undefined;
  fallback?: string;
  onTextChange: (next: string) => void;
  onSwatchChange: (next: string) => void;
  onClear?: () => void;
};

function resolvePickerColor(value: string | undefined): string | undefined {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value : undefined;
}

function SharedColorControl(props: SharedColorControlProps) {
  const pickerValue = resolvePickerColor(props.value);
  return (
    <div>
      <ClearableFieldHeader label={props.label} value={props.value} onClear={props.onClear} />
      <input type="color" value={pickerValue ?? "#000000"} onChange={...} />
      <Input value={props.value ?? ""} onChange={...} />
    </div>
  );
}
```

Error handling:

- CSS variables and rgba text remain visible in the text input even when the
  swatch cannot represent them.
- Swatch changes may write a hex value, but must never silently rewrite the
  text field on rerender when the configured value is still a CSS variable.
- Clear removes the configured key through existing shared clear semantics.

Regression-test shape:

- Assert `var(--color-bg)` stays visible in the text field across rerenders.
- Assert rgba/custom text does not collapse into a fake hex swatch state.
- Assert hex swatch updates propagate through `onSwatchChange`.
- Assert clear removes only the targeted configured value.

## Sub-Tasks

- [x] Add a shared text-plus-swatch color-control owner.
- [x] Keep shared clear semantics intact for the new control.
- [x] Add focused shared UI tests.
- [x] Repoint dependent task docs to this physical shared owner.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/shared-color-control.test.tsx`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_TASKS/TASK-265_Entry_Teaser_Widget_Playwright_Product_Followups.md`
- `_docs/_TASKS/TASK-265-06_Entry_Teaser_Shared_Color_Control_Adoption.md`
- `_docs/WIDGETS.md` only if the shared contract wording changes.

## Acceptance Criteria

- The repo exposes one shared swatch-plus-text color control instead of
  requiring widget-local picker clones.
- CSS variables, rgba values, and clear semantics remain stable.
- Downstream widget tasks have a concrete physical dependency for shared
  color-control adoption.
