# TASK-519-02-L01: ColorSwatchControl Alpha Upgrade (Control)

# FileName: TASK-519-02-L01-ColorSwatchControl.md

**Parent Subtask:** TASK-519-02
**Priority:** High
**Category:** Admin UI / Editor Controls (menu + page swatch) / Security
**Estimated Effort:** Small
**Dependencies:** 519-01-L01 (`colorValue.ts`), reuses `editorControls/SliderControl.tsx`.
**Status:** ⏳ To Do

---

## Single-writer file

**Solely owns `core/admin/ui/pages/editorControls/ColorSwatchControl.tsx`.** No other
leaf writes it.

## Changes (grounded in current file)

1. **Import** from `../../../shared/colorValue`: `parseColorValue`, `composeHexColor`,
   `colorAlpha`, `pickerHexFor`, `normalizeAdminColorValue`. Import `SliderControl`
   from `./SliderControl`.
2. **Replace** the local `HEX_COLOR_PATTERN`/`isHexColor`/`toSafeHexColor`
   (`ColorSwatchControl.tsx:33-46`) usage in the custom block with the shared helpers
   (`toSafeHexColor` can be deleted; if it is referenced only by the picker `value`,
   swap to `pickerHexFor(parseColorValue(value))`).
3. **Native picker (`:143-153`)**: `value={pickerHexFor(parsed)}`, `onChange` →
   `onChange(composeHexColor(e.target.value, alpha))` (base change keeps current
   alpha — HI-2).
4. **NEW opacity slider** below the picker: `SliderControl` `0..100`, value
   `Math.round(colorAlpha(parsed)*100)`, disabled unless `parsed.kind` is `hex|rgb`,
   `onChange(pct)` → `onChange(composeHexColor(pickerHexFor(parsed), pct/100))`.
5. **Hex text field (`:154-172`)**: widen `commitHexDraft` to
   `commitDraft` using `normalizeAdminColorValue(draft)` (accept `#rgba`/`#rrggbbaa`/
   `rgba()`/`hsla()`/`var()`/keyword; reject → revert). Placeholder `"#rrggbbaa"`;
   width `w-28`. Keep `key={value}` and the onBlur/Enter commit wiring.
6. **Do NOT touch** the transparent swatch block (`:99-117`, `onChange(null)`) or the
   palette map (`:118-140`).
7. When `parsed.kind` is `token`/`keyword`/`unknown`, render a one-line hint
   ("Token/keyword color — opacity slider unavailable") and disable the slider (mirrors
   the widget-side `ColorTokenHint`). The text field still shows the raw value.

## Data flow

`value: string` (may be `""`, hex6/8, rgba, hsla, `var(--color-*)`, or an upstream
`null` rendered as `""`) → `parseColorValue` → `{baseHex, alpha, kind}` drives picker +
slider + text. Any edit recomposes via `composeHexColor` (or passes the raw normalized
string for rgba/hsla/token) to the existing `onChange(string | null)`.

## Error handling / security

`normalizeAdminColorValue` fail-soft (revert on reject); alpha clamped in
`composeHexColor`. Cannot emit unsafe CSS (structural — see 519-01). Transparent/clear
still `onChange(null)`. No route/RBAC/schema/migration.

## Tests

Owned by sibling **519-02-L02** (`tests/vitest/ui/color-swatch-alpha.test.tsx`). This
leaf ships only the control.
