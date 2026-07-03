# TASK-504-04: Design Editor — Brand & Level Controls

# FileName: TASK-504-04-Design-Editor-Brand-And-Level-Controls.md

**Parent Task:** TASK-504
**Priority:** High
**Category:** Admin UI / Menus / Site Shell
**Estimated Effort:** Large
**Dependencies:** TASK-504-01 (model: `BrandStyle`, `NavLevelStyle`/`levelStyles`, the
new clamp ranges + per-link scalar keys, and the per-device write/read/clear/resolve
helpers for the brand BLOCK style channel + the nav `levelStyles` delta channel — HARD
dependency, its exported helper API must land first), TASK-504-02 (`buildMenuDocumentPreviewCss`
must accept the canvas force-open level arg + emit `navLevelRules`/`collectMenuBrandRules`
so the canvas preview is verifiable; also emits the `:where([aria-current="page"])` current-page
rule that smoke scenario 5's front half asserts), TASK-504-03 (Front Aria-Current Stamp — the
`aria-current="page"` attribute is ABSENT in `siteShell.tsx` today, so the current-page smoke
half in scenario 5 cannot pass until 504-03 lands it), TASK-501-03 (`MenuResponsiveControlShell` +
device-forked writer idiom — ported, reused verbatim), TASK-502 (tablet cascade
un-deferred: `MENU_RESPONSIVE_BREAKPOINT_KEYS = ["tablet","mobile"]`, recursive
`renderPreviewNavItem`)
**Status:** ✅ Done
**Completed:** 2026-07-03

---

## Overview

Wire the Menu Design panel to author the new styling surface TASK-504-01/02 added to the
`menuDocumentV2` contract. Today `MenuDesignEditor.tsx` (single owned file) exposes only
Mode / Brand text / Link on the brand block (`:1298-1372`) and one flat nav-link
appearance set on the nav-items block (`:1136-1291`). This subtask adds, all inside
`core/admin/ui/menus/MenuDesignEditor.tsx`:

1. **Brand style controls, mode-gated** — text mode ⇒ fontSize / fontWeight / color /
   textTransform / letterSpacing; image mode ⇒ height / maxWidth — writing into
   `brand.props.style` (base) and, on Tablet/Mobile, into the sparse brand-block responsive
   style override (504-01's extended `MenuBlockOverride`). This ALSO includes stamping
   `data-menu-block-id={block.id}` on the CANVAS brand `<a class="site-header-brand">`
   (`MenuDesignEditor.tsx:578`), mirroring the front markup (`siteShell.tsx:414,428`), so the
   504-02 brand rule lands ON the `<a>` and DIRECTLY-set props (e.g. `font-weight`) take effect
   on canvas — not only the inheritable ones (see §3, and 504-02 §1 data-flow note).
2. **A "Level" `SegmentedControl` (Level 0 / Level 1 / Level 2)** at the top of the
   nav-items panel that REBINDS the same control set to the selected level's record:
   Level 0 writes today's nav base (`navProps` scalars via the existing `setNavField`);
   Level 1/2 write `navProps.levelStyles[N]`. Each level control shows a **Base / Override
   / "inherits level N-1"** inheritance badge (orthogonal to the device badge).
3. **Submenu CONTAINER controls for levels ≥ 1** — background / borderColor / borderWidth /
   radius / shadow / minWidth (the dropdown chrome, hardcoded today).
4. **Cheap-win controls on the nav base** — per-link paddingX / paddingY / radius, and a
   hover TEXT color (distinct from the existing hover BACKGROUND control).
5. **Per-device device-forked writes for BOTH brand and levels** via
   `MenuResponsiveControlShell` (Base/Override/Inherited badge + per-breakpoint Reset that
   prunes the stored responsive record), mirroring 501/502.
6. **Canvas force-open preview** — thread the selected nav level from editor state through
   `MenuDocumentCanvas` → `buildMenuDocumentPreviewCss(doc, device, forceOpenLevel)` so the
   sublist depth being styled is revealed on the canvas (sim-open, mirroring
   `previewMobileOpen`).
7. **Canvas brand IMAGE preview (defect B1, HIGH)** — the canvas brand `<a>` (`:578-582`) renders
   image mode as the literal text `String(block.props.image.alt) || "Logo"`, NOT an `<img>`. Wire
   the 504-01-normalized `{asset/src}`-resolvable brand-image shape into the canvas preview so it
   renders a real `<img>` (matching the front §504-03-5), replacing the "Logo" text fallback (§7).
8. **Nav font-size slider — unset ≠ explicit 15 (defect B2, LOW)** — the Font-size `SliderControl`
   shows `navProps.fontSize ?? FONT_SIZE_FALLBACK` (15, `:281`/`:1170`) at the UNSET position, but
   an UNSET `fontSize` emits `font-size:inherit` (theme ~16px, `menuDocumentCss.ts:152`) — the
   slider MISLEADS. Render the UNSET state distinctly (§8).
9. **Items-count badge — "N items" mislabel (defect B3, LOW)** — a ONE-LINE fix in the SECOND
   owned file `core/admin/ui/menus/MenuEditorPage.tsx` (§9).

No route/RBAC/endpoint/migration and no `schemaVersion` bump: every write rides the
existing `updateDoc` reducer → validated `PATCH /menus/:id`. This subtask touches NO
production file other than `MenuDesignEditor.tsx` AND `MenuEditorPage.tsx` (the latter ONLY for
the one-line items-count badge fix, §9 — single-writer: no other 504 subtask writes it).
(`MenuAppearancePanel.tsx` is dead — grep shows it is imported nowhere; leave it untouched.)

### Security Contract

UI/client-state + schema-first document contract extension; **no new route/RBAC/endpoint/
migration**. The editor only assembles the same `MenuDocumentV2` object the validated
`PATCH /menus/:id` envelope (`menuUpdateSchema.document`) already accepts; all new fields
are validated server-side on the strict-write path (504-01 reject-unknown + `MenuDocumentError`
`path`) and on the fail-closed read path. No `menuDocumentV2` `schemaVersion` bump. No new
secrets, tokens, rate-limit buckets, or authz surface. The editor never bypasses the
normalizer — an out-of-range slider value is clamped, an unknown key is impossible to emit
(the writers only ever set allow-listed keys).

---

## Dependency contract — helpers imported from 504-01 / 504-02

504-04 is a pure CONSUMER of the following (single-writer discipline: 504-01 owns
`menuDocumentV2.ts`, 504-02 owns `menuDocumentCss.ts`; this file only imports). If any
signature differs at land time, reconcile in 504-01/02 — do NOT re-implement doc-shape
mutation locally.

```ts
// from ../../../services/menus/menuDocumentV2  (owned by 504-01)
type BrandStyle;              // {fontSize?,fontWeight?,color?,textTransform?,letterSpacing?,height?,maxWidth?}
type NavLevelStyle;           // link + container fields (see parent §Feature Contracts (2))
type NavLevelStyleLevel = 1 | 2;
const BRAND_STYLE_NUMBER_RANGES: { fontSize; letterSpacing; height; maxWidth };  // {min,max}
const NAV_LEVEL_NUMBER_RANGES: { fontSize; gap; paddingX; paddingY; borderWidth; radius; minWidth };
const NAV_LINK_NUMBER_RANGES:  { paddingX; paddingY; radius };  // NEW per-link base scalars (cheap win 4a)

// --- BRAND per-device style channel (504-01 extends MenuBlockOverride to {visibility?; style?: BrandStyle}) ---
function resolveMenuBrandStyleForDevice(block: MenuBlockV2, device: MenuDeviceKind): BrandStyle;      // base ⊕ override, DISPLAY
function readMenuBrandStyleOverrideValue(block, breakpoint: MenuResponsiveBreakpoint, key: keyof BrandStyle): unknown | undefined;   // raw override leaf, DETECTION (tablet|mobile only)
function patchMenuBrandStyleForDevice(doc, blockId, device: MenuDeviceKind, patch: Partial<BrandStyle>): MenuDocumentV2; // desktop⇒props.style base; tablet/mobile⇒responsive[device].style; undefined⇒delete+prune
function clearMenuBrandStyleOverride(doc, blockId, breakpoint: MenuResponsiveBreakpoint, key: keyof BrandStyle): MenuDocumentV2; // tablet|mobile only

// --- NAV levelStyles per-device delta channel (rides section.responsive[device].navProps.levelStyles) ---
function resolveMenuNavLevelStyle(section, device: MenuDeviceKind, level: NavLevelStyleLevel): NavLevelStyle;          // base ⊕ override, DISPLAY
function readMenuNavLevelStyleOverrideValue(section, breakpoint: MenuResponsiveBreakpoint, level, key: keyof NavLevelStyle): unknown | undefined; // DETECTION (tablet|mobile only)
function patchMenuNavLevelStyleForDevice(doc, sectionId, device: MenuDeviceKind, level, patch: Partial<NavLevelStyle>): MenuDocumentV2; // desktop⇒props.levelStyles[level]; tablet/mobile⇒responsive[device].navProps.levelStyles[level]; undefined⇒delete+prune-level+prune-levelStyles
function clearMenuNavLevelStyleOverride(doc, sectionId, breakpoint: MenuResponsiveBreakpoint, level, key: keyof NavLevelStyle): MenuDocumentV2; // tablet|mobile only
```

```ts
// from ../../../site/menuDocumentCss  (owned by 504-02)
// EXTENDED signature — third arg is the canvas-only force-open depth:
function buildMenuDocumentPreviewCss(
  doc: MenuDocumentV2,
  device: PageBreakpoint,
  forceOpenLevel?: NavLevelStyleLevel,   // CUMULATIVE depth (see below): 1 ⇒ open depth 1; 2 ⇒ open depths 1 AND 2; undefined ⇒ today's behavior (byte-identical)
): string;
```

> **CUMULATIVE force-open semantics (contract owned HERE by 504-04; emission owned by 504-02):**
> `forceOpenLevel` is a DEPTH THRESHOLD, not a single-depth toggle. The level-2 sublist is the
> nested `.site-nav-sublist .site-nav-sublist` (verified `renderPreviewNavItem` :508-512,
> `navNestingRules` `menuDocumentCss.ts:400-406`), which lives INSIDE the level-1
> `.site-nav-item > .site-nav-sublist`; BOTH default to `display:none` (`menuDocumentCss.ts:400`).
> A `display:none` ANCESTOR hides its descendants regardless of their own `display`, so revealing
> only the nested depth leaves the level-1 parent closed and the author sees NOTHING. Therefore:
> - `forceOpenLevel=1` MUST emit `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid}` (depth 1).
> - `forceOpenLevel=2` MUST emit BOTH the depth-1 rule above AND `${menuDocScope} .site-nav-sublist .site-nav-sublist{display:grid}` (depth 2) — depth 1 opens the parent, depth 2 opens the nested fly-out inside it.
> Both rules are emitted LAST (after `navNestingRules` `:400`) so they win the `display:none` on
> source order (mirroring `previewMobileOpen` `:461-466`). 504-02 owns the emission code; this
> cumulative contract is stated here so a literal implementer does not read "2 ⇒ reveal nested"
> as depth-2-only and break smoke scenario 2's `getComputedStyle(sublist).display !== "none"`.

> **Byte-identity guard for the new arg:** `buildMenuDocumentPreviewCss(doc, device)` with
> `forceOpenLevel` omitted MUST be byte-identical to today (default param, no branch taken).
> 504-02 owns the assertion; 504-04 relies on it so existing canvas tests stay green.

---

## Execution-ready implementation

### 1. New editor state + threading (main `MenuDesignEditor` component, `:1486-1495`)

The force-open level must be visible to BOTH the panel (which sets it) and the canvas
(which consumes it), so it lives in the top-level component beside `device`/`selectedId`.

```tsx
// alongside the existing useState block (:1488-1495)
const [navLevel, setNavLevel] = useState<0 | 1 | 2>(0);

// Reset the level to base whenever the selected block changes away from nav-items,
// so a stale force-open level never lingers on the brand/cta canvas. Derive — no effect:
const selectedBlock = findMenuBlock(doc, selectedId);            // existing :1538
const navLevelActive = selectedBlock?.type === "nav-items" ? navLevel : 0;
const forceOpenLevel = navLevelActive >= 1 ? (navLevelActive as 1 | 2) : undefined;
```

> Do NOT drive `setNavLevel(0)` from a `useEffect` on `selectedId` — that reintroduces the
> setState-in-effect anti-pattern the memory flags. `navLevelActive` (a pure derivation)
> already neutralizes a stale level for non-nav blocks; the raw `navLevel` state persists
> so re-selecting nav-items restores the author's last level.

Thread `forceOpenLevel` into the canvas (`:1721`):

```tsx
<MenuDocumentCanvas
  doc={doc} device={device} items={items} navLabel={navLabel}
  siteName={siteName} tokenVariables={canvasSiteTokenVariables}
  selectedId={selectedId} onSelect={setSelectedId}
  forceOpenLevel={forceOpenLevel}     // NEW
/>
```

And through the `<MenuBlockPanel …>` RENDER SITE (`:1738`, props end `:1747`) so the nav
panel can drive it — NOT the sibling `<MenuBarPanel …>` branch (`:1749-1758`), which also
accepts `doc`/`device`/`palette`/`updateDoc` and is the wrong target:

```tsx
<MenuBlockPanel ...existing (block/doc/device/palette/siteName/updateDoc/onRemove/onMove, :1738-1747)
  navLevel={navLevel} onNavLevelChange={setNavLevel} />   // NEW props
```

Widen `MenuBlockPanel`'s OWN prop signature at `:972` (the destructure `:972-981` + its type
object opening `:981`) to add `navLevel: 0 | 1 | 2` and `onNavLevelChange: (n: 0 | 1 | 2) => void`
— see §4, which consumes them.

### 2. `MenuDocumentCanvas` — consume the force-open arg (`:621-680`)

```tsx
function MenuDocumentCanvas({ doc, device, /*…*/, forceOpenLevel }: {
  /*…existing…*/ forceOpenLevel?: 1 | 2;
}) {
  const css = useMemo(
    () => buildMenuDocumentPreviewCss(doc, device, forceOpenLevel),   // was (doc, device)
    [doc, device, forceOpenLevel],
  );
  /* …unchanged… */
}
```

The `useMemo` dep array MUST list `forceOpenLevel` (a missing dep = stale sim-open CSS;
lint would flag it). Everything else is unchanged — the force-open rules are emitted by
504-02 inside the shared builder, so front↔canvas parity holds automatically.

### 3. Brand style controls, mode-gated + device-forked (in `MenuBlockPanel`, brand branch `:1298`)

**Prerequisite DOM stamp (canvas parity — REQUIRED deliverable, 504-02 §1 assigns it here).**
The canvas brand `<a class="site-header-brand">` (`MenuDesignEditor.tsx:578`) currently carries
NO `data-menu-block-id` — only its wrapper `SelectableBlock` `<div>` (`:303`) does — so the
504-02 brand rule `[data-menu-block-id="<esc>"]{…}` lands on the WRAPPER, and directly-set props
like `font-weight` never reach the `<a>` (the base `.site-header-brand{font-weight:600}` at
`menuDocumentCss.ts:535` beats wrapper inheritance). Stamp `data-menu-block-id={block.id}` on the
canvas brand `<a>` at `:578`, mirroring the front markup (`siteShell.tsx:414,428`), so the rule
lands ON the `<a>` and directly-set props take effect on canvas (this is what makes smoke #1's
CANVAS `font-weight` assertion pass — see §Smoke #1). This is a one-line render-markup edit inside
the sole owned file; it emits no CSS (504-02 owns emission) and is byte-identity-safe (adds only a
data attribute, no visual default).

Add the controls INSIDE the existing `block.type === "brand"` block, after the Mode/Text/Link/Logo
controls. Reuse `SliderControl` / `SegmentedControl` / `ColorSwatchControl` (already
imported `:100-106`). Display resolved values; detect override off the RAW base record.

```tsx
// derive once at the top of the brand branch:
const brandStyle: BrandStyle = resolveMenuBrandStyleForDevice(block, device);
const brandOverride = (key: keyof BrandStyle) =>
  isMenuOverrideDevice(device) &&
  readMenuBrandStyleOverrideValue(block, device, key) !== undefined;
const setBrand = <K extends keyof BrandStyle>(key: K, value: BrandStyle[K] | undefined) =>
  updateDoc((current) => patchMenuBrandStyleForDevice(current, block.id, device, { [key]: value }));
const resetBrand = (key: keyof BrandStyle) => () =>
  updateDoc((current) => clearMenuBrandStyleOverride(current, block.id, device, key));

// wrap EVERY style control identically to the nav controls:
const brandStyleControl = (key, label, node) => (
  <MenuResponsiveControlShell device={device} override={brandOverride(key)}
    label={label} onReset={resetBrand(key)}>{node}</MenuResponsiveControlShell>
);
```

Text mode (`block.props.mode === "text"`):

```tsx
{block.props.mode === "text" ? (<>
  {brandStyleControl("fontSize", "Brand font size",
    <SliderControl label="Brand font size"
      value={brandStyle.fontSize ?? BRAND_STYLE_NUMBER_RANGES.fontSize.min}
      min={BRAND_STYLE_NUMBER_RANGES.fontSize.min} max={BRAND_STYLE_NUMBER_RANGES.fontSize.max}
      step={1} unit="px" onChange={(n) => setBrand("fontSize", n)} />)}
  {brandStyleControl("fontWeight", "Brand font weight",
    <SegmentedControl label="Brand font weight"
      value={brandStyle.fontWeight ? String(brandStyle.fontWeight) : FONT_WEIGHT_INHERIT}
      options={fontWeightOptions} optionLabels={fontWeightLabels}
      onChange={(next) => setBrand("fontWeight",
        next === FONT_WEIGHT_INHERIT ? undefined : (Number(next) as MenuAppearanceFontWeight))} />)}
  {brandStyleControl("color", "Brand color",
    <ColorSwatchControl label="Brand color" palette={palette}
      value={toSwatchValue(brandStyle.color ?? "inherit")}
      onChange={(v) => setBrand("color", v === null ? undefined : v)} />)}
  {brandStyleControl("textTransform", "Brand text transform",
    <SegmentedControl label="Brand text transform"
      value={brandStyle.textTransform ?? "none"} options={menuAppearanceTextTransforms}
      optionLabels={textTransformLabels}
      onChange={(next) => setBrand("textTransform", next as MenuAppearance["textTransform"])} />)}
  {brandStyleControl("letterSpacing", "Letter spacing",
    <SliderControl label="Letter spacing" value={brandStyle.letterSpacing ?? 0}
      min={BRAND_STYLE_NUMBER_RANGES.letterSpacing.min} max={BRAND_STYLE_NUMBER_RANGES.letterSpacing.max}
      step={1} unit="px" onChange={(n) => setBrand("letterSpacing", n)} />)}
</>) : null}
```

Image mode (`block.props.mode === "image"`), beside the existing `MediaPickerControl`:

```tsx
{block.props.mode === "image" ? (<>
  {brandStyleControl("height", "Logo height",
    <SliderControl label="Logo height" value={brandStyle.height ?? BRAND_STYLE_NUMBER_RANGES.height.min}
      min={BRAND_STYLE_NUMBER_RANGES.height.min} max={BRAND_STYLE_NUMBER_RANGES.height.max}
      step={1} unit="px" onChange={(n) => setBrand("height", n)} />)}
  {brandStyleControl("maxWidth", "Logo max width",
    <SliderControl label="Logo max width" value={brandStyle.maxWidth ?? BRAND_STYLE_NUMBER_RANGES.maxWidth.max}
      min={BRAND_STYLE_NUMBER_RANGES.maxWidth.min} max={BRAND_STYLE_NUMBER_RANGES.maxWidth.max}
      step={1} unit="px" onChange={(n) => setBrand("maxWidth", n)} />)}
</>) : null}
```

**Sparse-write contract:** `setBrand(key, undefined)` (e.g. font weight "Theme") must DELETE
the key (`patchMenuBrandStyleForDevice` prunes → the pruned `style` disappears → legacy brand
byte-identity holds). The color control maps the swatch's `null` to `undefined` (omit) rather
than the literal `"transparent"` used for nav backgrounds — brand `color` at default means
"inherit", so an omitted key is correct and keeps the emission absent (zero bytes).

### 4. Nav-items panel — Level SegmentedControl + rebound control set (nav branch `:1136`)

Add `navLevel` / `onNavLevelChange` to `MenuBlockPanel`'s prop type (`:972` destructure
`:972-981` + type object opening `:981` — same widening cited in §1). At the TOP of the
`block.type === "nav-items"` grid, before the existing Orientation control:

```tsx
<SegmentedControl
  label="Nesting level"
  value={String(navLevel)}
  options={["0", "1", "2"]}
  optionLabels={{ "0": "Level 0", "1": "Level 1", "2": "Level 2+" }}
  onChange={(next) => onNavLevelChange(Number(next) as 0 | 1 | 2)}
/>
```

The remaining nav controls are then rendered by a single branch on `navLevel`:

- **`navLevel === 0`** ⇒ render the EXISTING control set UNCHANGED (`setNavField` writer,
  `navProps` display, `navOverride`/`resetNav`, `:1146-1291`). Level 0 IS today's nav base;
  do not fork it.
- **`navLevel === 1 || navLevel === 2`** ⇒ render the level-bound control set below, writing
  `navProps.levelStyles[navLevel]` (device-forked).

Level-bound writer/detector (compute inside the nav branch when `navLevel >= 1`):

```tsx
const level = navLevel as 1 | 2;
const section = doc.sections[0];
const levelStyle: NavLevelStyle = section ? resolveMenuNavLevelStyle(section, device, level) : {};
const levelOverride = (key: keyof NavLevelStyle) =>
  section !== undefined && isMenuOverrideDevice(device) &&
  readMenuNavLevelStyleOverrideValue(section, device, level, key) !== undefined;
const setLevel = <K extends keyof NavLevelStyle>(key: K, value: NavLevelStyle[K] | undefined) =>
  updateDoc((current) => {
    const target = current.sections[0];
    return target ? patchMenuNavLevelStyleForDevice(current, target.id, device, level, { [key]: value }) : current;
  });
const resetLevel = (key: keyof NavLevelStyle) => () =>
  updateDoc((current) => {
    const target = current.sections[0];
    return target && isMenuOverrideDevice(device)
      ? clearMenuNavLevelStyleOverride(current, target.id, device, level, key) : current;
  });

// two badge axes:
//  • device axis  → MenuResponsiveControlShell (Base/Override/Inherited vs breakpoint)
//  • level axis   → NavLevelInheritBadge below (does this field override level N-1?)
const levelControl = (key, label, node) => (
  <MenuResponsiveControlShell device={device} override={levelOverride(key)} label={label} onReset={resetLevel(key)}>
    <div className="grid gap-1">
      {node}
      <NavLevelInheritBadge level={level} overridden={levelStyle[key] !== undefined} />
    </div>
  </MenuResponsiveControlShell>
);
```

`NavLevelInheritBadge` (small local component, reuses the badge chrome from
`MenuResponsiveStateBadge` `:405-433`):

```tsx
function NavLevelInheritBadge({ level, overridden }: { level: 1 | 2; overridden: boolean }) {
  return (
    <span data-menu-level-field={overridden ? "override" : "inherited"}
      className={/* same pill classes as MenuResponsiveStateBadge */}>
      {overridden ? "This level" : `Inherits level ${level - 1}`}
    </span>
  );
}
```

Level-bound LINK controls (all levels 1 & 2), each wrapped by `levelControl`:

| field | control | range / enum |
|---|---|---|
| `linkColor` | `ColorSwatchControl` | `normalizeMenuColorValue` swatch |
| `linkHoverColor` | `ColorSwatchControl` (label "Hover background") | swatch (504-02 emits `:hover{background}`) |
| `linkHoverTextColor` | `ColorSwatchControl` (label "Hover text") | swatch (504-02 emits `:hover{color}`) |
| `linkActiveColor` | `ColorSwatchControl` (label "Active background") | swatch (504-02 emits `:active{background}`) |
| `fontSize` | `SliderControl` | `NAV_LEVEL_NUMBER_RANGES.fontSize` |
| `fontWeight` | `SegmentedControl` | `fontWeightOptions` (+ Theme⇒`undefined`) |
| `gap` | `SliderControl` | `NAV_LEVEL_NUMBER_RANGES.gap` |
| `paddingX` | `SliderControl` | `NAV_LEVEL_NUMBER_RANGES.paddingX` |
| `paddingY` | `SliderControl` | `NAV_LEVEL_NUMBER_RANGES.paddingY` |

Level-bound CONTAINER controls (levels ≥ 1 ONLY — always true in this branch; the dropdown
chrome), each wrapped by `levelControl`, under a "Dropdown container" sub-heading:

| field | control | range / enum |
|---|---|---|
| `background` | `ColorSwatchControl` | swatch (`null`⇒`undefined`) |
| `borderColor` | `ColorSwatchControl` | swatch |
| `borderWidth` | `SliderControl` | `NAV_LEVEL_NUMBER_RANGES.borderWidth` |
| `radius` | `SliderControl` | `NAV_LEVEL_NUMBER_RANGES.radius` |
| `shadow` | `SegmentedControl` | `menuAppearanceShadows` + `shadowLabels` |
| `minWidth` | `SliderControl` | `NAV_LEVEL_NUMBER_RANGES.minWidth` |

### 5. Cheap-win controls on the nav BASE (level 0 set, `:1146`)

Add to the `navLevel === 0` control set (they are base `NavItemsProps` scalars, so they use
the EXISTING `setNavField` device-forked writer + `navOverride`/`resetNav` machinery — free
per-device via the delta channel):

- **`linkPaddingX` / `linkPaddingY` / `linkRadius`** — three `SliderControl`s, ranges from
  `NAV_LINK_NUMBER_RANGES` (504-01). Labels: "Link padding X / Y", "Link radius".
- **`linkHoverTextColor`** — a NEW `ColorSwatchControl` labelled **"Hover text"**, distinct
  from the existing `linkHoverColor` control which stays labelled "Hover background"
  (`:1229-1247`). Writes `setNavField("linkHoverTextColor", v === null ? undefined : v)`
  (omit at default so the base-only text `color:hover` rule is absent = zero bytes).

> Field names above (`linkPaddingX/Y`, `linkRadius`, `linkHoverTextColor`) are the 504-01
> `NAV_ITEMS_PROP_KEYS` widening; import them as typed `NavItemsProps` keys — the compiler
> enforces the contract, so a rename in 504-01 is a type error here, not a silent no-op.

### 6. Canvas force-open — end-to-end wiring recap

`navLevel` state (main component) → `MenuBlockPanel.onNavLevelChange` sets it when the
author picks a level → `forceOpenLevel` derivation (nav-items selected + level ≥ 1) →
`MenuDocumentCanvas.forceOpenLevel` → `buildMenuDocumentPreviewCss(doc, device, forceOpenLevel)`.
504-02 emits the sim-open rule(s) LAST (wins the `display:none`), mirroring `previewMobileOpen`
(`menuDocumentCss.ts:461-466`). Because `forceOpenLevel` is CUMULATIVE (a depth threshold — see
the dependency-contract note above): Level 1 opens ONLY depth 1
(`.site-nav-list > .site-nav-item > .site-nav-sublist{display:grid}`), revealing the first
dropdown; Level 2 opens BOTH depth 1 AND depth 2 (`.site-nav-sublist .site-nav-sublist{display:grid}`)
— depth 1 must open the level-1 parent or its `display:none` would keep the nested fly-out hidden
regardless (`menuDocumentCss.ts:400`). Result: the author SEES the exact depth being styled
without hovering, and smoke scenario 2's `getComputedStyle(sublist).display !== "none"` holds at
both depths.

### 7. Canvas brand IMAGE preview — render a real `<img>` (defect B1, HIGH)

The canvas brand `<a>` (`:578-582`) renders image mode as the literal text
`String(block.props.image.alt ?? "") || "Logo"` — NOT an `<img>` — so the author never sees the
logo and the 504-02 `[data-menu-block-id] img{…}` sizing rule has no target on canvas. Consume the
504-01-normalized `{asset/src}`-resolvable brand-image shape (§504-01 (3a), the SAME shape the
front §504-03-5 consumes) and render a real `<img>` in the canvas brand preview:

```tsx
// canvas brand render (:578) — image mode ⇒ real <img> from the normalized shape + src GUARD.
const resolvedSrc = resolveBrandImageSrc(block.props.image);   // same resolution as the front leaf
<a className="site-header-brand" href={href} onClick={(e) => e.preventDefault()}
   data-menu-block-id={block.id}>                              {/* stamp from §3 — rule reaches the img */}
  {block.props.mode === "image" && resolvedSrc
    ? <img src={resolvedSrc} alt={String(block.props.image?.alt ?? "")} />
    : (block.props.text || siteName || "Site name")}           {/* text fallback, unchanged */}
</a>
```

- The `<img>` is SIZED by 504-02's `[data-menu-block-id] img{height;max-width;width:auto}` rule
  (the `data-menu-block-id` stamp from §3 makes the rule reach it), so brand image-mode `height` /
  `maxWidth` controls (§3, image mode) now have a live target on canvas — smoke #1's image-mode
  canvas geometry assertion becomes valid (previously front-only per 504-02 §1). If `resolveBrandImageSrc`
  returns empty (no logo), fall through to the text fallback (no broken `<img>`).
- Use the SAME `resolveBrandImageSrc` / normalized shape 504-01 defines and 504-03 consumes — do
  NOT invent a canvas-only resolution.

### 8. Nav font-size slider — render the UNSET state distinctly (defect B2, LOW)

The Font-size `SliderControl` (`:1170`) displays `navProps.fontSize ?? FONT_SIZE_FALLBACK` where
`FONT_SIZE_FALLBACK = 15` (`:281`), but an UNSET `fontSize` emits `font-size:inherit` which the
theme resolves to ~16px (`menuDocumentCss.ts:152`) — so the slider shows "15" for a link that
actually renders at 16, and an author who explicitly picks 15 sees no visual change. FIX (DISPLAY
ONLY — do NOT change the CSS emission semantics, and do NOT write on mount):

- Show the TRUE inherited value at the unset position: display the theme-inherited size (16, a
  `NAV_FONT_SIZE_INHERITED = 16` constant reflecting the `font-size:inherit` resolution) instead of
  the misleading `15`, AND mark the control state as inherited (e.g. an "Inherited" hint / the
  existing `MenuResponsiveControlShell` Base/Inherited affordance) so UNSET (inherits 16) reads
  distinctly from an EXPLICIT `16`.
- The slider's `onChange` still writes `setNavField("fontSize", next)` (an explicit value); this
  change touches only the DISPLAYED default when `navProps.fontSize === undefined`. `font-size:inherit`
  emission (504-02 group 5 present-only) is unchanged — a truly unset field still emits nothing.

### 9. Items-count badge — fix "N items" mislabel (defect B3, LOW — `MenuEditorPage.tsx`)

`MenuEditorPage.tsx` computes `const rootCount = items.filter((i) => i.parentId === null).length`
(`:801`) and renders `<Badge>{`${rootCount} items`}</Badge>` (`:998`), so a 4-item nested menu with
1 root shows "1 items" (wrong count AND wrong plural). ONE-line fix in this second owned file:

- Count TOTAL items — `const itemCount = items.length` — (or, if the badge is meant to convey
  top-level structure, RELABEL to "top-level" while keeping `rootCount`); AND pluralize:
  `` `${itemCount} ${itemCount === 1 ? "item" : "items"}` ``. Prefer the TOTAL count + pluralize
  (matches author intuition: a 4-item menu shows "4 items", a 1-item menu shows "1 item").
- No other change to `MenuEditorPage.tsx`; single-writer boundary respected (§Overview).

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`: the Vitest (Bun-free) lane covers this editor component;
the Bun lane (owned by 504-05 for render/route byte-identity) is referenced here only for
the cross-file parity guarantees this editor depends on.

### Vitest (Bun-free) — `tests/vitest/ui/menu-design-editor.test.tsx`

Extend the existing suite (Testing Library, `render` + user events; a `console.error` spy
asserts NO setState-in-effect warnings, matching the 501/502 pattern):

1. **Brand style controls are mode-gated.** Select a brand block in text mode ⇒ font
   size / weight / color / transform / letter-spacing controls present; switch Mode to
   image ⇒ those disappear and height / max-width appear (and vice-versa). Assert the
   `updateDoc` payload writes into `brand.props.style` (base, Desktop) with ONLY the touched
   key; setting font weight to "Theme" DELETES `style.fontWeight`.
2. **Level SegmentedControl rebinds the control set.** Nav-items selected: default level 0
   renders the existing controls and writes `navProps` scalars. Choosing "Level 1" swaps to
   the level control set (incl. Dropdown container controls); a write lands in
   `navProps.levelStyles[1]`, NOT `navProps` scalars. Choosing "Level 2+" writes
   `levelStyles[2]`. Level 0 never writes `levelStyles`.
3. **`NavLevelInheritBadge` axis.** A level-1 field with no override shows "Inherits level 0";
   after a write it shows "This level" (`data-menu-level-field="override"` ⇒ `"inherited"`
   toggling on the exact field only, siblings unaffected).
4. **Device-forked writes for brand AND levels.** With `DeviceSwitcher` on Mobile: a brand
   style write lands in the block's `responsive.mobile.style` (sparse) not `props.style`; a
   level-1 write lands in `responsive.mobile.navProps.levelStyles[1]`. The
   `MenuResponsiveControlShell` badge reads "Override"; Desktop reads "Base". Tablet forks
   independently (Override on tablet, still Base-derived vs Desktop).
5. **Reset prunes the stored record.** On Mobile, override brand fontSize + level-1
   linkColor, then click each Reset ⇒ `clearMenuBrandStyleOverride` /
   `clearMenuNavLevelStyleOverride` fire; the resulting doc has the responsive leaves removed and
   empty parents pruned (deep-equal the pre-override doc for that branch).
6. **Cheap-win controls.** Level-0 nav panel exposes Link padding X/Y, Link radius, and a
   "Hover text" control SEPARATE from "Hover background"; each writes the correct
   `NavItemsProps` key; "Hover text" default (`null`) omits `linkHoverTextColor`.
7. **Canvas force-open threading.** Selecting Level 1 on a nav-items block calls
   `buildMenuDocumentPreviewCss` with `forceOpenLevel === 1` (spy/mock the builder or assert
   via the emitted `<style>` containing the sim-open selector); selecting a non-nav block
   passes `undefined` (`navLevelActive` derivation neutralizes stale level — no effect used).
8. **No setState-in-effect.** `console.error` spy empty across the whole suite (the
   `navLevel` reset is a pure derivation, not an effect).
9. **Canvas brand IMAGE preview (B1).** A brand block in image mode with a configured logo renders
   an `<img>` with a resolved (non-empty) `src` on the canvas (NOT the literal "Logo" text); an
   image-mode brand with no logo falls back to text; a text-mode brand is unchanged.
10. **Nav font-size slider unset display (B2).** With `navProps.fontSize` UNSET, the Font-size
    control displays the inherited value (16) and reads as inherited/base — distinct from an
    explicit `15`; picking a value writes `navProps.fontSize` and leaving it untouched writes
    nothing (no font-size emission).
11. **Items-count badge (B3).** In the MenuEditorPage suite (`tests/vitest/ui/menu-editor.test.tsx`,
    NOT `menu-design-editor.test.tsx`), rendering `MenuEditorPage` with a 4-item nested menu (1 root)
    shows "4 items" (TOTAL count, not "1 items"); a single-item menu shows "1 item" (singular).

### Cross-file parity guards this editor RELIES ON (owned by 504-02 / 504-05, named here)

- `buildMenuDocumentPreviewCss(doc, device)` with `forceOpenLevel` OMITTED is byte-identical
  to today (`tests/unit/site/menu-document-render.test.tsx` no-override byte-stable guard, plus
  `tests/vitest/services/menu-document-v2.test.ts` which invokes the preview builder) —
  guarantees the third arg is additive and existing canvas snapshots stay green.
- All new CSS routes through the ONE `buildMenuRuleSetsForDocument` so the canvas preview and
  the front `@media` sheet never diverge (front↔canvas parity, 504-02/05).
- `tests/unit/pages/siteShellCss.test.ts` (`buildSiteShellCss(null)` byte-identical) and the
  no-override `menu-document-render.test.tsx` guard: the editor MUST NEVER emit a non-sparse
  record (a control at its default value writes nothing) — test 1/6 above assert the
  omit-at-default behavior that keeps those base-sheet guards green.
- **Reject-unknown / fail-closed READ traps** (owned by 504-01, depended on here): the editor
  can only ever set allow-listed keys (`BrandStyle` / `NavLevelStyle` / widened `NavItemsProps`
  keys are typed), so it can NEVER emit an unknown key — the type system is the first gate; the
  round-trip tests for `"style"` ∈ `BRAND_PROP_KEYS` and `"levelStyles"` ∈ the nav-native key
  set are 504-01's responsibility and MUST be green before this editor is verifiable.

### SMOKE — ≥ 5 DISTINCT real-flow scenarios (owner mandate; measure VISIBLE EFFECT)

Run with `playwright-cli` in the LIVE admin canvas AND on the front (`:3000`). Start
`coderso-dev-core-host` if the admin page is white/down; confirm the Soft-Violet theme is
active (deactivate any stale active profile + hard-refresh). Every assertion measures a
COMPUTED style / geometry, NOT the presence of a control. These are 504-04-driven flows;
504-05 aggregates the closure smoke run.

1. **Brand style — text + image visible effect.** Select the brand block (text mode); set
   font size + font weight + color + text transform. Assert the canvas brand `<a>`'s computed
   `font-size` / `font-weight` / `color` / `text-transform` CHANGED — the canvas `font-weight`
   assertion is valid here (NOT front-only, unlike 504-02's own smoke, which runs before this
   subtask lands) BECAUSE §3 stamps `data-menu-block-id={block.id}` on the canvas brand `<a>`
   (`:578`) so directly-set props reach the `<a>`. Then reload the front and assert the SAME
   computed values on the published `.site-header-brand`. Switch Mode to image,
   pick a logo, set height + max width; assert the brand `img`'s computed `height` /
   `max-width` CHANGED (geometry) on canvas AND front.

2. **Per-level styling 0/1/2 independently, each at the RIGHT depth.** Style level 0 (top-bar
   link color + size), level 1 (first-dropdown link color + container background/border/radius),
   level 2 (nested link color). Pick each level in the panel and assert the canvas FORCE-OPEN
   reveals that depth (`getComputedStyle(sublist).display !== "none"`) and the styled
   link/container shows the authored values. On the FRONT, HOVER to open each depth and assert
   the computed style applies at that depth ONLY (top-bar link ≠ level-1 link ≠ level-2 link);
   the level-2 descendant selector also styles a level-3 item.

3. **Per-device brand + level override + reset across desktop/tablet/mobile.** On Mobile
   (`DeviceSwitcher`), override brand font size and level-1 link color; at the 390px viewport
   assert the computed value differs from Desktop and at 1280px matches Desktop. Click each
   Mobile Reset; assert the stored `responsive.mobile` record is pruned verbatim and the
   computed value reverts to the Desktop base. Repeat one field on Tablet (at the 768px
   viewport, assert it applies in the bounded 640–1023 range) and confirm Mobile does NOT
   inherit Tablet.

4. **Sublist chrome (level ≥ 1 container).** Author the level-1 container background + border +
   shadow + radius + min-width; HOVER open the dropdown on the front and assert the
   `.site-nav-sublist` computed `background-color` / `border` / `box-shadow` / `border-radius` /
   `min-width` match the authored values (proving the hardcoded base chrome is OVERRIDDEN from
   the doc-scoped sheet; the base sheet is untouched).

5. **Hover-text + current-page + link padding (cheap wins).** On the nav base (level 0) set a
   "Hover text" color and per-link paddingX/paddingY; on the front hover a top-bar link and
   assert its computed text `color` changes (NOT just the background pill) and its computed
   padding matches. Navigate to the active page and assert the link carrying
   `aria-current="page"` (stamped by 504-03; ABSENT in `siteShell.tsx` today, so this half
   depends on 504-03 landing the stamp AND 504-02 emitting the `:where([aria-current="page"])`
   rule) shows the current-page computed styling.
   NOTE: the canvas has NO current-page/route concept — `renderPreviewNavItem` (`:490-516`)
   stamps no `aria-current` and this subtask's `MenuDesignEditor.tsx` body (§1-6) adds none
   (canvas nav items come from the published tree with hrefs only, no "active" data source). So
   the current-page half is a FRONT-ONLY assertion; do NOT assert a canvas `NavItemsPreview`
   aria-current mirror (unimplementable as scoped — deferred with the active-item indicator, see
   §Deferred).

---

## Acceptance Criteria (measured LIVE)

- Brand style controls are mode-gated (text vs image) and produce a visible computed-style
  change on canvas AND front; a control left at default writes nothing (sparse); legacy brand
  blocks round-trip byte-identical. The canvas brand `<a>` (`:578`) carries
  `data-menu-block-id={block.id}` so DIRECTLY-set props (e.g. `font-weight`) take effect on
  canvas, reaching parity with the front (not only inheritable props).
- The Level SegmentedControl rebinds the control set: Level 0 writes the nav base; Level 1/2
  write `navProps.levelStyles[N]`; the "inherits level N-1" badge tracks per-field override.
- Submenu container controls (levels ≥ 1) override the hardcoded dropdown chrome from the doc
  scope; per-link padding/radius + a distinct hover-text control work on the nav base.
- Brand AND level styles fork per device (tablet + mobile) via `MenuResponsiveControlShell`
  with Base/Override/Inherited badge; Reset prunes the stored responsive record verbatim;
  cascade follows Pages (tablet + mobile inherit Desktop; mobile ≠ tablet).
- Selecting a level ≥ 1 force-opens that sublist depth on the canvas via the extended
  `buildMenuDocumentPreviewCss` arg; non-nav selection passes `undefined` (canvas byte-identical
  to today).
- Canvas brand IMAGE mode (defect B1) renders a real `<img>` with a resolved `src` (not the "Logo"
  text), so image-mode `height`/`maxWidth` controls show a visible effect on canvas AND front.
- The nav Font-size slider (defect B2) renders the UNSET state distinctly — showing the inherited
  value (16) as inherited/base, not a misleading explicit 15 — without changing CSS emission.
- The items-count badge (defect B3, `MenuEditorPage.tsx`) shows the TOTAL item count with correct
  pluralization ("4 items", "1 item"), not "1 items".
- Only `core/admin/ui/menus/MenuDesignEditor.tsx` AND `core/admin/ui/menus/MenuEditorPage.tsx` (the
  latter only the §9 one-liner) are modified in this subtask; no setState-in-effect (console.error
  spy clean); Vitest editor suite + lint + types + root `tsc` green.

---

## Deferred (state in the 504 changelog residuals)

- Levels 3+ as independent editor targets (Level 2+ authors them uniformly via the descendant
  selector).
- Custom font-family / line-height controls for brand and levels.
- Active-item indicator pill/underline editor (beyond the `aria-current` current-page color).
- Mobile-drawer styling controls — the drawer section is not front-rendered yet
  (`siteShell.tsx:311-313` composes only `sections[0]`).
