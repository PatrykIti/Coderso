# TASK-519-03-L01: ClearableFields Alpha-Aware Helpers

# FileName: TASK-519-03-L01-ClearableFields-Helpers.md

**Parent Subtask:** TASK-519-03
**Priority:** High
**Category:** Admin UI / Editor Controls (widget shared helpers) / Security
**Estimated Effort:** Small
**Dependencies:** 519-01-L01 (`colorValue.ts`). Lands before 519-03-L02.
**Status:** ⏳ To Do

---

## Single-writer file

**Solely owns `core/admin/ui/widgets/editors/ClearableFields.tsx`.** No other leaf
writes it. `SharedColorControl.tsx` (519-03-L02) imports the fixed exports from here —
so this leaf lands FIRST.

## Changes (grounded in current file)

1. **Import** `parseColorValue, colorAlpha, pickerHexFor, isAlphaPickerRepresentable,
   composeHexColor` from `../../../shared/colorValue`.
2. **`isHexColorValue` (`:14-16`)** — widen the local `hexColorPattern` (`:10`) usage to
   accept 4/8-digit hex (`^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$`), so an
   alpha hex classifies as a real color (feeds `describeSharedColorControlState` →
   `selected_swatch`).
3. **`resolveColorPickerValue` (`:18-30`)** — replace the alpha-dropping body with
   `pickerHexFor(parseColorValue(value), fallback)` (returns the BASE hex for hex8/rgba,
   fallback for token/keyword). REMOVE the `:27` alpha→fallback early-return.
4. **`resolveColorSwatchValue` (`:32-34`)** — keep delegating to
   `resolveColorPickerValue`.
5. **`isPickerRepresentableColorValue` (`:36-45`)** — replace with
   `isAlphaPickerRepresentable(value)` (now TRUE for alpha rgba/hex — the slider handles
   alpha).
6. **`applySharedColorPickerChange` (`:47-66`)** — preserve current alpha when the
   picker changes the base: read `alpha = colorAlpha(parseColorValue(currentValue))`,
   emit `composeHexColor(nextValue, alpha)` when `alpha < 1`, else `nextValue`. Keep the
   `onPickerChange` short-circuit (`:58-61`).
7. **NEW export `applySharedColorAlphaChange({ currentValue, alphaPct, onChange })`** —
   `onChange(composeHexColor(pickerHexFor(parseColorValue(currentValue)), alphaPct/100))`.
8. **Do NOT change** `resolveColorContrastAdvisory`/`parseColor` (`:86-174`; already
   alpha-aware, `:114`), `ClearableFieldHeader`, `ClearableInputField`, `ColorTokenHint`,
   `ColorContrastNotice`, or `SharedColorFieldInputs` signatures — API stays stable so
   the 27 widget editors compile unchanged.

## Data flow / error handling

Pure helpers; delegate parsing/clamping to 519-01. No throws. Token/keyword/unknown →
fallback (picker) + not representable (slider hidden).

## Security

New emits go through `composeHexColor` (structurally safe). Free-text `onChange` path
unchanged; server normalize authoritative. No route/RBAC/schema/migration.

## Tests

Owned by **519-03-L03** (`tests/vitest/ui/clearable-fields-alpha.test.tsx`).
