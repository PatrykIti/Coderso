# 1213 - TASK-504 Menu Styling Depth — Brand Style, Per-Nesting-Level Styling & Cheap Wins

**Date:** 2026-07-03
**Version:** Unreleased
**Tasks:** TASK-504, TASK-504-01, TASK-504-02, TASK-504-03, TASK-504-04, TASK-504-05
**Type:** Admin UI/Content (Menus)/Navigation/Site Front/Responsive/QA/Docs/Task Board

## Overview

Deep menu styling for the menuDocumentV2 Design tab — a per-device-overridable
brand style, per-nesting-level nav styling (levels 0/1/2+), author-controllable
sublist chrome, and the cheap wins (per-link padding/radius, hover TEXT color,
`aria-current` current-page) — all on the EXISTING validated `PATCH /menus/:id`
document envelope.

- **No new endpoint / RBAC / migration.** The document rides the existing
  `menuUpdateSchema.document` (`{ type: ["object","null"] }`) with service-side
  strict validation; `menus.settings` is freeform jsonb. **No `menuDocumentV2`
  `schemaVersion` bump** (stays `schemaVersion: 1`).
- **Byte-identity preserved.** `buildSiteShellCss(null)` is byte-identical
  (`tests/unit/pages/siteShellCss.test.ts` ZERO-line diff — nothing new enters
  the base sheet); no-override menu docs are byte-identical on BOTH
  `buildMenuDocumentCss` and `buildMenuDocumentPreviewCss`; legacy brand + no-level
  docs round-trip verbatim. All new styling ONLY overrides the hardcoded base via
  later source order under the `[data-site-menu-doc="true"]` doc scope.
- **Fail-closed READ blast radius asserted consciously** for `"style"` (brand)
  and `"levelStyles"` (nav): an unknown key inside either degrades the WHOLE stored
  document to the default look (not a partial degrade) — proven by round-trip tests,
  not discovered in production.

## Key Changes

### 504-01 — Menu model: brand style, per-level styles, cheap-win vocabulary (`core/services/menus/menuDocumentV2.ts`, `core/services/menus/normalizeMenuAppearance.ts`)
- `BrandStyle` (`brand.props.style`): text-mode `fontSize`/`fontWeight`/`color`/
  `textTransform`/`letterSpacing` + image-mode `height`/`maxWidth`, validated by
  `normalizeBrandStyle` (reject-unknown KEYS with `path`; bad VALUES fail-soft →
  omitted; sparse + prune-empty). NEW local clamp table
  `BRAND_STYLE_NUMBER_RANGES` — `fontSize [10,48]`, `letterSpacing [-2,8]`
  (negative allowed), `height [16,120]`, `maxWidth [40,400]`. `"style"` is the
  CONSCIOUS widening of `BRAND_PROP_KEYS`.
- `NavLevelStyle` / `NavItemsProps.levelStyles` (`{ 1?, 2? }`): per-level link
  typography + state + submenu CONTAINER chrome. `normalizeNavItemsProps` SPLITS
  `levelStyles` off the raw props BEFORE the flat `NAV_ITEMS_PROP_KEYS` subset
  check and validates it via `normalizeNavLevelStyles` (reject-unknown OUTER level
  keys — only `"1"`/`"2"` — and per-level style keys; `NAV_LEVEL_NUMBER_RANGES`).
  `"levelStyles"` is NOT added to `NAV_ITEMS_PROP_KEYS` (that const stays
  `... satisfies readonly (keyof MenuAppearance)[]`); the carrier type widens to
  `Pick<…> & { levelStyles?: {…} }`.
- Cheap-win scalars `linkPaddingX`/`linkPaddingY`/`linkRadius`/`linkHoverTextColor`
  are first-class `MenuAppearance` vocabulary (type + `fieldNormalizers` +
  `menuAppearanceNumberRanges`) so they widen `NAV_ITEMS_PROP_KEYS` (conscious) and
  flow per-device FREE through `collectDeltaRules`. They carry **NO resolution
  default** (NOT seeded into `MENU_APPEARANCE_DEFAULTS`/`SHELL_APPEARANCE_DEFAULTS`)
  so a no-override doc gains ZERO new doc-sheet bytes (present-only emission).
- Per-device machinery (NEW dedicated helpers — the flat/visibility-only helpers
  cannot reach the nested paths): `patchMenuBrandStyleForDevice` /
  `clearMenuBrandStyleOverride` (desktop ⇒ flat `props.style`; tablet/mobile ⇒
  sparse `responsive[bp].style`, prune-on-clear), a nested-path
  `patchMenuSectionForDevice` variant + nested raw-read targeting
  `responsive[bp].navProps.levelStyles[N][field]` with a DEEP prune chain, and the
  READ-side widening of `normalizeMenuBlockResponsive`'s group-key gate to accept
  `"style"` (the twin of the `BRAND_PROP_KEYS` widening — else a stored
  `responsive.{tablet,mobile}.style` would fail-closed throw). `resolveBrandImageSrc`
  exported (single home for the brand `<img>` src resolver — B1).

### 504-02 — Menu CSS: brand, level rules & cheap wins (`core/site/menuDocumentCss.ts`)
- `collectMenuBrandRules` emits scoped `[data-menu-block-id]` text decls + `… img{}`
  for image mode; absent style ⇒ ZERO bytes.
- `navLevelRules` emits the EXACT depth selectors for levels 1 and 2 ONLY (level 0
  stays the existing flat `.site-nav-link` base — the cascade ROOT, NOT re-emitted).
  DESCENDANT combinators are deliberate: level-1 link
  `… > .site-nav-sublist .site-nav-link`, level-1 container list
  `… > .site-nav-sublist, … > .site-nav-sublist .site-nav-sublist`, level-2 link
  `… > .site-nav-sublist .site-nav-sublist .site-nav-link`, level-2 container the
  ANCHORED `… > .site-nav-sublist .site-nav-sublist` — so "level 2 inherits level 1
  where unset" holds by pure CSS cascade (the strict-child form was rejected: it
  would make level 2 inherit level 0). Level LINK typography folds into the
  all-width base (mobile inherits desktop); CONTAINER chrome folds into the ≥640
  shared bucket.
- Cheap wins: per-link padding/radius group, hover TEXT color on
  `.site-nav-link:hover`, and a `:where([aria-current="page"])` current-page rule
  colored by the EXISTING `linkActiveColor` — all present-only.
- Per-device brand + level deltas ride dedicated parallel resolvers (NOT the scalar
  `collectDeltaRules`) diffed vs DESKTOP into the bounded tablet
  `@media (min-width:640px) and (max-width:1023px)` and mobile `@media (max-width:639px)`
  buckets (mobile ≠ tablet). Canvas `buildMenuDocumentPreviewCss` force-open opens
  the WHOLE ancestor chain (levels 1..N) for the selected level, appended LAST; the
  single canvas-only addition (precedent: `previewMobileOpen`).

### 504-03 — Front: active-path source + `aria-current` stamp (`core/site/siteShell.tsx`, `core/server/publicSite.tsx`, `core/site/pageRuntimeV2.tsx`, `core/site/renderPublicPage.tsx`)
- New `activePath?: string | null` prop threaded
  `SiteHeaderMenuDocumentRender → NavItemsRender → SiteNavItem → SiteNavLink`,
  stamping `aria-current="page"` on the active link ONLY (server-component-safe;
  no `usePathname()` client conversion). The PRODUCER is wired end-to-end:
  `renderPublicPageHtmlInternal` sources `requestPath` (page render only; preview ⇒
  `null`), forwarded through `PageTemplatePropsV2.activePath` /
  `PublicPageV2RuntimeRenderOptions.activePath`. Brand IMAGE mode (defect B1) now
  renders a resolved-`src`-guarded `<img>` SIZED by `BrandStyle.height`/`maxWidth`
  via the exported `resolveBrandImageSrc` — no more dashed placeholder / header
  balloon. `siteShellCss.ts` base sheet unchanged (byte-identity guard).

### 504-04 — Design editor: brand & level controls (`core/admin/ui/menus/MenuDesignEditor.tsx`, `core/admin/ui/menus/MenuEditorPage.tsx`)
- Mode-gated brand style controls (text ⇒ fontSize/fontWeight/color/textTransform/
  letterSpacing; image ⇒ height/maxWidth) writing into `brand.props.style`.
- A **Level SegmentedControl (0/1/2)** at the top of the nav-items panel rebinds the
  SAME control set (Level 0 ⇒ nav base scalars; Level 1/2 ⇒ `props.levelStyles[N]`)
  with a **Base/Override/Inherited** badge. Device-forked writes for BOTH brand and
  levels drive the new dedicated mutators + per-breakpoint Reset. Selecting a level
  ≥1 threads the force-open level into the canvas preview. The font-size slider is
  DISPLAY-only for the inherited value (B2). `MenuEditorPage` items badge shows the
  TOTAL nested count with correct plural (B3). All writes fire from event handlers
  (no setState-in-effect).

### 504-05 — Tests, docs & closure (this entry)
- Route boundary (`tests/integration/routes/menus.test.ts`): `PATCH /menus/:id`
  round-trips `brand.props.style` + `navProps.levelStyles` + `responsive.{tablet,mobile}`
  brand/level overrides WITHOUT dropping appearance/extras; invalid brand-style key
  and invalid level key (`levelStyles.3`) map to 400 `menu_document_invalid` with the
  exact `path`, store untouched. Verified the sibling-owned matrices green together:
  brand/level normalizers + fail-closed READ traps + per-device sparse/prune
  (`menu-document-v2.test.ts`), clamp/enum reuse (`normalize-menu-appearance.test.ts`),
  brand/level/cheap-win/force-open emission (`menu-document-css.test.ts`),
  `normalizeNavPath`/`resolveMenuActiveHref` + `aria-current` resolver
  (`siteShell.test.tsx`), editor controls (`menu-design-editor.test.tsx`), render
  byte-identity + brand-image + `aria-current` markup (`menu-document-render.test.tsx`).
- Docs: `PAGE_MODEL.md` + `CONTENT_TYPES_SPEC.md` extended; board + Statistics closed.

## Guards & invariants (asserted)

- `buildSiteShellCss(null)` byte-identity — `siteShellCss.test.ts` ZERO-line diff.
- No-override menu docs byte-identical on both CSS builders.
- Fail-closed READ-trap round-trips for `"style"` and `"levelStyles"` (whole-doc
  blast radius asserted).
- Reject-unknown at the model (path-tagged `MenuDocumentError`) and the route
  (400 `menu_document_invalid` with `path`) for brand-style keys, level keys (only
  1/2), per-level style keys, and per-device override keys.
- All new CSS routed through the ONE `buildMenuRuleSetsForDocument` (front `@media`
  + canvas flatten never diverge); canvas force-open is the single canvas-only add.
- Gates green together: `lint`, `lint:types`, root `tsc -p tsconfig.json --noEmit`,
  `test:vitest`, `test:bun`, `gates:coderso`.

## Deferred residuals (honest)

- Levels 3+ independent styling (the level-2 descendant selector covers depth 3+
  uniformly).
- Custom `font-family` / `line-height` controls.
- Active-item indicator pill / underline (beyond the `aria-current` current-page
  color).
- Mobile-drawer styling — the `menu-drawer` section is not front-rendered yet
  (`siteShell.tsx` composes only `sections[0]`); requires shipping the drawer render
  path first.
