# 1215 - TASK-506 Menu Modern Styling — Base Reset, Visible Defaults & 5 Modern Bundles

**Date:** 2026-07-03
**Version:** Unreleased
**Tasks:** TASK-506, TASK-506-01, TASK-506-02, TASK-506-03, TASK-506-04, TASK-506-05
**Type:** Admin UI/Content (Menus)/Navigation/Page Builder/Site Front/Responsive/QA/Docs/Task Board

## Overview

Two owner-reported UX foundations plus five owner-approved "modern styling"
bundles for the menuDocumentV2 Design tab — all on the SAME architecture family as
TASK-504/505 (the document contract + doc-scoped CSS via the ONE shared
`buildMenuRuleSetsForDocument` + `MenuDesignEditor` controls), on the EXISTING
validated `PATCH /menus/:id` envelope.

- **F1 — Base-record reset-to-default.** A value authored on the DESKTOP BASE (e.g.
  a link `paddingX`, a per-level field, a navChrome pill, a brand style key) can now
  be cleared back to the CSS/theme default. Base reset lands the doc **byte-identical
  to a doc that never carried the value**.
- **F2 — Visible resolved default / inherited value.** Every unset numeric/enum/
  color control shows the RESOLVED effective value + its SOURCE (a single model
  provider `resolveMenuControlDefault`), never the misleading `range.min`.
- **B1–B5 modern bundles** (per-level 0/1/2 + per-device tablet/mobile): item
  separators (orientation-aware), hover/active underline indicator + hover-lift +
  transition, caret toggle + rotate + flyout animation, pill nav + dropdown padding,
  nested submenu placement.

**No new endpoint / RBAC / migration.** The document rides the existing
`menuUpdateSchema.document` (`{ type: ["object","null"] }`) with service-side strict
validation (`core/server/validation/menuSchemas.ts` unchanged); `menus.settings` is
freeform jsonb. **No `menuDocumentV2` `schemaVersion` bump** (stays
`schemaVersion: 1`). The level-0 chrome home is **Option B** — a NEW
`NavItemsProps.navChrome` sub-record parallel to `levelStyles`, keeping
`MenuAppearance` churn and byte-identity blast radius minimal.

- **Byte-identity preserved.** `buildSiteShellCss(null)` byte-identical
  (`tests/unit/pages/siteShellCss.test.ts` ZERO-line diff — nothing new enters the
  base sheet, `siteShellCss.ts` untouched); no-override menu docs byte-identical on
  BOTH `buildMenuDocumentCss` and `buildMenuDocumentPreviewCss`. All new visuals
  emit present-only from the `[data-site-menu-doc="true"]` doc scope, overriding the
  hardcoded base by later source order.
- **Fail-closed READ blast radius asserted consciously** — each new
  `NAV_LEVEL_STYLE_KEYS` / `NAV_CHROME_KEYS` entry carries a per-key round-trip
  persistence test; an unknown key inside a stored `levelStyles` / `navChrome` record
  degrades the WHOLE stored document to the default look (proven by test, not
  discovered in production).

## Key Changes

### 506-01 — Menu model: reset, defaults & modern fields (`core/services/menus/menuDocumentV2.ts`)
- `NavLevelStyle` (levels 1/2) gains B1/B2/B3/B4-container/B5 fields:
  `itemDivider{Show,Color,Width,Style}`, `indicator{,Color,Thickness,Grow}`,
  `hoverUnderline`, `transitionMs`, `hoverLift`, `showCaret`, `caretRotateOnOpen`,
  `flyoutAnimation` (levels ≥ 1 ONLY), `containerPaddingX/Y`, `submenuPlacement`
  (level-2 read). Each new key joins `NAV_LEVEL_STYLE_KEYS` (reject-unknown) AND
  exactly one value partition — COLOR / NUMBER (+`NAV_LEVEL_NUMBER_RANGES` clamp) /
  a NEW enum branch / a NEW boolean partition (none existed pre-506). New clamps:
  `itemDividerWidth [1,8]`, `indicatorThickness [1,6]`, `transitionMs [0,400]`,
  `hoverLift [0,8]`, `containerPaddingX [0,40]`, `containerPaddingY [0,32]`.
- **Level-0 home (Option B):** a NEW `NavChromeStyle` sub-record on
  `NavItemsProps.navChrome` (B4 pill `navPill{Background,Radius,PaddingX,PaddingY}` +
  the level-0 variants of B1/B2/B3; NO `flyoutAnimation`). Split off in
  `normalizeNavItemsProps` BEFORE the flat `NAV_ITEMS_PROP_KEYS` subset (mirroring
  the `levelStyles` split), with its own `NAV_CHROME_KEYS` allowlist + partitions +
  `NAV_CHROME_NUMBER_RANGES` (`navPillRadius/PaddingX [0,40]`, `navPillPaddingY [0,32]`)
  + prune-empty-to-legacy. Full parallel helper family: `patchMenuNavChromeForDevice`,
  `resolveMenuNavChrome`, `readMenuNavChromeOverrideValue`,
  `readMenuNavChromeBaseValue`; `resolveMenuSectionAppearanceForDevice` carries
  `navChrome` forward (deep-merge). `NAV_ITEMS_PROP_KEYS` / `BRAND_PROP_KEYS` /
  `MENU_SECTION_KEYS` unchanged; `normalizeMenuAppearance.ts` untouched.
- **F1 base-clear wrappers** over the existing desktop `bp===null` delete+prune
  branches: `clearMenuSectionBase`, `clearMenuNavLevelStyleBase`,
  `clearMenuNavChromeBase` (dedicated — prunes `props.navChrome`→`props`, NOT the flat
  scalar path), `clearMenuBrandStyleBase` — each lands the exact never-had-it byte
  shape. `MENU_NAV_DEVICE_DEFINING_KEYS` (`mobileMode`/`dropdownDirection`) are
  EXCLUDED (they carry resolution defaults). Base raw readers
  `readMenuNavLevelStyleBaseValue` / `readMenuSectionBaseValue` /
  `readMenuBrandStyleBaseValue` feed the editor's `hasBaseValue` predicate.
- **F2 provider** `resolveMenuControlDefault(section, device, level, key) →
  { value, sourceLabel }` (section-only, 4-param): a FULL CASCADE WALK, not a single
  hop. tablet/mobile unset recurses through the provider on `"desktop"` (label stays
  "Inherited from desktop") so a compound device×level-unset case NEVER surfaces
  `(undefined)`; level N unset walks shallower LEVELS then level-0 nav-base/navChrome
  then theme/base default; gated present-only numerics return
  `{ value: undefined, sourceLabel: "Off"/"Not applied" }` (never `range.min`); the
  modern enum/bool defaults read the EXPORTED `NAV_CHROME_DEFAULTS`
  (`submenuPlacement:"right"`, `showCaret:true`, `indicator:"none"`, …) as the single
  non-hardcoded source. Exported model consts `MENU_SHELL_DEFAULT_LINK_{PX,PY,RADIUS}`
  (12/8/6) keep the provider self-contained (no CSS/editor import cycle).

### 506-02 — Menu CSS: separators, indicator, placement & pill (`core/site/menuDocumentCss.ts`)
- **B1 orientation-aware separators:** level-0 top bar ⇒ VERTICAL
  `border-inline-end` on `.site-nav-list > .site-nav-item:not(:last-child)`; dropdown
  (levels ≥ 1) ⇒ HORIZONTAL `border-block-end` on the dedicated single-member
  `… > .site-nav-sublist > li:not(:last-child)` selector.
- **B2 indicator** as a `::before` bar (caret keeps `::after` — they coexist on group
  parents) with `position:relative` added to the link; `indicatorGrow` ⇒
  `scaleX(0)→scaleX(1)` (non-grow ⇒ `opacity:0→1`) shown on `:hover`/`:focus-visible`/
  `:where([aria-current="page"])`; `hoverUnderline`/`hoverLift`/`transitionMs`
  present-only. Link-level ⇒ re-emits at mobile.
- **B3 caret:** `showCaret:false` suppresses the caret `::after` (`content:none`);
  `caretRotateOnOpen` rotates 180° on `:hover`/`:focus-within`; `flyoutAnimation`
  (fade|slide) reveals via `opacity`(+`transform`) with
  `transition:…,display …ms allow-discrete` + a matching `@starting-style` block,
  layered OVER (never replacing) the `display:none→grid` toggle — zero-JS reachability
  preserved, NO `visibility`.
- **B4:** pill on `.site-nav-list` (bg/radius/padding); dropdown container padding on
  the container selector (≥640-only). **B5:** nested placement on the anchored (0,5,0)
  `LEVEL_CONTAINER_SELECTORS[2]` selector with all-four-offset resets
  (right/bottom/left distinct), preserving the 504 specificity + the base
  `dropdownDirection` first-dropdown rule.
- Per-device deltas: `collectLevelDeltaRules` (levelStyles) + NEW
  `collectChromeDeltaRules` (navChrome) diff vs DESKTOP with the ≥640-only vs all-width
  `linkOnly` split (link fields re-emit at mobile; pill/divider/container stay ≥640);
  `submenuPlacement` rides a STANDALONE `submenuPlacementDeltaRule` (≥640-only, never
  mobile). Canvas force-open additionally neutralizes B3's rest state
  (`display:grid;opacity:1;transform:none`, NO `visibility`).

### 506-03 — Front & preview parity (`core/site/siteShell.tsx`)
- Every B1–B5 bundle is PURE CSS on EXISTING markup hooks (`.site-nav-list`,
  `.site-nav-item`, `li[data-site-nav-group]`, `.site-nav-link`, nested
  `.site-nav-sublist`, `[aria-current="page"]`, `[data-menu-block-id]`) — styling a
  doc changes ONLY the emitted `<style>`, never the rendered DOM (byte-identical
  markup, no new class/aria). `buildSiteShellCss(null)` untouched.

### 506-04 — Design editor: reset, defaults & modern controls (`core/admin/ui/menus/MenuDesignEditor.tsx`)
- **F1:** `MenuResponsiveControlShell` renders Reset when the control's OWN record
  (base OR device) carries an explicit value (`hasBaseValue` from the RAW base
  readers), tooltip copy per branch ("Reset to default" on base vs "Remove the
  {device} override…"); `onResetBase` calls the 506-01 base-clear.
- **F2:** one reusable `<ControlDefaultHint data-menu-control-default>` under every
  numeric/enum/color control, fed by `resolveMenuControlDefault` — the misleading
  `?? range.min` display is gone.
- **B1–B5** per-level (+ level-0 navChrome) controls: segmented for enums, sliders
  (bounds from the exported range tables) for clamped numbers, toggles for bools,
  swatches for colors; B4 pill only on Level 0, container padding on 1/2, B5 only on
  Level 2. Selecting a level ≥ 1 threads it into the canvas force-open. All writes
  fire from event handlers (no setState-in-effect).

### 506-05 — Tests, docs & closure (this entry)
- Verified the sibling-owned matrices green together and **filled the emission-golden
  gap**: added positive per-bundle CSS goldens for B1 (orientation-aware
  `border-inline-end`/`border-block-end`), B2 (`::before` scaleX/opacity + `[aria-current]`),
  B3 (caret `content:none`, 180° rotate, flyout `@starting-style` + `allow-discrete`,
  NO `visibility`), B4 (pill + container padding), B5 (anchored (0,5,0) placement
  right/bottom/left) plus present-only, doc-scope, front↔canvas parity, per-device
  navChrome delta, and the STANDALONE B5 tablet delta (≥640-only, never mobile) —
  `tests/vitest/site/menu-document-css.test.ts` + `tests/unit/site/menu-document-render.test.tsx`.
  The render lane also pins the F1 base-reset ⇒ never-had-it CSS-sheet byte-identity.
- Route boundary (`tests/integration/routes/menus.test.ts`): `PATCH /menus/:id`
  round-trips the modern per-level + navChrome + per-device deltas WITHOUT dropping
  siblings; invalid per-level key and invalid navChrome key map to 400
  `menu_document_invalid` with the exact `path`, store untouched.
- Model matrix (`tests/vitest/services/menu-document-v2.test.ts`): table-driven
  per-key round-trip READ traps for EVERY new key + whole-doc blast radius; reject-
  unknown path; fail-soft value omit; clamp bounds; F1 base-clear byte-identity per
  surface; F2 provider labels incl. the compound level-2-unset-with-level-1-also-unset
  and the compound device×level fall-through (never `(undefined)`).
- Editor (`tests/vitest/ui/menu-design-editor.test.tsx`): F1 base Reset on desktop,
  F2 hint (resolved value not range.min), B1–B5 device-forked writes, force-open
  threading, no setState-in-effect.
- Docs: `_docs/PAGE_MODEL.md` + `_docs/CONTENT_TYPES_SPEC.md` extended; board +
  Statistics closed.

## Guards & invariants (asserted)

1. Fail-closed READ-trap round-trip per new key (whole-doc blast radius asserted).
2. `buildSiteShellCss(null)` byte-identity — `siteShellCss.test.ts` ZERO-line diff;
   base sheet untouched.
3. No-override menu docs byte-identical on BOTH CSS builders (present-only emission).
4. F1 base reset ⇒ never-had-it byte-identity (model round-trip + render-layer sheet
   equality).
5. ONE shared builder — front `@media` + canvas flatten never diverge.
6. Per-device cascade — tablet+mobile diff vs DESKTOP; mobile NEVER inherits tablet;
   link fields re-emit at mobile, container fields stay ≥640-only; every new
   per-level key ∈ `NAV_LEVEL_STYLE_COMPARE_KEYS`, every navChrome key ∈ the navChrome
   compare list; B5 `submenuPlacement` rides the standalone tablet delta.
7. B5 preserves the anchored (0,5,0) level-2 specificity + keeps `dropdownDirection`.
8. B3 flyoutAnimation keeps the zero-JS hover/focus-within open + reachability
   (`allow-discrete` + `@starting-style`, NO `visibility`) and does not fight canvas
   force-open.
9. NO `schemaVersion` bump; NO route/RBAC/endpoint/migration.
- Gates green together: `bun --cwd core lint`, `lint:types`, root
  `bunx tsc -p tsconfig.json --noEmit`, `test:vitest`, `test:bun`, `gates:coderso`.

## Deferred residuals (honest)

- Levels 3+ independent styling (the level-2 descendant selector covers depth 3+
  uniformly).
- Custom `font-family` / `line-height`; icon/badge per item.
- Mobile-drawer styling — the `menu-drawer` section is not front-rendered yet.
- JS-driven flyout collision / edge-flip (CSS-only placement for now).
- Per-item (not per-level) separator/indicator overrides.
