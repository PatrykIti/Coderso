# TASK-310: Shared Color Picker CSS Variable and Border Clear Regression

# FileName: TASK-310_Shared_Color_Picker_CSS_Variable_and_Border_Clear_Regression.md

**Priority:** High
**Category:** Widgets + Admin UI + Shared Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-305
**Status:** In Progress (2026-05-17)

---

## Overview

Repair the leftover shared color-field adoption drift that survived
`TASK-256-02`, even after the concrete shared owner landed under `TASK-305`.

The TASK-269 audit confirmed that the old `resolvePickerColor()` / local
`ColorField` pattern survived in multiple widget editors even after the shared
owner seam existed:

- the hex-only `resolvePickerColor()` pattern is still duplicated across many
  widget editors, so CSS-variable/custom token values fall back to the picker
  swatch default instead of remaining truthful in the UI;
- Form Embed already closed its shared rows by consuming the landed lower-level
  helper surface, so the remaining work is now strictly about still-local
  adopters.

This task now owns the remaining adoption wave: reuse or lightly extend the
landed shared helper surface (`ClearableFields.tsx`,
`SharedColorControl.tsx`, and `SharedColorFieldInputs`) across editors that
still duplicate local swatch/text logic before widget-local styling work
continues.

Already closed or separately owned and therefore excluded from the remaining
wave:

- Form Embed: already consumes the landed shared helper surface.
- Entry Teaser: already consumes `SharedColorControl`.
- Booking Calendar: routed through `TASK-297` as a widget-specific adoption
  leaf.
- Gallery Mosaic: current overlay/current-media special-case behavior was
  settled under `TASK-312` / `TASK-270` and must not be flattened into a
  generic no-alpha helper rewrite.

## Scope Boundary

This task owns:

- additive shared helper work only when a remaining adopter cannot consume the
  landed helper surface as-is;
- adoption in widget editors that still duplicate the old
  `resolvePickerColor()` / local `ColorField` pattern.

This task does not own widget-local variant/product styling, runtime typography,
public accessibility semantics, or any new schema fields outside the existing
color/clear contract.

This umbrella is no longer implementation-ready by itself. Execute it through
the physical adopter leaves below so each wave has a bounded write scope and
targeted validation lane.

## Sub-Tasks

- [ ] TASK-310-01: Shared Color Picker Layout and Interactive Editor Adoption
- [ ] TASK-310-02: Shared Color Picker Content and Marketing Editor Adoption
- [ ] TASK-310-03: Shared Color Picker Shell and Forms-Adjacent Editor Adoption
- [ ] TASK-310-04: Shared Color Picker Team and Testimonials Editor Adoption

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Extend the landed token-aware helper surface only when an adopter leaf proves the shared seam still lacks required bounded behavior. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Keep the swatch-plus-text owner aligned with the adopter leaves when a consumer needs the full control API instead of the lower-level helper. |
| `_docs/_TASKS/TASK-310-01_Shared_Color_Picker_Layout_and_Interactive_Editor_Adoption.md` | Physical execution leaf for Accordion, Compare Timeline, Divider, FAQ Accordion, Grid Columns, Section, and Timeline. |
| `_docs/_TASKS/TASK-310-02_Shared_Color_Picker_Content_and_Marketing_Editor_Adoption.md` | Physical execution leaf for Content List, CTA Banner, Feature Grid, Hero, Rich Text Section, and Stats KPI. |
| `_docs/_TASKS/TASK-310-03_Shared_Color_Picker_Shell_and_Forms_Adjacent_Editor_Adoption.md` | Physical execution leaf for Contact, Footer, Navigation, Newsletter, and Pricing Plans. |
| `_docs/_TASKS/TASK-310-04_Shared_Color_Picker_Team_and_Testimonials_Editor_Adoption.md` | Physical execution leaf for Team and Testimonials. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Add shared helper coverage for CSS variables/custom tokens and clear-state semantics. |
| Additional touched editor-wave tests | Update only for editors whose expectations currently hardcode the old hex-only swatch fallback. |
| `_docs/_TASKS/README.md` | Keep the board, notes, and statistics synchronized after the adopter split. |

## Implementation Pseudocode

```tsx
type SharedColorFieldState = {
  pickerValue: string;
  displayValue: string;
  configured: boolean;
};

function resolveColorFieldState(value: string | undefined, pickerFallback: string): SharedColorFieldState {
  const displayValue = value ?? "";
  const configured = typeof value === "string" && value.trim().length > 0;
  const isHex = /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(displayValue);

  return {
    pickerValue: isHex ? displayValue : pickerFallback,
    displayValue,
    configured,
  };
}

function SharedColorField(props: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  pickerFallback: string;
  placeholder: string;
}) {
  const state = resolveColorFieldState(props.value, props.pickerFallback);

  return (
    <>
      <ClearableFieldHeader label={props.label} value={props.value} onClear={props.onClear} />
      <ColorInput value={state.pickerValue} onChange={props.onChange} />
      <TextInput value={state.displayValue} onChange={props.onChange} />
    </>
  );
}
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged admin UI only.
- Reject-unknown validation: this task must not widen widget schemas or add raw
  style blobs outside the existing allowlisted fields.
- Anti-abuse: no public write path changes.
- Secret handling: editor token/color values remain plain strings only; do not
  log configured style values into debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx`
- targeted editor-wave suites for every adopted editor whose old assertions
  depend on the local helper behavior
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` for the adopter split and any later status
  transitions.
- Update the relevant widget docs or Playwright reports only when a leaf
  changes visible editor behavior or closes a report row.
- Update child task docs and the changelog when the full adopter wave is
  complete.

## Changelog Policy

- This task must not move to `Done` until it is listed in `_docs/_CHANGELOG/`
  and `_docs/_CHANGELOG/README.md`.

## Acceptance Criteria

- CSS-variable/custom token color values no longer appear to “reset” just
  because the swatch cannot represent them.
- Shared color-field clear semantics are consistent across the adopted editors.
- The remaining editors are split into physical leaves with bounded write sets
  instead of one monolithic in-progress task.
- Form Embed, Entry Teaser, Booking Calendar, and Gallery Mosaic stay excluded
  from this remaining wave for the explicit reasons documented above.
