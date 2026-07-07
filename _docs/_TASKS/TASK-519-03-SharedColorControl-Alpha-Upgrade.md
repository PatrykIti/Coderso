# TASK-519-03: Upgrade SharedColorControl + ClearableFields (Widgets) to Author + Round-Trip Alpha

# FileName: TASK-519-03-SharedColorControl-Alpha-Upgrade.md

**Parent Task:** TASK-519
**Priority:** High
**Category:** Admin UI / Editor Controls (widget editors) / Security (CSS-value validation)
**Estimated Effort:** Medium
**Dependencies:** 519-01 (imports `colorValue.ts`). No route/RBAC/schema/migration change.
**Status:** ⏳ To Do

---

## Scope (single-writer; two owned files, one leaf each)

**Sole writer of `core/admin/ui/widgets/editors/ClearableFields.tsx` AND
`core/admin/ui/widgets/editors/SharedColorControl.tsx`** (these back the 27 widget
editors that consume `SharedColorControl`). Upgrade the widget color control to author
AND round-trip alpha (fix the alpha-losing helpers, add an alpha slider, show the true
swatch), without losing transparent / theme-token / clear UX.

**Leaves (single-writer per file; ClearableFields lands first as the helper seam):**

| Leaf | Owns | Purpose |
|------|------|---------|
| 519-03-L01 | `core/admin/ui/widgets/editors/ClearableFields.tsx` | fix alpha-losing helpers + shared inputs |
| 519-03-L02 | `core/admin/ui/widgets/editors/SharedColorControl.tsx` | add alpha slider + true swatch + state classification |
| 519-03-L03 | `tests/vitest/ui/clearable-fields-alpha.test.tsx` + `tests/vitest/ui/shared-color-alpha.test.tsx` (NEW); PLUS the alpha-behavior assertions of EXISTING `tests/vitest/ui/clearable-fields.test.tsx` + `tests/vitest/ui/shared-color-control.test.tsx` | alpha author/round-trip + regression tests, AND re-baseline the 4 legacy alpha assertions to the new intended behavior |

**Land order within subtask:** L01 (ClearableFields helpers) → L02 (SharedColorControl
consumes them) → L03 (tests). L01 lands first because `SharedColorControl` imports
`isPickerRepresentableColorValue`/`resolveColorSwatchValue` from `ClearableFields`
(`SharedColorControl.tsx:3-8`).

## Current behavior to fix (grounded)

- `resolveColorPickerValue` (`ClearableFields.tsx:18-30`) DISCARDS alpha (:27 returns
  fallback when rgba has alpha) and has NO hex8 branch → an alpha value shows the picker
  as the fallback.
- `isPickerRepresentableColorValue` (:36-45) returns `false` for rgba-with-alpha (:44)
  → `applySharedColorPickerChange` (:47-66) refuses to overwrite via picker; the value
  gets stuck.
- `hexColorPattern` (:10) 3/6-digit only; `isHexColorValue` (:14-16) rejects hex8.
- `SharedColorControl` has NO alpha slider; `swatchColor = resolveColorSwatchValue(value,
  pickerFallback)` (:178) shows the fallback (wrong) for alpha values;
  `describeSharedColorControlState` (:109-116) classifies an alpha value as
  `saved_custom` instead of `selected_swatch`.
- KEEP: `'Use transparent'` → `onChange("transparent")` (:219-227); `onClear`;
  theme-token display; `ColorTokenHint` (:277-287); `resolveColorContrastAdvisory`
  (already alpha-aware — `parseColor` reads alpha :114 — leave it).

## Security Contract

No route/RBAC/schema/migration. `SharedColorControl` continues to store raw strings via
`onChange`; the widget-side write normalizer (`resolveClearableCssColorValue` /
`resolveClearableStyleValue`, e.g. `navigation.tsx:15-16`) stays authoritative and
already accepts alpha. New picker/slider edits emit via `composeHexColor` (519-01),
structurally incapable of unsafe CSS. The free-text field still accepts any string (as
today) — the server normalize drops unsafe values on write, unchanged. No boundary is
weakened.

## Pseudocode

### 519-03-L01 — `ClearableFields.tsx` (fix helpers; keep API stable)

```ts
import { parseColorValue, colorAlpha, pickerHexFor, isAlphaPickerRepresentable,
         composeHexColor } from "../../../shared/colorValue";

// widen recognition (used by describeSharedColorControlState & swatch preview)
export function isHexColorValue(v?: string) {                 // now accepts 4/8-digit too
  return typeof v === "string" && /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v);
}

// picker BASE color now round-trips alpha values (returns baseHex, not fallback)
export function resolveColorPickerValue(value: string | undefined, fallback: string) {
  return pickerHexFor(parseColorValue(value), fallback);       // hex8/rgba -> base; token -> fallback
}
export function resolveColorSwatchValue(value: string | undefined, fallback?: string) {
  return resolveColorPickerValue(value, fallback ?? "#000000");
}

// FIX: alpha values ARE representable now (slider handles alpha)
export function isPickerRepresentableColorValue(value?: string) {
  return isAlphaPickerRepresentable(value);                    // true for hex/rgb kinds incl. alpha
}

// picker change now composes base+currentAlpha (preserve alpha — HI-2)
export function applySharedColorPickerChange({ currentValue, nextValue, onChange, onPickerChange }) {
  if (onPickerChange) { onPickerChange(nextValue); return; }
  const alpha = colorAlpha(parseColorValue(currentValue));     // keep current alpha
  onChange(alpha < 1 ? composeHexColor(nextValue, alpha) : nextValue);
}

// NEW: slider change helper (compose base + new alpha)
export function applySharedColorAlphaChange({ currentValue, alphaPct, onChange }) {
  const base = pickerHexFor(parseColorValue(currentValue), "#000000");
  onChange(composeHexColor(base, alphaPct / 100));
}
// SharedColorFieldInputs (:311-360) unchanged in signature; it already renders picker+text.
// (Optionally thread an alpha slider through it, but SharedColorControl owns its own layout —
//  keep the slider in L02 to avoid double-owning the swatch column.)
```

### 519-03-L02 — `SharedColorControl.tsx` (add alpha slider + true swatch)

```tsx
import { parseColorValue, colorAlpha, isAlphaPickerRepresentable } from "../../../shared/colorValue";
import { applySharedColorPickerChange, applySharedColorAlphaChange } from "./ClearableFields";

const parsed = parseColorValue(value);
const representable = isAlphaPickerRepresentable(value);
const swatchColor = value ?? pickerFallback;   // show the REAL color (incl. alpha) as preview when representable
// picker onChange -> applySharedColorPickerChange (now alpha-preserving)
handleSwatchChange -> keep, but route through applySharedColorPickerChange so alpha survives.

// NEW alpha slider (in the value column, under the text Input), shown when representable:
{showValueInput && representable ? (
  <Slider label="Opacity" min={0} max={100}
    value={Math.round(colorAlpha(parsed) * 100)}
    onChange={(pct) => applySharedColorAlphaChange({ currentValue: value, alphaPct: pct, onChange })} />
) : null}
// describeSharedColorControlState already routes hex/representable -> "selected_swatch"
// once isHexColorValue/isPickerRepresentableColorValue accept alpha (fixed in L01) — VERIFY in test.
```

`'Use transparent'` (:219-227), `onClear`, theme-token/`ColorTokenHint`, and
`showValueInput=false` preview branch stay intact.

## Test shape (519-03-L03 — Vitest admin/UI + pure)

- `tests/vitest/ui/clearable-fields-alpha.test.tsx` (NEW): unit tests for the fixed
  helpers — `resolveColorPickerValue("#0812209e") === "#081220"`;
  `resolveColorPickerValue("rgba(8,17,31,.84)") === "#08111f"`;
  `isPickerRepresentableColorValue("rgba(8,17,31,.84)") === true`;
  `isHexColorValue("#0812209e") === true`; `applySharedColorPickerChange` preserves
  alpha (base `#112233` + current `#0812209e` → `onChange("#1122339e")`);
  `applySharedColorAlphaChange` (base `#081220` + 50 → `#08122080`).
- `tests/vitest/ui/shared-color-alpha.test.tsx` (NEW): render `SharedColorControl` with
  `value="#0812209e"` → swatch preview backgroundColor is the real color (not fallback);
  opacity slider ≈ 62; `data-shared-color-state` (or state label) === `selected_swatch`;
  slider change to 50 → `onChange("#08122080")`; `'Use transparent'` → `onChange("transparent")`;
  token value keeps `theme_token` classification + hint + disabled slider; `onClear` fires.

The EXISTING `tests/vitest/ui/clearable-fields.test.tsx` and
`tests/vitest/ui/shared-color-control.test.tsx` DO assert the old alpha-dropping behavior
(4 assertions). Because L01 makes that behavior an INTENDED contract change, 519-03-L03 is
assigned sole ownership of re-baselining exactly those 4 assertions to the new correct
values (see 519-03-L03 for the precise old→new list). This keeps single-writer coherent
(only L03 writes those two files) and keeps the full-vitest gate green.

## Acceptance (this subtask)

Widget color control authors + round-trips alpha with a slider + true swatch preview;
transparent/token/clear intact; gates green (root `tsc` + `bun --cwd core lint:types`).
