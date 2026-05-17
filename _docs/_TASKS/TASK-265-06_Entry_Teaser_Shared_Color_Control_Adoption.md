# TASK-265-06: Entry Teaser Shared Color Control Adoption

# FileName: TASK-265-06_Entry_Teaser_Shared_Color_Control_Adoption.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-265, TASK-293
**Status:** To Do

---

## Overview

Adopt the shared color-control contract from TASK-293 for Entry Teaser
surface and border fields.

This leaf owns only the Entry Teaser-specific part of report finding E-14 from
`_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`. TASK-293 owns the generic
color-picker behavior: CSS-variable preservation, clearable style state, and
the shared control API. TASK-265-06 wires that shared control into
`EntryTeaserEditors.tsx` and verifies that Entry Teaser surface/border values
stay faithful in editor and runtime output.

## Scope Boundary

In scope:

- Replace Entry Teaser surface/border text-only controls with the shared
  color-control hook/component after TASK-293 lands it.
- Preserve existing CSS variable tokens such as `var(--color-bg)` and
  `var(--color-border)` without accidental hex overwrite.
- Keep `Clear` semantics as field omission through the existing
  `clearStyle()`/`resolveClearableStyleValue()` path.
- Add focused Entry Teaser editor/render tests for color picker adoption.

Out of scope:

- Designing the generic color picker or changing shared clear/none semantics.
- Adding custom arbitrary style objects or raw class names.
- Changing Entry Teaser visual tokens unrelated to `style.surface` and
  `style.border`.

## Files To Create Or Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` | Replace surface/border `ClearableInputField` usage with the shared color-control hook/component from TASK-293 while keeping clear actions. |
| `core/widgets/core/entryTeaser.tsx` | Keep `resolveClearableStyleValue()` and `compactStyle()` output stable; update only if the shared helper requires an Entry Teaser adapter. |
| `tests/vitest/ui/entry-teaser-editor-wave.test.tsx` | Assert CSS variable values survive text and swatch interactions, and clear removes only the targeted field. |
| `tests/vitest/widgets/entryTeaser.test.tsx` | Create or extend Bun-free assertions for cleared and configured surface/border render output. |
| `_docs/_WIDGETS/ENTRY_TEASER.md` | Document final color-control behavior after implementation. |

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged.
- CSRF: unchanged because no route is introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: no new persisted keys unless TASK-293 requires a
  documented schema-backed adapter field.
- Anti-abuse: color controls must not accept raw style objects, raw class names,
  scripts, or unbounded CSS injection beyond the existing accepted color/token
  strings.
- Secret handling: no secrets, private URLs, or privileged tokens in widget
  style fields, diagnostics, docs, or DOM output.

## Implementation Pseudocode

```tsx
function EntryTeaserAdvancedEditor(...) {
  return (
    <SharedColorControl
      label="Surface color"
      value={normalized.style?.surface}
      fallback="var(--color-bg)"
      onTextChange={(next) => updateStyle(value, onChange, { surface: next })}
      onSwatchChange={(next) => updateStyle(value, onChange, { surface: next })}
      onClear={() => clearStyle(value, onChange, "surface")}
    />
  );
}
```

Data flow:

- The shared control owns display state for text/swatch parity.
- Persisted Entry Teaser data remains `style.surface` and `style.border`.
- Runtime still reads only normalized widget data and never editor-only color
  control state.

Error handling:

- Invalid color text stays visible as user input until the shared control marks
  it invalid; do not silently replace it with a hex value or fallback token.
- Clear removes the field and leaves sibling style fields unchanged.
- If TASK-293 has not landed the shared control, keep this leaf blocked
  instead of building an Entry Teaser-only picker.

Regression-test shape:

- Assert `var(--color-bg)` survives rendering and editor rerender.
- Assert swatch updates can set a hex value without deleting a CSS variable in
  the sibling field.
- Assert clear removes `surface` or `border` independently.
- Assert runtime output omits inline style for cleared fields.

## Sub-Tasks

- [ ] Consume the shared TASK-293 color-control hook/component.
- [ ] Wire Entry Teaser surface and border fields through the shared control.
- [ ] Preserve clearable style omission behavior.
- [ ] Add focused editor and render tests.
- [ ] Update Entry Teaser docs and report evidence.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- if this leaf creates or extends `tests/vitest/widgets/entryTeaser.test.tsx`,
  run `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx`
- `bun test tests/unit/widgets/entryTeaser.test.tsx` while render assertions
  still remain in the Bun-owned suite
- Shared TASK-293 color-control tests when the shared hook/component is
  touched by this leaf.

## Documentation Updates Required

- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when this leaf moves to
  `Done`.

## Acceptance Criteria

- E-14 has a concrete Entry Teaser owner after TASK-293 defines the generic
  color-control contract.
- Entry Teaser does not implement a parallel generic color picker.
- CSS variable tokens and clear behavior remain stable in editor and runtime.
