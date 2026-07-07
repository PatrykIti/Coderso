# TASK-520-01-L01: Menu-Bar Layout — Scrolled Variants, Card Radius & Border-Width-Scrolled Keys

# FileName: TASK-520-01-L01-Menu-Bar-Scrolled-Variants-And-Radius.md

**Parent Subtask:** TASK-520-01
**Priority:** High
**Category:** Services / Schema (JSON model)
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the **menu-bar layout region** of
`core/services/menus/menuDocumentV2.ts` (sole owner 520-01; disjoint from L02's
box-shadow validator helper region and L03's brand region). Lands FIRST within
520-01. Ships the `MenuBarLayout` intersection extension, the
`MENU_BAR_EXTRA_KEYS` allowlist, the local `MENU_BAR_LAYOUT_NUMBER_RANGES`, and
the `normalizeMenuBarLayout` split — WITHOUT the two `shadowCustom*` keys' value
validator (that is L02; this leaf leaves a `// L02:` seam comment where the
`normalizeMenuBoxShadowValue` calls slot in).

## Grounded anchors

`MENU_BAR_LAYOUT_KEYS` @114-123; `MenuBarLayout = Pick<…>` @145;
`normalizeAppearanceSubset` @421-443; `normalizeMenuBarLayout` @445-446 (called
@506 + @1304); `clampLocalNumber` @792; `normalizeEnumLocal` @797;
`menuAppearanceNumberRanges` import @23; `menuAppearanceShadows` import @19;
`normalizeMenuColorValue` import @22; `MenuAppearanceShadow` type @26.

## Implementation pseudocode

```ts
// 1) Type + allowlist (sibling of MENU_BAR_LAYOUT_KEYS @123):
const MENU_BAR_EXTRA_KEYS = [
  "radius",
  "shadowCustom",
  "surfaceColorScrolled",
  "borderColorScrolled",
  "borderWidthScrolled",
  "shadowScrolled",
  "shadowCustomScrolled",
] as const;
export const MENU_BAR_LAYOUT_NUMBER_RANGES = { radius: { min: 0, max: 40 } } as const;

// MenuBarLayout (@145) becomes an intersection (the extra keys are NOT MenuAppearance keys —
// they intentionally do NOT satisfy keyof MenuAppearance, so keep MENU_BAR_LAYOUT_KEYS's
// `satisfies readonly (keyof MenuAppearance)[]` on the APPEARANCE list only):
export type MenuBarLayout = Pick<MenuAppearance, (typeof MENU_BAR_LAYOUT_KEYS)[number]> & {
  radius?: number;
  shadowCustom?: string;            // value validated in L02
  surfaceColorScrolled?: string;
  borderColorScrolled?: string;
  borderWidthScrolled?: number;
  shadowScrolled?: MenuAppearanceShadow;
  shadowCustomScrolled?: string;    // value validated in L02
};

// 2) Split normalizeMenuBarLayout (replace @445-446):
const normalizeMenuBarLayout = (value: unknown, path: string): MenuBarLayout => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const allowed = new Set<string>([...MENU_BAR_LAYOUT_KEYS, ...MENU_BAR_EXTRA_KEYS]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new MenuDocumentError(`${path}.${key}`);   // reject-unknown
  }
  const appearanceInput: Record<string, unknown> = {};
  for (const k of MENU_BAR_LAYOUT_KEYS) if (k in (value as object)) appearanceInput[k] = (value as any)[k];
  const out: MenuBarLayout = {
    ...(normalizeAppearanceSubset(appearanceInput, MENU_BAR_LAYOUT_KEYS, path) as MenuBarLayout),
  };
  const v = value as Record<string, unknown>;
  if (v.radius != null) {
    const n = clampLocalNumber(MENU_BAR_LAYOUT_NUMBER_RANGES.radius, v.radius);
    if (n !== null) out.radius = n;
  }
  if (v.borderWidthScrolled != null) {
    const n = clampLocalNumber(menuAppearanceNumberRanges.borderWidth, v.borderWidthScrolled);
    if (n !== null) out.borderWidthScrolled = n;
  }
  if (v.surfaceColorScrolled != null) {
    const c = normalizeMenuColorValue(v.surfaceColorScrolled); if (c !== null) out.surfaceColorScrolled = c;
  }
  if (v.borderColorScrolled != null) {
    const c = normalizeMenuColorValue(v.borderColorScrolled); if (c !== null) out.borderColorScrolled = c;
  }
  if (v.shadowScrolled != null) {
    const s = normalizeEnumLocal(menuAppearanceShadows, v.shadowScrolled); if (s !== null) out.shadowScrolled = s;
  }
  // L02 SEAM (leaf L02 fills these two branches with normalizeMenuBoxShadowValue):
  // if (v.shadowCustom != null) { const sh = normalizeMenuBoxShadowValue(v.shadowCustom); if (sh !== null) out.shadowCustom = sh; }
  // if (v.shadowCustomScrolled != null) { const sh = normalizeMenuBoxShadowValue(v.shadowCustomScrolled); if (sh !== null) out.shadowCustomScrolled = sh; }
  return out;
};
```

### Widen the section base-value helper param types (same file, admin consumers need it)

The four section layout-group accessors 520-03's `MenuBarPanel` uses to
detect/reset the extra controls are typed `key: keyof MenuAppearance` but
read/write `section.layout[key]` (or the override record) generically at runtime:
`readMenuSectionBaseValue` (@2197-2212), `clearMenuSectionBase` (@2146-2155),
`readMenuSectionOverrideValue` (@1561-1571), `clearMenuSectionOverride`
(@1648-1662). The new extra bar keys are `keyof MenuBarLayout` but NOT
`keyof MenuAppearance`, so 520-03 would need unsafe casts. Since 520-01 owns THIS
file, widen the `key` param on all four additively so 520-03 stays cast-free:

```ts
// widen the key param on all four helpers (additive; the scalar/navProps branch still
// accepts the nav-items MenuAppearance keys, the layout branch now also accepts the extra keys):
key: keyof MenuAppearance | keyof MenuBarLayout
```

This is a type-only widening (runtime unchanged — all four already read/write by
property name), so it does NOT alter any existing call site or emit.
`setLayoutField` (admin file @876, generic `K extends keyof MenuBarLayout`) and
`patchMenuSectionForDevice` (@1588, `patch: MenuBarLayout | NavItemsProps`)
already accept the extra keys — no change needed there.

**Error handling:** structural (non-object) throws `MenuDocumentError(path)`;
unknown key throws `MenuDocumentError(path.key)`; bad VALUE fails soft (omit),
never throws. `normalizeAppearanceSubset` over the appearance-only `appearanceInput`
can never see an extra key (they were filtered out), so its own reject-unknown
does not false-positive.

## Regression-test shape (Vitest, Bun-free — `tests/vitest/services/menu-document-v2.test.ts`)

- **Round-trip** a `layout` with `radius:18`, `surfaceColorScrolled:"rgba(8,17,31,.84)"`,
  `borderColorScrolled:"#ffffff2e"`, `borderWidthScrolled:2`, `shadowScrolled:"md"`
  → re-read equals input (the `shadowCustom*` half is proven in L02's test once L02
  fills the seam).
- **Reject-unknown:** `layout:{ bogus:1 }` throws `MenuDocumentError` with path
  `…layout.bogus`.
- **Fail-soft:** `radius:"x"`, `shadowScrolled:"xl"`, `surfaceColorScrolled:"url(x)"`,
  `borderWidthScrolled:999` (clamped to 8, NOT omitted) → invalid enum/color omitted,
  `radius` omitted, `borderWidthScrolled === 8`; siblings survive.
- **Present-only:** a `layout` with only appearance keys is byte-identical to
  pre-520 (no extra keys added).
- **Per-device:** `responsive.mobile.layout.radius:8` round-trips and
  `resolveMenuSectionAppearanceForDevice(section,"mobile").layout.radius === 8`.

## Hard Invariants

- Extra keys never join `MenuAppearance`/`MENU_BAR_LAYOUT_KEYS` (keep the
  appearance list's `satisfies keyof MenuAppearance` intact).
- No schemaVersion bump; present-only; legacy byte-identical.
- Leaves a clean L02 seam; DOES NOT define `normalizeMenuBoxShadowValue`.
