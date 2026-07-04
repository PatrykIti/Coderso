# 1211 - TASK-502 Menu Design Fixes V2 — Brand Text, Tablet Cascade, Canvas WYSIWYG & Nested Submenus

**Date:** 2026-07-02
**Version:** Unreleased
**Tasks:** TASK-502, TASK-502-01, TASK-502-02, TASK-502-03, TASK-502-04, TASK-502-05
**Type:** Admin UI/Content (Menus)/Navigation/Site Front/Responsive/QA/Docs/Task Board

## Overview

Fixes the seven owner-reported Menu Design bugs from the 2026-07-02 live recon
and lands two owner decisions that un-defer TASK-501 scoping choices — all on
the existing validated `PATCH /menus/:id` envelope with **no new
endpoint / RBAC / migration**. Editable brand text with a `text → siteName →
null` fallback chain shared by canvas and front; a real **tablet cascade** that
mirrors Pages exactly (desktop = base; tablet AND mobile each carry their own
sparse record and BOTH inherit from DESKTOP — mobile does NOT inherit tablet);
device-DEFINING panel controls (`mobileMode`, `dropdownDirection`) that write
the base and are device-scope-visible; canvas WYSIWYG via site-token painting
on the canvas frame root; divider blocks that render as a real vertical
separator line; a selectable "Hidden" ghost gate plus cta Size/target options;
and recursive nested submenus (fly-out on the front/canvas, inline-indented on
mobile). `buildSiteShellCss(null)` is byte-identical; no-override / mobile-only
menu docs emit NO tablet `@media`/branch.

## Key Changes

### 502-01 — Model: brand text, tablet breakpoint, device-defining carve-out (`core/services/menus/menuDocumentV2.ts`)
- `BRAND_PROP_KEYS += "text"` — `brand.props.text?: string`, string-only,
  trimmed, capped at 120 chars (fail-SOFT clamp/slice; only non-string non-null
  throws with the offending path; empty/whitespace/`null` OMITTED sparse).
  Defaults + legacy adapter stay textless.
- `MENU_RESPONSIVE_BREAKPOINT_KEYS = ["tablet","mobile"]` — Pages cascade.
  `resolveMenuSectionAppearanceForDevice`/`patchMenuSectionForDevice`/clear +
  prune generalized per breakpoint (tablet = base + ONLY `responsive.tablet`;
  mobile ignores tablet). `resolveMenuBlockVisibleForDevice` and
  `setMenuBlockVisibleForDevice` handle tablet; `hasMenuBlockVisibilityOverride`
  generalized to ANY breakpoint (gates the CSS visibility plan + the front
  hand-off-to-CSS so tablet-only overrides emit hide rules).
- Device-defining carve-out (`MENU_NAV_DEVICE_DEFINING_KEYS =
  ["mobileMode","dropdownDirection"]`): WRITE rejects either key inside
  `responsive.*.navProps` with the offending path. STORED READ is
  non-destructive and SPLIT — a 501-era mobile `mobileMode` override is HOISTED
  into the base then pruned (published mobile CSS byte-identical before/after);
  `dropdownDirection` is prune-only (truly dead). A junk value is prune-only,
  not hoisted; empty pruned records are removed; the migrated doc round-trips
  clean through the WRITE normalizer. Any OTHER unknown navProps key still
  degrades the whole doc (fail-closed contrast preserved).

### 502-02 — CSS: tablet branch, separators, nested sublists (`core/site/menuDocumentCss.ts`)
- FRONT: new bounded tablet `@media (min-width: 640px) and (max-width: 1023px)`
  (`pageResponsiveMediaBounds.tablet`) with per-GROUP delta rules; NO tablet
  branch for docs without tablet overrides. Visibility hide rules placed per
  RESOLVED tri-device state (desktop+tablet ⇒ shared ≥640 branch byte-stable;
  desktop-only ⇒ `min-width:1024px`; tablet-only ⇒ bounded tablet branch;
  mobile ⇒ mobile branch).
- CANVAS: `buildMenuDocumentPreviewCss` stops mapping tablet⇒desktop (forced
  tablet branch = base + `desktopShared` + tabletDelta) and emits NO visibility
  hide rule in ANY forced branch (canvas visibility owned by the 502-04 ghost).
- Divider context rules (per-divider-block, doc-scoped): frame-as-line
  `[data-block-id="X"]{align-self:center;width:<thick>px;height:1.5em;
  background:<tone>}` (no `display:` — cascade guard) + inner `hr{display:none}`;
  emitted only when a divider exists, front AND preview.
- Nested-sublist rules doc-scoped, ≥640 branch ONLY; mobile branch carries no
  sublist hide/un-hide (base-sheet inline indent applies). Canvas-only
  disclosure sim-open appends after the retained closed rule (source-order win).

### 502-03 — Front: recursive nav & brand chain (`core/site/siteShell.tsx`)
- Deleted `flattenNavigationDescendants` and the `[item, ...dropdownItems]`
  parent-duplication. `SiteNavItem` is recursive in both variants:
  menu-document path renders details-FREE `<li class="site-nav-item">` + nested
  `<ul class="site-nav-sublist">` (targeted by the 502-02 hover/focus-within
  fly-out rules; `#` group labels are `<span class="site-nav-link
  site-nav-group-label" tabIndex={0}>` for keyboard reachability); the legacy
  no-document `SiteHeaderNav` path renders recursive click-open
  `<details class="site-nav-group">` per level (option (b) — no base-sheet CSS
  added), linked parents as the FIRST entry of their DIRECT sublist. FLAT
  legacy menus render byte-identical markup.
- `BrandRender`: `props.text?.trim() || siteName`, `null` when neither.
- `shouldRenderMenuBlock` gains the tablet term (anywhere-gate); the private
  `menuLeafToPageBlock` is unchanged/unexported.

### 502-04 — Editor: canvas WYSIWYG & device controls (`MenuDesignEditor.tsx`, `tokenCss.ts`, shared hook, `PageEditor.tsx`)
- `useCanvasSiteTokens` extracted to `core/admin/ui/shared/useCanvasSiteTokens.ts`
  (PageEditor adopts the import — behavior-identical). New
  `toMenuCanvasColorCssVariableMap` (all 7 `--color-*`) painted on the canvas
  frame ROOT; selection ring re-pointed to an `--admin-*` var; site-resolved
  `palette` passed to every `ColorSwatchControl`.
- Brand text input (text mode only, sparse-delete); canvas brand = `text ||
  siteName` (menu name gone). Device-scoped controls: "Mobile menu" only on
  Mobile, "Dropdown direction" only off-Mobile, both write the base, no shell.
  Tablet override badges/Reset. Selectable dimmed "Hidden" ghost gate (sole
  canvas visibility owner). CTA Size + "Open in new tab" via the real leaf
  (local `canvasMenuLeafToPageBlock` replica, visibility forced true). Divider
  real-leaf preview; recursive `NavItemsPreview` (grandchildren reachable).
  Hover/active copy relabelled as state background (emission unchanged).

### 502-05 — Tests, docs, closure
- Cross-cutting vitest + bun coverage extended in-place (no parallel suites):
  `menu-document-v2.test.ts` (brand text accept/trim/cap/sparse + reject; tablet
  round-trip/resolve/patch/clear/prune; device-defining write-reject + stored-read
  hoist/prune with byte-identical mobile CSS; fail-closed contrast on `wide`),
  `menu-design-editor.test.tsx` (brand input, canvas fallback, tablet forks +
  badges/Reset, device-scoped base writes, ghost, cta size/target, palette,
  recursive preview, no setState-in-effect), `menus.test.ts` (brand.text +
  responsive.tablet persist; invalid `wide`/non-string `text` ⇒ 400
  `menu_document_invalid` with path), `menu-document-render.test.tsx` (tablet
  media bounds; canvas tablet branch; ghost handoff; divider context rules;
  nested fly-out present doc-scoped/absent in `buildSiteShellCss`; SSR recursion
  + brand chain + legacy recursive `<details>`).
- §0 stale-501-pin flips verified (owned by the sibling that changed the
  behavior): breakpoint vocabulary `["tablet","mobile"]`; `wide` replaces
  `tablet` as the reject-unknown / fail-closed-read fixture (reject-unknown
  coverage kept alive); route invalid fixture `responsive.wide`; tablet
  resolve/patch cascade; block-visibility tablet axis; editor scope pill
  "Tablet (overrides)"; preview tablet ≠ desktop mapping; preview builders emit
  NO hide rule; site-shell-runtime doc-header hover mode (`:536-537`, legacy
  `:310-311` intact); `page-runtime-shell-branch.test.tsx:72` flat fixture
  unchanged. No "deferred" language remains.
- §2.3 golden re-freeze (executed once by 502-02, verified rule-by-rule here —
  no golden array edited by 502-05): `GOLDEN_DESKTOP`/nesting gains ONLY the
  `navNestingRules` block, verbatim — `.site-nav-sublist{display:none}`; the
  `:hover`/`:focus-within` open pair `{display:grid}`;
  `.site-nav-sublist>li{position:relative}`; the direction-aware nested fly-out
  `.site-nav-sublist .site-nav-sublist{left:100%;top:0;bottom:auto}`
  (`bottom:0;top:auto` for `dropdownDirection:"top"`); the caret rule
  `li[data-site-nav-group="true"]>.site-nav-link::after{content:" \25BE";
  font-size:.7em}` — plus `GOLDEN_PREVIEW_MOBILE` gains the disclosure sim-open
  member `.site-nav-list{display:flex;flex-direction:column;align-items:stretch;
  padding-top:8px}` appended AFTER the retained closed `display:none` member. NO
  member removed/reordered; NO `details[open]` / `.site-nav-group[open]` in the
  frozen arrays (positively asserted).
- Byte-identity guards: `buildSiteShellCss(null)` and
  `tests/unit/pages/siteShellCss.test.ts` are ZERO-line diff; no-override /
  mobile-only docs emit NO tablet branch; a mobile-only doc's mobile branch is
  byte-identical to pre-502.
- Docs: `_docs/PAGE_MODEL.md` menuDocumentV2 subsection extended (brand text
  chain, tablet cascade, device-defining carve-out, tablet/visibility CSS
  placement, nested-sublist + divider context CSS, canvas-token editor).
  Corrected changelog **1210** menus-routes count "39/39" → "11/11" (the
  PRE-502 count: 9 `testIfDb(` + 2 plain `test(`; the closure bun run includes
  this task's own additions and must NOT be back-written into a 501-era entry).

## Verification

- `bun --cwd core lint` ✅ · `bun --cwd core lint:types` ✅ ·
  root `bunx tsc -p tsconfig.json --noEmit` ✅ (covers `tests/**`).
- Vitest lane green (menu services/UI + shell-branch targeted 120/120; full
  lane green on named re-run — the full-glob run showed known spurious 10s
  timeout flakes in unrelated suites, all green when re-run named).
- Bun lane green: `menus` routes 11/11, `menu-document-render` +
  `siteShellCss` byte-identity (zero-line diff), `site-shell-runtime` menu-doc
  hover-mode + legacy `<details>` pins.

## Scope / Security

- No new endpoint, RBAC, or migration — `brand.text` and `responsive.tablet`
  ride the existing validated `PATCH /menus/:id` envelope. Schema-first,
  reject-unknown (write throws `MenuDocumentError` with path; route 400
  `menu_document_invalid`). `brand.text` rendered as React text (no innerHTML).
  Divider CSS derives only from validated enum/number props. Fail-closed stored
  read preserved except the two conscious device-defining carve-out keys
  (non-destructive migration). All new CSS stays inside the
  `[data-site-menu-doc="true"]` doc-scoped sheet; canvas token painting is
  admin-client-only inline style; the front renders published-only.

## Named residuals (recorded, NOT scope)

- Brand text formatting/typography (rides the block style channel later).
- Divider `orientation` prop, spacer `flex:1` push, bar `blockGap` field,
  per-block margin/padding controls; divider tone/thickness inspector controls.
- Hover/active emission semantics stay state-only background pills (502-04 is a
  copy-only change).
- Touch first-tap-open at ≥640px on the details-free menu-doc path
  (owner-approved deferral; keyboard focus via the `tabIndex={0}` group labels
  is the non-pointer path; the legacy `<details>` path keeps click/tap-open).
- `menu-drawer` still unimplemented by design.

## Live smoke

Acceptance is measured LIVE per TASK-502 (canvas + `:3000` at 1280/744/390px);
the automated SSR/emission/editor suites above assert the same visible-effect
invariants headlessly (computed rules, DOM presence/absence, ghost opacity,
recursion depth). The owner-mandated ≥5-scenario real-input playwright walk
remains the live-verification gate.
