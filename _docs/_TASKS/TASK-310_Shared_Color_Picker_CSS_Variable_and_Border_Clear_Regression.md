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
- Form Embed already closed its shared rows by consuming the new helper, which
  means the remaining work is now strictly about the still-local adopters.

This task now owns the remaining adoption wave: reuse or lightly extend the
landed shared helper surface (`ClearableFields.tsx` plus
`SharedColorControl.tsx`) across editors that still duplicate local swatch/text
logic before widget-local styling work continues. The remaining live adopters
still include Accordion, Content List, Footer, and the other editors listed in
the file matrix below.

## Scope Boundary

This task owns:

- additive shared helper work only when a remaining adopter cannot consume the
  landed helper surface as-is;
- adoption in widget editors that still duplicate the old
  `resolvePickerColor()` / local `ColorField` pattern.

This task does not own widget-local variant/product styling, runtime typography,
public accessibility semantics, or any new schema fields outside the existing
color/clear contract.

## Sub-Tasks

- [ ] Reuse the landed shared color-field helper surface where possible and
  extend it only when a remaining adopter cannot consume it cleanly.
- [ ] Replace duplicated local `resolvePickerColor()` / `ColorField` patterns
  in the current widget editors that still use them.
- [ ] Add focused UI tests that prove CSS-variable/custom token text survives
  color-swatch interaction and that clear actions remove configured values.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Extend the landed token-aware helper surface only when the remaining adopters need additive shared behavior. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Keep the swatch-plus-text owner aligned with the adoption wave when a remaining consumer needs that API instead of the lower-level helper. |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Replace local color-field helper usage with the shared helper where the existing contract already owns those fields. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Replace the local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/ContentListEditors.tsx` | Replace the local color-field helper usage with the shared helper where shared renderer/style work still owns those fields. |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Replace the local color-field helper usage with the shared helper for the remaining shared footer color controls. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Add shared helper coverage for CSS variables/custom tokens and clear-state semantics. |
| `tests/vitest/ui/form-embed-editor-wave.test.tsx` | Cover Form Embed border-color clear and CSS-variable preservation through the shared helper. |
| Additional touched editor-wave tests | Update only for editors whose expectations currently hardcode the old hex-only swatch fallback. |

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

- Update any touched `_docs/_TASKS/TASK-269*.md` references that still route
  U3/U4 through closed TASK-256 scope.
- Update touched widget docs only when visible editor behavior changes.
- Update the relevant Playwright reports when the shared helper adoption closes
  a report row.

## Changelog Policy

- This task must not move to `Done` until it is listed in `_docs/_CHANGELOG/`
  and `_docs/_CHANGELOG/README.md`.

## Acceptance Criteria

- CSS-variable/custom token color values no longer appear to “reset” just
  because the swatch cannot represent them.
- Shared color-field clear semantics are consistent across the adopted editors.
- The remaining editors adopt the landed shared owner seam instead of cloning
  another local swatch/text implementation.
