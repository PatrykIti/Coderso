# TASK-519-02: Upgrade ColorSwatchControl (Menu/Page) to Author + Round-Trip Alpha

# FileName: TASK-519-02-ColorSwatchControl-Alpha-Upgrade.md

**Parent Task:** TASK-519
**Priority:** High
**Category:** Admin UI / Editor Controls (menu + page swatch) / Security (CSS-value validation)
**Estimated Effort:** Medium
**Dependencies:** 519-01 (imports `colorValue.ts`). No route/RBAC/schema/migration change.
**Status:** ⏳ To Do

---

## Scope (single-writer)

**Sole writer of `core/admin/ui/pages/editorControls/ColorSwatchControl.tsx`.** This
control backs the menu/page swatch usages (`MenuDesignEditor.tsx` :990/1000/1383/1526/
1622/1924/2193/2207/2221/2236 + `MenuAppearancePanel.tsx`). Upgrade it to author AND
round-trip alpha (`#rrggbbaa`, incl. `#0812209e`) via a base-color picker + an alpha
slider + an alpha-capable hex/rgba text field, WITHOUT losing the transparent swatch,
palette swatches, or token display.

**Leaves:**

| Leaf | Owns | Purpose |
|------|------|---------|
| 519-02-L01 | `core/admin/ui/pages/editorControls/ColorSwatchControl.tsx` | the control upgrade |
| 519-02-L02 | `tests/vitest/ui/color-swatch-alpha.test.tsx` (NEW) | alpha author/round-trip + regression tests |

**Land order within subtask:** L01 → L02.

## Current behavior to fix (grounded)

- `HEX_COLOR_PATTERN` (:33) 3/6-digit only → `commitHexDraft` (:86-94) **reverts**
  typed `#0812209e` (:93). → widen to accept 4/8-digit (delegate to
  `parseColorValue`/`normalizeAdminColorValue` from 519-01).
- `toSafeHexColor` (:38-46) clamps 8-digit to `#000000` for the native picker → use
  `pickerHexFor(parseColorValue(value))` so the picker shows the BASE color and the
  alpha is handled by the slider (HI-2: editing base keeps alpha).
- No alpha slider today → ADD one.
- Transparent swatch → `onChange(null)` (:99-117) — KEEP unchanged.
- Palette swatches (:118-140) — KEEP unchanged (a palette pick sets an opaque token;
  the alpha slider then applies over it).

## Security Contract

No route/RBAC/schema/migration. The control emits colors ONLY via
`composeHexColor`/`normalizeAdminColorValue` (519-01), whose output is a strict subset
of `resolveClearableCssColorValue`/`normalizeMenuColorValue` — so it cannot produce
`url(`/`expression(`/`javascript:`/`;{}<>`. `onChange(null)` (transparent/clear) is
preserved. Alpha clamped `[0,1]` inside 519-01. The server `normalizeMenuColorValue`
remains authoritative on write; nothing here weakens it.

## Pseudocode (519-02-L01)

```tsx
import { parseColorValue, composeHexColor, colorAlpha, pickerHexFor,
         normalizeAdminColorValue } from "../../../shared/colorValue";

// derive current state (value may be "", a token, hex8, rgba, or transparent-null upstream)
const parsed = parseColorValue(value);
const alpha  = colorAlpha(parsed);                 // slider position 0..1
const baseHex = pickerHexFor(parsed, "#000000");   // native picker base

// native <input type=color>: onChange sets BASE, KEEPS current alpha (HI-2)
onChange={(e) => onChange(composeHexColor(e.target.value, alpha))}

// NEW alpha slider (0..100 -> 0..1). Show only when parsed.kind is hex|rgb (representable);
// for token/keyword/unknown keep it disabled with a hint (mirrors ClearableFields ColorTokenHint).
<SliderControl label="Opacity" min={0} max={100} step={1}
  value={Math.round(alpha * 100)} disabled={disabled || !(parsed.kind==="hex"||parsed.kind==="rgb")}
  onChange={(pct) => onChange(composeHexColor(baseHex, pct / 100))} />
// (SliderControl exists at editorControls/SliderControl.tsx — reuse; do NOT hand-roll.)

// hex/rgba text field: widen commit to accept alpha formats via the shared normalizer.
const commitDraft = (input: HTMLInputElement) => {
  const draft = input.value.trim();
  if (draft === value) return;
  const safe = normalizeAdminColorValue(draft);    // accepts #rgba/#rrggbbaa/rgba()/hsla()/var/keyword
  if (safe) { onChange(safe); return; }
  input.value = value;                             // reject-unknown -> revert (unchanged behavior)
};
// placeholder becomes "#rrggbbaa" and the field width widens (w-28) to fit 8 digits.
```

**Transparent + palette blocks unchanged** — only the custom-color block (picker + new
slider + widened text) changes. The `key={value}` on the text `<input>` (:155) stays so
external value changes re-seed the uncontrolled field.

## Test shape (519-02-L02 — Vitest admin/UI lane)

`tests/vitest/ui/color-swatch-alpha.test.tsx` (NEW; render via `createRoot` from
`react-dom/client` — NOT `@testing-library/react`, which is not a repo dependency —
`vitest`, mirrors `tests/vitest/ui/page-editor-control-primitives.test.tsx`; import the
control RELATIVELY, `../../../core/admin/ui/pages/editorControls/ColorSwatchControl`):

- **round-trip display (HI-1):** render `value="#0812209e"` → hex text field shows
  `#0812209e`; native picker `value` === `#081220`; opacity slider ≈ 62.
- **author alpha via slider (HI-2):** with `value="#081220"`, move slider to 50 →
  `onChange` called with `#08122080` (base preserved, alpha applied).
- **edit base keeps alpha (HI-2):** with `value="#0812209e"`, fire picker change to
  `#112233` → `onChange` with `#1122339e` (alpha preserved).
- **type rgba (canonicalized):** type `rgba(8,17,31,.84)` + blur →
  `onChange("rgba(8,17,31,0.84)")` (the leading-dot alpha is canonicalized to render-safe
  `0.84` by `normalizeAdminColorValue`; matches leaf 519-02-L02 and the 519-01 render-boundary
  contract — raw `.84` is dropped by `resolveClearableCssColorValue`).
- **reject-unknown:** type `url(x)` + blur → NO `onChange`; field reverts to prior.
- **transparent preserved (HI-3):** click transparent swatch → `onChange(null)`.
- **palette + token preserved (HI-3):** palette pick → opaque token onChange; a
  `var(--color-*)` value shows the raw text and the slider disabled with a hint.

Also EXTEND `tests/vitest/ui/menu-design-editor.test.tsx` only if the existing tests
assert the old 6-digit-only behavior (regression guard) — but that file is NOT owned by
this leaf; coordinate as an additive assertion (a menu color authored with alpha
persists). If it conflicts with the single-writer rule, put the assertion in the NEW
`color-swatch-alpha.test.tsx` instead.

## Acceptance (this subtask)

`ColorSwatchControl` authors + round-trips alpha with a slider; transparent/palette/
token UX intact; gates green (root `tsc` + `bun --cwd core lint:types`, since a prop or
internal change here can surface an excess-prop error in tests outside `core/`).
