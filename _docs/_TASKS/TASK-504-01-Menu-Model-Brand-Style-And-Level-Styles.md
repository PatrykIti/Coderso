# TASK-504-01: Menu Model — Brand Style & Per-Level Styles
# FileName: TASK-504-01-Menu-Model-Brand-Style-And-Level-Styles.md

**Parent Task:** TASK-504
**Priority:** High
**Category:** Services / Content (Menus) / Schema / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-499-02 (`menuDocumentV2` engine + `normalizeMenuAppearance` reuse),
TASK-501-01 (`MENU_RESPONSIVE_BREAKPOINT_KEYS`, `MenuSectionOverride`/`MenuBlockOverride`,
the `resolve*/patch*/clear*ForDevice` helper family, `menuDeviceBreakpoint`, prune-chain
discipline), TASK-502-01 (tablet un-deferred: `MENU_RESPONSIVE_BREAKPOINT_KEYS =
["tablet","mobile"]`, Pages cascade — tablet AND mobile each inherit DESKTOP, mobile
NEVER inherits tablet)
**Status:** ✅ Done
**Completed:** 2026-07-03

---

## Overview

The **model keystone** of TASK-504. Extends the menu document contract with (a) a
brand-block `style` sub-object, (b) a per-nesting-level `levelStyles` record on the
nav-items props, (c) NEW local clamp ranges for both, (d) the per-device machinery
so brand style AND level styles are overridable on tablet + mobile through the existing
`responsive.{tablet,mobile}` delta channel, and (e) the four nav-link **cheap-win base
scalars** (`linkPaddingX` / `linkPaddingY` / `linkRadius` / `linkHoverTextColor`) consumed
by 504-02 (CSS) and 504-04 (editor). Zero CSS, zero UI here — TWO service files:
`menuDocumentV2.ts` (the brand/level sub-objects + all `Brand*`/`NavLevel*` local ranges +
device helpers) AND a NARROW, single-purpose extension of `normalizeMenuAppearance.ts` for the
four cheap-win scalars ONLY (they must be real `MenuAppearance` keys so `NAV_ITEMS_PROP_KEYS`
can `Pick` them and they surface as `ResolvedMenuAppearance` fields for the scalar delta
engine). Every OTHER new range stays LOCAL to `menuDocumentV2.ts`.

Sole writer of `core/services/menus/menuDocumentV2.ts` AND of the four-scalar
`normalizeMenuAppearance.ts` cheap-win extension (§2a). Downstream subtasks import the
exported types + resolve/patch/clear helpers and NEVER re-edit these files:
- 504-02 (CSS) consumes `BrandStyle`, `NavLevelStyle`, `resolveMenuSectionAppearanceForDevice`
  (now level-aware) + `resolveMenuBrandStyleForDevice`, plus the four cheap-win
  `ResolvedMenuAppearance` fields (which resolve to `undefined` when unauthored — per parent
  §4(a)/(b) these four carry NO resolution default; 504-02 seeds NOTHING for them and emits them
  PRESENT-ONLY — §2a ownership split).
- 504-04 (editor) consumes the device-forked `patch*/clear*/read*/has*` helpers, the
  single-level `resolveMenuNavLevelStyle`, and the `NAV_LINK_NUMBER_RANGES` slider bounds.

### Security Contract

UI/client-state + schema-first document contract extension; **no new route/RBAC/
endpoint/migration**. All writes ride the existing validated `PATCH /menus/:id` envelope
(`menuUpdateSchema.document`, per-key merge in `menuService`, `mapMenuError` path branch —
all landed in TASK-499). No `menuDocumentV2` `schemaVersion` bump (stays `1`). New document
fields are validated on the strict WRITE path (reject-unknown keys ⇒ `MenuDocumentError`
+ `path`) and on the fail-closed STORED READ path (any unhandled unknown key ⇒ whole-doc
degrade to empty). No new secrets, tokens, rate-limit buckets, or authz surface.

---

## Verified current-state anchors (re-checked 2026-07-02 against source)

- `BrandProps` (`menuDocumentV2.ts:158-170`) = `{ mode; href; image?; text? }` — NO style
  channel. `BRAND_PROP_KEYS = ["mode","href","image","text"]` (`:445`, carries an explicit
  fail-closed-read-trap comment `:442-444`). `normalizeBrandProps` (`:447-489`): reject-unknown
  key loop `:453-457`, then per-key validation; called from `normalizeMenuBlock` `:643`.
- `NavItemsProps = Pick<MenuAppearance, NAV_ITEMS_PROP_KEYS[number]>` (`:122`); the key list
  (`:108-119`) is `satisfies readonly (keyof MenuAppearance)[]` — a PURE flat-scalar Pick, so
  a non-`MenuAppearance` member CANNOT be added to `NAV_ITEMS_PROP_KEYS` without breaking the
  `satisfies`. `normalizeNavItemsProps` (`:306-307`) = thin wrapper over
  `normalizeAppearanceSubset(value, NAV_ITEMS_PROP_KEYS, path)` (`:279-301`), which asserts
  raw keys ⊆ the subset BEFORE `pickAppearance(normalizeMenuAppearance(...))` (a levelStyles
  key would be REJECTED there today).
- `MenuSectionOverride = { layout?; navProps? }` (`:147-152`); `MenuBlockOverride =
  { visibility?: { visible: boolean } }` (`:155`). Section responsive validated by
  `normalizeMenuSectionResponsive` (`:320-366`) — group allowlist `MENU_SECTION_OVERRIDE_GROUP_KEYS
  = ["layout","navProps"]` (`:131`), `navProps` runs through `normalizeNavItemsProps` `:360`
  after the device-defining carve-out (`:351-359`). Block responsive validated by
  `normalizeMenuBlockResponsive` (`:406-437`) — hard-codes `groupKey !== "visibility" ⇒ throw`
  (`:418-421`).
- Shared vocabulary (all EXPORTED, reusable): `normalizeMenuColorValue` (token-backed,
  `normalizeMenuAppearance.ts:163`), enums `menuAppearanceFontWeights` (`:50`),
  `menuAppearanceTextTransforms` (`:51`), `menuAppearanceShadows` (`:52`). Clamp source
  `menuAppearanceNumberRanges` (`:113-119`) has `fontSize:{10,32}` only — the brand fontSize
  (10..48) and the height/maxWidth/letterSpacing/minWidth/radius ranges are NOT covered and
  the `fontSize` key would COLLIDE (see clamp decision below). `clampMenuAppearanceNumber`
  is keyed to `menuAppearanceNumberRanges` so it cannot clamp new ranges.
- Per-device helper family (`:869-1127`): `menuDeviceBreakpoint` (`:869-870`, desktop⇒null),
  `mapMenuSection`/`mapMenuBlock` (`:872-901`), `resolveMenuSectionAppearanceForDevice`
  (`:910-925`, SHALLOW-merges `{...base,...override}` per group), `readMenuSectionOverrideValue`
  (`:928-938`, RAW hasOwnProperty read), `patchMenuSectionForDevice` (`:955-1008`,
  delete-on-`undefined` + full prune chain), `clearMenuSectionOverride` (`:1015-1040`),
  `setMenuBlockVisibleForDevice` (`:1077-1101`), `clearMenuBlockVisibilityOverride`
  (`:1108-1127`), `hasMenuBlockVisibilityOverride` (`:1061-1069`).
- Write/read entry: `normalizeMenuDocumentV2` (`:728-751`) ⇒ `normalizeMenuDocumentV2ForWrite`
  (carveout `"reject"`, `:753-755`) / `normalizeStoredMenuDocumentV2ForRead` (carveout
  `"prune"` + try/catch-to-empty, `:762-771`). Block-level key gates
  `MENU_NATIVE_BLOCK_KEYS`/`MENU_LEAF_BLOCK_KEYS` (`:582-584`) gate the block ENVELOPE keys
  (`id/type/props/responsive[/style/visibility]`) — brand `style` and nav `levelStyles` live
  INSIDE `props`, so their read traps are inside the PROP normalizers, not these lists.

---

## Feature contract (execution-ready shapes)

All new code lands in `core/services/menus/menuDocumentV2.ts`.

### 1. New type shapes

```ts
import {
  isMenuAppearanceError,
  normalizeMenuAppearance,
  normalizeMenuColorValue,          // NEW import (already exported)
  menuAppearanceFontWeights,        // NEW import (already exported)
  menuAppearanceTextTransforms,     // NEW import (already exported)
  menuAppearanceShadows,            // NEW import (already exported)
  type MenuAppearance,
  type MenuAppearanceFontWeight,    // NEW type import
  type MenuAppearanceTextTransform, // NEW type import
  type MenuAppearanceShadow,        // NEW type import
} from "./normalizeMenuAppearance";

/** Brand block styling. Text-mode keys style the `<a>`; image-mode keys size the `<img>`.
 *  Sparse — only edited keys stored; empty ⇒ member omitted (legacy byte-identity). */
export type BrandStyle = {
  // text mode:
  fontSize?: number;                            // BRAND_STYLE_NUMBER_RANGES.fontSize [10,48]
  fontWeight?: MenuAppearanceFontWeight;        // reuse enum menuAppearanceFontWeights
  color?: string;                               // normalizeMenuColorValue (token-backed)
  textTransform?: MenuAppearanceTextTransform;  // reuse enum
  letterSpacing?: number;                       // [-2,8] px — NEGATIVE allowed (new range)
  // image mode:
  height?: number;                              // [16,120] px
  maxWidth?: number;                            // [40,400] px
};

/** Per-nesting-level nav styling. Link fields apply at every level; container fields
 *  apply ONLY to the submenu chrome at levels >= 1 (ignored/omitted for level 0). */
export type NavLevelStyle = {
  // link typography/state (linkHoverColor = hover BACKGROUND, linkHoverTextColor = hover TEXT,
  // mirroring the base-link cheap win + 504-02's levelStateRules emission):
  linkColor?: string; linkHoverColor?: string; linkHoverTextColor?: string; linkActiveColor?: string;
  fontSize?: number; fontWeight?: MenuAppearanceFontWeight;
  gap?: number; paddingX?: number; paddingY?: number;
  // submenu CONTAINER (levels >= 1 only):
  background?: string; borderColor?: string; borderWidth?: number;
  radius?: number; shadow?: MenuAppearanceShadow; minWidth?: number;
};

/** Sparse per-level record. Level 0 = the EXISTING nav-items scalar base (NO new type —
 *  never duplicated here). Level 2 = "level 2 AND deeper" (descendant selector in 504-02).
 *  The level key is NUMERIC — ONE canonical representation (`NavLevelStyleLevel = 1 | 2`)
 *  shared verbatim by 504-02's CSS selector maps (`Record<1 | 2, string>`; level 0 is the
 *  un-re-emitted flat `.site-nav-link` base, so it has NO selector-map entry and NO levelStyles
 *  key) and 504-04's editor, so `levelStyles[1]`/`levelStyles[2]` index without a string↔number
 *  cast. (Runtime object keys are still `"1"`/`"2"` strings — JSON-identical — but the TYPE
 *  is numeric so consumers index numerically.) */
export type NavLevelStyleLevel = 1 | 2;
export type NavLevelStyles = Partial<Record<NavLevelStyleLevel, NavLevelStyle>>;
```

Type mutations (widen, do NOT replace):

```ts
// NavItemsProps is no longer a pure Pick — add the non-appearance levelStyles member.
export type NavItemsProps =
  Pick<MenuAppearance, (typeof NAV_ITEMS_PROP_KEYS)[number]> & { levelStyles?: NavLevelStyles };

// BrandProps gains a sparse style sub-object.
export type BrandProps = {
  mode: "text" | "image";
  href: string;
  image?: Record<string, unknown>;
  text?: string;
  style?: BrandStyle;   // NEW
};

// Brand style is per-device; the block override now carries an optional style delta
// alongside the existing visibility record. (levelStyles per-device rides navProps —
// no MenuSectionOverride shape change needed, see §5.)
export type MenuBlockOverride = {
  visibility?: { visible: boolean };
  style?: BrandStyle;   // NEW — tablet/mobile brand style delta (sparse)
};
```

> Note: `MenuSectionOverride.navProps` is already typed `NavItemsProps`, so once
> `NavItemsProps` carries `levelStyles?`, the section responsive record can carry a
> `levelStyles` delta with NO further type edit — only the normalizer + resolver must be
> taught to handle it (§4, §5).

### 2. New constants — key lists + clamp ranges (defined in `menuDocumentV2.ts`; the two clamp tables are EXPORTED for the 504-04 editor sliders)

```ts
// --- CONSCIOUS fail-closed READ-trap key-list extension (brand) -------------------
// "style" gates BOTH write and stored read inside normalizeBrandProps; forgetting it
// degrades EVERY saved doc carrying brand.props.style to empty on read (round-trip test).
const BRAND_PROP_KEYS = ["mode", "href", "image", "text", "style"] as const; // +"style"

const BRAND_STYLE_KEYS = [
  "fontSize", "fontWeight", "color", "textTransform", "letterSpacing", "height", "maxWidth",
] as const;

const NAV_LEVEL_KEYS = ["1", "2"] as const;   // reject-unknown OUTER level keys (RAW string
                                              // keys off Object.keys — the wire form)
const NAV_LEVEL_STYLE_LEVELS = [1, 2] as const; // NUMERIC iteration/assignment (NavLevelStyleLevel)
const NAV_LEVEL_STYLE_KEYS = [
  "linkColor", "linkHoverColor", "linkHoverTextColor", "linkActiveColor", "fontSize", "fontWeight",
  "gap", "paddingX", "paddingY",
  "background", "borderColor", "borderWidth", "radius", "shadow", "minWidth",
] as const;

// NEW clamp tables. Defined here (NOT added to menuAppearanceNumberRanges) for two reasons:
//   (a) "fontSize" collides — appearance fontSize is 10..32, brand fontSize is 10..48;
//   (b) letterSpacing/height/maxWidth/minWidth/radius are not appearance concepts.
// Both are EXPORTED (for the 504-04 editor slider bounds — see its dependency contract).
// A dedicated local clamp helper mirrors clampMenuAppearanceNumber's round-then-bound math.
export const BRAND_STYLE_NUMBER_RANGES = {   // EXPORTED for 504-04 slider bounds
  fontSize: { min: 10, max: 48 },
  letterSpacing: { min: -2, max: 8 },   // NEGATIVE min — the reason it can't reuse the table
  height: { min: 16, max: 120 },
  maxWidth: { min: 40, max: 400 },
} as const;

export const NAV_LEVEL_NUMBER_RANGES = {     // EXPORTED for 504-04 slider bounds
  fontSize: { min: 10, max: 32 },
  gap: { min: 0, max: 32 },
  paddingX: { min: 0, max: 40 },
  paddingY: { min: 0, max: 32 },
  borderWidth: { min: 0, max: 8 },
  radius: { min: 0, max: 32 },
  minWidth: { min: 80, max: 480 },
} as const;

// Local clamp (mirrors clampMenuAppearanceNumber :123-126, but table-agnostic). Returns
// null for non-finite ⇒ caller OMITS the key (sparse fail-soft, see value policy below).
const clampLocalNumber = (range: { min: number; max: number }, value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(range.max, Math.max(range.min, Math.round(value)))
    : null;

const normalizeEnumLocal = <T>(options: readonly T[], value: unknown): T | null =>
  options.includes(value as T) ? (value as T) : null;
```

**Value-handling policy (CONSCIOUS, documented in-code).** For these NEW style sub-objects:
- **KEYS reject** — any key outside the allowlist throws `MenuDocumentError(path.key)`
  (schema-first reject-unknown); non-object / array containers throw
  `MenuDocumentError(path)` (structural).
- **VALUES fail-soft** — a value failing its validator (bad color, non-finite number,
  bad enum) is OMITTED (sparse), NOT thrown. This mirrors `normalizeMenuColorValue`'s
  null-drop and keeps authoring resilient; the editor only ever emits valid values, so
  the round-trip on valid data is LOSSLESS (the property under test). This intentionally
  differs from the flat `normalizeAppearanceSubset`, which throws on bad scalar values —
  that difference is asserted by tests so it can never regress silently.

### 2a. Nav-link cheap-win base scalars (narrow `normalizeMenuAppearance.ts` extension)

504-02 (`.site-nav-link` padding/radius group + hover-text) and 504-04 (base-level sliders +
"Hover text" swatch) both consume `linkPaddingX` / `linkPaddingY` / `linkRadius` /
`linkHoverTextColor` as `ResolvedMenuAppearance` fields. Because they must ride the EXISTING
scalar delta engine (`collectDeltaRules` keyed by `keyof ResolvedMenuAppearance`) and the
`NAV_ITEMS_PROP_KEYS` `Pick`, they have to be REAL `MenuAppearance` keys — so this subtask makes
the ONE narrow, single-purpose edit to `normalizeMenuAppearance.ts` (nothing else there changes):

```ts
// normalizeMenuAppearance.ts — this subtask adds EXACTLY three things here, nothing else:
// (1) MenuAppearance gains four nav-link scalars (the type members) — SPARSE-OPTIONAL like
// every existing MenuAppearance member (mirroring `linkActiveColor?: string` /
// `itemGap?: number` at normalizeMenuAppearance.ts:74/76), NOT `| null`:
//   linkPaddingX?: number; linkPaddingY?: number; linkRadius?: number; linkHoverTextColor?: string;
// (These stay optional so `NavItemsProps = Pick<MenuAppearance, NAV_ITEMS_PROP_KEYS[number]>`
// remains ALL-optional — the `: {}` fallback at menuDocumentV2.ts:915, the
// `pickAppearance(...) as NavItemsProps` casts, and every NavItemsProps literal/test keep
// compiling. The stored/sparse layer never persists null: normalizeMenuAppearance drops a
// null input (line 228) and treats a normalizer null-return as INVALID→throw (230-232).
// `linkHoverTextColor` carries NO resolution default (parent §4(b) — NOT seeded into
// MENU_APPEARANCE_DEFAULTS/SHELL_APPEARANCE_DEFAULTS): it resolves to `undefined` when unauthored,
// and 504-02's group-6 hover-text `base()` emits present-only (`!= null`) so an unset key ⇒ ZERO
// bytes. It does NOT mirror the `linkActiveColor: null` SHELL_APPEARANCE_DEFAULTS default — the
// four cheap-win keys deliberately have no default value at all.)
// (2) menuAppearanceNumberRanges gains the three numeric clamps (so the existing
// clampMenuAppearanceNumber path bounds them — they are NOT local because they DO belong to the
// shared scalar table, unlike the Brand*/NavLevel* ranges which collide/aren't appearance):
//   linkPaddingX: { min: 0, max: 40 }, linkPaddingY: { min: 0, max: 32 }, linkRadius: { min: 0, max: 32 }
// (3) fieldNormalizers gains the four entries: linkPaddingX/linkPaddingY/linkRadius clamp via
// clampMenuAppearanceNumber; linkHoverTextColor validated by normalizeMenuColorValue (nullable,
// omit-on-null).
//
// NO DEFAULTS SEED — ANYWHERE. Per parent §4(a)/(b), these four cheap-win keys carry NO
// resolution default: they are NOT added to `MENU_APPEARANCE_DEFAULTS` (core/site/menuDocumentCss.ts)
// or `SHELL_APPEARANCE_DEFAULTS` (siteShellCss.ts). normalizeMenuAppearance.ts has NO defaults
// concept by design (its own comment: `defaults are applied at CSS-build time, never persisted`),
// and 504-02 seeds NOTHING for these keys either. Because
// `ResolvedMenuAppearance = ReturnType<typeof resolveMenuAppearanceForDevice> =
// {...MENU_APPEARANCE_DEFAULTS, ...sanitizeMenuAppearance(...)}`, an UNAUTHORED key resolves to
// `undefined`; 504-02's group-9 `.site-nav-link` padding/radius `base()` and group-6 hover-text
// `base()` are PRESENT-ONLY (emit ONLY when the key is authored, `!= null`) ⇒ a no-override doc
// emits ZERO bytes ⇒ buildSiteShellCss(null) AND the no-override doc-sheet baseline stay
// byte-identical. The hardcoded base-sheet `padding:8px 12px;border-radius:6px` (siteShellCss.ts:144)
// remains the effective default; 504-02 completes the `padding` shorthand from LOCAL fallback
// constants (NOT a resolution seed). See §2a ownership split below.
```

```ts
// menuDocumentV2.ts — widen the nav-items key list (still `satisfies readonly (keyof
// MenuAppearance)[]`, now that the four keys ARE MenuAppearance members):
const NAV_ITEMS_PROP_KEYS = [/* …existing… */,
  "linkPaddingX", "linkPaddingY", "linkRadius", "linkHoverTextColor"] as const
  satisfies readonly (keyof MenuAppearance)[];

// Editor slider-bound convenience alias (keys paddingX/paddingY/radius, re-mapped from the
// shared table) — exported for 504-04. The CSS module (504-02) seeds NO default for these four
// keys (parent §4(a)) and emits them present-only from the resolved (possibly-undefined) values:
export const NAV_LINK_NUMBER_RANGES = {
  paddingX: menuAppearanceNumberRanges.linkPaddingX,
  paddingY: menuAppearanceNumberRanges.linkPaddingY,
  radius:   menuAppearanceNumberRanges.linkRadius,
} as const;
```

These four keys flow through the UNCHANGED `normalizeAppearanceSubset` scalar path (throw on bad
value, reject-unknown) — no new normalizer, no `levelStyles`-style fail-soft. They are per-device
for free via the existing `navProps` scalar delta channel (501/502).

> **§2a ownership split (NO defaults seed — parent §4(a)/(b)).** The line between 504-01 and
> 504-02 on the four cheap-win scalars:
> - **504-01 (this subtask, `normalizeMenuAppearance.ts`)** adds ONLY the four `MenuAppearance`
>   type members, the three `menuAppearanceNumberRanges` clamps
>   (`linkPaddingX` 0..40 / `linkPaddingY` 0..32 / `linkRadius` 0..32), and the four
>   `fieldNormalizers` entries. Asserted in `normalize-menu-appearance.test.ts` (clamp bounds +
>   `linkHoverTextColor` token/nullable). It does NOT touch any DEFAULTS constant.
> - **504-02 (CSS, `core/site/menuDocumentCss.ts`)** adds NO `MENU_APPEARANCE_DEFAULTS` seed for
>   these four keys (parent §4(a)/(b) mandate — do NOT add them to `MENU_APPEARANCE_DEFAULTS` or
>   `SHELL_APPEARANCE_DEFAULTS`). They stay `undefined` when unauthored; 504-02's group-9
>   `.site-nav-link` padding/radius `base()` and group-6 hover-text `base()` are PRESENT-ONLY
>   (emit ONLY when the key is authored, `!= null`), so an unauthored key ⇒ ZERO bytes. 504-02
>   completes the `padding` shorthand from LOCAL `menuDocumentCss.ts` fallback constants
>   (`SHELL_DEFAULT_LINK_PX/PY/RADIUS = 12/8/6`) used ONLY for shorthand completion + the neutral
>   `delta` value — NOT a resolution seed, so `SHELL_APPEARANCE_DEFAULTS` (`siteShellCss.ts:67`)
>   stays byte-identical. The 'unauthored ⇒ zero bytes / no-override byte-identity' assertion lives
>   in the render/CSS test (`menu-document-render.test.tsx` or a `menuDocumentCss` test), NOT in
>   `normalize-menu-appearance.test.ts` (which has no DEFAULTS concept to assert).

> **Level-0 vs level-1/2 key mapping (504-04 constraint — the sole-writer boundary made
> explicit).** This subtask is the SOLE writer of `menuDocumentV2.ts`, so the level-0 link
> controls it enables downstream MUST be closed here or they are orphaned. Link padding/radius/gap
> deliberately use TWO DISTINCT key namespaces:
> - **Level 0 (the nav-items BASE)** = the flat scalars `linkPaddingX` / `linkPaddingY` /
>   `linkRadius` (§2a) + the EXISTING `itemGap`. They are real `MenuAppearance` members inside
>   `NAV_ITEMS_PROP_KEYS`, written/reset/read via the EXISTING scalar helpers
>   `patchMenuSectionForDevice`(group `"navProps"`) / `clearMenuSectionOverride` /
>   `readMenuSectionOverrideValue` (§6) — NO `NavLevelStyle` is involved at level 0.
> - **Levels 1/2 (submenu links)** = the `NavLevelStyle` members `paddingX` / `paddingY` /
>   `radius` / `gap` (§1/§4), written via `patchMenuNavLevelStyleForDevice` /
>   `clearMenuNavLevelStyleOverride` (§6).
>
> The names diverge ON PURPOSE: the base scalars MUST be real `MenuAppearance` keys for the
> `Pick`/scalar-delta engine, whereas `NavLevelStyle` is the sparse non-appearance member. So
> 504-04's shared padding/radius/gap control set is a DISPLAY surface that REMAPS by selected
> level — level 0 ⇒ `link*`/`itemGap` base scalars; levels 1/2 ⇒ the `NavLevelStyle` keys.
> `NAV_LINK_NUMBER_RANGES` intentionally exposes the level-0 SLIDER BOUNDS under the
> control-facing keys `paddingX`/`paddingY`/`radius` (bounds only — the level-0 WRITE target is
> still the `link*` scalar; the alias is never a write key).
>
> **Fail-closed trap this closes (stated here because only the sole writer can):** a
> `NavLevelStyle`-named key (`paddingX`/`paddingY`/`radius`/`gap`) written into the nav-items
> BASE falls OUTSIDE `NAV_ITEMS_PROP_KEYS` ⇒ `normalizeAppearanceSubset` reject-unknown throw
> (verified `:279-301`) ⇒ `400 menu_document_invalid` on write / whole-doc degrade to empty on
> stored read. The model therefore exposes NO `paddingX`/`paddingY`/`radius`/`gap` member on the
> nav base, and 504-04 MUST NEVER route a level-0 padding/radius/gap edit through the
> `NavLevelStyle` helpers — level 0 writes ONLY `linkPaddingX`/`linkPaddingY`/`linkRadius`/`itemGap`.

### 3. `normalizeBrandStyle`

```ts
const normalizeBrandStyle = (value: unknown, path: string): BrandStyle | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path);       // structural throw
  for (const key of Object.keys(value)) {                            // reject-unknown KEYS
    if (!(BRAND_STYLE_KEYS as readonly string[]).includes(key))
      throw new MenuDocumentError(`${path}.${key}`);
  }
  const out: BrandStyle = {};
  const num = (k: keyof typeof BRAND_STYLE_NUMBER_RANGES) => {
    const v = clampLocalNumber(BRAND_STYLE_NUMBER_RANGES[k], value[k]);
    if (v !== null) out[k] = v;                                       // value fail-soft omit
  };
  if (value.fontSize !== undefined && value.fontSize !== null) num("fontSize");
  if (value.letterSpacing !== undefined && value.letterSpacing !== null) num("letterSpacing");
  if (value.height !== undefined && value.height !== null) num("height");
  if (value.maxWidth !== undefined && value.maxWidth !== null) num("maxWidth");
  if (value.fontWeight !== undefined && value.fontWeight !== null) {
    const w = normalizeEnumLocal(menuAppearanceFontWeights, value.fontWeight);
    if (w !== null) out.fontWeight = w;
  }
  if (value.textTransform !== undefined && value.textTransform !== null) {
    const t = normalizeEnumLocal(menuAppearanceTextTransforms, value.textTransform);
    if (t !== null) out.textTransform = t;
  }
  if (value.color !== undefined && value.color !== null) {
    const c = normalizeMenuColorValue(value.color);                  // token-backed
    if (c !== null) out.color = c;
  }
  return Object.keys(out).length > 0 ? out : undefined;              // PRUNE empty ⇒ omit member
};
```

`normalizeBrandProps` (`:478`) wiring — insert AFTER the image branch, guarded like `text`:

```ts
if (value.style !== undefined && value.style !== null) {            // null tolerated as absent
  const style = normalizeBrandStyle(value.style, `${path}.style`);
  if (style) props.style = style;                                   // sparse: omit when pruned
}
```

### 3a. Brand IMAGE normalization — fix the non-rendering logo (defect B1, HIGH)

Brand image mode is BROKEN today: `MenuBrandRender` (`siteShell.tsx:406-417`) builds an image
block with `props: block.props.image` (`:410`), but the stored `block.props.image` shape (written
by the editor picker, `MenuDesignEditor.tsx:1353-1355` — an `{ assetId, alt, … }` record) does NOT
resolve to a `src` for the image leaf renderer, so the front shows the empty-image dashed
placeholder and the header balloons, and the canvas shows the literal text "Logo". This subtask
owns the MODEL half of the fix:

- **Verify + normalize `brand.props.image` into the leaf's `{asset/src}`-resolvable shape.** In
  `normalizeBrandProps` (`:447-489`, the image branch that today stores the raw `image` record),
  compare `block.props.image` against HOW the image leaf resolves its `src` (the same normalizer /
  props shape a NORMAL image PageBlockV2 uses — trace the image-leaf `src` resolution and store the
  brand logo in that exact shape, e.g. `{ assetId, alt, … }` normalized to whatever key the leaf
  reads: `asset`/`src`). The goal: `props: <normalized brand.image>` passed to the image leaf in
  504-03/504-04 resolves to a real `src`. Keep `image` OPTIONAL + SPARSE (absent ⇒ text-mode
  fallback, unchanged) so legacy brand blocks without an image round-trip byte-identical.
- **`BrandProps.image` type** stays `Record<string, unknown>` at the envelope (or is tightened to
  the leaf-image props shape if the leaf exports one) — no `schemaVersion` bump; this is a
  normalize/read-shape correction, not a new field.
- **DEFINE + EXPORT the resolver here (single home).** This subtask adds and EXPORTS
  `resolveBrandImageSrc(image: BrandProps["image"]): string | null` from `menuDocumentV2.ts` (the
  brand model owner) — it takes the normalized brand `image` shape and returns the resolvable `src`
  (or `null` when absent/unresolvable), reusing the SAME resolution the image leaf uses (do NOT
  re-implement leaf logic — delegate to / mirror the leaf `src` resolver). 504-03 (front
  `MenuBrandRender`) and 504-04 (canvas brand preview) **IMPORT** `resolveBrandImageSrc` and emit a
  resolved-`src`-guarded `<img>` SIZED by the new `BrandStyle.height`/`maxWidth` — neither redefines
  it (prevents two divergent copies). 504-05 adds the regression test. The exported helper + its
  input shape are the SINGLE contract those consumers rely on — keep it consistent across
  504-01/03/04.

### 4. `normalizeNavLevelStyles` + `normalizeNavItemsProps` extension

```ts
const normalizeNavLevelStyle = (value: unknown, path: string): NavLevelStyle | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {                            // reject-unknown STYLE keys
    if (!(NAV_LEVEL_STYLE_KEYS as readonly string[]).includes(key))
      throw new MenuDocumentError(`${path}.${key}`);
  }
  const out: NavLevelStyle = {};
  // colors: linkColor/linkHoverColor/linkActiveColor/background/borderColor via normalizeMenuColorValue (omit on null)
  // numbers: fontSize/gap/paddingX/paddingY/borderWidth/radius/minWidth via clampLocalNumber(NAV_LEVEL_NUMBER_RANGES[k], …)
  // enums:   fontWeight via menuAppearanceFontWeights; shadow via menuAppearanceShadows
  // ... assign present + valid keys only (SPARSE), identical fail-soft pattern to normalizeBrandStyle ...
  return Object.keys(out).length > 0 ? out : undefined;             // prune empty level
};

const normalizeNavLevelStyles = (value: unknown, path: string): NavLevelStyles | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {                            // reject-unknown LEVEL keys ("0"/"3"/junk)
    if (!(NAV_LEVEL_KEYS as readonly string[]).includes(key))
      throw new MenuDocumentError(`${path}.${key}`);
  }
  const out: NavLevelStyles = {};
  for (const level of NAV_LEVEL_STYLE_LEVELS) {                       // numeric 1|2 (typed key)
    const raw = (value as Record<string, unknown>)[level];           // value[1] ⇒ "1" at runtime
    if (raw === undefined || raw === null) continue;
    const style = normalizeNavLevelStyle(raw, `${path}.${level}`);
    if (style) out[level] = style;                                   // prune empty level
  }
  return Object.keys(out).length > 0 ? out : undefined;             // prune empty record ⇒ omit
};
```

`normalizeNavItemsProps` (`:306-307`) — split `levelStyles` out BEFORE the flat subset
(this is the CONSCIOUS nav-block fail-closed READ-trap extension: an unhandled `levelStyles`
key would be REJECTED by `normalizeAppearanceSubset` and degrade the doc):

```ts
const normalizeNavItemsProps = (value: unknown, path: string): NavItemsProps => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const { levelStyles: rawLevelStyles, ...scalars } = value;        // extract non-appearance member
  // scalars still flow through the SAME strict subset (color/number/enum + reject-unknown
  // for any OTHER stray key) — the flat scalar contract is unchanged.
  const base = normalizeAppearanceSubset(scalars, NAV_ITEMS_PROP_KEYS, path) as NavItemsProps;
  if (rawLevelStyles === undefined || rawLevelStyles === null) return base; // legacy byte-identity
  const levelStyles = normalizeNavLevelStyles(rawLevelStyles, `${path}.levelStyles`);
  return levelStyles ? { ...base, levelStyles } : base;             // prune ⇒ no member
};
```

> This one change makes `levelStyles` work for BOTH the nav-items BASE props AND the section
> responsive delta, because `normalizeMenuSectionResponsive` (`:360`) already routes
> `raw.navProps` through `normalizeNavItemsProps` after the device-defining carve-out. No
> edit to `normalizeMenuSectionResponsive`'s group loop is required; `levelStyles` is a
> `navProps` sub-member, not a new group (`MENU_SECTION_OVERRIDE_GROUP_KEYS` unchanged).
> Confirm the carve-out loop (`:352-359`) leaves `levelStyles` untouched (it iterates only
> `MENU_NAV_DEVICE_DEFINING_KEYS`), and that a navProps record carrying ONLY `levelStyles`
> survives the `Object.keys(navProps).length > 0` prune guard (`:361`).

### 5. Per-device — brand style delta + block-override widening

`normalizeMenuBlockResponsive` (`:406-437`) — replace the hard-coded
`groupKey !== "visibility"` gate (`:418-421`) with an allowlist and add the `style` branch
(CONSCIOUS fail-closed READ-trap: forgetting `"style"` here degrades every doc carrying a
`responsive.{bp}.style` brand delta):

```ts
const MENU_BLOCK_OVERRIDE_GROUP_KEYS = ["visibility", "style"] as const;   // NEW (+"style")

// inside the per-breakpoint loop, replace the visibility-only group guard:
for (const groupKey of Object.keys(raw)) {
  if (!(MENU_BLOCK_OVERRIDE_GROUP_KEYS as readonly string[]).includes(groupKey))
    throw new MenuDocumentError(`${path}.${key}.${groupKey}`);            // "props"/junk ⇒ reject
}
const override: MenuBlockOverride = {};
// CONTROL-FLOW CONVERSION (do NOT port the source body verbatim). The existing
// visibility body (:422-434) is driven by TWO `continue`s — :422 and, critically,
// :430 (`if (visible === undefined || visible === null) continue`). Ported verbatim
// into this if-block, the :430 `continue` would skip the REST of the for-iteration —
// including the `style` branch AND the final `out[key]=override` assign — silently
// DROPPING a valid brand `style` delta on any record whose visibility is empty/absent-
// `visible` (fail-closed data-loss). Both `continue`s MUST become conditional
// NON-ASSIGNMENT so the `style` branch + final assign always run:
if (raw.visibility !== undefined && raw.visibility !== null) {          // was :422 continue-guard, now block-entry
  if (!isPlainObject(raw.visibility)) throw new MenuDocumentError(`${path}.${key}.visibility`);
  for (const vKey of Object.keys(raw.visibility)) {                     // reject-unknown (:424-428)
    if (!(MENU_BLOCK_VISIBILITY_OVERRIDE_KEYS as readonly string[]).includes(vKey))
      throw new MenuDocumentError(`${path}.${key}.visibility.${vKey}`);
  }
  const visible = raw.visibility.visible;
  if (visible !== undefined && visible !== null) {                      // was :430 `continue`, now NON-assign else
    if (typeof visible !== "boolean") throw new MenuDocumentError(`${path}.${key}.visibility.visible`);
    override.visibility = { visible };                                  // was :434 out[key] assign
  }                                                                      // empty `visible` ⇒ skip ONLY this assign, FALL THROUGH to style
}
if (raw.style !== undefined && raw.style !== null) {
  const style = normalizeBrandStyle(raw.style, `${path}.${key}.style`);   // reuse §3
  if (style) override.style = style;                                      // prune empty
}
if (Object.keys(override).length > 0) out[key as MenuResponsiveBreakpoint] = override;
```

> The brand style delta is BLOCK-scoped (brand is a block), so it rides the BLOCK responsive
> record — the faithful home. The nav `levelStyles` delta is nav-props-scoped, so it rides
> the SECTION responsive `navProps` record (§4). Both are SPARSE, pruned, resolved vs
> DESKTOP (Pages cascade); mobile never inherits tablet.

### 6. Resolvers — level-aware section resolve + brand style resolve

`resolveMenuSectionAppearanceForDevice` (`:910-925`) returns a `navProps: NavItemsProps`
whose shallow spread would REPLACE `levelStyles` wholesale on any device override. Teach it
a DEEP merge for the `levelStyles` member only (scalars keep the existing shallow per-key
merge). This keeps ONE authoritative device resolver (consumed by 504-02 CSS + 504-04 badges):

```ts
// helper — deep-merge a levelStyles delta over the base (per level, per field):
const mergeNavLevelStyles = (
  base: NavLevelStyles | undefined,
  delta: NavLevelStyles | undefined
): NavLevelStyles | undefined => {
  if (!base && !delta) return undefined;
  const out: NavLevelStyles = {};
  for (const level of NAV_LEVEL_STYLE_LEVELS) {                             // numeric 1|2 key
    const merged = { ...(base?.[level] ?? {}), ...(delta?.[level] ?? {}) }; // field-level cascade
    if (Object.keys(merged).length > 0) out[level] = merged;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

// in resolveMenuSectionAppearanceForDevice, replace the navProps spread:
const { levelStyles: baseLevels, ...baseScalars } = baseNavProps;
const { levelStyles: overrideLevels, ...overrideScalars } = override?.navProps ?? {};
const navProps: NavItemsProps = { ...baseScalars, ...overrideScalars };
const mergedLevels = mergeNavLevelStyles(baseLevels, overrideLevels);
if (mergedLevels) navProps.levelStyles = mergedLevels;                    // omit when empty
// (desktop branch bp===null: return { ...baseNavProps } unchanged — includes levelStyles)
```

New device-forked brand-style helpers (mirror the section/visibility helper family — same
delete-on-`undefined`, prune-chain, RAW-read discipline):

```ts
/** desktop = brand.props.style; tablet/mobile = deep-merge of the block responsive[bp].style
 *  delta over the DESKTOP base (mobile never reads tablet). Returns {} when unstyled. */
export function resolveMenuBrandStyleForDevice(block: MenuBlockV2, device: MenuDeviceKind): BrandStyle {
  const base = block.type === "brand" ? (block.props.style ?? {}) : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return { ...base };
  return { ...base, ...(block.responsive?.[bp]?.style ?? {}) };           // field-level cascade
}

/** Badge/Reset RAW read — undefined = inherited (hasOwnProperty, never the merge). */
export function readMenuBrandStyleOverrideValue(
  block: MenuBlockV2, breakpoint: MenuResponsiveBreakpoint, key: keyof BrandStyle
): unknown {
  const record = block.responsive?.[breakpoint]?.style;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

export const hasMenuBrandStyleOverride = (
  block: MenuBlockV2, breakpoint?: MenuResponsiveBreakpoint
): boolean =>
  breakpoint !== undefined
    ? block.responsive?.[breakpoint]?.style !== undefined
    : MENU_RESPONSIVE_BREAKPOINT_KEYS.some((bp) => block.responsive?.[bp]?.style !== undefined);

/** Device-forked writer. desktop ⇒ brand.props.style; tablet/mobile ⇒ own sparse
 *  responsive[bp].style. undefined patch value ⇒ DELETE key (never an own undefined). */
export function patchMenuBrandStyleForDevice(
  doc: MenuDocumentV2, blockId: string, device: MenuDeviceKind, patch: Partial<BrandStyle>
): MenuDocumentV2 {
  // mapMenuBlock + applyPatch(delete-on-undefined) over the target style record; then the
  // full prune chain: empty style ⇒ drop style; empty override ⇒ drop breakpoint; empty
  // responsive ⇒ delete member (byte-identical legacy shape). Non-brand block ⇒ identity.
}

/** Explicit Reset: delete ONE style key, prune style ⇒ override ⇒ responsive. */
export function clearMenuBrandStyleOverride(
  doc: MenuDocumentV2, blockId: string, breakpoint: MenuResponsiveBreakpoint, key: keyof BrandStyle
): MenuDocumentV2 { /* mirror clearMenuBlockVisibilityOverride :1108-1127 prune chain */ }
```

New device-forked nav-LEVEL helpers (levels 1/2 only — level 0 reuses the EXISTING
`patchMenuSectionForDevice`/`clearMenuSectionOverride`/`readMenuSectionOverrideValue` on the
scalar `navProps` group writing the `linkPaddingX`/`linkPaddingY`/`linkRadius`/`itemGap` BASE
scalars, NOT the `NavLevelStyle` `paddingX`/`paddingY`/`radius`/`gap` keys — see the §2a level-0
key-mapping constraint / fail-closed trap — so level 0 is NOT re-implemented here):

```ts
/** desktop ⇒ the FIRST nav-items block props.levelStyles[level]; tablet/mobile ⇒ that base
 *  DEEP-merged (per field) with section responsive[bp].navProps.levelStyles[level] (mobile
 *  never reads tablet). Returns {} when the level is unstyled. This is the SINGLE-LEVEL
 *  resolver 504-04's per-level control display consumes (the level-scoped analogue of
 *  resolveMenuSectionAppearanceForDevice, which resolves the whole navProps). */
export function resolveMenuNavLevelStyle(
  section: MenuSectionV2, device: MenuDeviceKind, level: NavLevelStyleLevel
): NavLevelStyle {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const base = navBlock?.type === "nav-items" ? (navBlock.props.levelStyles?.[level] ?? {}) : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return { ...base };
  return { ...base, ...(section.responsive?.[bp]?.navProps?.levelStyles?.[level] ?? {}) };
}

/** RAW read for a level field's override (badge/Reset). */
export function readMenuNavLevelStyleOverrideValue(
  section: MenuSectionV2, breakpoint: MenuResponsiveBreakpoint, level: NavLevelStyleLevel, key: keyof NavLevelStyle
): unknown { /* section.responsive?.[bp]?.navProps?.levelStyles?.[level] hasOwnProperty read */ }

/** desktop ⇒ the FIRST nav-items block props.levelStyles[level] (matches the .find() binding
 *  used by resolve + collectMenuAppearance); tablet/mobile ⇒ section responsive[bp].navProps
 *  .levelStyles[level]. delete-on-undefined + prune: field ⇒ level ⇒ levelStyles ⇒ navProps
 *  ⇒ override ⇒ responsive. */
export function patchMenuNavLevelStyleForDevice(
  doc: MenuDocumentV2, sectionId: string, device: MenuDeviceKind, level: NavLevelStyleLevel, patch: Partial<NavLevelStyle>
): MenuDocumentV2 { /* mapMenuSection; desktop writes the nav block props; else the responsive record */ }

/** Explicit Reset for one level field. */
export function clearMenuNavLevelStyleOverride(
  doc: MenuDocumentV2, sectionId: string, breakpoint: MenuResponsiveBreakpoint, level: NavLevelStyleLevel, key: keyof NavLevelStyle
): MenuDocumentV2 { /* full prune chain to byte-identical legacy shape */ }
```

### 7. Data flow & error handling

- **Write:** editor state ⇒ `PATCH /menus/:id` ⇒ `menuUpdateSchema.document` ⇒
  `normalizeMenuDocumentV2ForWrite(carveout:"reject")` ⇒ per-block/section normalizers above.
  Unknown key ⇒ `MenuDocumentError(path)` ⇒ `mapMenuError` ⇒ `400 menu_document_invalid`
  with `path`; store untouched.
- **Stored read:** `normalizeStoredMenuDocumentV2ForRead(carveout:"prune")` runs the SAME
  normalizers inside try/catch — any thrown error degrades the WHOLE doc to empty (the
  fail-closed trap the round-trip tests guard). Valid `style`/`levelStyles`/responsive deltas
  survive losslessly.
- **Resolvers/helpers** are pure (no throw): bad shapes were already rejected on write; the
  resolve path only ever sees validated data.

---

## Byte-identity & reject-unknown invariants (this subtask)

- **Legacy round-trip byte-identity:** a brand block WITHOUT `style` and a nav-items block
  WITHOUT `levelStyles` normalize to objects with NO new member (every emission is
  present-only / pruned-when-empty). `EMPTY_MENU_DOCUMENT`, `createDefaultMenuDocumentV2`,
  and `buildMenuDocumentV2FromLegacy` outputs are unchanged (no new default seeds — brand
  style and level styles are opt-in).
- **`normalizeMenuAppearance.ts` — NARROW four-scalar extension only (§2a):** the `Brand*` /
  `NavLevel*` ranges stay LOCAL to `menuDocumentV2.ts` (the `fontSize` key would COLLIDE — brand
  10..48 vs appearance 10..32 — and letterSpacing/height/maxWidth/minWidth/radius aren't
  appearance concepts). The ONLY additions to `normalizeMenuAppearance.ts` are the four cheap-win
  nav-link scalars (`linkPaddingX`/`linkPaddingY`/`linkRadius` type members + clamps +
  `linkHoverTextColor` color) — REQUIRED because they must be real `MenuAppearance` keys for the
  `Pick`/scalar-delta engine (§2a). No enum added, and NO defaults seed anywhere: per parent
  §4(a)/(b) these four keys carry NO resolution default — they are NOT added to
  `MENU_APPEARANCE_DEFAULTS` or `SHELL_APPEARANCE_DEFAULTS`, they resolve to `undefined` when
  unauthored, and 504-02 emits them PRESENT-ONLY (zero bytes when unauthored). `normalizeMenuAppearance.ts`
  has no defaults concept by design (§2a split); 504-02 adds no defaults for these keys either.
- **Reject-unknown, named:** `BRAND_STYLE_KEYS`, `NAV_LEVEL_KEYS` (`"1"`/`"2"` only),
  `NAV_LEVEL_STYLE_KEYS`, `MENU_BLOCK_OVERRIDE_GROUP_KEYS` (`"visibility"`/`"style"`) each
  throw `MenuDocumentError(path)` on any stray key.
- **Fail-closed READ traps, named (each needs a round-trip test):** `"style"` ∈
  `BRAND_PROP_KEYS`; `levelStyles` extraction in `normalizeNavItemsProps`; `"style"` ∈
  `MENU_BLOCK_OVERRIDE_GROUP_KEYS`. A forgotten one degrades every doc carrying that member.
- **Level-0 vs level-1/2 padding/radius/gap namespaces (sole-writer boundary):** the nav-items
  BASE (level 0) carries the `link*` scalars (`linkPaddingX`/`linkPaddingY`/`linkRadius`) +
  `itemGap` ONLY; the bare `NavLevelStyle` keys `paddingX`/`paddingY`/`radius`/`gap` exist ONLY
  on levels 1/2. Writing a `NavLevelStyle`-named key into the base is OUTSIDE `NAV_ITEMS_PROP_KEYS`
  ⇒ `normalizeAppearanceSubset` reject-unknown throw ⇒ 400 / stored-read degrade. Named here so
  504-04's level-remapped control set can never orphan the boundary (see §2a constraint).
- **No `schemaVersion` bump** — `MENU_DOCUMENT_SCHEMA_VERSION` stays `1`.

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`: the Vitest (Bun-free) lane owns the model units; the Bun
menu suites own the route + persistence byte-identity.

### Vitest (Bun-free) — `tests/vitest/services/menu-document-v2.test.ts`

- **`normalizeBrandStyle`:** accepts each text-mode + image-mode key; SPARSE (only present
  keys kept); PRUNES empty ⇒ `undefined`; reject-unknown key ⇒ `MenuDocumentError` with the
  exact `path` (e.g. `…style.foo`); non-object/array ⇒ throw at `path`; bad VALUE (bad color,
  non-finite number, bad enum) ⇒ OMITTED (fail-soft, asserted distinct from the scalar-subset
  throw behavior); NEW clamp ranges — `letterSpacing` accepts NEGATIVE (e.g. `-2` kept, `-3`
  clamped to `-2`), `fontSize` bound `48` (not `32`), `height`/`maxWidth` bounds.
- **`normalizeNavLevelStyles`:** per-level accept/reject/sparse/prune; reject-unknown OUTER
  level key (`"0"`, `"3"`, junk ⇒ throw at `…levelStyles.0`); reject-unknown per-level style
  key; container fields (`background`/`borderColor`/`borderWidth`/`radius`/`shadow`/`minWidth`)
  validated; NEW ranges (`minWidth` [80,480], `radius`/`borderWidth`/`gap`/`paddingX`/`paddingY`
  bounds); empty level ⇒ pruned; empty record ⇒ member omitted.
- **`normalizeNavItemsProps` extension:** a nav-items props carrying BOTH scalars AND
  `levelStyles` round-trips both; a stray non-scalar/non-levelStyles key still rejects; scalar
  bad-value still THROWS (unchanged flat-subset behavior); legacy (no `levelStyles`) ⇒ no member.
- **Level-0 key-namespace guard (sole-writer boundary):** a nav-items BASE carrying a
  `NavLevelStyle`-named key (`paddingX`/`paddingY`/`radius`/`gap`) at the props ROOT (not under
  `levelStyles`) still THROWS `MenuDocumentError` at `…props.paddingX` (proves the base scalar set
  is `linkPaddingX`/`linkPaddingY`/`linkRadius`/`itemGap`, so 504-04's level-0 controls must write
  those names — locks the §2a mapping so the trap can never regress silently).
- **Cheap-win base scalars (§2a) — model side (this subtask, in `normalize-menu-appearance.test.ts`):**
  `linkPaddingX`/`linkPaddingY`/`linkRadius` clamp to 0..40/0..32/0..32 via the shared
  `menuAppearanceNumberRanges` path; `linkHoverTextColor` is token-validated + nullable; they are
  present in `NAV_ITEMS_PROP_KEYS` (the `Pick` still holds). NOTE: `normalize-menu-appearance.ts`
  has NO defaults concept, so this test does NOT — and cannot — assert `MENU_APPEARANCE_DEFAULTS`.
  Per parent §4(a)/(b) these four keys carry NO resolution default (NOT seeded into
  `MENU_APPEARANCE_DEFAULTS`), so they resolve to `undefined` when unauthored; the 'unauthored ⇒
  a doc leaving all four untouched emits ZERO new bytes (no-override byte-identity)' assertion is
  owned by 504-02's PRESENT-ONLY emission and lives in the render/CSS test
  (`menu-document-render.test.tsx` or a `menuDocumentCss` test), NOT here.
- **Fail-closed READ-trap round-trips (MANDATORY):** a doc with `brand.props.style`, with
  `navProps.levelStyles`, and with `responsive.{tablet,mobile}` brand `style` + nav
  `levelStyles` deltas survives `normalizeMenuDocumentV2ForWrite` → `normalizeStoredMenuDocumentV2ForRead`
  IDENTICALLY (proves `"style"` ∈ `BRAND_PROP_KEYS`, the `levelStyles` extraction, and
  `"style"` ∈ `MENU_BLOCK_OVERRIDE_GROUP_KEYS`). A regression removing any of the three
  degrades the doc to empty — asserted.
- **Per-device model:** `normalizeMenuBlockResponsive` accepts `{tablet|mobile}.style`,
  rejects a `props`/unknown group and unknown style key with `path`, prunes empty; the section
  responsive `navProps.levelStyles` delta is sparse + pruned; both records reject-unknown.
  **Control-flow data-loss guard (MANDATORY, §5):** a `responsive.{bp}: { style: {…} }` record
  carrying a valid brand `style` delta but NO `visibility` (and, separately, one whose
  `visibility` has an empty/absent `visible`) survives write→stored-read IDENTICALLY — the
  `style` delta is NOT dropped. This locks the §5 conversion of the two source `continue`s
  (:422 & :430) into conditional non-assignment; a regression reintroducing the :430 `continue`
  inside the visibility if-block would skip the `style` branch + final `out[key]=override` assign
  and silently drop the delta — asserted here so it can never regress.
- **Resolvers/helpers:** `resolveMenuBrandStyleForDevice` (desktop=base; tablet/mobile=base⊕
  own delta; mobile ≠ tablet); `resolveMenuSectionAppearanceForDevice` DEEP-merges
  `levelStyles` per level per field (override field wins, unset field inherits desktop),
  scalars stay shallow-per-key; `patch*ForDevice` (brand + nav-level) write the correct target,
  delete-on-`undefined`, and prune to byte-identical legacy shape; `clear*` full prune chain;
  `read*OverrideValue`/`has*Override` RAW hasOwnProperty semantics; desktop nav-level 0 continues
  to route through the EXISTING `patchMenuSectionForDevice` (no regression to scalar overrides).

### Bun (menu suites)

- **`tests/integration/routes/menus.test.ts`:** `PATCH /menus/:id` round-trips
  `brand.props.style` + `navProps.levelStyles` + `responsive.{tablet,mobile}` brand/level
  deltas WITHOUT dropping sibling `appearance`/`extras`/other blocks; an invalid brand-style
  key, an invalid level key (`"0"`), and an invalid level-style key each ⇒ `400
  menu_document_invalid` with the offending `path`, store untouched.
- **`tests/unit/site/menu-document-render.test.tsx`:** NO-override / no-style docs stay
  byte-identical (the present-only guard) — this subtask must not perturb it; a styled doc is
  additive only (the actual new-rule emission is 504-02's assertion, referenced here for the
  cross-file contract).

### Byte-identity / reject-unknown guards named explicitly

- `tests/unit/pages/siteShellCss.test.ts` — `buildSiteShellCss(null)` byte-identical: **ZERO
  edits** (nothing this subtask does touches the base sheet; guard stays green untouched).
- `tests/unit/site/menu-document-render.test.tsx` — no-override menu docs byte-identical.
- Fail-closed READ-trap round-trips for `"style"` (brand + block override) and `levelStyles`
  (nav) are MANDATORY (above).

### SMOKE (owner mandate — live real-flow, ≥5 scenarios)

The full live playwright smoke (admin canvas + front `:3000`, assert VISIBLE EFFECT via
computed styles/geometry, ≥5 scenarios: brand text+image style; per-level 0/1/2 each at the
right hover depth + canvas force-open; per-device brand/level override + reset across
desktop/tablet/mobile; sublist chrome; hover-text/current-page + link padding) is authored and
EXECUTED in **TASK-504-05** (closure), because it requires the CSS (504-02), front stamp
(504-03), and editor controls (504-04) to be landed. This subtask's model contract is what
each scenario ultimately measures; its own gate is the Vitest + Bun matrices above plus lint,
`bun --cwd core lint:types`, and root `tsc -p tsconfig.json --noEmit` (the prop-signature
change to `NavItemsProps`/`BrandProps` demands the ROOT tsc pass so a test excess-prop error
cannot block the commit).

---

## Acceptance Criteria

- `BrandStyle`, `NavLevelStyle`, `NavLevelStyles`, `NavLevelStyleLevel` (numeric `1 | 2`)
  exported; `BrandProps.style?`, `NavItemsProps.levelStyles?`, `MenuBlockOverride.style?` added;
  the four nav-link cheap-win scalars (`linkPaddingX`/`linkPaddingY`/`linkRadius`/
  `linkHoverTextColor`) widen `NAV_ITEMS_PROP_KEYS` (they are real `MenuAppearance` keys, so the
  `Pick` still holds), and `resolveMenuNavLevelStyle(section, device, level)` is exported for the
  per-level editor display. The slider-bound clamp tables `BRAND_STYLE_NUMBER_RANGES`,
  `NAV_LEVEL_NUMBER_RANGES`, and `NAV_LINK_NUMBER_RANGES` are EXPORTED for the 504-04 editor
  controls (matching its dependency-contract imports).
- `normalizeBrandStyle`, `normalizeNavLevelStyles`, the `normalizeNavItemsProps` extraction,
  and the `normalizeMenuBlockResponsive` `style` branch validate reject-unknown (keys) +
  fail-soft (values) + sparse-prune (byte-stable); the three fail-closed READ traps are covered.
- New LOCAL clamp ranges applied (brand `fontSize` 10..48, `letterSpacing` −2..8 incl.
  negative, `height` 16..120, `maxWidth` 40..400; level `minWidth` 80..480, `radius`/
  `borderWidth`/`gap`/`paddingX`/`paddingY`/`fontSize`); `normalizeMenuAppearance.ts` extended
  ONLY by the four cheap-win nav-link scalars — the four SPARSE-OPTIONAL `MenuAppearance` type
  members (`linkPaddingX?`/`linkPaddingY?`/`linkRadius?: number`, `linkHoverTextColor?: string`,
  matching every existing optional member so `NavItemsProps` stays all-optional), the three
  `menuAppearanceNumberRanges` clamps (`linkPaddingX`/`linkPaddingY`/`linkRadius` 0..40/0..32/0..32),
  and the four `fieldNormalizers` entries (`linkHoverTextColor` token-validated, null input
  dropped). It adds NO defaults; per parent §4(a)/(b) these four keys carry NO resolution default
  and are NOT seeded into `MENU_APPEARANCE_DEFAULTS`/`SHELL_APPEARANCE_DEFAULTS` — they resolve to
  `undefined` when unauthored and 504-02 emits them PRESENT-ONLY (zero bytes when unauthored;
  the base-sheet `padding:8px 12px;border-radius:6px` stays the effective default). See §2a
  ownership split.
- Per-device: brand style overridable on tablet + mobile via the block responsive record; nav
  `levelStyles` overridable via the section responsive `navProps` delta; both follow the Pages
  cascade (tablet + mobile inherit DESKTOP; mobile ≠ tablet); resolve/patch/clear helpers are
  device-generalized and prune to byte-identical legacy shape.
- Legacy docs round-trip byte-identical; no `schemaVersion` bump; no route/RBAC/endpoint/
  migration.
- Gates: full Vitest menu-document-v2 suite + Bun menus route/render matrices, lint, core
  `lint:types`, root `tsc`, and gates:coderso green together.

---

## Deferred (state in the TASK-504 changelog residuals)

- Levels 3+ independent styling (the `"2"` descendant selector covers them uniformly in 504-02).
- Custom `font-family` / `line-height` controls.
- Active-item indicator pill/underline (beyond the `aria-current` current-page color in 504-02/03).
- Mobile-drawer styling (the `menu-drawer` section is not front-rendered yet).
