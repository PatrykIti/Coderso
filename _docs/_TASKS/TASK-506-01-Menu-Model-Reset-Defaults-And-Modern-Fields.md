# TASK-506-01: Menu Model — Reset, Defaults & Modern Fields

# FileName: TASK-506-01-Menu-Model-Reset-Defaults-And-Modern-Fields.md

**Parent Task:** TASK-506
**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Page Builder / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-499 (menuDocumentV2 contract + normalizer chain), TASK-501 (per-device `responsive.{tablet,mobile}` records + `MenuResponsiveCarveout`), TASK-504 (`NavItemsProps.levelStyles`, per-level normalizer partitions, per-device resolvers, `patch*ForDevice`/`clear*Override` helper families), TASK-505 (sibling architecture family). Rides the existing validated `PATCH /menus/:id` write path.
**Status:** ✅ Done
**Completed:** 2026-07-03 (changelog 1215)

---

## Scope (single-writer keystone)

**Sole writer of `core/services/menus/menuDocumentV2.ts`.** (Touches
`normalizeMenuAppearance.ts` ONLY if Option A is chosen — this subtask pins
**Option B**, so it is NOT touched.) Nothing renders these fields yet; 506-02
(CSS), 506-03 (front), 506-04 (editor), 506-05 (tests/docs) all depend on the
API this subtask lands. Ships:

1. **F1** — base-record reset: named `clearMenu*Base` wrappers over the existing
   desktop-branch delete+prune machinery, landing the doc at the exact
   no-override byte-identical shape.
2. **F2** — a single model-side resolved-default provider
   `resolveMenuControlDefault(...) → { value, sourceLabel }` so the editor never
   hardcodes defaults.
3. **B1/B2/B3/B5 per-level fields** on `NavLevelStyle` (levels 1/2) + all
   allowlist / clamp-range / normalizer-partition (color/number/enum/**new
   boolean**) extensions.
4. **Level-0 home (Option B)** — a NEW `NavItemsProps.navChrome` sub-record
   (parallel to `levelStyles`) holding the level-0 variants of B1/B2/B3 + B4 pill,
   with its own reject-unknown allowlist + prune.
5. **B4 container fields** (`containerPaddingX/Y`) on `NavLevelStyle` (levels ≥ 1).

**NO `schemaVersion` bump. NO route/RBAC/endpoint/migration.** Byte-identity of
`buildSiteShellCss(null)` and no-override docs is preserved by present-only
emission (that emission is 506-02's job; this subtask must not add any
resolution default that would make an unauthored field emit).

---

## Security Contract

**UI/client-state + schema-first document-contract extension; no new
route/RBAC/endpoint/migration.** Every new field's normalizer lives in
`menuDocumentV2.ts`; unknown KEYS throw machine-readable `MenuDocumentError` with
the offending `path` (reject-unknown); VALUES are fail-soft (bad
color/number/enum/bool OMITTED, matching the file's value policy `:625-631`) via
the SAME validated field normalizers as the base — raw stored input never reaches
CSS. The stored-read normalizer stays fail-closed; legacy docs WITHOUT the new
fields parse byte-unchanged. Each new key added to a reject-unknown allowlist is a
**fail-closed READ TRAP** ⇒ each carries a round-trip persistence test. No
`schemaVersion` bump; the document rides the existing `content:write`-gated
`PATCH /menus/:id` envelope (freeform jsonb, no migration).

---

## Grounding (verified against source on `feature/visual` this run)

All anchors Read-verified (menu files read as BINARY to `rg` — use `Read` /
`grep -an`):

- `NAV_ITEMS_PROP_KEYS` `:121-136` is `satisfies readonly (keyof MenuAppearance)[]`
  `:136`; `NavItemsProps = Pick<MenuAppearance, …> & { levelStyles?: NavLevelStyles }`
  `:140-142`. ⇒ **new menu-only fields cannot ride this list** (they are not
  `MenuAppearance` keys). Level-0 home = the Option-B `navChrome` split, mirroring
  the `levelStyles` split `:385-389`.
- `NavLevelStyle` type `:163-180`; `NAV_LEVEL_STYLE_KEYS` `:565-581` (reject-unknown
  allowlist, enforced in `normalizeNavLevelStyle` `:686-690`); value partitions
  `NAV_LEVEL_STYLE_COLOR_KEYS` `:665-672`, `NAV_LEVEL_STYLE_NUMBER_KEYS` `:673-681`;
  fontWeight `:703-706` + shadow `:707-710` enum branches. **No boolean partition
  exists today** — 506 introduces it.
- `NAV_LEVEL_NUMBER_RANGES` `:594-602` (EXPORTED); `clampLocalNumber` `:617-620`
  (rounds, clamps, null on non-finite ⇒ key OMITTED); `normalizeEnumLocal`
  `:622-623`. Value policy `:625-631` (KEYS throw, VALUES fail-soft omit).
- `NavLevelStyleLevel = 1 | 2` `:186`; `NAV_LEVEL_KEYS = ["1","2"]` `:562`;
  `NAV_LEVEL_STYLE_LEVELS = [1,2]` `:564`; `NavLevelStyles` `:187`.
- `normalizeNavItemsProps` `:383-390` (splits `levelStyles` off before the flat
  subset; returns bare base when absent `:387` = legacy byte-identity).
- `MENU_NAV_DEVICE_DEFINING_KEYS = ["mobileMode","dropdownDirection"]` `:205`
  (base-only, rejected in responsive `:435-442`) — **excluded** from F1 base-reset.
- Helper families (F1 wrappers ride these desktop `bp===null` branches, which
  already delete-on-`undefined` + prune to legacy shape):
  - `patchMenuSectionForDevice` `:1283-1336` (desktop `:1301-1320`, `applyPatch`
    delete `:1293-1294`).
  - `patchMenuNavLevelStyleForDevice` `:1631-1667` (desktop `:1640-1651`,
    `applyNavLevelPatch` delete `:1597-1607` + `withNavLevel` prune `:1610-1622`).
  - `patchMenuBrandStyleForDevice` `:1498-1535` (desktop `:1515-1521`, deletes key
    + prunes empty `style` off props `:1518-1519`).
  - The three clears `clearMenuSectionOverride` `:1343-1368`,
    `clearMenuNavLevelStyleOverride` `:1670-1698`, `clearMenuBrandStyleOverride`
    `:1538-1562` are ALL `breakpoint: MenuResponsiveBreakpoint` (tablet|mobile) —
    NONE accept desktop (F1 root cause CONFIRMED).
- F2 resolvers to reuse: `resolveMenuNavLevelStyle` `:1574-1584` (desktop = base
  level; tablet/mobile = base ⊕ own delta), `resolveMenuSectionAppearanceForDevice`
  `:1230-1253` (scalars shallow-merge, levelStyles deep-merge `mergeNavLevelStyles`
  `:1217-1228`), raw readers `readMenuNavLevelStyleOverrideValue` `:1587-1595`,
  `readMenuSectionOverrideValue` `:1256-1266`. **Brand is BLOCK-scoped** (not
  section) — its device-inherit desktop value is reachable ONLY through the brand
  block: `resolveMenuBrandStyleForDevice(block, device)` `:1463-1471` (desktop =
  `block.props.style`; tablet/mobile = base ⊕ own delta) + raw reader
  `readMenuBrandStyleOverrideValue` `:1474-1481`. ⇒ F2 is `section`-only (4-param) and
  therefore does NOT surface a brand's authored desktop value on tablet/mobile: a brand
  `"base"` key unset on tablet/mobile returns `value === undefined` (present-only, no hint).
  506-04 computes each brand control's `isSet` from `block.props.style` at its own call site.

**Cross-file handoff (do NOT edit here — flag for the owner in 506-02):** every new
`NavLevelStyle`/`navChrome` key MUST also be added to
`NAV_LEVEL_STYLE_COMPARE_KEYS` (and a `navChrome` compare list) in
`core/site/menuDocumentCss.ts` (`~:620`) or per-device delta detection silently
never emits. That file is 506-02's single-writer surface; 506-01 lists the exact
key set in its closure note so 506-02 wires the compare keys in the same land.

---

## Implementation Pseudocode (execution-ready — implement in THIS order)

### Step 0 — new enum option consts + clamp ranges (top-of-file, near `:594`)

```ts
// Fresh local `as const` option arrays (mirror menuAppearanceFontWeights usage):
const ITEM_DIVIDER_STYLES = ["solid", "dashed", "dotted"] as const;
const NAV_INDICATOR_KINDS  = ["none", "underline", "overline"] as const;
const FLYOUT_ANIMATIONS    = ["none", "fade", "slide"] as const;
const SUBMENU_PLACEMENTS   = ["right", "bottom", "left"] as const;

// New numeric clamp ranges. NAV_LEVEL_NUMBER_RANGES (@594) is keyed by the
// existing level number keys; to avoid collision + keep the exported table's
// existing shape stable, ADD the new keys to it (all are new key names, no
// collision) so normalizeNavLevelStyle's number loop and the editor share ONE table:
export const NAV_LEVEL_NUMBER_RANGES = {
  /* …existing 7 entries (fontSize/gap/paddingX/paddingY/borderWidth/radius/minWidth)… */
  itemDividerWidth:   { min: 1, max: 8 },   // B1
  indicatorThickness: { min: 1, max: 6 },   // B2
  transitionMs:       { min: 0, max: 400 }, // B2
  hoverLift:          { min: 0, max: 8 },   // B2
  containerPaddingX:  { min: 0, max: 40 },  // B4 (levels ≥ 1)
  containerPaddingY:  { min: 0, max: 32 },  // B4 (levels ≥ 1)
} as const;

// Level-0 pill ranges (new local table — navChrome-only keys, NOT NavLevelStyle):
export const NAV_CHROME_NUMBER_RANGES = {
  navPillRadius:      { min: 0, max: 40 },
  navPillPaddingX:    { min: 0, max: 40 },
  navPillPaddingY:    { min: 0, max: 32 },
  // level-0 variants of the shared numeric fields (same bounds as the level table):
  itemDividerWidth:   { min: 1, max: 8 },
  indicatorThickness: { min: 1, max: 6 },
  transitionMs:       { min: 0, max: 400 },
  hoverLift:          { min: 0, max: 8 },
} as const;
```

### Step 1 — extend the `NavLevelStyle` type (`:163-180`)

Append (levels 1/2). Container fields (`containerPaddingX/Y`) apply ONLY to the
submenu chrome at levels ≥ 1 (CSS ignores them for level 0 — but level 0 uses
`navChrome`, so no conflict):

```ts
export type NavLevelStyle = {
  /* …existing 16 fields… */
  // B1 item separators (orientation-aware emission is 506-02's job):
  itemDividerShow?: boolean;
  itemDividerColor?: string;                       // normalizeMenuColorValue
  itemDividerWidth?: number;                       // 1..8
  itemDividerStyle?: "solid" | "dashed" | "dotted";
  // B2 indicator + hover:
  indicator?: "none" | "underline" | "overline";
  indicatorColor?: string;                         // color
  indicatorThickness?: number;                     // 1..6
  indicatorGrow?: boolean;
  hoverUnderline?: boolean;
  transitionMs?: number;                           // 0..400
  hoverLift?: number;                              // 0..8
  // B3 caret + flyout (levels ≥ 1 parents):
  showCaret?: boolean;
  caretRotateOnOpen?: boolean;
  flyoutAnimation?: "none" | "fade" | "slide";
  // B4 dropdown inner padding (container, levels ≥ 1):
  containerPaddingX?: number;                      // 0..40
  containerPaddingY?: number;                      // 0..32
  // B5 nested placement (levels ≥ 1):
  submenuPlacement?: "right" | "bottom" | "left";
};
```

### Step 2 — extend the reject-unknown allowlist + value partitions (`:565-710`)

```ts
const NAV_LEVEL_STYLE_KEYS = [
  /* …existing 15 entries… */
  "itemDividerShow", "itemDividerColor", "itemDividerWidth", "itemDividerStyle",
  "indicator", "indicatorColor", "indicatorThickness", "indicatorGrow",
  "hoverUnderline", "transitionMs", "hoverLift",
  "showCaret", "caretRotateOnOpen", "flyoutAnimation",
  "containerPaddingX", "containerPaddingY",
  "submenuPlacement",
] as const;

const NAV_LEVEL_STYLE_COLOR_KEYS  = [ /* …existing 6… */ "itemDividerColor", "indicatorColor" ] as const;
const NAV_LEVEL_STYLE_NUMBER_KEYS = [ /* …existing 7… */
  "itemDividerWidth", "indicatorThickness", "transitionMs", "hoverLift",
  "containerPaddingX", "containerPaddingY" ] as const;

// NEW enum + NEW boolean partitions inside normalizeNavLevelStyle (@683-712),
// AFTER the fontWeight/shadow branches, BEFORE the prune-empty return:
const NAV_LEVEL_STYLE_BOOL_KEYS = [
  "itemDividerShow", "indicatorGrow", "hoverUnderline", "showCaret", "caretRotateOnOpen",
] as const;

const normalizeNavLevelStyle = (value, path) => {
  // …existing key reject-unknown loop @686-690 (now covers the new keys automatically)…
  // …existing color loop @693-697, number loop @698-702 (new number keys covered by the
  //   extended NAV_LEVEL_STYLE_NUMBER_KEYS + NAV_LEVEL_NUMBER_RANGES)…
  // …existing fontWeight @703-706 + shadow @707-710…

  // NEW enum branches (mirror the shadow branch exactly — fail-soft omit on bad value):
  const enumField = (k, options) => {
    if (value[k] === undefined || value[k] === null) return;
    const e = normalizeEnumLocal(options, value[k]);
    if (e !== null) out[k] = e;
  };
  enumField("itemDividerStyle", ITEM_DIVIDER_STYLES);
  enumField("indicator",        NAV_INDICATOR_KINDS);
  enumField("flyoutAnimation",  FLYOUT_ANIMATIONS);
  enumField("submenuPlacement", SUBMENU_PLACEMENTS);

  // NEW boolean partition (none exists today) — typeof===boolean, fail-soft omit:
  for (const k of NAV_LEVEL_STYLE_BOOL_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    if (typeof value[k] === "boolean") out[k] = value[k]; // non-boolean ⇒ OMIT (fail-soft)
  }
  return Object.keys(out).length > 0 ? out : undefined; // unchanged prune-empty
};
```

> **HARD INVARIANT:** each new key must appear in `NAV_LEVEL_STYLE_KEYS` **and**
> exactly one value partition (COLOR / NUMBER+RANGE / ENUM branch / BOOL). A number
> key missing from `NAV_LEVEL_NUMBER_RANGES` throws at clamp; a key missing from a
> partition is silently DROPPED (present in allowlist, handled by no branch) — the
> round-trip test (Step 6) catches BOTH.

### Step 3 — Level-0 home: the `navChrome` sub-record (Option B)

```ts
export type NavChromeStyle = {
  // B4 pill (level-0 wrapper on .site-nav-list):
  navPillBackground?: string;                      // color
  navPillRadius?: number;                          // 0..40
  navPillPaddingX?: number;                        // 0..40
  navPillPaddingY?: number;                        // 0..32
  // level-0 variants of B1/B2/B3 (same field names/semantics as NavLevelStyle):
  itemDividerShow?: boolean; itemDividerColor?: string; itemDividerWidth?: number;
  itemDividerStyle?: "solid" | "dashed" | "dotted";
  indicator?: "none" | "underline" | "overline"; indicatorColor?: string;
  indicatorThickness?: number; indicatorGrow?: boolean;
  hoverUnderline?: boolean; transitionMs?: number; hoverLift?: number;
  showCaret?: boolean; caretRotateOnOpen?: boolean;
  // NOTE: NO flyoutAnimation on navChrome/level-0 — it is a levels-≥1 CONTAINER field
  // (NavLevelStyle 1/2 ONLY): the top bar is never a revealed sublist and forceOpenLevel=0
  // ⇒ undefined, so a level-0 flyout control would never force-open/neutralize its reveal
  // (defeats Hard Invariant 6). See 506-02's reconcile note @425-440.
};

// NavItemsProps gains the member (parallel to levelStyles @140-142):
export type NavItemsProps = Pick<MenuAppearance, …> & {
  levelStyles?: NavLevelStyles;
  navChrome?: NavChromeStyle;
};

// Reject-unknown allowlist + partitions (mirror the level-style set):
const NAV_CHROME_KEYS = [
  "navPillBackground", "navPillRadius", "navPillPaddingX", "navPillPaddingY",
  "itemDividerShow", "itemDividerColor", "itemDividerWidth", "itemDividerStyle",
  "indicator", "indicatorColor", "indicatorThickness", "indicatorGrow",
  "hoverUnderline", "transitionMs", "hoverLift",
  "showCaret", "caretRotateOnOpen",
  // NO "flyoutAnimation" — levels-≥1 CONTAINER field (NavLevelStyle 1/2 ONLY), NOT a navChrome key
  // (writing it under navChrome would reject-unknown throw; see 506-02 @425-440).
] as const;
const NAV_CHROME_COLOR_KEYS  = ["navPillBackground", "itemDividerColor", "indicatorColor"] as const;
const NAV_CHROME_NUMBER_KEYS = ["navPillRadius", "navPillPaddingX", "navPillPaddingY",
  "itemDividerWidth", "indicatorThickness", "transitionMs", "hoverLift"] as const;
const NAV_CHROME_ENUM: Array<[keyof NavChromeStyle, readonly string[]]> = [
  ["itemDividerStyle", ITEM_DIVIDER_STYLES], ["indicator", NAV_INDICATOR_KINDS],
  // NO flyoutAnimation — it is a NavLevelStyle (levels 1/2) enum only, never a navChrome field.
];
const NAV_CHROME_BOOL_KEYS = ["itemDividerShow", "indicatorGrow", "hoverUnderline",
  "showCaret", "caretRotateOnOpen"] as const;

// Normalizer — same value policy as normalizeNavLevelStyle (KEYS throw, VALUES omit),
// numbers clamp over NAV_CHROME_NUMBER_RANGES:
const normalizeNavChrome = (value, path): NavChromeStyle | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value))
    if (!(NAV_CHROME_KEYS as readonly string[]).includes(key))
      throw new MenuDocumentError(`${path}.${key}`);           // reject-unknown KEY
  const out: NavChromeStyle = {};
  for (const k of NAV_CHROME_COLOR_KEYS)  { /* normalizeMenuColorValue, omit null */ }
  for (const k of NAV_CHROME_NUMBER_KEYS) { /* clampLocalNumber(NAV_CHROME_NUMBER_RANGES[k]), omit null */ }
  for (const [k, opts] of NAV_CHROME_ENUM){ /* normalizeEnumLocal, omit null */ }
  for (const k of NAV_CHROME_BOOL_KEYS)   { /* typeof===boolean, else omit */ }
  return Object.keys(out).length > 0 ? out : undefined;        // prune empty ⇒ no member
};

// Split navChrome off BEFORE the flat subset, EXACTLY like levelStyles (@383-390):
const normalizeNavItemsProps = (value, path): NavItemsProps => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const { levelStyles: rawLevels, navChrome: rawChrome, ...scalars } = value; // split BOTH
  const base = normalizeAppearanceSubset(scalars, NAV_ITEMS_PROP_KEYS, path) as NavItemsProps;
  let next: NavItemsProps = base;
  if (rawLevels !== undefined && rawLevels !== null) {
    const levelStyles = normalizeNavLevelStyles(rawLevels, `${path}.levelStyles`);
    if (levelStyles) next = { ...next, levelStyles };
  }
  if (rawChrome !== undefined && rawChrome !== null) {
    const navChrome = normalizeNavChrome(rawChrome, `${path}.navChrome`);
    if (navChrome) next = { ...next, navChrome };
  }
  return next; // absent BOTH ⇒ bare base (legacy byte-identity @387)
};
```

> `normalizeNavItemsProps` is reused verbatim by the responsive write path
> (`normalizeMenuSectionResponsive` `:443`), so `navChrome` flows through the SAME
> reject-unknown automatically per-device — **no separate responsive allowlist
> needed.** The device-defining carve-out (`:435-442`) is unaffected (`navChrome`
> is neither `mobileMode` nor `dropdownDirection`).

### Step 4 — device patch/resolve/read for `navChrome` (mirror `levelStyles`)

`navChrome` needs its own device-forked writer + resolver + raw reader so
506-04 can wire level-0 controls per-device (Desktop ⇒ base, tablet/mobile ⇒ own
delta). Model these on `patchMenuNavLevelStyleForDevice` / `resolveMenuNavLevelStyle`:

```ts
// prune helper (mirror withNavLevel @1610-1622): set/delete navChrome on navProps,
// prune the empty member.
const withNavChrome = (navProps: NavItemsProps, next: NavChromeStyle): NavItemsProps => {
  const { navChrome: _c, ...rest } = navProps;
  return Object.keys(next).length > 0 ? { ...rest, navChrome: next } : rest;
};

export function patchMenuNavChromeForDevice(doc, sectionId, device, patch: Partial<NavChromeStyle>) {
  // desktop bp===null ⇒ FIRST nav-items block.props via applyPatch(delete-on-undefined) + withNavChrome
  // tablet/mobile ⇒ responsive[bp].navProps.navChrome, full prune chain
  //   field ⇒ navChrome ⇒ navProps ⇒ override ⇒ responsive (mirror @1652-1665)
}

export function resolveMenuNavChrome(section, device): NavChromeStyle {
  const nav = section.blocks.find((b) => b.type === "nav-items");
  const base = nav?.type === "nav-items" ? (nav.props.navChrome ?? {}) : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return { ...base };
  return { ...base, ...(section.responsive?.[bp]?.navProps?.navChrome ?? {}) }; // shallow ⊕ own delta
}

export function readMenuNavChromeOverrideValue(section, breakpoint, key: keyof NavChromeStyle): unknown {
  const rec = section.responsive?.[breakpoint]?.navProps?.navChrome;
  return rec && Object.prototype.hasOwnProperty.call(rec, key) ? rec[key] : undefined;
}
export function readMenuNavChromeBaseValue(section, key: keyof NavChromeStyle): unknown {
  const nav = section.blocks.find((b) => b.type === "nav-items");
  const rec = nav?.type === "nav-items" ? nav.props.navChrome : undefined;
  return rec && Object.prototype.hasOwnProperty.call(rec, key) ? rec[key] : undefined;
}
```

> **`resolveMenuSectionAppearanceForDevice` (`:1230-1253`) also carries `navChrome`
> forward.** Currently `:1244-1248` deep-merges only `levelStyles`. Extend it: split
> `navChrome` off alongside `levelStyles`, shallow-merge base⊕override (same as the
> scalar merge), re-attach when non-empty. This keeps the resolved appearance
> complete for the CSS builder + editor `resolve*` reads.

### Step 5 — F1 base-clear wrappers + base raw readers

The desktop `bp===null` branches ALREADY delete-on-`undefined` + prune to legacy
shape (verified `:1293-1294`, `:1518-1519`, `:1647-1648`). The base-clear is a thin
named API — **no new prune logic.** Add:

```ts
// level-0 scalar / layout base clear (over patchMenuSectionForDevice desktop branch):
export function clearMenuSectionBase(doc, sectionId, group: MenuSectionOverrideGroup, key: keyof MenuAppearance) {
  return patchMenuSectionForDevice(doc, sectionId, "desktop", group, { [key]: undefined } as any);
}
// per-level (1/2) base clear:
export function clearMenuNavLevelStyleBase(doc, sectionId, level: NavLevelStyleLevel, key: keyof NavLevelStyle) {
  return patchMenuNavLevelStyleForDevice(doc, sectionId, "desktop", level, { [key]: undefined });
}
// level-0 navChrome base clear:
export function clearMenuNavChromeBase(doc, sectionId, key: keyof NavChromeStyle) {
  return patchMenuNavChromeForDevice(doc, sectionId, "desktop", { [key]: undefined });
}
// brand base clear:
export function clearMenuBrandStyleBase(doc, blockId, key: keyof BrandStyle) {
  return patchMenuBrandStyleForDevice(doc, blockId, "desktop", { [key]: undefined });
}
```

Plus base raw readers the editor uses to decide whether to show "Reset to
default" (mirror the override readers `:1587-1595` / `:1256-1266`):

```ts
export function readMenuNavLevelStyleBaseValue(section, level: NavLevelStyleLevel, key: keyof NavLevelStyle): unknown {
  const nav = section.blocks.find((b) => b.type === "nav-items");
  const rec = nav?.type === "nav-items" ? nav.props.levelStyles?.[level] : undefined;
  return rec && Object.prototype.hasOwnProperty.call(rec, key) ? rec[key] : undefined;
}
export function readMenuSectionBaseValue(section, group: MenuSectionOverrideGroup, key: keyof MenuAppearance): unknown {
  if (group === "layout")
    return Object.prototype.hasOwnProperty.call(section.layout, key) ? (section.layout as any)[key] : undefined;
  const nav = section.blocks.find((b) => b.type === "nav-items");
  const rec = nav?.type === "nav-items" ? nav.props : undefined;
  return rec && Object.prototype.hasOwnProperty.call(rec, key) ? (rec as any)[key] : undefined;
}
export function readMenuBrandStyleBaseValue(block, key: keyof BrandStyle): unknown {
  const rec = block.type === "brand" ? block.props.style : undefined;
  return rec && Object.prototype.hasOwnProperty.call(rec, key) ? rec[key] : undefined;
}
```

> **EXCLUDE** `MENU_NAV_DEVICE_DEFINING_KEYS` (`mobileMode`, `dropdownDirection`,
> `:205`) from the base-reset generalization — they carry resolution defaults and are
> written to base on every device; the editor must not offer "Reset to default" for
> them (505-04 gates this). Each base-clear must land the doc at the exact
> never-had-it byte shape ⇒ Step 6 round-trip.

### Step 6 — F2 resolved-default provider (single model source of truth)

Returns the EFFECTIVE value + human source label for an UNSET control, so the
editor NEVER hardcodes defaults. Pull ONLY from existing exports
(`MENU_APPEARANCE_DEFAULTS` / `SHELL_APPEARANCE_DEFAULTS` / `SHELL_DEFAULT_LINK_*` /
`NAV_FONT_SIZE_INHERITED` (16) / the range tables). Source rules exactly per the
parent contract:

```ts
export type MenuControlDefault = { value: number | string | boolean | undefined; sourceLabel: string };

export function resolveMenuControlDefault(
  section: MenuSectionV2,
  device: MenuDeviceKind,
  level: 0 | 1 | 2 | "base",           // 0 = level-0 nav scalar/navChrome; 1|2 = NavLevelStyle; "base" = brand OR layout scalar (NOT nav)
  key: string,
): MenuControlDefault {
  // SECTION-ONLY provider (4-param, no `block` arg — matches the parent §506-01 signature
  // and 506-04's sole-consumer calls). The provider MUST handle EVERY value 506-04 passes:
  // 0 (nav-base/chrome), 1|2 (NavLevelStyle), and "base" (brand/layout scalar). "base" and 0
  // are DISTINCT source domains — "base" is NEVER resolved as a level-0 nav key.
  // SCOPE SPLIT (case 4): a "base" key is EITHER brand (KEY-based theme default from
  // MENU_APPEARANCE_DEFAULTS) OR layout (section-scoped `section.layout`); both are reachable
  // from `section` alone (no brand block instance required — 506-04 computes each control's
  // `isSet` at its own call site and passes it IN). Nav (0/1/2) always resolves from `section`.
  // 1) tablet/mobile with the field UNSET on THIS device ⇒ inherits the RESOLVED desktop value.
  //    Compute that desktop value by RECURSING through THIS provider —
  //    `resolveMenuControlDefault(section, "desktop", level, key).value` — NOT a literal
  //    `resolveMenuNavLevelStyle(section, "desktop", N)[key]`: that reader merges only level N's OWN
  //    base+desktop record and does NOT fall back to shallower levels (@1574-1584, see case 2), so for
  //    a LEVEL field (1/2) unset on BOTH the device AND desktop-level-N it returns undefined ⇒ the
  //    misleading "Inherited from desktop (undefined)" — the SAME '(undefined)' bug class F2 exists to
  //    kill. Recursing reuses the case-2/3 cascade so the desktop value falls through to the shallower /
  //    level-0 / theme number; keep sourceLabel = "Inherited from desktop" (the device-inherit label,
  //    NOT the recursed desktop label). Net: `value` is NEVER undefined for a nav/level/layout key that
  //    has any desktop cascade stop, even when desktop-level-N is itself unset.
  //    Nav (0/1/2) + layout desktop values resolve from `section`. BRAND is BLOCK-scoped and
  //    NOT reachable from `section`, so a brand "base" key UNSET on tablet/mobile returns
  //    { value: undefined } ⇒ present-only, NO "Inherited from desktop" hint (506-04 accepts this).
  // 2) level N (1/2) UNSET on desktop ⇒ FULL CASCADE WALK (NOT a single N−1 hop). CRITICAL:
  //    `resolveMenuNavLevelStyle` (@1574-1584) merges ONLY a level's OWN base+device record — it
  //    does NOT fall back to a shallower level — so the walk lives HERE, else a level-2 field unset
  //    WHILE level 1 is ALSO unset returns `resolveMenuNavLevelStyle(section,device,1)[key] === undefined`
  //    ⇒ the misleading "Inherits level 1 (undefined)" (the exact compound-case bug F2 kills).
  //    Walk shallower LEVELS until a DEFINED value: for each L in [N−1..1] test
  //    `resolveMenuNavLevelStyle(section, device, L)[key]`; first DEFINED ⇒
  //    { value, sourceLabel: `Inherits level ${L} (${resolved}${unit})` } (mirrors NavLevelInheritBadge
  //    @1048; level 2 whose level-1 is SET ⇒ "Inherits level 1", because the cascade is descendant-anchored
  //    — LEVEL_LINK_SELECTORS[1] also matches level-2 links, so level 1 is the true effective source).
  //    If ALL shallower NavLevelStyle levels (down to 1) are UNSET ⇒ fall through to the LEVEL-0
  //    nav-base/navChrome value for the analogous key (level 0 is NOT a NavLevelStyle @186, but
  //    `.site-nav-link` matches deeper links ⇒ it is the real next cascade stop),
  //    sourceLabel = "Inherits level 0"; if THAT is unset too ⇒ theme/base-sheet default (case 3 below).
  //    NEVER emit "Inherits level ${L} (undefined)" — a level whose value is undefined is SKIPPED, not
  //    labeled. Net: level 2 unset + level 1 SET ⇒ "Inherits level 1"; level 1 unset (or level 2 unset
  //    WITH level 1 also unset) ⇒ "Inherits level 0"; level 0 also unset ⇒ theme/base default.
  // 3) level 0 UNSET (nav-base scalar / navChrome) ⇒ theme / base-sheet default:
  //    fontSize      ⇒ { value: NAV_FONT_SIZE_INHERITED (16), sourceLabel: "Inherited from theme (16px)" }
  //    linkPaddingX  ⇒ { value: SHELL_DEFAULT_LINK_PX (12),  sourceLabel: "Default 12px" }
  //    linkPaddingY  ⇒ { value: SHELL_DEFAULT_LINK_PY (8),   sourceLabel: "Default 8px" }
  //    linkRadius    ⇒ { value: SHELL_DEFAULT_LINK_RADIUS (6), sourceLabel: "Default 6px" }
  //    GATED PRESENT-ONLY numerics (indicatorThickness, itemDividerWidth, transitionMs,
  //      hoverLift, containerPaddingX/Y, navPillRadius/navPillPaddingX/navPillPaddingY) ⇒
  //      { value: undefined, sourceLabel: "Off" | "Not applied" } — range.min is FORBIDDEN here
  //      (it is the exact misleading 0/80 bug F2 kills; parent §506-01 + AC3). When unset there
  //      is NO indicator/divider/pill, hence NO meaningful resolved number; the hint is suppressed
  //      until the gating flag turns on (matches 506-04's ControlDefaultHint returning null when
  //      value===undefined). Keep { value: range.min, sourceLabel: "Default" } ONLY for genuinely
  //      always-resolvable numerics with no theme default (if any) — NEVER the gated set above.
  //    the modern B1–B5 enum/bool navChrome fields (submenuPlacement, indicator,
  //      flyoutAnimation, showCaret, caretRotateOnOpen, indicatorGrow, hoverUnderline,
  //      itemDividerShow, itemDividerStyle) ⇒ resolve from NAV_CHROME_DEFAULTS (the parent
  //      §506-01 table, imported/re-declared here as the SINGLE non-hardcoded source):
  //      { value: NAV_CHROME_DEFAULTS[key], sourceLabel: `Default (${humanize(value)})` }
  //      (submenuPlacement ⇒ {value:"right","Default (Right)"}, showCaret ⇒ {value:true,"Default (On)"},
  //       indicator ⇒ {value:"none","Default (None)"}, itemDividerShow ⇒ {value:false,"Default (Off)"}).
  //    OTHER enums/colors with no default (NOT in NAV_CHROME_DEFAULTS) ⇒ { value: undefined, sourceLabel: "Not set" }.
  // 4) "base" UNSET (brand / layout scalar — NOT nav) ⇒ that group's OWN theme/base default,
  //    resolved KEY-based from MENU_APPEARANCE_DEFAULTS / SHELL_APPEARANCE_DEFAULTS for the
  //    brand/layout key (sourceLabel "Default <v><unit>" / "Inherited from theme (<v>px)"; no
  //    default ⇒ { value: undefined, sourceLabel: "Not set" }). A brand/layout control passing
  //    "base" gets the brand/layout default — NEVER a level-0 nav default (distinct source/label
  //    from case 3). LAYOUT keys resolve from `section.layout`; BRAND keys resolve KEY-based from
  //    MENU_APPEARANCE_DEFAULTS (block-scoped authored values are NOT read here — 506-04 computes
  //    the brand control's `isSet` at its call site from `block.props.style` and passes it IN, so
  //    the provider stays `section`-only). Brand tablet/mobile inherit (case 1) is unreachable
  //    from `section` ⇒ returns { value: undefined } (present-only, no hint).
  // NEVER emits CSS — pure read/derivation for the editor hint. No resolution default
  // is written to the doc (present-only emission preserved).
}
```

> Notes: `SHELL_DEFAULT_LINK_PX/PY/RADIUS` (12/8/6) live in `menuDocumentCss.ts`
> `:104-106`; `NAV_FONT_SIZE_INHERITED` (16) is the editor const `:304`. To keep the
> model self-contained WITHOUT importing from the CSS/editor layer, re-declare these
> three link defaults as EXPORTED model consts (`MENU_SHELL_DEFAULT_LINK_{PX,PY,RADIUS}`)
> and have 506-02/506-04 import them from the model (single source), OR import from
> `siteShellCss.ts`'s `SHELL_APPEARANCE_DEFAULTS` if it already carries them — the
> implementer picks the non-cyclic path and documents it in the closure note. The
> provider is pure and covered by unit tests asserting each label branch.
>
> **`NAV_CHROME_DEFAULTS`** (the parent §506-01 table: `submenuPlacement:"right"`,
> `indicator:"none"`, `flyoutAnimation:"none"`, `showCaret:true`,
> `caretRotateOnOpen:false`, `indicatorGrow:false`, `hoverUnderline:false`,
> `itemDividerShow:false`, `itemDividerStyle:"solid"`) is declared and **EXPORTED**
> from this model module as the single non-hardcoded source for the modern B1–B5
> enum/bool effective defaults — `resolveMenuControlDefault` reads it for those keys,
> 506-02 mirrors it for present-only CSS emission, and 506-04's `ControlDefaultHint`
> imports it to render the resolved `Default (<Value>)` label.

### Step 7 — do NOT touch

- **NO** `menuDocumentV2` `schemaVersion` bump (grep the current version const;
  leave unchanged).
- **NO** edit to `normalizeMenuAppearance.ts` (Option B avoids MenuAppearance).
- **NO** resolution default that makes an unauthored field emit (present-only).
- **NO** edit to `NAV_ITEMS_PROP_KEYS` / `MENU_NAV_DEVICE_DEFINING_KEYS` /
  `MENU_SECTION_KEYS` / `BRAND_PROP_KEYS` (all 506 fields live under `levelStyles`
  or `navChrome`, already inside `navProps`).

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free — pure model):** `tests/vitest/services/menu-document-v2.test.ts`

1. **Fail-closed READ-trap round-trip — one per NEW key** (every key in
   `NAV_LEVEL_STYLE_KEYS` additions + every key in `NAV_CHROME_KEYS`): write a doc
   carrying the key → `normalizeMenuDocumentV2` (write carveout) → re-read (stored
   carveout) → deep-equals the input; AND a stored doc carrying the key survives
   read WITHOUT the sibling keys/levels being dropped (proves no whole-record
   degrade). This is the mandatory guard — a forgotten allowlist/partition entry
   degrades every stored doc carrying the field.
2. **Reject-unknown KEY throws** `MenuDocumentError` with the exact offending
   `path`. The BASE record lives at `blocks[N].props.navChrome` / `blocks[N].props.levelStyles`
   (nav-items block props), so the base reject example is `…props.navChrome.bogus` (and
   `…props.levelStyles.1.bogus`) — NO `.navProps.` prefix. The `.navProps.` prefix is correct
   ONLY for the per-device responsive path (`sections[N].responsive.{device}.navProps.…`), which
   is the separate responsive reject example (matches 506-05 §1.1 / §2.1).
3. **Fail-soft VALUE omit** per type: bad enum (`indicator:"blink"`), non-boolean
   bool (`showCaret:"yes"`), non-finite number (`indicatorThickness:NaN`), bad
   color — each OMITTED from the normalized output, siblings intact (asserts the
   value policy `:625-631` extends to the new partitions).
4. **Clamp bounds** for every new numeric: `itemDividerWidth` 0→1 / 99→8;
   `indicatorThickness` 0→1 / 9→6; `transitionMs` -5→0 / 999→400; `hoverLift`
   -1→0 / 20→8; `containerPaddingX/Y`; `navPillRadius/PaddingX/PaddingY`
   (round + clamp per the range tables).
5. **F1 base-clear byte-identity** per surface: author a base value
   (`clearMenuNavLevelStyleBase` / `clearMenuNavChromeBase` / `clearMenuSectionBase`
   / `clearMenuBrandStyleBase`) then clear ⇒ the doc deep-equals AND is
   `JSON.stringify`-identical to a doc that never had the value (prune to legacy
   shape). Missing-value clear ⇒ identity. Device-defining keys are NOT clearable
   to nothing (assert `clearMenuSectionBase` is never called for them by the editor
   — covered in 506-04, but assert here that clearing `mobileMode`/`dropdownDirection`
   is out of the base-reset API surface).
6. **F2 provider labels** (4-param `resolveMenuControlDefault(section, device, level, key)`,
   section-only): FULL CASCADE WALK for unset level N=1/2 — level 2 unset WITH level 1 SET ⇒
   `"Inherits level 1"`, level 1 unset ⇒ `"Inherits level 0"`; **plus the compound-fall-through
   case** — level 2 unset WHILE level 1 is ALSO unset ⇒ walks past the undefined level 1 to
   `"Inherits level 0"` (or the theme/base default if level 0 is unset too), and NEVER emits the
   misleading `"Inherits level 1 (undefined)"`; assert the walk value equals the resolved level-0 /
   theme number, not `undefined`;
   theme/base default label (`"Inherited from theme (16px)"` / `"Default 8px"` /
   `"Default 12px"` / `"Default 6px"`) for unset level 0; `"Inherited from desktop"` for
   unset tablet/mobile with a desktop value — asserted for a section-scoped key (nav/layout).
   **Plus the compound device×level fall-through** — a LEVEL-2 field UNSET on tablet WITH
   desktop level-2 ALSO unset resolves (via case-1 recursion through the provider) to the
   resolved level-1 / level-0 / theme number, NEVER `{ value: undefined }` /
   `"Inherited from desktop (undefined)"`; assert the returned `value` equals that resolved
   shallower/level-0/theme number and the label stays `"Inherited from desktop"`.
   A layout `"base"` key resolves from `section.layout` + `SHELL_APPEARANCE_DEFAULTS`; a brand
   `"base"` key resolves KEY-based from `MENU_APPEARANCE_DEFAULTS`, and unset on tablet/mobile
   returns `{ value: undefined }` (present-only, NOT "Inherited from desktop" — brand's authored
   desktop value is block-scoped and NOT reachable from `section`; 506-04 computes brand `isSet`
   at its call site). `value` matches the resolved effective value; never mutates the doc.
7. **navChrome split byte-identity**: a doc with `navChrome` absent normalizes
   byte-identical to pre-506 (bare base returned `:387`); an empty `navChrome`
   object prunes to no member.
8. **Per-device delta**: `patchMenuNavChromeForDevice`/`patchMenuNavLevelStyleForDevice`
   on `tablet`/`mobile` writes only that device's sparse record; mobile never reads
   tablet; `resolveMenuNavChrome`/`resolveMenuNavLevelStyle` merge base⊕own-delta
   only; `resolveMenuSectionAppearanceForDevice` carries `navChrome` forward.

**Bun lane (route/runtime):** `tests/integration/routes/menus.test.ts` — a
`document` PATCH carrying the new `levelStyles.{1,2}.*` and `navChrome.*` fields
persists per-key without dropping siblings; an invalid payload (unknown key) 4xx's
with `menu_document_invalid` + the offending path.

**Byte-identity guards (asserted here + owned by 506-03/05):**
`buildSiteShellCss(null)` unchanged; no-override menu-document render byte-identical
(no resolution default introduced by this subtask).

> The ≥5-scenario visible-effect SMOKE is authored in **506-05** (owner mandate),
> not here — this subtask ships pure-model unit + round-trip coverage.

---

## Definition of Done

- New `NavLevelStyle` fields (B1/B2/B3/B4-container/B5) + `NavChromeStyle`
  (level-0 B1/B2/B3 + B4 pill) land with full reject-unknown + value-partition
  (color/number/enum/**boolean**) coverage; every key in an allowlist has a
  round-trip test.
- F1 `clearMenu*Base` wrappers + base raw readers land the doc at the exact
  no-override byte-identical shape (per-surface round-trip green).
- F2 `resolveMenuControlDefault(section, device, level, key)` (4-param, section-only —
  matches the parent §506-01 signature and 506-04's calls) returns `{ value, sourceLabel }`
  for every level/device/key source rule; the editor (506-04) can consume it with zero
  hardcoded defaults. Nav (0/1/2) + layout `"base"` keys resolve from `section`; brand `"base"`
  keys resolve KEY-based from `MENU_APPEARANCE_DEFAULTS` (no brand `block` param — 506-04
  computes each brand control's `isSet` at its call site and passes it in). A brand `"base"`
  key UNSET on tablet/mobile has no section-side desktop record ⇒ `value === undefined`
  (present-only, no "Inherited from desktop" hint).
- Device patch/resolve/read for `navChrome`; `resolveMenuSectionAppearanceForDevice`
  carries `navChrome`.
- NO `schemaVersion` bump; NO `normalizeMenuAppearance.ts` / route / migration
  change. Closure note lists the EXACT new key set for 506-02's
  `NAV_LEVEL_STYLE_COMPARE_KEYS` + navChrome compare wiring.
- Gates green: `bun --cwd core lint`, `lint:types`, root `tsc -p tsconfig.json
  --noEmit`, the model vitest suite, `test:bun` menu suites.
