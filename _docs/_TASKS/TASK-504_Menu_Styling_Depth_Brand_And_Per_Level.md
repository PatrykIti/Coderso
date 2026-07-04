# TASK-504: Menu Styling Depth — Brand Style, Per-Nesting-Level Styling & Cheap Wins

# FileName: TASK-504_Menu_Styling_Depth_Brand_And_Per_Level.md

**Parent Task:** TASK-504
**Priority:** High
**Category:** Admin UI / Menus / Site Shell
**Estimated Effort:** Large
**Dependencies:** TASK-499 (menuDocumentV2 contract + Design tab), TASK-501 (per-device
override machinery: `responsive.{tablet,mobile}` records, `MenuResponsiveControlShell`,
per-block `data-menu-block-id` CSS gating, canvas sim-open precedent), TASK-502
(tablet cascade un-deferred `MENU_RESPONSIVE_BREAKPOINT_KEYS = ["tablet","mobile"]`,
recursive `SiteNavItem`/`NavItemsPreview`, `useCanvasSiteTokens`, editable `brand.props.text`)
**Status:** ✅ Done
**Completed:** 2026-07-03

---

## Overview

The menuDocumentV2 Design tab today lets the author restyle the header bar and the
FLAT nav-link appearance, but three deep-styling gaps remain, all confirmed against
source in the 2026-07-02 recon:

1. **The brand block is unstyleable.** `BrandProps = {mode, href, image?, text?}`
   (`core/services/menus/menuDocumentV2.ts:158-170`) carries no style channel;
   `BrandRender` emits a bare `.site-header-brand` `<a>` whose only styling is the
   hardcoded base rule `.site-header-brand{font-weight:600;color:inherit;text-decoration:none}`
   (`core/site/siteShellCss.ts:139`). There is no way to size the logo image or set
   the brand text's size/weight/color/transform. The panel exposes only Mode / Brand
   text / Link (`core/admin/ui/menus/MenuDesignEditor.tsx:1294+`).

2. **There is no per-nesting-level styling** — the core owner ask. Every nav link at
   every depth shares ONE appearance via `NavItemsProps` → `.site-nav-link`
   (`MENU_RULE_GROUPS` groups 5-8, `core/site/menuDocumentCss.ts:227-257`). A submenu
   link cannot differ from a top-bar link.

3. **The dropdown (sublist) chrome is 100% hardcoded.** `.site-nav-sublist` background,
   border, radius, shadow and min-width are baked into the base sheet
   (`core/site/siteShellCss.ts:151` + `:157`) with zero author control — the single
   biggest visible gap. Plus per-link padding/radius is hardcoded (`padding:8px 12px;
   border-radius:6px`, `siteShellCss.ts:144`), `linkHoverColor` is background-only
   (no hover TEXT color), and there is no current-page indicator (the front never
   stamps `aria-current`).

**Folded-in defect — brand IMAGE mode does not render (HIGH, confirmed in source).** Separate
from the styling gaps above, brand image mode is currently BROKEN end-to-end: `MenuBrandRender`
(`siteShell.tsx:406-417`) wraps the stored logo into an image block via `props: block.props.image`
(`:410`), but that props shape does NOT resolve to a `src` for the image leaf renderer, so the
PUBLIC header shows the empty-image dashed placeholder ("Image") and BALLOONS from ~64px to ~217px;
the design canvas shows the literal text "Logo" (`MenuDesignEditor.tsx:579-580`) instead of the
image. Normal image blocks on the same page render fine, so the fault is the brand-specific
props-passing shape, not the image leaf. This task FIXES it as part of the brand work (so brand
image-mode sizing — the new `BrandStyle.height`/`maxWidth` — has a real `<img>` to size): 504-01
normalizes/stores `brand.image` in the SAME `{asset/src}`-resolvable shape the image leaf expects
and verifies it against how that leaf resolves `src`; 504-03 wires the resolution into the FRONT
`MenuBrandRender` and emits a resolved-`src`-guarded `<img>` SIZED to the header via the new
image-mode style; 504-04 wires the same resolution into the CANVAS brand preview (replacing the
"Logo" text fallback); 504-05 adds the regression test (front + canvas render an `<img>` with a
resolved `src`, header does NOT balloon).

**Chosen tier — "Bogaty + per-device" (owner-approved 2026-07-02).** This task adds
a rich, per-device-overridable brand style + per-level nav styling + the cheap wins,
all on the EXISTING validated `PATCH /menus/:id` document envelope. Deliberately the
per-device dimension (which the recon flagged as a v2/defer option) is IN SCOPE here:
brand style AND level styles are overridable on tablet + mobile, through the TASK-501
`responsive.{tablet,mobile}` channel, following the TASK-502 Pages cascade
(tablet + mobile each inherit DESKTOP; mobile does NOT inherit tablet). The level
link-typography BASE rides the all-width base slot (so mobile inherits desktop, mirroring
the flat-field pattern), and per-device DELTAS ride the shared ≥640 tablet bucket and the
<640 mobile bucket; below 640 the nav collapses to inline/disclosure, so the submenu
CONTAINER chrome is a harmless present-only no-op there while level link typography still
applies.

Everything rides the existing schema-first, reject-unknown, doc-scoped-CSS
architecture. No `menuDocumentV2` `schemaVersion` bump. No new route/RBAC/endpoint/
migration. `buildSiteShellCss(null)` stays byte-identical (nothing new enters the base
sheet — new styling ONLY overrides base via later source order under the doc scope),
and no-override docs stay byte-identical.

### Architectural anchors (verified against source)

- **Validated vocabulary reuse** — `normalizeMenuColorValue` (`normalizeMenuAppearance.ts:163`,
  token-backed via `MENU_APPEARANCE_COLOR_PATTERN`), `clampMenuAppearanceNumber` +
  `menuAppearanceNumberRanges` (`:113-124`), enums `menuAppearanceFontWeights` (`:50`),
  `menuAppearanceTextTransforms` (`:51`), `menuAppearanceShadows` (`:52`). NEW clamp
  ranges are required in the LOCAL brand/level tables for `fontSize`(brand)/`letterSpacing`/
  `height`/`maxWidth`/`minWidth`/`radius`/`borderWidth`/`paddingX`/`paddingY` (level+brand
  fields) — do NOT reuse the nav-`fontSize` 10..32 range blindly. Additionally, the cheap-win
  scalar keys `linkPaddingX`/`linkPaddingY`/`linkRadius` extend `menuAppearanceNumberRanges`
  ITSELF (not a local table), because they are first-class `MenuAppearance` fields riding the
  scalar delta channel — see (4)(a).
- **Subset-with-reject-unknown recipe** — `normalizeAppearanceSubset`
  (`menuDocumentV2.ts:279-301`): assert raw keys ⊆ allowlist BEFORE
  `pickAppearance(normalizeMenuAppearance(...))`, remap `MenuAppearanceError.field` →
  `MenuDocumentError.path`. The NEW `normalizeBrandStyle` / `normalizeNavLevelStyles`
  follow it (level styles handled OUTSIDE the flat MenuAppearance subset).
- **Fail-closed read traps** — `BRAND_PROP_KEYS` (`menuDocumentV2.ts:445`) gates the
  brand PROPS, and `NAV_ITEMS_PROP_KEYS` (`:108`) gates the nav PROPS, reject-unknown on
  READ; a forgotten new key degrades EVERY saved doc carrying that key to empty. `"style"`
  (brand, ∈ `BRAND_PROP_KEYS`) is a CONSCIOUS widening of that allowlist. `"levelStyles"`
  (nav) is NOT added to `NAV_ITEMS_PROP_KEYS` — that const is constrained `... as const
  satisfies readonly (keyof MenuAppearance)[]` (`:119`) and `levelStyles` is not a
  `keyof MenuAppearance`, so adding it is a COMPILE ERROR (do NOT relax that satisfies
  constraint — it underpins the whole nav-props read trap). Instead `levelStyles` is SPLIT
  off the raw nav props BEFORE `normalizeAppearanceSubset(remainder, NAV_ITEMS_PROP_KEYS)`
  and validated separately via `normalizeNavLevelStyles` (see (2)). The carrier type widens
  too: `NavItemsProps = Pick<MenuAppearance, (typeof NAV_ITEMS_PROP_KEYS)[number]>` (`:122`)
  becomes `Pick<MenuAppearance, (typeof NAV_ITEMS_PROP_KEYS)[number]> & { levelStyles?: { 1?: NavLevelStyle; 2?: NavLevelStyle } }`
  (a pure `Pick` cannot hold the key). Neither key touches the block-ENVELOPE gate
  `MENU_NATIVE_BLOCK_KEYS` (`:582`, which allows only `["id","type","props","responsive"]`
  and never sees keys inside `props`). Each is covered by a round-trip test that stores a
  doc carrying the new key and asserts it survives normalize.
- **One shared CSS builder** — `buildMenuRuleSetsForDocument` (`menuDocumentCss.ts:439-475`)
  feeds BOTH `buildMenuDocumentCss` (front @media, `:490`) and
  `buildMenuDocumentPreviewCss` (canvas flatten, `:573`). ALL new emission goes through
  it so front + canvas never diverge. `menuDocScope = [data-site-menu-doc="true"]`
  (`:137`); every new rule is scoped under it.
- **Byte-identity mechanism** — "absent style ⇒ zero new bytes": emit a rule only when
  the sparse record is present/non-empty (mirrors the orientation group returning
  `null` at default, `:218`, and `collectMenuVisibilityPlan` skipping override-less
  blocks). `escapeAuthoringCssString` (`:15`, `:377` precedent) interpolates every id.
- **Per-device delta channel** — `collectDeltaRules` (`menuDocumentCss.ts:429-437`)
  emits per-GROUP mobile/tablet deltas vs DESKTOP over the FLAT `ResolvedMenuAppearance`
  (`:120`, a merged scalar record of `MenuAppearance` fields only); the tablet branch is
  bounded `@media (min-width:640px) and (max-width:1023px)`. This scalar channel carries
  the cheap-wins scalar fields (per-link padding/radius, hover-text) but CANNOT carry
  `levelStyles` (a nested `navProps` record, NOT a `ResolvedMenuAppearance` field) or the
  brand `style` — each needs its OWN parallel resolve-and-diff into a NAMED media bucket
  (see (1)/(2)); do NOT imply reuse of the scalar delta channel for either. `desktopShared`
  (`:453`) is the shared ≥640 rule bucket the canvas tablet/desktop branches spread
  (`:579-580`).

### Security Contract

UI/client-state + schema-first document contract extension; **no new route/RBAC/
endpoint/migration**. All writes ride the existing validated `PATCH /menus/:id`
envelope (`menuUpdateSchema.document`, per-key merge in `menuService`, `mapMenuError`
path branch — all landed in TASK-499). No `menuDocumentV2` `schemaVersion` bump. New
document fields are validated on the strict-write path (reject-unknown, `MenuDocumentError`
+ `path`) and on the fail-closed read path (whole-doc degrade on any unknown key). No
new secrets, tokens, rate-limit buckets, or authz surface.

---

## Sub-Tasks

| ID | Title | File | Effort | Status |
|----|-------|------|--------|--------|
| TASK-504-01 | Menu Model — Brand Style & Per-Level Styles | `TASK-504-01-Menu-Model-Brand-Style-And-Level-Styles.md` | Large | ✅ Done |
| TASK-504-02 | Menu CSS — Brand, Level Rules & Cheap Wins | `TASK-504-02-Menu-CSS-Brand-Level-And-Cheap-Wins.md` | Large | ✅ Done |
| TASK-504-03 | Front — Active-Path Source + `aria-current` Stamp | `TASK-504-03-Front-Aria-Current-Stamp.md` | Medium | ✅ Done |
| TASK-504-04 | Design Editor — Brand & Level Controls | `TASK-504-04-Design-Editor-Brand-And-Level-Controls.md` | Large | ✅ Done |
| TASK-504-05 | Menu Styling Tests, Docs & Closure | `TASK-504-05-Menu-Styling-Tests-Docs-Closure.md` | Medium | ✅ Done |

### Land order & single-writer ownership

Land strictly in sequence to keep single-writer discipline (each core file has exactly
ONE owning subtask; downstream subtasks import, never re-edit):

1. **504-01 model** — sole writer of `core/services/menus/menuDocumentV2.ts` AND of
   `core/services/menus/normalizeMenuAppearance.ts` (the cheap-win keys
   `linkPaddingX`/`linkPaddingY`/`linkRadius`/`linkHoverTextColor` extend the
   `MenuAppearance` TYPE + the `fieldNormalizers` map + `menuAppearanceNumberRanges` —
   NOT merely clamp/enum constants — but carry NO resolution default (they are NOT added
   to `MENU_APPEARANCE_DEFAULTS`/`SHELL_APPEARANCE_DEFAULTS`; they stay `undefined` when
   unauthored so the doc-sheet emission is present-only; see (4)(a)/(b)). **Writer scope also adds NEW
   per-device helpers — the existing flat/visibility-only helpers do NOT reach the new nested
   / dedicated sub-records, so this is NOT a free mirror of the 501/502 shell:**
   (a) a NESTED-PATH variant of `patchMenuSectionForDevice` (`:955`) plus a nested raw-read
   replacing `readMenuSectionOverrideValue`'s (`:928-937`) `key: keyof MenuAppearance` signature,
   targeting `responsive[bp].navProps.levelStyles[N][field]`, with a DEEP prune chain (empty
   level ⇒ empty `levelStyles` ⇒ empty `navProps` group ⇒ empty breakpoint record ⇒ deleted
   `responsive`) — the flat `applyPatch`/group-level prune (`:995-1004`) can only delete the
   whole `levelStyles` key, not one nested field; (b) a `patchMenuBrandStyleForDevice` /
   `clearMenuBrandStyleOverride` pair mirroring `setMenuBlockVisibleForDevice` (`:1077`) /
   `clearMenuBlockVisibilityOverride` (`:1108`) but keyed on `style` (desktop ⇒ flat
   `props.style`; tablet/mobile ⇒ sparse `responsive[bp].style`, prune-on-clear); (c) the
   READ-side gate — widen `normalizeMenuBlockResponsive`'s group-key check (`:420`, today
   rejecting every group key ≠ `"visibility"` with the explicit source comment
   `"props"/"style" here ⇒ reject: menu block overrides carry ONLY visibility.`) to ALSO
   accept `"style"` and validate it via `normalizeBrandStyle`; else a saved doc carrying
   `responsive.{tablet,mobile}.style` FAIL-CLOSED THROWS `menu_document_invalid` on the
   stored-read (whole-doc) path, degrading every brand-per-device doc. Keep the record SPARSE
   + prune empty (empty `style` ⇒ no `style`; empty `responsive[bp]` ⇒ deleted `responsive`,
   mirroring the existing visibility prune at `:434-436`). This is the READ-side twin of the
   `BRAND_PROP_KEYS`+`"style"` widening — the block-envelope brand gate (§1) only reaches the
   DESKTOP flat `props.style`; the per-device `responsive[bp].style` reaches through
   `normalizeMenuBlockResponsive` and needs its OWN gate widening. Note the `:155`
   `MenuBlockOverride` type widens from `{visibility?}` to `{visibility?; style?: BrandStyle}`
   accordingly. Each new helper carries its own round-trip + prune test, and the READ gate
   carries the mandated round-trip/route test that a stored `responsive.{tablet,mobile}.style`
   survives normalize (see Testing Requirements).
2. **504-02 CSS** — sole writer of `core/site/menuDocumentCss.ts`.
3. **504-03 front** — sole writer of `core/site/siteShell.tsx` (thread a new
   `activePath?: string | null` PROP through
   `SiteHeaderMenuDocumentRender`/`NavItemsRender`/`SiteNavItem`/`SiteNavLink` to stamp
   `aria-current="page"`, server-component-safe — see (4)(c)) and any base-sheet-neutral
   change in `core/site/siteShellCss.ts` (byte-identity guarded — expected ZERO base-sheet
   change). **The `activePath` PRODUCER + pass-through wiring are also 504-03's sole-writer
   scope** — declaring the prop optional is not enough (TypeScript will NOT force a producer
   to populate it, so the feature ships INERT and smoke #5 fails while the build passes). No
   existing subtask owns these files, so 504-03 additionally owns: (i) `core/server/publicSite.tsx`
   — `renderPublicPageHtmlInternal` (`:861`) sources the request path
   (`const activePath = options?.requestPath ?? null;`) and passes it into
   `renderPublicPageV2RuntimeHtml({ ..., activePath })`; the path itself is
   already computed one level up in the request handler as `normalizeSitePath(url.pathname)`
   (`publicSite.tsx:1638`) and is threaded in as `requestPath` on the PAGE render options only
   (preview passes nothing ⇒ `null`); (ii) the pass-through render entries `core/site/pageRuntimeV2.tsx`
   (`PageTemplatePropsV2` gains `activePath?: string | null`; `DefaultRuntimePageShellV2`
   forwards it ONLY into the document-header branch `<SiteHeaderMenuDocumentRender>` at `:38`) and
   `core/site/renderPublicPage.tsx` (`PublicPageV2RuntimeRenderOptions` gains
   `activePath?: string | null`, set on `templateProps.activePath`) — each must FORWARD
   `activePath` into `SiteHeaderMenuDocumentRender`
   so the stamp is reachable end-to-end. `resolveSiteShellRenderProps` is NOT edited — `activePath`
   does NOT live on `SiteShellRenderProps`. Single-writer discipline stays intact (no other subtask
   writes these three files).
4. **504-04 editor** — sole writer of `core/admin/ui/menus/MenuDesignEditor.tsx` AND of
   `core/admin/ui/menus/MenuEditorPage.tsx` (the latter ONLY for the one-line items-count badge
   fix, cheap-win B3 — see 504-04 scope; no other subtask writes it, single-writer intact).
5. **504-05 closure** — tests, docs, changelog, board; touches no production source.

---

## Feature Contracts (execution-ready shapes)

### (1) Brand block styling — `brand.props.style`

```ts
// core/services/menus/menuDocumentV2.ts
export type BrandStyle = {
  // text mode:
  fontSize?: number;                            // clamp BRAND_STYLE_NUMBER_RANGES.fontSize = [10, 48]
  fontWeight?: MenuAppearanceFontWeight;        // reuse enum (menuAppearanceFontWeights)
  color?: string;                               // normalizeMenuColorValue (token-backed)
  textTransform?: MenuAppearanceTextTransform;  // reuse enum
  letterSpacing?: number;                       // clamp [-2, 8] px (NEGATIVE allowed — new range)
  // image mode:
  height?: number;                              // clamp [16, 120] px
  maxWidth?: number;                            // clamp [40, 400] px
};
export type BrandProps = { mode; href; image?; text?; style?: BrandStyle };

const BRAND_PROP_KEYS = ["mode", "href", "image", "text", "style"] as const; // +"style" (conscious)

// NEW local clamp table (menuAppearanceNumberRanges does NOT cover these):
const BRAND_STYLE_NUMBER_RANGES = {
  fontSize: { min: 10, max: 48 },
  letterSpacing: { min: -2, max: 8 },   // allow negative
  height: { min: 16, max: 120 },
  maxWidth: { min: 40, max: 400 },
} as const;

const BRAND_STYLE_KEYS = ["fontSize","fontWeight","color","textTransform","letterSpacing","height","maxWidth"] as const;

const normalizeBrandStyle = (value: unknown, path: string): BrandStyle | undefined => {
  if (value == null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) throw new MenuDocumentError("menu_document_invalid", path);
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!(BRAND_STYLE_KEYS as readonly string[]).includes(key))
      throw new MenuDocumentError("menu_document_invalid", `${path}.${key}`); // reject-unknown
  }
  const out: BrandStyle = {};
  // color → normalizeMenuColorValue (null ⇒ omit); numbers → local clamp; enums → normalizeEnum
  // ... assign present keys only (SPARSE)
  return Object.keys(out).length ? out : undefined;  // PRUNE empty ⇒ byte-identity for legacy brand
};
```

- Lives at `brand.props.style` (sub-object) — menu-native blocks carry NO flat
  `PageBlockStyleV2` (`menuDocumentV2.ts:41-46`), so this stays self-contained and does
  not touch the leaf pipeline.
- Reject non-string `color` via `normalizeMenuColorValue` returning `null` ⇒ omit (fail
  soft, sparse), NOT throw — mirrors existing color handling; unknown KEYS throw.
- Prune empty `style` ⇒ no member. Legacy brand blocks (no `style`) round-trip
  byte-identical.
- **Per-device (this tier):** brand style is overridable on tablet + mobile (brand is
  always visible — inline on mobile too — so BOTH breakpoints apply). See the responsive
  extension in 504-01 — extend `MenuBlockOverride` (today `{visibility?}`) to
  `{visibility?; style?: BrandStyle}` (block-level override is the faithful choice since
  brand is a BLOCK). Each responsive record is SPARSE + pruned; unknown keys inside it
  rejected with `path`. **Fail-closed READ trap (mandatory — the twin of `BRAND_PROP_KEYS`+`"style"`):**
  `normalizeMenuBlockResponsive` (`menuDocumentV2.ts:406-437`) hard-rejects any group key ≠
  `"visibility"` at `:420` (`"props"/"style" here ⇒ reject`), so a stored
  `responsive.{tablet,mobile}.style` would THROW `menu_document_invalid` on the whole-doc read
  path unless that gate is widened to accept `"style"` and validate it via `normalizeBrandStyle`
  — see §504-01(c). **Write/read/reset machinery (NEW helpers — not a free mirror):**
  the only existing block device helpers are `setMenuBlockVisibleForDevice`
  (`menuDocumentV2.ts:1077`) and `clearMenuBlockVisibilityOverride` (`:1108`), and BOTH
  hardcode the `visibility` key — neither can write or clear `responsive[bp].style`, and
  desktop brand style is a FLAT `props.style` write via `patchBlock` while tablet/mobile must
  write `responsive[bp].style` (two forked write paths with NO existing helper). 504-01 adds a
  `patchMenuBrandStyleForDevice` / `clearMenuBrandStyleOverride` pair mirroring the visibility
  helpers but keyed on `style` (desktop ⇒ flat `props.style`; tablet/mobile ⇒ sparse
  `responsive[bp].style` with prune-on-clear ⇒ empty `responsive[bp]` ⇒ deleted `responsive`);
  round-trip + prune tests cover each. **Emission channel (do NOT reuse `collectDeltaRules`):** the brand
  base rules fold into `sets.base`, which is emitted UN-media-wrapped on the front
  (`menuDocumentCss.ts:494-495`) and spread verbatim on the canvas
  (`buildMenuDocumentPreviewCss:581`) — it has NO media-scoped slot, so a per-device brand
  override cannot ride it. Add a dedicated `collectMenuBrandDeviceRules` that resolves the
  tablet/mobile brand `style` vs DESKTOP and emits the delta into the bounded tablet bucket
  (`min-width:640/max-width:1023`) and the mobile bucket (`max-width:639`) respectively —
  NOT into `sets.base`.

### (2) Per-nesting-level styling — `NavItemsProps.levelStyles`

```ts
// core/services/menus/menuDocumentV2.ts
export type NavLevelStyle = {
  // link typography/state (reuse MenuAppearance validators):
  linkColor?: string; linkHoverColor?: string; linkHoverTextColor?: string; linkActiveColor?: string;
  fontSize?: number; fontWeight?: MenuAppearanceFontWeight;
  gap?: number; paddingX?: number; paddingY?: number;
  // submenu CONTAINER (levels >= 1 only; ignored for level 0):
  background?: string; borderColor?: string; borderWidth?: number;
  radius?: number; shadow?: MenuAppearanceShadow; minWidth?: number;
};
// NavItemsProps gains a sparse per-level record (level 0 = the EXISTING nav base — NO new type).
// Level key is NUMERIC (NavLevelStyleLevel = 1 | 2) — the single canonical representation shared
// by 504-01 (record type + helper signatures), 504-02 (CSS selector maps) and 504-04 (editor):
levelStyles?: { 1?: NavLevelStyle; 2?: NavLevelStyle };
```

- **Cap at levels 0 / 1 / 2+** (three buckets). Level 0 = today's `.site-nav-link` base
  (do NOT duplicate it into a type). `levelStyles["1"]` styles the first dropdown;
  `levelStyles["2"]` = "level 2 AND deeper" via a descendant selector (naturally covers
  3, 4…). Deeper independent levels are deferred (diminishing return).
- **Inheritance is pure CSS cascade + source order** — emit level-0 rules, then level-1,
  then level-2, each emitting ONLY its own present overrides. Level 1 inherits level 0
  where unset; level 2 inherits level 1 where unset. NO runtime merge.
- **Normalizer handled OUTSIDE `normalizeAppearanceSubset`** (that subset is flat
  MenuAppearance scalars, and `normalizeNavItemsProps` (`menuDocumentV2.ts:306-307`) is
  today a one-line pure delegate to it): RESTRUCTURE `normalizeNavItemsProps` to SPLIT
  `levelStyles` off the raw props first, validate the REMAINDER against
  `NAV_ITEMS_PROP_KEYS` (`:108`) via `normalizeAppearanceSubset`, and validate
  `levelStyles` via a dedicated `normalizeNavLevelStyles(value, path)`. `"levelStyles"` is
  therefore NOT added to `NAV_ITEMS_PROP_KEYS` (`:119`, constrained `... as const satisfies
  readonly (keyof MenuAppearance)[]` — `levelStyles` is not a `keyof MenuAppearance`, so
  adding it is a COMPILE ERROR; do NOT relax that satisfies constraint): it is split off
  BEFORE the `normalizeAppearanceSubset(remainder, NAV_ITEMS_PROP_KEYS)` subset check and
  validated separately. The carrier type widens accordingly: `NavItemsProps` becomes
  `Pick<MenuAppearance, (typeof NAV_ITEMS_PROP_KEYS)[number]> & { levelStyles?: { 1?: NavLevelStyle; 2?: NavLevelStyle } }`
  (`:122`, a pure `Pick` cannot hold the key). It does NOT touch the block-envelope gate
  `MENU_NATIVE_BLOCK_KEYS` (`:582`), which gates only `id/type/props/responsive` and never
  inspects keys inside `props`. Because `MenuSectionOverride.navProps` (`:151`) is itself a
  `NavItemsProps` validated by the SAME `normalizeNavItemsProps` (`:360`), this one
  restructure enables ONLY the NORMALIZE/VALIDATE half of the
  `responsive.{tablet,mobile}.navProps.levelStyles` per-device channel — a stored nested
  level record now survives read/write validation. Levels ride the SECTION override
  (`MenuSectionOverride.navProps`, `:151`), NOT the BLOCK responsive, so `MenuBlockOverride`
  (`:155`) stays `{visibility?}`-only FOR THE LEVELS PATH; separately, the BRAND per-device
  channel (§1) DOES widen `MenuBlockOverride` to `{visibility?; style?: BrandStyle}` and its
  `normalizeMenuBlockResponsive` group-key gate to accept `"style"` (§504-01(c)) — do NOT read
  this parenthetical as forbidding the brand extension. It does NOT by itself give the editor a way to WRITE/READ/RESET a single
  nested level field: the existing device helpers cannot reach that path and 504-01 MUST add
  new dedicated ones (see the writer-scope enumeration in the land-order §504-01). Concretely,
  the flat `patchMenuSectionForDevice` (`menuDocumentV2.ts:955`) applies a TOP-LEVEL
  `applyPatch` over `Object.entries(patch)` and prunes only when the whole GROUP record is
  empty (`:995-1004`) — it can neither write `responsive[bp].navProps.levelStyles[N][field]`
  nor clear ONE nested level field (only delete the whole `levelStyles` key); and
  `readMenuSectionOverrideValue` (`:928-937`) is typed `key: keyof MenuAppearance` and reads a
  FLAT group key, so `levelStyles` (not a `keyof MenuAppearance`) cannot back its
  Override/Inherited/Reset badge. 504-01 therefore adds a NESTED-PATH variant of
  `patchMenuSectionForDevice` + a nested raw-read (replacing `readMenuSectionOverrideValue`'s
  `keyof MenuAppearance` key) targeting `responsive[bp].navProps.levelStyles[N][field]`, with
  a DEEP prune chain (empty level ⇒ empty `levelStyles` ⇒ empty `navProps` group ⇒ empty
  breakpoint record ⇒ deleted `responsive`) so partially-cleared overrides stay byte-identical;
  round-trip + prune tests cover each. Do NOT describe this as a free reuse of the flat
  helpers — they do not reach the nested path:

```ts
const NAV_LEVEL_KEYS = ["1", "2"] as const;                     // reject-unknown level keys
const NAV_LEVEL_STYLE_KEYS = ["linkColor","linkHoverColor","linkHoverTextColor","linkActiveColor",
  "fontSize","fontWeight","gap","paddingX","paddingY","background","borderColor","borderWidth",
  "radius","shadow","minWidth"] as const;
const NAV_LEVEL_NUMBER_RANGES = {
  fontSize: { min: 10, max: 32 }, gap: { min: 0, max: 32 },
  paddingX: { min: 0, max: 40 }, paddingY: { min: 0, max: 32 },
  borderWidth: { min: 0, max: 8 }, radius: { min: 0, max: 32 }, minWidth: { min: 80, max: 480 },
} as const;
const normalizeNavLevelStyles = (value, path) => {
  // reject-unknown outer level keys (only "1","2"); per-level reject-unknown style keys;
  // reuse normalizeMenuColorValue + clamps + enums; SPARSE + prune empty per level;
  // prune empty levelStyles ⇒ undefined (byte-identity for docs without level styling)
};
```

- **Per-device (this tier):** level styles ride the nav-items block base AND are
  overridable on TABLET + MOBILE via `responsive.{tablet,mobile}.navProps.levelStyles`,
  resolved vs DESKTOP (Pages cascade; mobile never inherits tablet). Split by field class,
  mirroring the flat-field BASE/DELTA pattern: the level LINK-typography BASE emits into the
  all-width `sets.base`/`baseRules` (`menuDocumentCss.ts:445-450`, un-media-wrapped ⇒ all
  widths), so MOBILE inherits the DESKTOP level typography, and only the per-device DELTA
  rides the shared ≥640 tablet bucket and the <640 mobile bucket; at <640 the nav collapses
  to inline/disclosure, so the submenu CONTAINER chrome (folded into `desktopShared`, ≥640
  only) is a harmless present-only no-op there (nothing to override inline) while link
  typography still applies. **Emission channel:** `levelStyles` is a NESTED record on `navProps` and is NOT part of the flat
  `ResolvedMenuAppearance` (`menuDocumentCss.ts:120`) that `collectDeltaRules` (`:429-437`)
  diffs — it is UNREACHABLE through the scalar delta channel. Do NOT reuse `collectDeltaRules`;
  add a PARALLEL per-level resolve-and-diff that threads desktop-vs-device
  `navProps.levelStyles` per-level/per-field and emits its delta CSS into the bounded tablet
  bucket `@media (min-width:640px) and (max-width:1023px)` AND the mobile bucket
  `@media (max-width:639px)` (front) / the flattened `tabletDelta`/`mobile`-adjacent branches
  (canvas). Delta records are SPARSE, resolved vs DESKTOP.

### (3) Sublist chrome (folds out of #2 container fields — called out)

The dropdown container `background/borderColor/borderWidth/radius/shadow/minWidth`
becomes author-controllable per level (`NavLevelStyle` container fields at level ≥1).
Today these are hardcoded in `siteShellCss.ts:151` + `:157`. The doc-scoped sheet
OVERRIDES them from `[data-site-menu-doc]` scope ONLY — the base sheet stays byte-
identical (inviolable `buildSiteShellCss(null)` guard). Even shipping ONLY level-1
container styling closes the biggest visible gap.

### (4) Cheap wins bundled

- **(a) Per-link `linkPaddingX`/`linkPaddingY` + `linkRadius`** on `NavItemsProps` (a new
  `MENU_RULE_GROUP` for `.site-nav-link`, currently hardcoded `padding:8px 12px;
  border-radius:6px`, `siteShellCss.ts:144`). NEW key names are MANDATORY — bare
  `paddingX`/`paddingY` already exist on `MenuAppearance` as the header-BAR padding
  (`normalizeMenuAppearance.ts:78/:80`) and would collide. **Chosen path (explicit, not
  optional — the ONLY path under which both claims below hold):** add
  `linkPaddingX`/`linkPaddingY`/`linkRadius` to the `MenuAppearance` VOCABULARY itself — the
  `MenuAppearance` type (`normalizeMenuAppearance.ts:70`), the `fieldNormalizers` map (`:180`,
  whose `[K in keyof Required<MenuAppearance>]` mapped shape FORCES one normalizer entry per
  new key), and the clamp table `menuAppearanceNumberRanges` (`:113`) — so they become
  first-class scalar fields. **These three keys carry NO resolution default** — do NOT add
  them to `MENU_APPEARANCE_DEFAULTS` (`menuDocumentCss.ts:89`) or `SHELL_APPEARANCE_DEFAULTS`;
  they stay `undefined` on the resolved `ResolvedMenuAppearance` when unauthored. This is
  MANDATORY for doc-sheet no-override byte-identity: `resolveMenuAppearanceForDevice =
  {...MENU_APPEARANCE_DEFAULTS, ...sanitized}` (`menuDocumentCss.ts:113-116`) applies each
  default to EVERY resolved field, and a `MENU_RULE_GROUP` `base()` runs over that resolved
  record — a key WITH a default (e.g. `itemGap`) therefore emits UNCONDITIONALLY
  (`.site-nav-list{gap:${a.itemGap}px}`, `:210`). The hardcoded `padding:8px 12px`/
  `border-radius:6px` lives ONLY in the base sheet (`siteShellCss.ts:144`), NEVER the doc
  sheet today; so the new `.site-nav-link` padding/radius `MENU_RULE_GROUP` `base()` MUST
  return `null` unless the value is authored (present-only, mirroring the orientation group's
  null-at-default, `menuDocumentCss.ts:218`) — else a NO-OVERRIDE doc would gain a brand-new
  `[data-site-menu-doc] .site-nav-link{padding:…}` doc-sheet rule and break the
  `tests/unit/site/menu-document-render.test.tsx` no-override byte-identity baseline (which
  the `buildSiteShellCss(null)` guard does NOT cover). ONLY THEN can `NAV_ITEMS_PROP_KEYS`
  (`:108`, declared
  `... satisfies readonly (keyof MenuAppearance)[]`) be widened to include them (a conscious
  widening + round-trip test), AND they flow per-device FREE through `collectDeltaRules`
  (`menuDocumentCss.ts:429-437`), which diffs the flat `ResolvedMenuAppearance` (`:120`) —
  `collectDeltaRules` still no-ops undefined-vs-undefined (no default ⇒ no spurious delta).
  `buildSiteShellCss(null)` stays byte-identical (ZERO-line guard diff): the base site-shell
  builder never emits these keys — only the doc-scoped `.site-nav-link` group does, and only
  when authored. The two
  claims ("conscious `NAV_ITEMS_PROP_KEYS` widening" + "per-device free via the existing delta
  machinery") are mutually consistent ONLY under this vocabulary path; making them standalone
  `NavItemsProps` members (like `levelStyles`) would forfeit the free per-device and require a
  parallel resolve-and-diff.
- **(b) Hover TEXT color** — `linkHoverColor` (`MenuAppearance.linkHoverColor`) is
  background-only today; add a `linkHoverTextColor` field via the SAME vocabulary path as (a)
  (a new `MenuAppearance` scalar key + `fieldNormalizers` entry + `NAV_ITEMS_PROP_KEYS`
  widening, so it rides `collectDeltaRules` per-device free) — likewise carrying NO
  resolution default (NOT added to `MENU_APPEARANCE_DEFAULTS`/`SHELL_APPEARANCE_DEFAULTS`;
  stays `undefined` when unauthored) + a present-only emission on `.site-nav-link:hover` text
  `color` that returns `null` unless `linkHoverTextColor` is authored (no hover-text `color`
  rule lives in the doc sheet today, so an unconditional emit would break the no-override
  byte-identity baseline). Plus a **current-page** rule via
  `:where([aria-current="page"])` colored by the EXISTING `linkActiveColor`
  (`MenuAppearance.linkActiveColor`, `:74`, already in `NAV_ITEMS_PROP_KEYS` — NO new key, so
  no fail-closed read trap) — requires the FRONT to stamp `aria-current="page"` on the active
  nav link (504-03, which is NOT a one-liner — it must FIRST introduce an active-path source;
  see the 504-03 row and the source note below). The current-page stamp is FRONT-ONLY: the
  canvas has no current-page/route concept, so `NavItemsPreview` stamps no `aria-current` (the
  rule simply matches nothing on the canvas; deferred with the active-item indicator).
- **(c) Active-path source for `aria-current` (504-03 — NOT "Small").** Verified there is NO
  current-path input ANYWHERE in the render tree today: `SiteShellRenderProps`
  (`siteShell.tsx:83-104`), `SiteHeaderMenuDocumentRender` (`:451+`), `NavItemsRender`
  (`:364+`), `SiteNavItem`/`SiteNavLink` (`:142-233`) carry NO `pathname`/`activeHref`/
  `isActive` — so until a source is introduced the `:where([aria-current="page"])` emission is
  INERT. 504-03 must **thread a new `activePath?: string | null` PROP** down through
  `SiteHeaderMenuDocumentRender` → `NavItemsRender` → `SiteNavItem` →
  `SiteNavLink` (it does NOT live on `SiteShellRenderProps`), and — because an optional prop is
  not populated by the type system — must
  ALSO wire the PRODUCER: `renderPublicPageHtmlInternal` (`core/server/publicSite.tsx:861`)
  sources the request path (`const activePath = options?.requestPath ?? null;`) and passes it
  into `renderPublicPageV2RuntimeHtml({ ..., activePath })`; the path is already computed in the
  request handler as
  `normalizeSitePath(url.pathname)` (`publicSite.tsx:1638`) and is threaded in as `requestPath`
  on the PAGE render options only. The pass-through render entries then FORWARD it into the menu render:
  `PageTemplatePropsV2.activePath?: string | null` in `DefaultRuntimePageShellV2`
  (`core/site/pageRuntimeV2.tsx:38`, into the document-header branch only) and
  `PublicPageV2RuntimeRenderOptions.activePath?: string | null` in `renderPublicPage.tsx`
  (`core/site/renderPublicPage.tsx`, set on `templateProps.activePath`). It is then
  matched against `NavigationItem.href` to stamp `aria-current="page"` on the active link.
  Prefer this PROP-THREADING (the shell stays a SERVER component); do NOT reach for a
  `usePathname()` client conversion (that would force the whole nav subtree client-side — a
  bigger architectural change, explicitly avoided). The canvas mirrors nothing here
  (`NavItemsPreview` has no route concept); it may synthetically stamp `aria-current` on a
  chosen preview item ONLY if a canvas active-state control is added (deferred). The field
  that colors the stamped link is the EXISTING `linkActiveColor` (no new key ⇒ no round-trip
  read-trap). Consequently **504-03 is re-estimated Medium** (3–4 component threading +
  app-layer wiring), not a one-line `siteShell.tsx` stamp.

### (5) Editor UX

- **Brand style controls** in the brand block panel, gated by `block.props.mode`
  (text mode ⇒ fontSize/fontWeight/color/textTransform/letterSpacing;
  image mode ⇒ height/maxWidth), reusing `ColorSwatchControl`/`SliderControl`/
  `SegmentedControl` (already imported, `MenuDesignEditor.tsx:101-104`). Writes merge
  into `props.style` via the flat `patchBlock` helper (`:707`).
- **"Level" `SegmentedControl` (Level 0 / Level 1 / Level 2)** at the top of the
  nav-items panel. Selecting a level REBINDS the SAME control set to that level's record:
  Level 0 writes the existing nav base (`props` scalars); Level 1/2 write
  `props.levelStyles[N]`. A **Base / Override / Inherited badge** ("inherits level N-1")
  reuses the `MenuResponsiveControlShell` badge pattern (`:427`).
- **Per-device device-forked writes** + the per-breakpoint **Reset** badge — the
  `MenuResponsiveControlShell` PATTERN (Desktop ⇒ base; Tablet/Mobile ⇒ sparse
  `responsive.{device}` override, prune-on-clear) is reused, but the underlying mutators are
  NOT the existing flat/visibility-only helpers — those cannot reach `navProps.levelStyles[N]`
  or the brand `responsive[bp].style` (see §504-01 writer scope + (1)/(2)). Level controls
  drive the NEW nested-path `patchMenuSectionForDevice` variant + nested raw-read; brand
  controls drive the NEW `patchMenuBrandStyleForDevice` / `clearMenuBrandStyleOverride` pair.
  BOTH brand AND level controls fork on Tablet AND Mobile (on mobile the submenu container
  chrome is a harmless no-op — the nav is inline — while level link typography still applies;
  see (2)).
- **Canvas force-open preview (CUMULATIVE ancestor chain).** Sublists are `display:none`
  until `:hover`/`:focus-within` in both front and canvas (`navNestingRules`,
  `menuDocumentCss.ts:400-402`), and a level-2 sublist is nested INSIDE a level-1 sublist
  that is itself `display:none` by default. When a level N ≥ 1 is selected in the panel,
  thread the selected level into `MenuDocumentCanvas` → `buildMenuDocumentPreviewCss`, which
  emits doc-scoped FORCE-OPEN rules CUMULATIVELY for the whole ancestor chain — levels 1..N,
  NOT just depth N — so the selected depth is actually reachable. Selecting level 1 emits
  `${scope} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid}`; selecting
  level 2 emits THAT rule AND the nested
  `${scope} .site-nav-sublist .site-nav-sublist{display:grid}`
  (opening level 1 so its level-2 child becomes visible). Emitting ONLY the depth-2 selector
  would leave the level-2 dropdown INVISIBLE (its level-1 ancestor never opens) and fail smoke
  scenario #2's canvas level-2 assertion. Mirrors the proven `previewMobileOpen` sim-open
  technique (`:460-466`, emitted LAST to win the closed `display:none`). A canvas test asserts
  `.site-nav-sublist .site-nav-sublist` computed `display` != `none` when level 2 is selected.
  So the author SEES the level they are styling.

---

## Exact depth selectors (verified — hover markup, no `<summary>` in doc path)

| Level | Link selector | Container selector |
|---|---|---|
| 0 (top bar) | = the existing flat `${scope} .site-nav-link` base (group 5, `menuDocumentCss.ts:230`) — the cascade ROOT that reaches links at ALL depths; NOT re-emitted by `navLevelRules`, NOT the child-combinator form | — (level 0 has no container) |
| 1 (first dropdown) | `${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link` | `${scope} .site-nav-list > .site-nav-item > .site-nav-sublist, ${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist` |
| 2+ (nested) | `${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist .site-nav-link` | `${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist` (the ANCHORED heavier form (0,5,0) — NOT the short `${scope} .site-nav-sublist .site-nav-sublist` (0,3,0), which would LOSE to level 1's reach selector; see the container-specificity note below) |

`${scope}` = `menuDocScope` = `[data-site-menu-doc="true"]`. Level 0's link selector is
today's FLAT `.site-nav-link` base (group 5, `menuDocumentCss.ts:230`) — the cascade
ROOT that also matches every sublist link (each nested `<li class="site-nav-item">`
carries an `<a class="site-nav-link">`, `siteShell.tsx:146/175/189/217`), so "level 1
inherits level 0 where unset" holds. If level 0 were instead emitted with the child-
combinator form it would NOT reach sublist links and the inherit-from-level-0 cascade
would BREAK (level-1 links would fall back to the global base, not level 0). Therefore
`navLevelRules` emits ONLY levels 1 and 2; level 0 stays owned by the existing
`MENU_RULE_GROUPS` scalar emission and is never re-emitted. **Split the level emission by
field class, mirroring the flat-field BASE/DELTA pattern (`sets.base` vs the delta
buckets):** the level-1/level-2 LINK-typography BASE rules fold into `sets.base`/`baseRules`
(`menuDocumentCss.ts:445-450`, un-media-wrapped ⇒ emitted at ALL widths, `:495`) — exactly
like the flat scalar base rules — so MOBILE inherits the DESKTOP level typography and only
the per-device DELTA rides the tablet/mobile buckets (see (2)); the submenu CONTAINER chrome
folds into `desktopShared` (shared ≥640, front + canvas — dropdowns exist only ≥640, so this
is a harmless present-only no-op below 640 where all levels are inline and the base sheet's
cumulative `padding-left:16px` owns indentation). Folding the level LINK base into
`desktopShared` (≥640-only, `:496`) INSTEAD would BREAK the Pages "mobile inherits desktop"
cascade for levels: a non-overridden level field would never emit at <640, a delta-only
mobile resolver would emit nothing when equal to desktop, and after reset the link would
revert to the GLOBAL `.site-nav-link` base rather than the desktop level style — smoke #3's
mobile level-1 assertion would fail.

**Level 1 → level 2 cascade holds by the SAME descendant mechanism (the trap the task
avoided at level 0, avoided again here — do NOT anchor level 1 with a child combinator).**
The level-1 link selector ends in a DESCENDANT combinator (`… > .site-nav-sublist
.site-nav-link`), so it also matches level-2/level-3 links (they are descendants of the
top `.site-nav-sublist`) — a level-2 link with only `fontSize` set therefore INHERITS
level-1's `color` via the cascade, making "level 2 inherits level 1 where unset" true. Had
level 1 used the child-combinator form `… > .site-nav-sublist > li > .site-nav-link` it
would match ONLY depth-1 links, level-2 links would fall back to the level-0 base (or the
hardcoded chrome), and the 0→1→2 / "Inherited: inherits level N-1" badge would be FALSE for
level 2. Specificity orders base < L1 < L2 so deeper levels override: L0 `.site-nav-link`
(+scope) = (0,2,0) < L1 link (+scope) = (0,5,0) < L2 link (+scope) = (0,6,0); the L1
container (`.site-nav-list > .site-nav-item > .site-nav-sublist`, +scope = (0,4,0)) beats
the hardcoded base chrome `[data-site-header] .site-nav-sublist` (0,2,0) without relying on
source order.

**CONTAINER cascade — the L1-container-reach vs L2-container check (the LINK-side trap
repeated on the container side).** Exactly as the level-1 LINK selector ends in a descendant
combinator that also reaches level-2 links, the level-1 CONTAINER selector list carries a
SECOND, descendant reach selector `${scope} .site-nav-list > .site-nav-item >
.site-nav-sublist .site-nav-sublist` (+scope + 4 classes = (0,5,0)) so a level-2 container
INHERITS level-1's `background`/`border`/`shadow`/`radius`/`minWidth` where unset. That reach
selector therefore also SETS the ceiling the level-2 container rule must clear: had level 2
been emitted with the SHORT form `${scope} .site-nav-sublist .site-nav-sublist` (+scope + 2
classes = (0,3,0)), a level-2 container override could NEVER beat the inherited level-1 rule
((0,5,0) > (0,3,0) regardless of source order) and the "level 2 inherits level 1 UNLESS
overridden" cascade would be FALSE for CONTAINER fields (it would hold ONLY for links). So the
level-2 CONTAINER is emitted with the SAME anchored form as level-1's reach selector,
`${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist` = (0,5,0),
which TIES level-1's reach and WINS by source order (level 2 is emitted AFTER level 1) —
exactly mirroring how the LINK side already gives L2 the anchored heavier `… .site-nav-sublist
.site-nav-sublist .site-nav-link` = (0,6,0). Do NOT emit the level-2 container with the short
`.site-nav-sublist .site-nav-sublist` form.

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md` — the Vitest (Bun-free) lane covers the model/CSS/editor
units; the Bun lane covers route + render byte-identity + persistence.

### Vitest (Bun-free)

- `tests/vitest/services/menu-document-v2.test.ts` (the existing menu-document-v2
  suite): `normalizeBrandStyle` + `normalizeNavLevelStyles` accept/reject/sparse/prune;
  **round-trip fail-closed READ traps** — a stored doc carrying `brand.props.style` and
  `navProps.levelStyles` survives a normalize round-trip (proves `"style"` ∈
  `BRAND_PROP_KEYS`, and that `normalizeNavItemsProps` SPLITS `levelStyles` off `props`
  before the `NAV_ITEMS_PROP_KEYS` subset check rather than rejecting it); reject-unknown
  for brand-style keys, level keys (only `"1"`/`"2"`), level-style keys; NEW clamp ranges
  (letterSpacing negative allowed, height/maxWidth/minWidth/radius/borderWidth bounds);
  **cheap-win scalar keys round-trip** — a stored doc carrying
  `linkPaddingX`/`linkPaddingY`/`linkRadius`/`linkHoverTextColor` survives normalize (proves
  they were added to the `MenuAppearance` vocabulary + `fieldNormalizers` + widened into
  `NAV_ITEMS_PROP_KEYS`, else the fail-closed read degrades the doc); their new clamp ranges;
  per-device brand override records (`responsive.{tablet,mobile}`) + tablet level-style
  override records sparse + prune. **NEW per-device helper tests (mandatory — the flat/
  visibility-only helpers do NOT reach these paths):** the nested-path `patchMenuSectionForDevice`
  variant writes ONE `responsive[bp].navProps.levelStyles[N][field]` and its nested raw-read
  reports Override vs Inherited; clearing that ONE nested field prunes the DEEP chain (empty
  level ⇒ empty `levelStyles` ⇒ empty `navProps` group ⇒ empty breakpoint ⇒ deleted
  `responsive`) BYTE-IDENTICAL to legacy while a sibling level field survives; and
  `patchMenuBrandStyleForDevice` / `clearMenuBrandStyleOverride` write/clear `responsive[bp].style`
  (desktop ⇒ flat `props.style`) with prune-on-clear round-trip.
- `tests/vitest/site/menu-document-css.test.ts` (Bun-free): `collectMenuBrandRules`
  emits scoped `[data-menu-block-id]` text rules + `... img{}` for image mode, ZERO bytes
  when absent; `navLevelRules` emits the EXACT depth selectors for levels 1 and 2 ONLY
  (level 0 stays the existing flat `.site-nav-link` base, NOT re-emitted) — the level
  LINK-typography BASE folded into the all-width `sets.base` (asserted un-media-wrapped, so
  mobile inherits desktop) and the container rules for levels ≥1 folded into `desktopShared`
  (≥640); **level-1→level-2 cascade proof — a
  level-2 link with only `fontSize` set inherits level-1's `color`** (asserts level 1's
  trailing DESCENDANT combinator reaches level-2 links, and L0<L1<L2 specificity ordering);
  **level-1→level-2 CONTAINER cascade proof — a level-2 container `background` OVERRIDE beats a
  DIFFERING level-1 container `background` at the nested depth** (asserts the level-2 container
  rule is emitted with the ANCHORED `${scope} .site-nav-list > .site-nav-item > .site-nav-sublist
  .site-nav-sublist` form = (0,5,0), TYING level-1's reach selector and winning by source order —
  NOT the short (0,3,0) form, which would silently lose; and that a level-2 container with only
  `background` set still inherits level-1's `border`/`radius`/`shadow`/`minWidth` where unset);
  hover-text (`linkHoverTextColor` on `.site-nav-link:hover` `color`) +
  `:where([aria-current="page"])` colored by `linkActiveColor`; per-link
  `linkPaddingX`/`linkPaddingY`/`linkRadius` group on `.site-nav-link`; per-device
  `levelStyles` delta via the dedicated per-level resolver (NOT `collectDeltaRules`) into the
  bounded ≥640/<1024 tablet bucket AND the <640 mobile bucket (diffed vs DESKTOP; mobile ≠
  tablet), and the per-device brand delta into its named buckets; **canvas force-open emits
  CUMULATIVELY (levels 1..N) — asserting `.site-nav-sublist .site-nav-sublist` computed
  `display` != `none` when level 2 is selected** (level-1 ancestor also opened).
- `tests/vitest/ui/menu-design-editor.test.tsx`: brand style controls gated by
  mode; Level SegmentedControl rebinds the control set + Base/Override/Inherited badge;
  device-forked writes for brand + levels; Reset prunes the stored record; canvas
  force-open threaded through on level select; no setState-in-effect (console.error spy).

### Bun (menu suites)

- `tests/integration/routes/menus.test.ts` (Bun): `PATCH /menus/:id` round-trips
  `brand.props.style` + `navProps.levelStyles` + `responsive.{tablet,mobile}` brand +
  `responsive.{tablet,mobile}` level overrides WITHOUT
  dropping `appearance`/`extras`; invalid brand-style/level key ⇒ 400 `menu_document_invalid`
  with `path`, store untouched.
- `tests/unit/site/menu-document-render.test.tsx` (Bun): NO-override docs emit
  byte-identical CSS (present-only guard); a doc with brand/level styling emits the new
  scoped rules on both `buildMenuDocumentCss` and `buildMenuDocumentPreviewCss` (front +
  canvas parity).

### Byte-identity / reject-unknown guards named explicitly

- `tests/unit/pages/siteShellCss.test.ts` — `buildSiteShellCss(null)` byte-identical:
  **ZERO edits, ZERO-line diff.** Nothing new enters the base sheet.
- `tests/unit/site/menu-document-render.test.tsx` — no-override menu docs byte-identical.
- Fail-closed read-trap round-trip tests for `"style"` (brand) and `"levelStyles"` (nav)
  are MANDATORY — a forgotten key silently degrades every saved doc carrying it.
- All new CSS routed through the ONE `buildMenuRuleSetsForDocument` (front @media +
  canvas flatten never diverge); the canvas force-open is the single canvas-only addition
  (precedent: `previewMobileOpen`).

### SMOKE — ≥5 DISTINCT real-flow scenarios (owner mandate)

Run in the live admin canvas AND on the front (`:3000`) with `playwright-cli`. Every
assertion measures a **VISIBLE EFFECT** (computed styles / geometry), NOT control
presence. Start `coderso-dev-core-host` if the admin page is white/down; verify the
Soft-Violet theme is active.

1. **Brand style — text + image visible effect.** Text-mode brand: set fontSize +
   fontWeight + color + textTransform; assert the brand `<a>`'s computed
   `font-size`/`font-weight`/`color`/`text-transform` CHANGED on canvas AND front.
   Switch to image-mode brand: set height + maxWidth; assert the brand `img`'s computed
   `height`/`max-width` CHANGED (geometry).
2. **Per-level styling 0/1/2 independently, each verified at the RIGHT depth.** Style
   level 0 (top-bar link color/size), level 1 (first-dropdown link + container
   background/border/radius), level 2 (nested link). On the FRONT, HOVER to open each
   depth and assert the computed style applies at that depth ONLY (top-bar link ≠
   level-1 link ≠ level-2 link). On the CANVAS, select each level and assert the
   force-open rule reveals that depth (`display` != `none`) and the styled container/link
   shows the authored computed values.
3. **Per-device brand + level override + reset across desktop/tablet/mobile.** On Mobile,
   override brand fontSize AND a level-1 link color; assert the computed brand `font-size`
   and level-1 link `color` differ from Desktop at the mobile viewport (390px) and match
   Desktop at 1280px (brand is inline-visible on mobile, and level link typography applies
   inline too). Reset the mobile overrides; assert the stored `responsive.mobile` record is
   pruned verbatim and the computed values revert to the Desktop base. Repeat a level-1
   override on TABLET; assert it applies at a tablet viewport (768px, bounded ≥640/<1024)
   and matches Desktop at 1280px, and confirm mobile does NOT inherit the tablet level override.
4. **Sublist chrome (level ≥1 container) — including the level-2 override winning at depth.**
   Author level-1 container background + border + shadow + radius + minWidth; HOVER open the
   dropdown on the front and assert the level-1 `.site-nav-sublist` computed
   `background-color`/`border`/`box-shadow`/`border-radius`/`min-width` match the authored
   values (proving the hardcoded base chrome is OVERRIDDEN from the doc-scoped sheet, base sheet
   untouched). Then author a DIFFERING level-2 container `background`, hover open the nested
   (level-2) `.site-nav-sublist .site-nav-sublist` and assert its computed `background-color`
   equals the level-2 authored value and NOT the level-1 value — proving the anchored (0,5,0)
   level-2 container selector actually beats level-1's reach rule at the nested depth (this
   would silently fail under the short (0,3,0) form).
5. **Hover-text + current-page + link padding.** Set a hover TEXT color and a per-link
   paddingX/paddingY; hover a top-bar link and assert its computed text `color` changes
   (not just background) and its computed padding matches; navigate to the active page and
   assert the link carrying `aria-current="page"` shows the current-page computed styling.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` — extend the menuDocumentV2 section with `BrandStyle`,
  `NavLevelStyle`/`levelStyles`, the level cap (0/1/2+) + cascade-inheritance semantics,
  the new clamp ranges, the per-link padding/radius group, hover-text + `aria-current`,
  and the per-device override channels (brand on tablet+mobile; levels on tablet+mobile,
  each via its own parallel resolver — not the scalar `collectDeltaRules` path).
- `_docs/CONTENT_TYPES_SPEC.md` — brand style + per-level styling authoring surface
  (Level SegmentedControl, Base/Override/Inherited badges, canvas force-open preview).
- `_docs/_CHANGELOG/` — new numbered entry listing TASK-504 + all five leaf IDs;
  **record deferred residuals**: levels 3+ independent styling, custom font-family/
  line-height, active-item indicator pill, mobile-drawer styling (drawer not front-
  rendered yet — `siteShell.tsx:311-313` composes only `sections[0]`).
- `_docs/_TASKS/README.md` — board rows + Statistics (this task adds the parent + 5
  children to To Do; +6 To Do on completion-authoring, closure moves to Done).

---

## Acceptance Criteria (measured LIVE)

- **Brand styling:** brand text (fontSize/fontWeight/color/textTransform/letterSpacing)
  and image (height/maxWidth) are author-controllable and produce a visible computed-style
  change on canvas AND front; absent style = zero bytes; legacy brand blocks byte-identical.
- **Per-level styling:** levels 0/1/2+ style independently; verified at the RIGHT hover
  depth on the front and via the canvas force-open at each level; inheritance is pure CSS
  cascade (no runtime merge); level-2 selector covers depth 3+.
- **Sublist chrome:** dropdown background/border/shadow/radius/min-width are author-
  controllable per level and OVERRIDE the hardcoded base from the doc scope; base sheet
  byte-identical.
- **Cheap wins:** per-link padding/radius apply (computed geometry); hover TEXT color
  changes text (not just background); the active nav link carries `aria-current="page"`
  and shows current-page styling.
- **Per-device:** brand style AND level styles override on tablet + mobile (brand is
  always inline-visible; level link typography applies at both breakpoints, and on mobile
  the inline nav makes the submenu container chrome a harmless no-op); each rides its OWN
  parallel resolver (NOT the scalar `collectDeltaRules` channel), follows the Pages cascade
  vs DESKTOP (mobile ≠ tablet), and Reset prunes the stored responsive record verbatim.
- **Invariants:** `buildSiteShellCss(null)` byte-identical (ZERO-line test diff);
  no-override docs byte-identical; all new CSS doc-scoped via the ONE shared builder
  (front + canvas parity); reject-unknown + round-trip fail-closed read tests green for
  every new key; no `schemaVersion` bump; no new route/RBAC/endpoint/migration.
- **Gates:** full Vitest + Bun menu matrices, lint, types, root `tsc`, and gates:coderso
  green together; real-viewport playwright smoke (≥5 scenarios) green at 390px + 768px + 1280px.

---

## Deferred (state in changelog residuals)

- Levels 3+ independent styling (level-2 descendant selector covers them uniformly).
- Custom `font-family` / `line-height` controls.
- Active-item indicator pill / underline (beyond the `aria-current` current-page color).
- Mobile-drawer styling — the `menu-drawer` section is not front-rendered yet
  (`siteShell.tsx:311-313` composes only `sections[0]`); requires shipping the drawer
  render path first.
