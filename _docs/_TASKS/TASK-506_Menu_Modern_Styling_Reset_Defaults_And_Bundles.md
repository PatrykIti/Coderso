# TASK-506: Menu Design Modern Styling — Base Reset, Visible Defaults & 5 Modern Bundles

# FileName: TASK-506_Menu_Modern_Styling_Reset_Defaults_And_Bundles.md

**Parent Task:** TASK-506 (board umbrella)
**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Page Builder / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-499 (menuDocumentV2 + Design tab + `menuDocumentCss.ts`), TASK-501 (per-device `responsive.{tablet,mobile}` records, `MenuResponsiveControlShell`, dual-selector doc-scoped emission), TASK-504 (`NavItemsProps.levelStyles` per-nesting-level styling, the exact 1/2 descendant depth selectors, per-device brand+level resolvers, `aria-current` current-page stamp), TASK-505 (sibling architecture family — column presets, sink discipline). Rides the existing validated `PATCH /menus/:id` write path.
**Status:** ✅ Done
**Completed:** 2026-07-03 (changelog 1215)

---

## Overview

Two owner-reported UX gaps in the shipped Menu Design tab, plus five owner-approved
"modern styling" bundles that deepen the per-level / per-device styling surface —
all on the **same architecture family** as TASK-504/505: the menuDocumentV2 document
contract + doc-scoped CSS via the ONE shared `buildMenuRuleSetsForDocument` +
`MenuDesignEditor` controls. **Schema-first, reject-unknown, byte-identity,
present-only emission, per-device Pages cascade (tablet+mobile each inherit
DESKTOP, never each other). NO `schemaVersion` bump, NO route/RBAC/endpoint/migration.**

### The two owner-reported UX gaps (FOUNDATION — always in)

**F1 — Base-record reset-to-default (the #1 gap).** Today every clear helper —
`clearMenuNavLevelStyleOverride`, `clearMenuBrandStyleOverride`,
`clearMenuSectionOverride` — takes `breakpoint: MenuResponsiveBreakpoint`
(`tablet | mobile`) and reads `section.responsive?.[breakpoint]`; **none accept
`"desktop"`.** And `MenuResponsiveControlShell` renders its Reset button ONLY when
`state === "override"` (`MenuDesignEditor.tsx:476`), and desktop is always
`state === "base"`. So a value authored on the **DESKTOP BASE** (e.g. a link
`paddingX`) can **never** be cleared back to the CSS/theme default — the owner
wants the `auto`/centered default back and there is no affordance. **Fix:** add
base-clear helpers (or one generic base-prune) that DELETE the field from props
(prune empty objects → byte-stable legacy shape), and extend the editor so
**every** control shows a Reset / "Reset to default" affordance whenever its OWN
record (base OR device) carries an explicit value. The base reset must land the
doc back to the exact no-override, byte-identical shape.

> **F1 simplification (verified against source).** The base-clear does **NOT**
> need new delete/prune internals — every `patch*ForDevice` helper's `bp === null`
> (desktop) branch **already** deletes-on-`undefined` and prunes to the legacy
> byte-stable shape:
> - base level-field clear = `patchMenuNavLevelStyleForDevice(doc, id, "desktop", level, { [key]: undefined })` (`applyNavLevelPatch` delete `:1602-1603` + `withNavLevel` prune `:1610-1622`).
> - base level-0 scalar / layout clear = `patchMenuSectionForDevice(doc, id, "desktop", group, { [key]: undefined })` (`applyPatch` delete `:1293-1294`).
> - base brand-style clear = `patchMenuBrandStyleForDevice(doc, id, "desktop", { [key]: undefined })` (desktop branch deletes the key + prunes empty `style` off props `:1518-1519`).
> A named `clearMenu*Base` wrapper (cleaner for the editor) or a single generic
> base-prune is a thin API over this existing machinery + a byte-identity
> round-trip test per surface. **No new prune logic is required.** The
> device-defining keys `MENU_NAV_DEVICE_DEFINING_KEYS = [mobileMode, dropdownDirection]`
> (`:205`) carry resolution defaults and are written to base on every device —
> they are **excluded** from the base-reset generalization (leave them as-is).

**F2 — Visible default / inherited value (the #2 gap).** Today an unset numeric
slider shows `range.min` (`value ?? NAV_LEVEL_NUMBER_RANGES[key].min`,
`MenuDesignEditor.tsx:1343`) — a misleading `0`/`80` — and the ONLY resolved-default
hint in the whole editor is nav-base `fontSize`'s "Inherited from theme (16px)"
(`:1644-1651`, const `NAV_FONT_SIZE_INHERITED = 16` `:304`). Enum/color controls
show nothing. **Fix:** generalize the effective-default hint to **every**
numeric/enum/color control. When a field is UNSET, surface the RESOLVED effective
value + its SOURCE ("Default 8px", "Inherits level 1 (14px)", "Inherited from
theme (16px)", "Inherited from desktop"). Provide a **single resolved-default
provider in the model** returning `{ value, sourceLabel }` so the editor never
hardcodes defaults. Source rules — a **FULL cascade walk**, NOT a single N−1 hop
(a single hop mis-reports when the shallower level is ALSO unset): for an unset
level-N field, walk shallower LEVELS (N−1, N−2, …) until a DEFINED value is found,
label it by the level that supplied it (level 2 whose level-1 is set ⇒ "Inherits
level 1"; the descendant `LEVEL_LINK_SELECTORS[1]` `menuDocumentCss.ts:493` also
matches level-2 links, so level 1 is the true cascade provider, not a jump to level
0). CRITICAL: `resolveMenuNavLevelStyle` (`menuDocumentV2.ts:1574-1584`) merges ONLY
a level's OWN base+device record — it does NOT fall back to a shallower level — so
the provider must do the walk itself; a raw `resolveMenuNavLevelStyle(level-1)` on a
level-2 field would return `undefined` when level 1 is ALSO unset and re-introduce
the misleading-value bug F2 exists to kill. When the SHALLOWEST NavLevelStyle level
(1) is still unset, fall through to the **level-0 nav-base / navChrome** value (level
0 is NOT a NavLevelStyle, `:186`, but `.site-nav-link` matches deeper links so it is
the real next cascade stop), then the theme / base-sheet default (`SHELL_DEFAULT_LINK_*`
/ `NAV_FONT_SIZE_INHERITED` / `NAV_CHROME_DEFAULTS`) — labeled by whichever stop
supplied the value ("Inherits level 0", "Inherited from theme (16px)", "Default …").
level 0 unset ⇒ theme / base-sheet default directly; tablet/mobile unset ⇒ RESOLVED
desktop at the SAME level ("Inherited from desktop"), and device precedence is:
device override first, then desktop resolved at the same level, then the level walk —
so compound tablet/mobile-unset-with-desktop-also-unset cases resolve deterministically.
This complements the existing
`NavLevelInheritBadge` ("Inherits level N−1", `:1026-1051`), which already shows
the LEVEL axis — F2 adds the effective NUMBER/enum/color.

### The five modern bundles (owner-selected — PER-LEVEL 0/1/2 + PER-DEVICE tablet/mobile)

All five ride the existing per-level `levelStyles` (levels 1/2) + per-device
`responsive.navProps` delta machinery. Level-0 home decision: see
**§ Level-0 architecture decision** below.

- **B1 — Item separators / dividers (NEW).** A visual rule BETWEEN nav items —
  distinct from the standalone `divider` block. Top-level (level 0) horizontal
  bar ⇒ **VERTICAL** divider between items (`border-inline-end` on
  `li:not(:last-child)`); dropdown (levels ≥ 1, vertical stack) ⇒ **HORIZONTAL**
  divider (`border-block-end`). Fields: `itemDivider` `show`(bool) /
  `color`(token-backed, reuse the menu color normalizer) / `width`(clamp 1..8) /
  `style`(enum `solid|dashed|dotted`). Absent ⇒ zero bytes. Orientation-aware
  (respect group-4 orientation + `dropdownDirection`).
- **B2 — Hover/active underline indicator (NEW).** A modern animated indicator
  bar distinct from the existing hover-background "pill": `indicator`(enum
  `none|underline|overline`) / `indicatorColor` / `indicatorThickness`(1..6) /
  `indicatorGrow`(bool — animate width on hover via `transform: scaleX`) rendered
  as a `::before` bar on the link (the caret owns `::after` @712; the link gets
  `position:relative` so the absolute bar measures against the link box, not the
  flyout-wrapping `.site-nav-item` @143), shown on `:hover` and on `[aria-current=page]`;
  PLUS `hoverUnderline`(bool, `text-decoration` on hover); PLUS a smooth
  `transitionMs`(0..400, applied to color/background/transform) and an optional
  `hoverLift`(0..8, `translateY` up on hover). Per level + per device.
- **B3 — Caret toggle + flyout animation.** The caret `::after` on group parents
  already exists (`menuDocumentCss.ts:712`); make it CONTROLLABLE: `showCaret`(bool,
  per-level parents) + `caretRotateOnOpen`(bool, rotate 180° on hover/focus-within).
  PLUS `flyoutAnimation`(enum `none|fade|slide`) — animate the sublist open via an
  **`opacity`(+`transform`) reveal** driven by `transition:…,display …ms allow-discrete`
  + a matching `@starting-style` block (NO `visibility`), layered over — never replacing —
  the `display:none→grid` toggle (`:703`): allow-discrete makes the discrete flip
  participate so the OPEN reveal interpolates instead of snapping, keeping the
  zero-JS hover/focus-within open and reachability intact. Per level + per device.
- **B4 — Pill nav + dropdown padding.** Nav-base (level 0) wrapper "pill":
  `navPillBackground` / `navPillRadius` / `navPillPaddingX` / `navPillPaddingY`
  applied to `.site-nav-list` (floating segmented-nav look); PLUS dropdown INNER
  padding for levels ≥ 1: `containerPaddingX` / `containerPaddingY` on the
  `.site-nav-sublist` container (distinct from per-LINK `paddingX/Y`). Absent ⇒
  zero bytes.
- **B5 — Nested submenu placement (NEW).** Owner: "level 2 currently always flies
  out to the RIGHT, I may want it BELOW." Make the nested flyout direction
  author-controllable on LEVEL 2 (the nested flyout sublist; read off `baseLevelStyles?.[2]`,
  emitted solely on the anchored level-2 container — the control renders at level 2 ONLY,
  a level-1 value is a NO-OP): `submenuPlacement`(enum `right|bottom|left`)
  mapping the nested `.site-nav-sublist .site-nav-sublist` positioning:
  `right`=`left:100%;top:0` (current default), `bottom`=`left:0;top:100%` (under
  the parent), `left`=`right:100%;top:0`. Keep the EXISTING first-dropdown
  `dropdownDirection`(top|bottom) working; this adds the horizontal/vertical
  placement axis for NESTED levels. **Must not break the anchored (0,5,0) level-2
  selector specificity from 504.**

### Level-0 architecture decision (load-bearing — the author must pin ONE and be consistent)

The new menu-only 506 fields (separators/indicator/caret/pill/placement) are **NOT
`MenuAppearance` keys**, and `NAV_ITEMS_PROP_KEYS` is
`satisfies readonly (keyof MenuAppearance)[]` (`menuDocumentV2.ts:136`) with
`NavItemsProps = Pick<MenuAppearance, …> & { levelStyles? }` (`:140-142`). So the
new fields **cannot** ride `NAV_ITEMS_PROP_KEYS` / the scalar delta channel as the
level-0 base. Levels 1/2 have a clean home on `NavLevelStyle` (`:163-180`) already.
Two viable homes for the LEVEL-0 variants (B4 pill is level-0-only; B1/B2/B3 have
level-0 variants):

- **Option A — extend `levelStyles` to allow a `"0"` key.** Add `"0"` to
  `NAV_LEVEL_KEYS` (`:562`), `0` to `NAV_LEVEL_STYLE_LEVELS` (`:564`), widen
  `NavLevelStyleLevel` (`:186`) to `0|1|2`, widen the level params on
  resolve/patch/clear (`:1574-1698`), add a level-0 selector to
  `LEVEL_LINK_SELECTORS` (`= .site-nav-link`). Cleanest reuse of ALL existing
  per-device delta + prune + reject-unknown machinery, but changes the "level 0 is
  NOT a NavLevelStyle" contract (`:182-185`) and touches many byte-identity anchors.
- **Option B (RECOMMENDED) — a NEW nested `navProps` sub-record parallel to
  `levelStyles`** (e.g. `navChrome`), split off in `normalizeNavItemsProps` exactly
  as `levelStyles` is (`:385-389`) with its own reject-unknown allowlist + prune.
  More isolated; avoids touching `MenuAppearance` / `ResolvedMenuAppearance` /
  `MENU_RULE_GROUPS` churn and the strict-throwing `normalizeAppearanceSubset`
  path. Keeps `NavLevelStyle` (levels 1/2) untouched. **COST:** because it is a
  brand-new sub-record, Option B does NOT reuse any existing machinery beyond the
  normalizer split — it must ADD the full helper family paralleling levelStyles
  (patch/resolve/read/clear + a dedicated navChrome base-clear + navChrome
  compare-keys + a `collectNavChromeDeltaRules` per-device collector; see §506-01).
  A base-clear routed through the FLAT `patchMenuSectionForDevice` navProps wrapper
  CANNOT reach nested `props.navChrome.*` (that branch patches flat `block.props`
  keys `:1290-1319`), and neither `NAV_LEVEL_STYLE_COMPARE_KEYS`/`collectLevelDeltaRules`
  (levelStyles-only) nor `collectDeltaRules` (MENU_RULE_GROUPS-only) covers navChrome —
  so without the parallel family level-0 clear + tablet/mobile deltas silently no-op.

**Recommendation: Option B (nested `navChrome` member)** for the level-0 chrome
fields + `NavLevelStyle` for levels 1/2, to keep `MenuAppearance` churn and
byte-identity blast-radius minimal. 506-01 pins the choice in its Implementation
Pseudocode and every level-0 field routes through it. Either way, each new
allowlist key needs a fail-closed round-trip persistence test (see Hard Invariants).

---

## Security Contract

**UI/client-state + schema-first document-contract extension; no new
route/RBAC/endpoint/migration.** Verified against source:

- **Route (existing).** The document rides `PATCH /menus/:id` inside the existing
  `menuUpdateSchema` `document` envelope (service-side strict validation). No new
  endpoint, RBAC bucket, or method; `menus.settings` is already freeform jsonb —
  **NO migration**. **NO `menuDocumentV2` `schemaVersion` bump.**
- **Schema-first / reject-unknown.** Every new field's normalizer lives in
  `menuDocumentV2.ts`; unknown keys throw machine-readable `MenuDocumentError`
  with the offending `path`. Values are fail-soft (bad value OMITTED, matching the
  file's value policy `:625-631`) via the SAME validated color/number/enum field
  normalizers as the base — raw stored input never reaches CSS.
- **Fail-closed read, non-destructive legacy.** The stored-read normalizer stays
  fail-closed; legacy documents WITHOUT the new fields parse byte-unchanged. Each
  new key added to a reject-unknown allowlist is a **fail-closed READ TRAP** — a
  forgotten key silently degrades EVERY stored doc carrying it to empty on read ⇒
  each addition carries a round-trip persistence test (write→normalize→re-read
  equals input; stored-doc-with-key survives read).
- **Present-only emission.** A new field carries NO resolution default ⇒ emits
  nothing unless authored. `buildSiteShellCss(null)` byte-identical
  (`tests/unit/pages/siteShellCss.test.ts` ZERO edits); no-override docs
  byte-identical (`tests/unit/site/menu-document-render.test.tsx`).
- **Front renders published-only** (unchanged); all new CSS stays inside the
  `[data-site-menu-doc="true"]`-scoped document sheet via the ONE shared
  `buildMenuRuleSetsForDocument` so front `@media` + canvas flatten NEVER diverge.

No auth/nonce/HMAC/reCAPTCHA change: the write is already `content:write`-gated with
the app's CSRF/session envelope; this task neither loosens nor adds an auth path.

---

## Sub-Tasks

| ID | Title | File | Status |
|----|-------|------|--------|
| TASK-506-01 | Menu Model — Reset, Defaults & Modern Fields | `TASK-506-01-Menu-Model-Reset-Defaults-And-Modern-Fields.md` | ✅ Done |
| TASK-506-02 | Menu CSS — Separators, Indicator, Placement & Pill | `TASK-506-02-Menu-CSS-Separators-Indicator-Placement-Pill.md` | ✅ Done |
| TASK-506-03 | Front & Preview Parity | `TASK-506-03-Front-And-Preview-Parity.md` | ✅ Done |
| TASK-506-04 | Design Editor — Reset, Defaults & Modern Controls | `TASK-506-04-Design-Editor-Reset-Defaults-And-Modern-Controls.md` | ✅ Done |
| TASK-506-05 | Menu Modern Styling — Tests, Docs & Closure | `TASK-506-05-Menu-Modern-Styling-Tests-Docs-Closure.md` | ✅ Done |

### Land order & single-writer ownership (strictly sequential — each lands green before the next opens)

1. **506-01 (model keystone)** — **sole writer of `core/services/menus/menuDocumentV2.ts`**
   (+ `normalizeMenuAppearance.ts` only if Option A adds a MenuAppearance key; Option B
   avoids it). Ships: the new `NavLevelStyle` fields (B1/B2/B3/B5 per-level) + the
   level-0 home (Option B `navChrome` sub-record, recommended) + all allowlist /
   clamp-range / compare-key / normalizer-partition extensions; the F1 base-clear
   helpers (or generic base-prune wrappers); the F2 resolved-default provider
   `{ value, sourceLabel }`. Nothing renders it yet.
2. **506-02 (CSS)** — **sole writer of `core/site/menuDocumentCss.ts`**. Consumes the
   new fields via the ONE shared `buildMenuRuleSetsForDocument`: B1 separators, B2
   indicator/hover/lift/transition, B3 caret-toggle/rotate + flyout animation, B4
   pill + dropdown padding, B5 nested placement. Per-device delta + `linkOnly`
   mobile split respected; present-only zero-byte emission.
3. **506-03 (front & preview parity)** — **sole writer of `core/site/siteShell.tsx`**
   (expected ZERO changes). Asserts no new markup/class/aria is needed (every hook
   already exists), `buildSiteShellCss(null)` byte-identity, and no-override doc
   render byte-identity. If any bundle is proven during impl to need a data-attr
   hook, it lands here.
4. **506-04 (editor)** — **sole writer of `core/admin/ui/menus/MenuDesignEditor.tsx`**.
   F1: extend `MenuResponsiveControlShell` to render Reset when the control's OWN
   record (base OR device) has an explicit value + wire `onResetBase`. F2:
   generalize the resolved-default hint under every control from the model provider.
   B1–B5: new per-level (+ level-0) controls; canvas force-open extended for B3
   animation.
5. **506-05 (closure)** — tests (Vitest + Bun), the **≥5-scenario SMOKE**, docs,
   changelog, board/Statistics.

Single-writer map: **`menuDocumentV2.ts` = 506-01**, **`menuDocumentCss.ts` = 506-02**,
**`siteShell.tsx` = 506-03**, **`MenuDesignEditor.tsx` = 506-04**, **tests/docs/closure = 506-05**.
No file has two owners. 506-02/03/04 all depend on 506-01; 506-04 additionally
consumes 506-02's `buildMenuDocumentPreviewCss` emission for the in-canvas preview,
so 506-02's builder API merges before 506-04's canvas work.

---

## Execution-ready contract (normative for the subtasks)

### 506-01 — Model shapes, allowlists, clamps, normalizer partitions

```ts
// core/services/menus/menuDocumentV2.ts

// ---- Per-level fields (levels 1/2) land on NavLevelStyle (@163-180) ----
type NavLevelStyle = {
  /* …existing 16 fields… */
  // B1 item separators (orientation-aware emission in CSS):
  itemDividerShow?: boolean;
  itemDividerColor?: string;                 // token-backed → normalizeMenuColorValue
  itemDividerWidth?: number;                 // clamp 1..8
  itemDividerStyle?: "solid" | "dashed" | "dotted";
  // B2 indicator + hover:
  indicator?: "none" | "underline" | "overline";
  indicatorColor?: string;                   // color
  indicatorThickness?: number;               // clamp 1..6
  indicatorGrow?: boolean;
  hoverUnderline?: boolean;
  transitionMs?: number;                     // clamp 0..400
  hoverLift?: number;                        // clamp 0..8
  // B3 caret + flyout (levels ≥ 1 parents):
  showCaret?: boolean;
  caretRotateOnOpen?: boolean;
  flyoutAnimation?: "none" | "fade" | "slide";
  // B4 dropdown inner padding (container, levels ≥ 1):
  containerPaddingX?: number;                // clamp 0..40
  containerPaddingY?: number;                // clamp 0..32
  // B5 nested placement (levels ≥ 1):
  submenuPlacement?: "right" | "bottom" | "left";
};

// EVERY new key MUST join (fail-closed READ TRAP ⇒ round-trip test each):
//  NAV_LEVEL_STYLE_KEYS            (@565-581) — reject-unknown allowlist (throw on unknown KEY)
//  + exactly ONE value partition:
//    NAV_LEVEL_STYLE_COLOR_KEYS    (@665-672)  itemDividerColor, indicatorColor
//    NAV_LEVEL_STYLE_NUMBER_KEYS   (@673-681)  itemDividerWidth, indicatorThickness,
//                                              transitionMs, hoverLift,
//                                              containerPaddingX/Y   (+ NAV_LEVEL_NUMBER_RANGES entry)
//    (new ENUM branch mirroring @703-710)      itemDividerStyle, indicator,
//                                              flyoutAnimation, submenuPlacement
//                                              (fresh `as const` option arrays + normalizeEnumLocal)
//    (NEW boolean partition — none exists today) itemDividerShow, indicatorGrow,
//                                              hoverUnderline, showCaret, caretRotateOnOpen
//                                              (typeof===boolean, fail-soft omit)
//  NAV_LEVEL_STYLE_COMPARE_KEYS    (menuDocumentCss.ts @620) — else per-device delta silently misses it

// NAV_LEVEL_NUMBER_RANGES (@594-602) additions:
//   itemDividerWidth {min:1,max:8}, indicatorThickness {min:1,max:6},
//   transitionMs {min:0,max:400}, hoverLift {min:0,max:8},
//   containerPaddingX {min:0,max:40}, containerPaddingY {min:0,max:32}

// ---- Level-0 home (Option B, RECOMMENDED): a NEW navProps sub-record ----
// NavItemsProps += navChrome?: NavChromeStyle  (split off in normalizeNavItemsProps @385-389,
//   pruned to legacy shape when empty; own reject-unknown allowlist NAV_CHROME_KEYS).
type NavChromeStyle = {
  // B4 pill (level-0 only):
  navPillBackground?: string;                // color
  navPillRadius?: number;                    // clamp 0..40
  navPillPaddingX?: number;                  // clamp 0..40
  navPillPaddingY?: number;                  // clamp 0..32
  // level-0 variants of B1/B2/B3 (mirror the NavLevelStyle fields above)
  itemDividerShow?: boolean; itemDividerColor?: string; itemDividerWidth?: number; itemDividerStyle?: "solid"|"dashed"|"dotted";
  indicator?: "none"|"underline"|"overline"; indicatorColor?: string; indicatorThickness?: number; indicatorGrow?: boolean;
  hoverUnderline?: boolean; transitionMs?: number; hoverLift?: number;
  showCaret?: boolean; caretRotateOnOpen?: boolean;
  // NO flyoutAnimation on navChrome — it is a levels-≥1 CONTAINER field (NavLevelStyle 1/2 ONLY);
  // the top bar is never a revealed sublist (forceOpenLevel=0 ⇒ undefined). See 506-02 @425-440.
  // (flyoutAnimation still has an effective-default VALUE in NAV_CHROME_DEFAULTS below — that is the
  //  modern-fields defaults lookup for the level 1/2 hint, exactly like the level-only submenuPlacement.)
};

// Option B REQUIRES the FULL navChrome helper family paralleling the levelStyles family
// (levelStyles gets patch/resolve/read/clear + compare-keys + delta collector; navChrome
// must too — otherwise level-0 write/clear/read/resolve + per-device deltas silently break):
//   patchMenuNavChromeForDevice(doc, id, device, patch)          // desktop branch deletes-on-undefined + prunes navChrome→props; tablet/mobile write responsive.navProps.navChrome
//   resolveMenuNavChrome(section, device): NavChromeStyle        // device cascade (tablet/mobile inherit desktop, never each other)
//   readMenuNavChromeOverrideValue(section, device, key)         // raw device-override reader (editor state)
//   readMenuNavChromeBaseValue(section, key)                     // raw base reader (F1 hasBaseValue predicate)
//   clearMenuNavChromeBase(doc, id, key)                         // = patchMenuNavChromeForDevice(..,"desktop",{[key]:undefined}) — see F1 block
//   NAV_CHROME_COMPARE_KEYS + collectNavChromeDeltaRules(doc,device) (menuDocumentCss.ts) — per-device emission
//     with the ≥640-only vs all-width `linkOnly` split (B2 link fields re-emit at mobile;
//     B4 pill / B1 dropdown-divider / container fields stay ≥640-only). WITHOUT this
//     collector, tablet/mobile navChrome overrides NEVER emit (NAV_LEVEL_STYLE_COMPARE_KEYS
//     @620 + collectLevelDeltaRules @671 cover ONLY levelStyles; collectDeltaRules @730
//     covers ONLY MENU_RULE_GROUPS scalars — navChrome is neither).
// (Option A cost tradeoff: if levelStyles were widened to a "0" key instead, ALL of the
//  above reuses the existing per-device levelStyles delta/prune/reject-unknown machinery —
//  the price of Option A's byte-identity blast-radius is avoiding this parallel family.)
```

**F1 base-clear (thin wrappers over existing desktop-branch delete+prune):**

```ts
// level-0 FLAT scalar / layout base clear — ONLY flat `block.props`/`layout` keys.
// The desktop branch runs `applyPatch` over FLAT props keys (@1290-1319) and CANNOT
// reach nested `props.navChrome.*` — do NOT route navChrome through this wrapper.
clearMenuSectionBase(doc, sectionId, group, key)      // = patchMenuSectionForDevice(doc, id, "desktop", group, {[key]: undefined})
// level-0 navChrome (Option B nested sub-record) base clear — DEDICATED helper, NOT
// the flat wrapper above: deletes props.navChrome[key] then prunes props.navChrome→props
// to legacy byte-stable shape (mirror clearMenuBrandStyleBase's nested `style` prune @1518-1519).
clearMenuNavChromeBase(doc, sectionId, key)           // = patchMenuNavChromeForDevice(doc, id, "desktop", {[key]: undefined})
// per-level (1/2) base clear
clearMenuNavLevelStyleBase(doc, sectionId, level, key)// = patchMenuNavLevelStyleForDevice(doc, id, "desktop", level, {[key]: undefined})
// brand base clear (out of 506 B-scope but part of F1 generalization)
clearMenuBrandStyleBase(doc, blockId, key)            // = patchMenuBrandStyleForDevice(doc, id, "desktop", {[key]: undefined})
// EXCLUDE MENU_NAV_DEVICE_DEFINING_KEYS (mobileMode/dropdownDirection) — they carry resolution defaults
```

**F2 resolved-default provider (single model source of truth):**

```ts
// returns the EFFECTIVE value + human source label for an UNSET control
resolveMenuControlDefault(
  section, device, level: 0 | 1 | 2 | "base", key
): { value: number | string | boolean | undefined; sourceLabel: string };
//   level vocabulary: 0 = nav-base scalar/navChrome; 1|2 = NavLevelStyle;
//   "base" = brand/layout scalar (a DISTINCT source domain, NEVER resolved as a level-0 nav key).
// FULL CASCADE WALK (NOT a single N−1 hop). resolveMenuNavLevelStyle (@1574-1584) merges ONLY
//   the level's OWN base+device record — it does NOT fall back to a shallower level — so the
//   walk lives HERE, else a level-2 field unset while level 1 is ALSO unset returns undefined
//   ("Inherits level 1 (undefined)") = the exact misleading-value bug F2 kills.
// level N (1/2) unset ⇒ walk shallower LEVELS until a DEFINED value: for each L in [N−1..1] test
//   resolveMenuNavLevelStyle(section, device, L)[key]; first defined ⇒ { value, sourceLabel:
//   `Inherits level ${L} (…)` } (level 2 w/ level-1 set ⇒ "Inherits level 1"; do NOT jump to 0).
//   If ALL shallower NavLevelStyle levels (down to 1) are unset ⇒ fall through to the LEVEL-0
//   nav-base/navChrome value (level 0 is NOT a NavLevelStyle @186, but .site-nav-link matches
//   deeper links ⇒ it is the real next cascade stop), sourceLabel "Inherits level 0"; if THAT is
//   unset too ⇒ theme/base-sheet default (SHELL_DEFAULT_LINK_* / NAV_FONT_SIZE_INHERITED /
//   NAV_CHROME_DEFAULTS), sourceLabel "Inherited from theme (16px)" | "Default 8px".
// level 0 unset  ⇒ { value: <SHELL_DEFAULT_LINK_* / NAV_FONT_SIZE_INHERITED / NAV_CHROME_DEFAULTS>, sourceLabel: "Default 8px" | "Inherited from theme (16px)" }
// "base" unset (brand/layout scalar) ⇒ { value: <brand/layout theme default>, sourceLabel: "Default …" } — NOT a level-0 nav default
// DEVICE PRECEDENCE (tablet/mobile): device override at this level first; else RESOLVED desktop
//   at the SAME level ⇒ { value, sourceLabel: "Inherited from desktop" }; else the level walk
//   above at desktop — so mobile-unset-with-desktop-also-unset resolves deterministically
//   (desktop-then-walk), never a bare undefined.
// pulls from MENU_APPEARANCE_DEFAULTS / SHELL_APPEARANCE_DEFAULTS / SHELL_DEFAULT_LINK_* /
//   NAV_LEVEL_NUMBER_RANGES / NAV_CHROME_DEFAULTS (below) — NEVER hardcoded in the editor.

// GATED PRESENT-ONLY NUMERICS (indicatorThickness, itemDividerWidth, transitionMs,
//   hoverLift, containerPaddingX/Y, navPillRadius/navPillPaddingX/navPillPaddingY) are a
//   DISTINCT case from the always-resolvable numerics above (link paddingX, fontSize, …).
//   Each is gated by an enabling flag (indicator!=="none", itemDividerShow, pill/dropdown-
//   padding presence): when unset there is NO indicator/divider/pill, hence NO meaningful
//   resolved number. NAV_CHROME_DEFAULTS DELIBERATELY omits them, and range.min
//   (NAV_LEVEL_NUMBER_RANGES) is FORBIDDEN here — it is the exact misleading `0`/`80` bug
//   F2 kills (AC3). THEREFORE for these keys the provider returns
//   `{ value: undefined, sourceLabel: "Off" | "Not applied" }` and the editor renders that
//   label in place of a number (equivalently: the effective-default hint is suppressed
//   until the gating flag turns on) — NEVER range.min. This keeps the provider the SINGLE
//   non-hardcoded source and makes AC3 satisfiable for EVERY numeric control.

// The new B1–B5 enum/bool fields are PRESENT-ONLY and carry NO resolution default in
// the numeric/appearance tables above, so their 'effective default' hint needs a declared
// source-of-truth. resolveMenuControlDefault reads NAV_CHROME_DEFAULTS for these — keeping
// the provider the SINGLE non-hardcoded source (the F2 invariant). These mirror the implicit
// CSS behavior today (caret always-on @712, nested flyout-right @707):
const NAV_CHROME_DEFAULTS = {
  submenuPlacement: "right",   // @707 nested flyout flies right today
  indicator: "none",           // no indicator bar today
  flyoutAnimation: "none",     // pure display toggle today (@703)
  showCaret: true,             // caret ::after always rendered today (@712)
  caretRotateOnOpen: false,    // static caret today
  indicatorGrow: false,
  hoverUnderline: false,
  itemDividerShow: false,      // itemDivider* off ⇒ zero bytes today
  itemDividerStyle: "solid",
  // NOTE: gated present-only NUMERICS (indicatorThickness / itemDividerWidth /
  //   transitionMs / hoverLift / containerPaddingX/Y / navPill{Radius,PaddingX,PaddingY})
  //   are DELIBERATELY absent here — unset ⇒ no element exists, so the provider returns
  //   { value: undefined, sourceLabel: "Off"/"Not applied" }, NEVER range.min (see the
  //   gated-present-only-numeric rule above + AC3).
} as const;
```

### 506-02 — CSS emission (all doc-scoped under `menuDocScope = [data-site-menu-doc="true"]`)

EXACT selector strings (reuse the 504 anchored maps — do NOT invent new specificity):

```
LEVEL_LINK_SELECTORS      (menuDocumentCss.ts @492-495): level0 = ".site-nav-link";
  level1 = ".site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link";
  level2 = ".site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist .site-nav-link"
LEVEL_CONTAINER_SELECTORS (@497-505): level2 = the anchored (0,5,0) form
  ".site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist"  // B5 must emit on THIS, not the short form

B1 separators (orientation-aware, present-only):
  level0 horizontal bar ⇒ `${scope} .site-nav-list > .site-nav-item:not(:last-child){border-inline-end:<w>px <style> <color>}`
  level0 vertical (orientation:vertical) ⇒ border-block-end instead
  dropdown (level≥1) ⇒ `${scope} <LEVEL_DROPDOWN_ITEM_SELECTORS[lvl]>{border-block-end:<w>px <style> <color>}`
    (level1 = dedicated single-member `.site-nav-list > .site-nav-item > .site-nav-sublist > li:not(:last-child)`, NOT the two-member LEVEL_CONTAINER_SELECTORS[1] with `> li` appended)
B2 indicator (levelLinkDecls @509 + levelStateRules @521 family) — GPU-friendly
  scaleX/opacity technique (NOT a `width` animation):
  DECONFLICTION — the caret already owns `.site-nav-link::after` (@712), and one
    element has exactly ONE ::after; a GROUP-PARENT link can be hovered AND carry
    `[aria-current=page]`, so the B2 bar and the B3 caret would fight (last-wins by
    source order) on that same pseudo. THEREFORE the B2 indicator bar is emitted on
    **`::before`** (leaf links use neither pseudo; group parents keep the caret on
    ::after) so caret + indicator coexist on group-parent links.
  POSITIONING — `.site-nav-link` is NOT positioned (`siteShellCss.ts:144` = only
    display/padding/border-radius/color); the nearest positioned ancestor is the
    `.site-nav-item{position:relative}` `<li>` (`:143`) which for group parents ALSO
    wraps the `.site-nav-sublist` flyout — so an absolute `bottom:0` bar would anchor
    to the whole li (behind/below the dropdown), not the link box. THEREFORE when the
    indicator field is present, ALSO add `position:relative` to that level's link
    decls (`levelLinkDecls` / the level-0 group) so the absolute bar measures against
    the link box.
  bar ⇒ `<linkSel>{position:relative}` + `<linkSel>::before{content:"";position:absolute;<underline:bottom:0|overline:top:0>;left:0;height:<t>px;width:100%;background:<c>;<grow? transform:scaleX(0);transform-origin:left : opacity:0>;transition:...}`
  shown on `<linkSel>:hover::before` + `<linkSel>:where([aria-current="page"])::before{<grow? transform:scaleX(1) : opacity:1>}`
  hoverUnderline ⇒ `<linkSel>:hover{text-decoration:underline}`
  hoverLift ⇒ `<linkSel>:hover{transform:translateY(-<lift>px)}`; transitionMs ⇒ transition on color/background/transform
B3 caret (make @712 toggleable, NOT add):
  showCaret=false ⇒ suppress the `li[data-site-nav-group="true"]>.site-nav-link::after{content:" \25BE"}` rule for that level
  caretRotateOnOpen ⇒ `li[data-site-nav-group="true"]:hover>.site-nav-link::after,…:focus-within>…{transform:rotate(180deg)}`
  flyoutAnimation (fade|slide) ⇒ rest `opacity:0`(+`transform:translateY(-6px)` for slide) + shown `opacity:1` revealed via
    `transition:opacity …ms(,transform …ms),display …ms allow-discrete` + a matching `@starting-style` block, layered OVER the display toggle @703 (NO `visibility`);
    NEVER replace `display:none→grid` — allow-discrete makes the discrete flip participate (keeps zero-JS hover/focus-within reachability @703)
B4 pill (level-0 wrapper) ⇒ `${scope} .site-nav-list{background:<bg>;border-radius:<r>px;padding:<py>px <px>px}` (new base group/collector)
  dropdown inner padding (level≥1, container channel @535, ≥640-only) ⇒ padding on LEVEL_CONTAINER_SELECTORS[lvl]
B5 nested placement — emit the positioning decls INSIDE `levelContainerDecls` (@535)
  keyed on `LEVEL_CONTAINER_SELECTORS[lvl]` (level 2 = the anchored (0,5,0) form @504),
  so B5 flows through `navLevelRules` (@566/@579) into BOTH `desktopShared` (@767) AND
  `collectLevelDeltaRules` (@671→@682, tablet delta). Mobile is `linkOnly` ⇒ container
  decls are OMITTED, which is CORRECT (flyout placement is ≥640-only). B5 does NOT live
  in `navNestingRules` (@707): that fn is invoked ONCE on `base` and folded ONLY into
  `desktopShared` (@766) — it is NOT on the per-device delta path, so putting B5 there
  would make tablet/mobile `submenuPlacement` overrides silently never emit AND bypass
  the (0,5,0) `LEVEL_CONTAINER_SELECTORS[2]` specificity map.
  Each decl MUST reset ALL FOUR offsets (a winning rule only overrides the props it
  declares; anything left undeclared falls back to @707's `left:100%` + direction-aware
  `top/bottom`, yielding a double-anchor stretch):
  right ⇒ left:100%;right:auto;top:0;bottom:auto
  bottom ⇒ left:0;right:auto;top:100%;bottom:auto
  left ⇒ right:100%;left:auto;top:0;bottom:auto
  The base `navNestingRules` @707 short-selector rule (`left:100%;`+`top:0;bottom:auto`
  default / `bottom:0;top:auto` under `dropdownDirection:'top'`) stays as the unset `right`
  default; the (0,5,0) anchored container decl overrides it by specificity + source order
  ONLY for the offsets it re-declares — hence the full four-offset reset above (else
  placement `left` inherits `left:100%` → left+right double-anchor, and ANY placement under
  `dropdownDirection:'top'` inherits `bottom:0` → top+bottom double-anchor).
  keep the base dropdownDirection(top|bottom) first-dropdown rule @325 working
```

Mobile `linkOnly` split (`navLevelRules(..., {linkOnly:true})` `@578/@682/@786`): LINK-level
new fields (B2 indicator/hover/lift) re-emit at mobile; CONTAINER-level new fields
(B4 dropdown padding, B1 dropdown divider, pill) stay ≥640-only. Canvas force-open
`previewForceOpenLevel` (`@894-902`) must additionally neutralize B3's rest state
via `display:grid;opacity:1;transform:none` (NO `visibility`) or the animated flyout stays invisible
on canvas.

### 506-04 — Editor wiring (F1 reset + F2 hint data flow)

- **F1:** `MenuResponsiveControlShell` gains `hasBaseValue` predicate + `onResetBase`;
  render Reset when `state==="override" || (state==="base" && hasBaseValue)`;
  tooltip copy per branch ("Reset to default" for base, keep "Remove the {device}
  override…" for device). Base-value predicates alongside the existing raw readers:
  `navBaseValue(key)` (first nav-items block props hasOwn), `brandBaseValue(key)`
  (`block.props.style` hasOwn), `levelBaseValue(level,key)` (new raw reader
  `readMenuNavLevelStyleBaseValue`), `layoutBaseValue`. `onResetBase` calls the
  506-01 base-clear on desktop / the existing responsive clear on tablet/mobile.
- **F2:** one reusable `<ControlDefaultHint>` (generalize the `:1644-1651` span, keep a
  stable `data-*` hook for tests) under EVERY control, fed by
  `resolveMenuControlDefault(...)`; kill the misleading `?? .min` display by showing
  `resolved value + sourceLabel` when the own record is unset.
- **B1–B5:** append the new per-level controls to `NavLevelControls` (`@1351-1408`)
  and the level-0 controls to the nav-base block (`@1580-1840`); segmented for enums,
  slider for clamped numbers (bounds from the exported range tables), toggle for bools,
  swatch for colors. Thread the selected level into the canvas force-open (already wired
  `@2102-2103/@2294`).

---

## Hard Invariants (each a named guard in 506-05)

1. **Fail-closed READ-trap round-trips.** Every new key added to a reject-unknown
   allowlist (`NAV_LEVEL_STYLE_KEYS`, `NAV_CHROME_KEYS` (Option B) or
   `NAV_ITEMS_PROP_KEYS`+`MenuAppearance` (Option A)) gets a round-trip persistence
   test: write→normalize→re-read equals input, AND a stored-doc-carrying-the-key
   survives read (proves no silent whole-doc degrade). A forgotten key degrades EVERY
   stored doc carrying it to empty on read.
2. **`buildSiteShellCss(null)` byte-identical** — `tests/unit/pages/siteShellCss.test.ts`
   ZERO edits; base sheet `siteShellCss.ts` untouched. All new visuals emit only from
   the doc-scoped sheet.
3. **No-override docs byte-identical** — `tests/unit/site/menu-document-render.test.tsx`;
   present-only emission ⇒ zero new bytes when unauthored. Base reset lands the doc at
   the exact no-override byte-identical shape (F1 round-trip).
4. **ONE shared builder.** All new CSS via `buildMenuRuleSetsForDocument` so front
   `@media` (`buildMenuDocumentCss`) + canvas flatten (`buildMenuDocumentPreviewCss`)
   NEVER diverge.
5. **Per-device cascade.** tablet+mobile each diff vs DESKTOP base; mobile NEVER
   inherits tablet. LINK-level new fields re-emit at mobile; CONTAINER-level new fields
   stay ≥640-only (`linkOnly`).
6. **B5 preserves the anchored (0,5,0) level-2 container specificity** (`@504`) and keeps
   `dropdownDirection` (`@707/@325`) working.
7. **B3 flyoutAnimation keeps the zero-JS hover/focus-within open + reachability**
   (an `opacity`(+`transform`) reveal via `transition:…,display …ms allow-discrete` + a
   matching `@starting-style` block, layered over the `display:none→grid` toggle so the
   discrete flip participates — never a plain opacity transition that snaps on open, and
   NO `visibility`) and does not fight canvas force-open (force-open emitted LAST).
8. **NO `schemaVersion` bump; NO route/RBAC/endpoint/migration.**

---

## Acceptance Criteria (measured LIVE, not synthetic-only)

1. **Every bundle visible at the right depth.** Style each level (0/1/2) for B1–B5;
   verify on the FRONT at the correct hover depth AND on the canvas force-open: B1
   separators appear between items (vertical on the bar, horizontal in dropdowns), B2
   indicator bar animates on hover + shows on the current page, B3 caret toggles/rotates
   and the flyout fades/slides while staying keyboard-reachable, B4 pill wraps
   `.site-nav-list` + dropdown inner padding applies, B5 level-2 flyout goes RIGHT /
   BELOW / LEFT per the enum.
2. **F1 base reset restores default.** A value authored on the DESKTOP BASE (e.g. link
   `paddingX`) shows a "Reset to default" affordance; clicking it removes the field, the
   canvas re-centers to the CSS/theme default, and the stored doc is byte-identical to a
   doc that never had the value.
3. **F2 default hint shows the effective number/source.** An unset numeric/enum/color
   control shows the RESOLVED effective value + source ("Default 8px" / "Inherits level 1
   (14px)" / "Inherited from theme (16px)" / "Inherited from desktop") — never the
   misleading `range.min`. For the GATED present-only numerics (indicatorThickness,
   itemDividerWidth, transitionMs, hoverLift, containerPaddingX/Y, navPill* numbers) there
   is no resolved number when their enabling flag is off, so the hint reads "Off" /
   "Not applied" (or is suppressed until the gate turns on) — again never `range.min`.
4. **Per-device works.** A level override set on tablet/mobile diffs vs desktop (front
   `@media` + canvas); mobile never inherits tablet; the existing Reset prunes the device
   record.
5. **Byte-identity.** No-override menu CSS is byte-identical to pre-TASK-506;
   `buildSiteShellCss(null)` unchanged; front markup unchanged (no new class/aria).
6. Full gates green: `bun --cwd core lint`, `lint:types`, root `tsc -p tsconfig.json
   --noEmit`, `test:bun`, full vitest, `gates:coderso`.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free — pure model/CSS/UI):**
- `tests/vitest/services/menu-document-v2.test.ts` — per-key round-trip persistence for
  EVERY new allowlist key (write→normalize→re-read; stored-doc-with-key survives read);
  reject-unknown KEY throws `MenuDocumentError`+path; fail-soft value OMIT on bad
  value/type (bool/enum/number); clamp bounds; F1 base-clear byte-identity (base reset ==
  never-had-it shape) per surface (level-0 flat scalar, level-0 navChrome nested sub-record,
  per-level, brand) — the navChrome case asserts `clearMenuNavChromeBase` lands byte-identical
  to a doc that never carried the navChrome member (prune of the emptied `props.navChrome`
  object OFF props, the fail-closed nested-prune-to-legacy risk); F2
  `resolveMenuControlDefault` source labels (level N ⇒ cascade-walk shallower levels: level 2
  w/ level-1 SET ⇒ "Inherits level 1", level 1 ⇒ "Inherits level 0"; level 0 ⇒
  theme/base default; tablet/mobile ⇒ inherits desktop) INCLUDING the compound fall-through
  cases the single-hop walk mis-reports: level-2-unset-WITH-level-1-ALSO-unset ⇒ falls
  through to level-0 nav-base / then theme (never "Inherits level 1 (undefined)"), and
  mobile-unset-WITH-desktop-ALSO-unset ⇒ resolves desktop-then-level-walk (never bare
  undefined); prune-empty legacy byte-identity.
- `tests/vitest/site/menu-document-css.test.ts` (or the existing CSS suite) — present-only
  zero-byte emission when unset; exact selector strings per bundle (B1 orientation-aware
  border side, B2 `::before` bar + link `position:relative` + `[aria-current=page]` (caret
  stays on `::after` — group-parent link carries BOTH), B3 caret suppress/rotate + flyout
  `opacity`(+`transform`) reveal via `display …ms allow-discrete` + `@starting-style` (NO `visibility`), B4 pill on `.site-nav-list` + container padding, B5 nested
  placement on the anchored (0,5,0) selector); mobile `linkOnly` split (link fields re-emit,
  container fields ≥640-only); per-device delta diff vs desktop.
- `tests/vitest/ui/menu-design-editor.test.tsx` — F1 Reset renders on base-with-value +
  clears to default (`data-*` hook); F2 hint shows resolved value+source under every control;
  B1–B5 controls write per-level + per-device (Desktop ⇒ base, Mobile ⇒ sparse override);
  no setState-in-effect regressions.

**Bun lane (route/runtime menu suites):**
- `tests/integration/routes/menus.test.ts` — a `document` PATCH carrying the new fields
  persists per-key without dropping siblings; invalid payload 4xx's with
  `menu_document_invalid` + path.
- `tests/unit/site/menu-document-render.test.tsx` — front `@media` emission per bundle +
  canvas flatten parity; no-override byte-identity; front markup unchanged.
- `tests/unit/pages/siteShellCss.test.ts` — byte-identity guard changes by ZERO lines.

**SMOKE — owner mandate (authored in 506-05): ≥5 DISTINCT real-flow scenarios asserting
VISIBLE EFFECT (computed styles/geometry), not control presence.** Real-input playwright
against the running admin (`coderso-a.localhost:5173`) + front (`:3000`):
1. **Deep-level styling + B5 placement (all axes, both directions).** Style level 2 with B1
   separator + B2 indicator + B5, and assert the nested flyout anchors on EXACTLY ONE axis
   per config (no double-anchor stretch from an inherited @707 offset):
   - `submenuPlacement:"bottom"` (default `dropdownDirection`): flyout BELOW (`top` ≈ parent
     bottom, `left` ≈ 0) and NOT `left:100%`;
   - `submenuPlacement:"left"` (default `dropdownDirection`): flyout to the LEFT (`right` ≈
     parent left edge) AND the used `left` is `auto` (NOT still `100%`) so it does not
     stretch full-width — the regression the two-offset spec missed;
   - `submenuPlacement:"bottom"` under `dropdownDirection:"top"`: flyout below with the used
     `bottom` = `auto` (NOT the inherited `bottom:0`) so it does not simultaneously top+bottom
     anchor.
   Also assert `getComputedStyle` shows the B1 border between items and the `::before`
   indicator geometry.
2. **Override/reset cycle (F1).** Author a DESKTOP-BASE link `paddingX`; assert the geometry
   changed; click "Reset to default"; assert geometry returns to the theme default AND the
   stored doc is byte-identical to the never-had-it shape.
3. **Every-control-visible-effect.** For B2 (indicatorGrow/hoverLift/transitionMs/hoverUnderline)
   and B3 (showCaret/caretRotateOnOpen/flyoutAnimation) assert each produces a distinct
   measured change (indicator width grows on hover, link lifts, caret suppressed/rotated,
   flyout opacity transitions) — reachability via keyboard focus-within preserved.
   Caret+indicator coexistence: on a level-0 GROUP-PARENT item with BOTH B3 showCaret=true
   and a B2 indicator enabled, assert `getComputedStyle(link, "::after").content` still
   carries the caret glyph (`\25BE`) AND `getComputedStyle(link, "::before")` shows the
   indicator bar (non-zero height/background) simultaneously — neither pseudo overwrites the
   other — and the `::before` bar's box sits at the LINK's bottom/top (link has
   `position:relative`), not below the flyout region.
4. **Cross-device.** Set a B4 pill + B1 separator on desktop, override the indicator color on
   mobile; at ≤639px the mobile override shows and container-level pill/padding respects the
   ≥640-only split; ≥640px shows desktop; mobile never inherits tablet.
5. **Publish→front parity.** Publish a fully-styled menu (all 5 bundles across levels 0/1/2)
   and assert the front render matches the canvas force-open at each depth
   (computed-style/geometry parity), and F2 default hints show the effective numbers in the
   editor for the unset controls.

**Named guards:** fail-closed READ-trap round-trip per new key; `buildSiteShellCss(null)`
ZERO-line diff; no-override byte-identity; present-only zero-byte emission; B5 (0,5,0)
specificity + `dropdownDirection` intact; B3 reachability + `opacity`(+`transform`) reveal via
`display …ms allow-discrete` + `@starting-style` (NO `visibility`; never a plain opacity transition
that snaps on open); ONE-shared-builder front/canvas parity; per-device
mobile-never-inherits-tablet + `linkOnly` split; no `schemaVersion` bump; base-reset
byte-identity.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (menuDocumentV2 section) — the new `NavLevelStyle` fields + the
  level-0 `navChrome` home (Option B) or the level-0 `levelStyles` extension (Option A),
  the F1 base-clear helpers, the F2 resolved-default provider, and per-bundle CSS contract.
- `_docs/CONTENT_TYPES_SPEC.md` — the 5 modern bundles (fields, clamp ranges, enums,
  orientation-aware separators, nested placement) + base-reset / visible-default UX.
- `_docs/_CHANGELOG/` — a new entry (next free number after 1214 — allocate at closure)
  listing TASK-506 + every closed leaf (506-01..05), the F1/F2 decisions, the level-0
  home choice, and the deferred residuals.
- `_docs/_TASKS/README.md` — parent + 5 child rows added to **To Do**; **Statistics**
  To Do +6; move to **Done** at closure.

---

## Deferred (state in changelog residuals)

Levels 3+ independent styling; custom font-family / line-height; icon/badge per item;
mobile-drawer styling (drawer not rendered yet); JS-driven flyout collision / edge-flip;
per-item (not per-level) separator/indicator overrides.

---

## Affected Files (grounded)

- `core/services/menus/menuDocumentV2.ts` — new `NavLevelStyle` fields + level-0 home
  (Option B `navChrome` sub-record, recommended) with its FULL helper family paralleling
  levelStyles: `patchMenuNavChromeForDevice` / `resolveMenuNavChrome` /
  `readMenuNavChromeOverrideValue` / `readMenuNavChromeBaseValue` / `clearMenuNavChromeBase`
  (dedicated navChrome base-clear that prunes `props.navChrome`→`props`, NOT the flat
  `clearMenuSectionBase` scalar path) + `NAV_CHROME_KEYS` allowlist (the navChrome
  per-device compare list `NAV_CHROME_COMPARE_KEYS` lives in `menuDocumentCss.ts` under 506-02,
  mirroring `NAV_LEVEL_STYLE_COMPARE_KEYS` @620; 506-01 only SUPPLIES its exact key set in the
  closure note);
  allowlist / clamp-range / compare-key / normalizer-partition (color/number/enum/**new
  boolean**) extensions; F1 base-clear wrappers (`clearMenuSectionBase` /
  `clearMenuNavLevelStyleBase` / `clearMenuNavChromeBase` / `clearMenuBrandStyleBase` over the
  existing desktop-branch delete+prune); F2 `resolveMenuControlDefault` `{ value, sourceLabel }`
  (FULL cascade walk — shallower levels via `resolveMenuNavLevelStyle` per level, then
  fall through level-0 nav-base/navChrome, then theme/base default when all shallower levels
  are unset; the walk lives in the provider because `resolveMenuNavLevelStyle` does NOT
  self-fall-back a level; device override → desktop-same-level → level walk). (+
  `normalizeMenuAppearance.ts` ONLY if Option A). (506-01)
- `core/site/menuDocumentCss.ts` — B1 separators (orientation-aware borders), B2
  indicator/hover/lift/transition (`levelLinkDecls`/`levelStateRules` + `[aria-current=page]`),
  B3 caret toggle/rotate + flyout `opacity`(+`transform`) reveal via `display …ms allow-discrete` + `@starting-style` (`navNestingRules` @707/@712),
  B4 pill (`.site-nav-list` group) + dropdown padding (`levelContainerDecls`), B5 nested
  placement on the anchored (0,5,0) selector; per-device delta (`collectLevelDeltaRules`
  levelStyles + NEW `collectNavChromeDeltaRules` for level-0 navChrome, gated by NEW
  `NAV_CHROME_COMPARE_KEYS` created HERE (mirroring `NAV_LEVEL_STYLE_COMPARE_KEYS` @620; key set
  supplied by 506-01) — else tablet/mobile
  navChrome never emits) + `linkOnly` split; canvas force-open neutralizes B3 hidden state.
  (506-02)
- `core/site/siteShell.tsx` — expected ZERO changes; 506-03 asserts no new markup/class/aria
  + `buildSiteShellCss(null)` + no-override byte-identity. (506-03)
- `core/admin/ui/menus/MenuDesignEditor.tsx` — F1 shell Reset-on-base + base-value predicates
  + `onResetBase` wiring; F2 `<ControlDefaultHint>` under every control from the model
  provider; B1–B5 per-level + level-0 controls; selected-level threaded to canvas force-open.
  (506-04)
- tests + docs + changelog + board/Statistics. (506-05)
</content>
</invoke>
