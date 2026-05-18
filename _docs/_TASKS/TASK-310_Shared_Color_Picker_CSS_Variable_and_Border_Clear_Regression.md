# TASK-310: Shared Color Picker CSS Variable and Border Clear Regression

# FileName: TASK-310_Shared_Color_Picker_CSS_Variable_and_Border_Clear_Regression.md

**Priority:** High
**Category:** Widgets + Admin UI + Shared Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-256-02
**Status:** In Progress (2026-05-17)

---

## Overview

Repair the leftover shared color-field drift that survived TASK-256-02.

The TASK-269 audit confirmed that Form Embed report rows U3/U4 are not
widget-local defects:

- the hex-only `resolvePickerColor()` pattern is still duplicated across many
  widget editors, so CSS-variable/custom token values fall back to the picker
  swatch default instead of remaining truthful in the UI;
- Form Embed still lacks the final `borderColor` clear adoption even though the
  shared clear/token contract is already supposed to own that behavior.

This task creates the shared owner seam for token-aware color inputs and fixes
the remaining border-clear adoption through that seam before TASK-269 continues
with widget-local styling work.

## Scope Boundary

This task owns:

- shared token-aware color-input helper behavior for editor swatches vs text
  values;
- shared configured/fallback/clear semantics for color fields;
- adoption in widget editors that still duplicate the old
  `resolvePickerColor()` / local `ColorField` pattern;
- the remaining Form Embed `borderColor` clear adoption because it is a shared
  clear-contract regression, not a Form Embed-local feature.

This task does not own widget-local variant/product styling, runtime typography,
public accessibility semantics, or any new schema fields outside the existing
color/clear contract.

## Sub-Tasks

- [ ] Add a shared color-field helper that keeps the swatch on a safe fallback
  when the text value is a CSS variable/custom token, without overwriting that
  text value.
- [ ] Extend shared clearable-field helpers so color rows can distinguish
  configured vs fallback state consistently.
- [ ] Replace duplicated local `resolvePickerColor()` / `ColorField` patterns
  in the current widget editors that still use them.
- [ ] Wire the remaining Form Embed `borderColor` clear adoption through the
  shared helper instead of a widget-local special case.
- [ ] Add focused UI tests that prove CSS-variable/custom token text survives
  color-swatch interaction and that clear actions remove configured values.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Add the shared token-aware color-field helper and configured/fallback state helpers. |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Replace local color-field helper usage with the shared helper where the existing contract already owns those fields. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Replace local color-field helper usage with the shared helper. |
| `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` | Consume the shared helper and add the missing `borderColor` clear adoption. |
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
- `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
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
- Form Embed `borderColor` clear is fixed through the shared owner seam, not a
  local one-off patch.
