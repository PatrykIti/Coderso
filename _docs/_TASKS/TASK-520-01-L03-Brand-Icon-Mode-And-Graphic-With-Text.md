# TASK-520-01-L03: Brand Model — Icon Mode, Icon Style & Graphic-With-Text Combo

# FileName: TASK-520-01-L03-Brand-Icon-Mode-And-Graphic-With-Text.md

**Parent Subtask:** TASK-520-01
**Priority:** High
**Category:** Services / Schema (JSON model) / Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the **brand region** of
`core/services/menus/menuDocumentV2.ts` (sole owner 520-01; disjoint from L01/L02).
Lands last within 520-01. Ships: `BrandProps.mode` gains `"icon"`; new
`icon?`/`showText?` on `BrandProps`; new `iconColor?`/`iconSize?` on `BrandStyle`;
the `normalizeBrandIconName` validator; allowlist + range extensions;
`normalizeBrandProps`/`normalizeBrandStyle` wiring. Model only — the icon
allowlist is ENFORCED at render (520-04) by resolving against `lucideKebabIconComponents`.

## Grounded anchors

`BrandStyle` @158-168; `BrandProps` @298-312; `MENU_BRAND_TEXT_MAX_LENGTH` @622;
`BRAND_PROP_KEYS = ["mode","href","image","text","style"]` @628; `BRAND_STYLE_KEYS`
@632; `BRAND_STYLE_NUMBER_RANGES` @689-694; `normalizeBrandStyle` @807-838
(`clampLocalNumber`/`normalizeEnumLocal`/`normalizeMenuColorValue` already used);
`normalizeBrandProps` @1044-1091 (`mode` guard @1057; `BRAND_PROP_KEYS`
reject-unknown @1051; `text` handling @1076-1081); `resolveBrandImageSrc` @1039.

## Implementation pseudocode

```ts
// 1) Icon-name validator (sibling of normalizeBrandStyle; pattern-only, fail-soft):
const BRAND_ICON_NAME_PATTERN = /^[a-z0-9-]{1,64}$/;
const normalizeBrandIconName = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const n = value.trim().toLowerCase();
  return BRAND_ICON_NAME_PATTERN.test(n) ? n : undefined;   // render (520-04) resolves vs lucide set = allowlist
};

// 2) Types:
export type BrandProps = {
  mode: "text" | "image" | "icon";       // + "icon"
  href: string;
  image?: Record<string, unknown>;
  text?: string;
  icon?: string;                          // NEW — validated kebab lucide name
  showText?: boolean;                     // NEW — combo: graphic + text wordmark
  style?: BrandStyle;
};
export type BrandStyle = {
  /* …existing text/image keys @159-167… */
  iconColor?: string;                     // NEW — normalizeMenuColorValue (alpha OK)
  iconSize?: number;                      // NEW — BRAND_STYLE_NUMBER_RANGES.iconSize [12,64]
};

// 3) Allowlist + range extensions:
const BRAND_PROP_KEYS = ["mode", "href", "image", "text", "icon", "showText", "style"] as const;  // @628
const BRAND_STYLE_KEYS = [ /* …existing… */ "iconColor", "iconSize" ] as const;                    // @632
export const BRAND_STYLE_NUMBER_RANGES = { /* …existing… */ iconSize: { min: 12, max: 64 } } as const; // @689

// 4) normalizeBrandProps (@1044): accept the new mode + fields.
//   mode guard (@1057) — widen:
if (value.mode !== "text" && value.mode !== "image" && value.mode !== "icon")
  throw new MenuDocumentError(`${path}.mode`);
//   after text handling (@1081), add:
if (value.icon !== undefined && value.icon !== null) {
  const icon = normalizeBrandIconName(value.icon);       // fail-soft omit (bad name dropped)
  if (icon) props.icon = icon;                           // SPARSE
}
if (value.showText !== undefined && value.showText !== null) {
  if (typeof value.showText !== "boolean") throw new MenuDocumentError(`${path}.showText`);
  if (value.showText) props.showText = true;             // present-only: store only `true` (false = default ⇒ omit)
}

// 5) normalizeBrandStyle (@807): add iconColor (color) + iconSize (num) branches, mirroring
//    the existing color/num branches:
if (value.iconSize !== undefined && value.iconSize !== null) num("iconSize");   // clampLocalNumber
if (value.iconColor !== undefined && value.iconColor !== null) {
  const c = normalizeMenuColorValue(value.iconColor); if (c !== null) out.iconColor = c;
}
```

**Semantics (documented for 520-03/04):**
- `mode:"icon"` renders a lucide `<svg>` (resolved from `icon`) as the brand mark;
  if `icon` is absent/unresolvable, fall through to the text/site-name chain.
- `showText:true` on a graphic mode (`"image"` or `"icon"`) renders the graphic
  AND the text wordmark (per-menu `text` → site name) side by side. On `mode:"text"`
  `showText` is meaningless (already text) — store present-only but the render
  ignores it for text mode. Unset `showText` = exclusive (today's behavior).
- `false` `showText` is NOT stored (present-only default-drop) so a doc that
  toggles it off round-trips byte-identical to never-set.

**Error handling:** unknown brand-prop / brand-style KEY throws
`MenuDocumentError(path.key)` (existing loops @1051 / @812); bad `showText` type
throws; bad `icon` name / `iconColor` / `iconSize` fail soft (omit). `mode` outside
the 3-value union throws.

## Regression-test shape (Vitest, Bun-free — `tests/vitest/services/menu-document-v2.test.ts`)

- **Round-trip:** `{ mode:"icon", icon:"house", showText:true, style:{ iconColor:"#f7fbffcc", iconSize:28 } }`
  → re-read equals input; `{ mode:"image", showText:true }` (combo) round-trips.
- **normalizeBrandIconName table:** `"house"`→`"house"`, `"arrow-right"`→`"arrow-right"`,
  `"House"`→`"house"` (lowercased), `"../../etc"`→undefined, `"a".repeat(65)`→undefined,
  `123`→undefined.
- **Reject-unknown / bad type:** `{ bogusBrand:1 }` throws; `{ showText:"yes" }` throws;
  `style:{ bogusStyle:1 }` throws.
- **Fail-soft:** `icon:"bad/name"`, `iconColor:"url(x)"`, `iconSize:5` (clamped to 12)
  → icon/iconColor omitted, iconSize===12, siblings survive.
- **Present-only default-drop:** `{ mode:"text", showText:false }` normalizes with
  NO `showText` key.
- **Back-compat:** `{ mode:"text" }` and `{ mode:"image", image:{...} }` round-trip
  byte-identical to pre-520 (no icon/showText keys added).

## Hard Invariants

- `mode:"icon"` accepted; icon name pattern-validated (render-time lucide allowlist).
- `showText` stored present-only (only `true`); `false`/unset = exclusive legacy behavior.
- Bad icon/color/size fail-soft; unknown keys / bad `mode`/`showText` type throw.
- No schemaVersion bump; legacy brand docs byte-identical.
