# TASK-519-03-L02: SharedColorControl Alpha Slider + True Swatch

# FileName: TASK-519-03-L02-SharedColorControl.md

**Parent Subtask:** TASK-519-03
**Priority:** High
**Category:** Admin UI / Editor Controls (widget editors) / Security
**Estimated Effort:** Small
**Dependencies:** 519-01-L01 (`colorValue.ts`), 519-03-L01 (fixed `ClearableFields` exports). Lands after L01.
**Status:** ✅ Done

---

## Single-writer file

**Solely owns `core/admin/ui/widgets/editors/SharedColorControl.tsx`.** No other leaf
writes it.

## Changes (grounded in current file)

1. **Import** `parseColorValue, colorAlpha, isAlphaPickerRepresentable,
   normalizeAdminColorValue` from `../../../shared/colorValue` (519-01 EXPORTS
   `normalizeAdminColorValue` — see 519-01-L01 `:154`) and `applySharedColorPickerChange,
   applySharedColorAlphaChange` from `./ClearableFields` (added in L01).
2. **True swatch preview** — `swatchColor` (`:178`) currently uses
   `resolveColorSwatchValue(value, pickerFallback)` (base only). For the visible
   preview chip and the native `<input type=color>` value, keep the BASE via the picker
   (HTML picker cannot show alpha), BUT the standalone preview swatch (`:198`,
   `showValueInput=false` branch `:212-215`) should show the REAL color
   (`value ?? pickerFallback` when representable) so the user sees the applied alpha.
3. **Picker onChange** (`:199`) — route through `applySharedColorPickerChange({
   currentValue: value, nextValue: e.target.value, onChange, onPickerChange:
   onSwatchChange })` so a base edit preserves alpha (HI-2). (Today it calls
   `handleSwatchChange` directly, dropping alpha.)
4. **NEW opacity slider** — under the value `<Input>` (`:203-208`) in the
   `showValueInput` branch, render a slider (`0..100`) when
   `isAlphaPickerRepresentable(value)`; value `Math.round(colorAlpha(parseColorValue(value))*100)`;
   `onChange(pct)` → `applySharedColorAlphaChange({ currentValue: value, alphaPct: pct,
   onChange })`. Hide/disable it for token/keyword/cleared.
5. **Free-text CANONICALIZATION on commit** — the value `<Input>` (`:203-208`)
   currently emits raw text: `onChange(event.target.value)` (`:206`), so the owner's
   leading-dot `rgba(8,17,31,.84)` would pass through verbatim. But the widget render
   path resolves via `resolveClearableCssColorValue`, whose `cssRgbColorPattern` REJECTS
   bare leading-dot `.84` (needs `0.84`), and — unlike the menu write path — there is NO
   server-side leading-dot canonicalization on the widget path, so a raw `.84` value would
   be DROPPED at render. FIX: canonicalize the free-text value ON COMMIT (blur/Enter),
   NOT on every keystroke — mirror the menu `ColorSwatchControl.commitDraft` pattern
   (519-02): on `onBlur`/Enter read the field, `const safe = normalizeAdminColorValue(draft)`;
   if `safe` emit `onChange(safe)` (rewrites `.84`→`0.84`); if the draft is unchanged or
   `normalizeAdminColorValue` returns `undefined` (unknown/unsafe) do NOT emit — the
   uncontrolled field simply keeps/reverts its text (add `key={value}` re-seed if needed).
   Keep the value shown live while typing (uncontrolled/`defaultValue` or a local draft),
   but the EMITTED value is always the render-safe canonical form. Do NOT loosen
   `resolveClearableCssColorValue`.
6. **State classification** — `describeSharedColorControlState` (`:51-124`) now
   returns `selected_swatch` for alpha values automatically (because L01 widened
   `isHexColorValue`/`isPickerRepresentableColorValue`). VERIFY via test; no code change
   needed here beyond confirming the `:109` branch is reached.
7. **Do NOT change** `'Use transparent'` (`:219-227` → `onChange("transparent")`),
   `onClear`/`ClearableFieldHeader`, the `showValueInput=false` label/description
   branch, or the `data-widget-control*` attributes.

## Data flow

`value` → `parseColorValue` → picker base + slider position + real-color preview. Edits
recompose via the L01 helpers → existing `onChange(next: string)`. Picker/slider edits
already emit canonical `#rrggbb(aa)` via `composeHexColor`; the free-text field
canonicalizes ON COMMIT through `normalizeAdminColorValue` (leading-dot `.84`→`0.84`) so
the EMITTED value is render-safe (a subset of BOTH the widget render boundary
`resolveClearableCssColorValue` AND `normalizeMenuColorValue`).

## Error handling / security

Slider clamped in 519-01; picker/slider emit whitelist-safe strings. The free-text path
now canonicalizes on commit via `normalizeAdminColorValue` (leading-dot `.84`→`0.84`) and
emits ONLY when the normalizer returns a defined (whitelist-safe) string — unknown/unsafe
input is not emitted (revert). This does NOT loosen `resolveClearableCssColorValue`; the
server/render normalize stays authoritative (defence in depth). No route/RBAC/schema/migration.

## Tests

Owned by **519-03-L03** (`tests/vitest/ui/shared-color-alpha.test.tsx`).
