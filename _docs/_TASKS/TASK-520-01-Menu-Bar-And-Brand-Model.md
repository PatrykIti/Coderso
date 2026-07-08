# TASK-520-01: Menu-Bar & Brand MODEL — Scrolled Variants, Radius, Custom Shadow, Icon & Combo

# FileName: TASK-520-01-Menu-Bar-And-Brand-Model.md

**Parent Task:** TASK-520
**Priority:** High
**Category:** Services / Schema (JSON model) / Navigation
**Estimated Effort:** Medium
**Dependencies:** TASK-499 (`menuDocumentV2` + `MenuDocumentError`), TASK-501 (per-device `responsive`), TASK-504/506/508 (`BrandStyle`, `NavChromeStyle`, `NAV_CHROME_DEFAULTS`, `resolveMenuControlDefault`). No dependency on TASK-519 (schema already accepts alpha colors).
**Status:** ✅ Done

---

## Scope (single-writer keystone)

**520-01 is the SOLE WRITER of `core/services/menus/menuDocumentV2.ts`.** It is
the model keystone: types, reject-unknown allowlists, value normalizers, and the two
NEW security-critical validators (custom box-shadow, brand icon name). The new bar
keys are held OUT of `MENU_BAR_LAYOUT_KEYS`/`SHELL_APPEARANCE_DEFAULTS`, so this
subtask adds NO resolver default-hint entries for them — they are present-only with
no seeded resolution default (see §Resolver default hints). **Nothing renders these yet**
— CSS emission (520-02), admin controls (520-03), and front render (520-04) all
consume this file and MUST land in the strict order per the parent. This subtask
makes ZERO edits to `menuDocumentCss.ts`, `siteShell.tsx`, `MenuDesignEditor.tsx`,
`normalizeMenuAppearance.ts`, or `siteShellCss.ts`.

**Intra-subtask leaf seam (additive, DISJOINT symbol regions, strict order):**
this subtask is decomposed into three executable leaves that edit the same file
in disjoint regions and strict sequence — there is no other single-writer for the
file, so this intra-subtask ordering is the additive seam:

- **520-01-L01** — menu-bar layout region (`MENU_BAR_LAYOUT_KEYS` sibling
  `MENU_BAR_EXTRA_KEYS`, `MenuBarLayout` intersection extension, `radius` +
  scrolled color/width/shadow-enum keys, the `normalizeMenuBarLayout` split, local
  number ranges). Lands first.
- **520-01-L02** — the `normalizeMenuBoxShadowValue` validator (security-critical
  CSS-value whitelist) + wiring `shadowCustom`/`shadowCustomScrolled` into the
  L01 bar-extra normalizer. Lands after L01 (consumes its key list).
- **520-01-L03** — brand region (`BrandProps` `mode:"icon"` + `icon`/`showText`,
  `BrandStyle` `iconColor`/`iconSize`, the `normalizeBrandIconName` validator,
  `BRAND_PROP_KEYS`/`BRAND_STYLE_KEYS`/`BRAND_STYLE_NUMBER_RANGES` extensions,
  `normalizeBrandProps` changes). Disjoint from L01/L02; lands last within 520-01.

## Security Contract

**Schema-first JSON-model extension; NO new route/RBAC/endpoint/migration; NO
`MENU_DOCUMENT_SCHEMA_VERSION` bump** (`:91` stays `1`). All normalizers live in
this file and run inside the existing validated `PATCH /menus/:id` `document`
write path. Reject-unknown at the KEY boundary (`MenuDocumentError(path.key)`);
VALUES fail-soft (invalid → omitted; never throws; raw input never reaches CSS).
The three attacker-influenceable surfaces:
- **Colors** (`surfaceColorScrolled`, `borderColorScrolled`, `iconColor`) →
  `normalizeMenuColorValue` (exported `normalizeMenuAppearance.ts:182`; pattern
  `:152-165` — token/hex/hex8/rgba/hsla/`var()`/`transparent` whitelist; rejects
  everything else). Alpha
  is first-class.
- **Custom box-shadow** (`shadowCustom`, `shadowCustomScrolled`) → the NEW
  `normalizeMenuBoxShadowValue` (520-01-L02): bounded grammar (optional `inset`,
  ≤4 lengths, ONE `normalizeMenuColorValue`-validated color, ≤4 comma layers,
  total ≤200 chars); rejects `url(`/`expression(`/`javascript:`/`{`/`}`/`;`/`<`/
  `>`/`@`/`/*`/backslash. Fail-soft omit.
- **Brand icon name** (`icon`) → `normalizeBrandIconName` (520-01-L03): pattern
  `^[a-z0-9-]{1,64}$`, fail-soft omit; the RENDER (520-04) resolves it against
  the lucide set (the effective allowlist).
Each new key that joins a reject-unknown allowlist is a **fail-closed READ TRAP**
⇒ carries a round-trip persistence test.

## What this subtask ships (grounded, anchors verified 2026-07-07)

Verified anchors in `menuDocumentV2.ts` (2528 lines): `MENU_DOCUMENT_SCHEMA_VERSION`
@91; `MENU_BAR_LAYOUT_KEYS` @114-123; `MenuBarLayout = Pick<…>` @145; `BrandStyle`
@158-168; `BrandProps` @298-312; `pickAppearance` @399-407; `normalizeAppearanceSubset`
@421-443; `normalizeMenuBarLayout` @445-446; `MENU_BRAND_TEXT_MAX_LENGTH` @622;
`BRAND_PROP_KEYS` @628; `BRAND_STYLE_KEYS` @632; `BRAND_STYLE_NUMBER_RANGES`
@689-694; `NAV_CHROME_DEFAULTS` @745; `clampLocalNumber` @792; `normalizeEnumLocal`
@797; `normalizeBrandStyle` @807-838; `normalizeBrandProps` @1044-1091;
`resolveMenuSectionAppearanceForDevice` @1528-1557. Enum import
`menuAppearanceShadows` @19, `normalizeMenuColorValue` @22.

See the three leaf files for execution-ready pseudocode. This subtask file is the
authoritative TYPE + allowlist + invariant contract; the leaves carry the
per-region code + test shapes.

### Type contract (authoritative shapes)

```ts
// L01 — menu-bar layout (intersection extension; the extra keys are NOT MenuAppearance keys):
export type MenuBarLayout = Pick<MenuAppearance, (typeof MENU_BAR_LAYOUT_KEYS)[number]> & {
  radius?: number;                 // 0..40
  shadowCustom?: string;           // validated box-shadow (L02); overrides `shadow` at emit
  surfaceColorScrolled?: string;   // normalizeMenuColorValue
  borderColorScrolled?: string;    // normalizeMenuColorValue
  borderWidthScrolled?: number;    // clamp via menuAppearanceNumberRanges.borderWidth [0,8]
  shadowScrolled?: MenuAppearanceShadow;  // none|sm|md
  shadowCustomScrolled?: string;   // validated box-shadow (L02); overrides shadowScrolled
};
const MENU_BAR_EXTRA_KEYS = [
  "radius", "shadowCustom",
  "surfaceColorScrolled", "borderColorScrolled", "borderWidthScrolled",
  "shadowScrolled", "shadowCustomScrolled",
] as const;
export const MENU_BAR_LAYOUT_NUMBER_RANGES = { radius: { min: 0, max: 40 } } as const;

// L03 — brand:
export type BrandProps = {
  mode: "text" | "image" | "icon";
  href: string;
  image?: Record<string, unknown>;
  text?: string;
  icon?: string;                   // normalizeBrandIconName (pattern; render-time allowlist)
  showText?: boolean;              // combo graphic+text
  style?: BrandStyle;
};
export type BrandStyle = { /* …existing… */ iconColor?: string; iconSize?: number };
```

### `normalizeMenuBarLayout` split (L01, uses L02's validator)

```ts
// BEFORE: normalizeMenuBarLayout delegated wholly to normalizeAppearanceSubset (@445-446),
// which reject-throws any key outside MENU_BAR_LAYOUT_KEYS. AFTER (split):
const normalizeMenuBarLayout = (value: unknown, path: string): MenuBarLayout => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  // reject-unknown over the UNION of appearance-subset ∪ extra keys:
  const allowed = new Set<string>([...MENU_BAR_LAYOUT_KEYS, ...MENU_BAR_EXTRA_KEYS]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new MenuDocumentError(`${path}.${key}`);
  }
  // 1) appearance subset via the strict subset normalizer (over the appearance keys ONLY —
  //    pick a value object containing only those keys so normalizeAppearanceSubset's own
  //    reject-unknown does not choke on the extra keys):
  const appearanceInput: Record<string, unknown> = {};
  for (const k of MENU_BAR_LAYOUT_KEYS) if (k in value) appearanceInput[k] = value[k];
  const base = normalizeAppearanceSubset(appearanceInput, MENU_BAR_LAYOUT_KEYS, path) as MenuBarLayout;
  // 2) extra keys via local fail-soft normalizers (present-only assign):
  const out: MenuBarLayout = { ...base };
  const num = (k: "radius", range: {min:number;max:number}) => {
    const v = clampLocalNumber(range, (value as any)[k]); if (v !== null) out[k] = v;
  };
  if (value.radius != null) num("radius", MENU_BAR_LAYOUT_NUMBER_RANGES.radius);
  if (value.borderWidthScrolled != null) {
    const v = clampLocalNumber(menuAppearanceNumberRanges.borderWidth, value.borderWidthScrolled);
    if (v !== null) out.borderWidthScrolled = v;
  }
  const col = (k: "surfaceColorScrolled" | "borderColorScrolled") => {
    const c = normalizeMenuColorValue((value as any)[k]); if (c !== null) out[k] = c;
  };
  if (value.surfaceColorScrolled != null) col("surfaceColorScrolled");
  if (value.borderColorScrolled != null) col("borderColorScrolled");
  if (value.shadowScrolled != null) {
    const s = normalizeEnumLocal(menuAppearanceShadows, value.shadowScrolled); if (s !== null) out.shadowScrolled = s;
  }
  if (value.shadowCustom != null) {                          // L02 validator
    const sh = normalizeMenuBoxShadowValue(value.shadowCustom); if (sh !== null) out.shadowCustom = sh;
  }
  if (value.shadowCustomScrolled != null) {
    const sh = normalizeMenuBoxShadowValue(value.shadowCustomScrolled); if (sh !== null) out.shadowCustomScrolled = sh;
  }
  return out;                                                // present-only; empties simply absent
};
```

> `menuAppearanceNumberRanges` is already imported (`@23`). `normalizeMenuBarLayout`
> is called both at `@506` (section normalize) and `@1304`; both paths inherit the
> split transparently. `resolveMenuSectionAppearanceForDevice` (@1555) already
> spreads `{ ...section.layout, ...(override?.layout ?? {}) }` so the extra keys
> flow per-device with ZERO edit here.

### Resolver default hints (for 520-03 `ControlDefaultHint`) — PRESENT-ONLY, NO seeded default

The new bar controls are **present-only with NO seeded resolution default** (AGENTS.md
present-only rule). By Hard Invariant #1 they are deliberately held OUT of
`MENU_BAR_LAYOUT_KEYS` and OUT of `SHELL_APPEARANCE_DEFAULTS`, so there is NO
resolver path that can surface a numeric/enum default for them, and NONE is added:
- The menu-bar controls resolve at **level `"base"`** (section-scoped layout), i.e.
  via `resolveBaseKeyThemeDefault` (`menuDocumentV2.ts:2329`), NOT `resolveNavKeyThemeDefault`
  (that is the level-0 nav-link cascade — its `radius`/`paddingX` entries are the
  nav-LINK radius, unrelated to the menu-bar card `radius`). For a key that is not
  in `MENU_BAR_LAYOUT_KEYS` (`isMenuLayoutKey` false) and not in
  `SHELL_APPEARANCE_DEFAULTS`, `resolveBaseKeyThemeDefault` returns
  `{ value: undefined, sourceLabel: "Not set" }`.
- Therefore `resolveMenuControlDefault(section,"base",…)` returns `value===undefined`
  for **every** new key (`radius`, `borderWidthScrolled`, `shadowScrolled`,
  `surfaceColorScrolled`, `borderColorScrolled`, `shadowCustom`, `shadowCustomScrolled`),
  and the 507 `ControlDefaultHint` guard (`value===undefined ⇒ return null`,
  `MenuDesignEditor.tsx:625`) HIDES the hint. This is the CORRECT behavior — do NOT
  invent a resolver-default path for keys held out of `MENU_BAR_LAYOUT_KEYS`, and do
  NOT add them to `SHELL_APPEARANCE_DEFAULTS` (that would break `buildSiteShellCss(null)`
  byte-identity, Hard Invariant #1).
- 520-03 surfaces guidance for these controls as **static helper text** (e.g.
  "inherits the base surface/border/shadow when unset") — plain copy in the control,
  NOT a `ControlDefaultHint` value. If a specific control genuinely needs a literal
  "Off"/"None" affordance it is rendered as static UI text by 520-03, NOT routed
  through `resolveMenuControlDefault`.
- `brand.showText` default `false`; `mode:"icon"` has no lucide default → picker
  placeholder only.

## Regression-test shape (this subtask's Vitest additions; full matrix in 520-05)

`tests/vitest/services/menu-document-v2.test.ts` (Bun-free, pure model):

1. **Fail-closed READ-trap round-trip per new key.** Write a menu-bar section
   `layout` carrying `radius:18`, `surfaceColorScrolled:"rgba(8,17,31,.84)"`,
   `borderColorScrolled:"#ffffff2e"`, `borderWidthScrolled:2`, `shadowScrolled:"md"`,
   `shadowCustom:"0 18px 50px rgba(0,0,0,.24)"`, `shadowCustomScrolled:"0 8px 24px
   rgba(0,0,0,.3)"` → `normalizeMenuDocumentV2` → re-read equals input. Brand:
   `mode:"icon"`, `icon:"house"`, `showText:true`, `style.iconColor:"#f7fbffcc"`,
   `style.iconSize:28` → round-trips.
2. **Reject-unknown KEY throws.** Unknown key on `layout` (e.g. `bogus`) and on
   brand props throws `MenuDocumentError` with the offending `path`.
3. **Fail-soft VALUE omit.** `radius:"huge"`, `shadowScrolled:"xl"`,
   `surfaceColorScrolled:"url(x)"`, `shadowCustom:"0 0 10px red;}body{}"`,
   `icon:"../../x"` are all OMITTED; sibling keys survive; no throw.
4. **Present-only / byte-identity.** A menu-bar `layout` with NO new keys
   normalizes byte-unchanged; an empty extra-key set adds no keys.
5. **No schemaVersion bump.** Output `schemaVersion === 1`.
6. **Per-device.** A `responsive.mobile.layout.radius` override survives round-trip
   and `resolveMenuSectionAppearanceForDevice(section,"mobile").layout.radius`
   reflects it (device merge).

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

- **Vitest (Bun-free, pure model):** the 6 cases above +
  `normalizeMenuBoxShadowValue` unit table (520-01-L02) + `normalizeBrandIconName`
  unit table (520-01-L03).
- **Bun route lane (asserted at 520-05, write path is this subtask's target):**
  `tests/integration/routes/menus.test.ts` — a `document` PATCH carrying the new
  keys persists per-key without dropping siblings; invalid payload 4xx's with
  `menu_document_invalid` + `path`.
- **Byte-identity guards (asserted 520-02/05):** `tests/unit/pages/siteShellCss.test.ts`
  ZERO edits; no-override menu-document render byte-identical.

## Hard Invariants (owned by this subtask)

1. New bar-extra keys are NOT `MenuAppearance` members → out of
   `SHELL_APPEARANCE_DEFAULTS`; `siteShellCss.ts` / `normalizeMenuAppearance.ts`
   untouched (`buildSiteShellCss(null)` byte-identical).
2. Each new key → its reject-unknown allowlist + exactly one value normalizer +
   round-trip test (fail-closed READ trap).
3. No `MENU_DOCUMENT_SCHEMA_VERSION` bump; no route/RBAC/endpoint/migration.
4. Present-only: unset keys emit no bytes; legacy docs byte-identical.
5. Back-compat brand: unset `showText` = exclusive text-XOR-image; `mode:"icon"`
   with absent/invalid icon falls through the text/site-name chain at render.

## Documentation Updates Required (authored at 520-05 closure)

`_docs/PAGE_MODEL.md` (MenuBarLayout new keys + BrandProps `icon`/`showText` +
BrandStyle icon fields), `_docs/CONTENT_TYPES_SPEC.md` (scrolled-state colors,
radius, custom shadow, brand icon/combo — enums, present-only, per-device).
