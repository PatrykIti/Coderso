# 1210 - TASK-501 Menu Per-Device Overrides, Orientation & Block Visibility

**Date:** 2026-07-02
**Version:** Unreleased
**Tasks:** TASK-501, TASK-501-01, TASK-501-02, TASK-501-03, TASK-501-04
**Type:** Admin UI/Content (Menus)/Navigation/Page Builder/Responsive/QA/Docs/Task Board

## Overview

Ports the Pages per-breakpoint override pattern onto the menuDocumentV2 Design
tab (TASK-499): with the DeviceSwitcher on **Mobile**, appearance edits write a
SPARSE `responsive.mobile` override record instead of the base, panels show
RESOLVED values with Base/Override/Inherited badges and an explicit per-control
Reset, and the front `@media` sheet + canvas flatten emit the mobile-resolved
look from ONE shared `buildMenuRuleSets`. Three features ride the one
mechanism: per-device section design overrides (`layout`/`navProps`), a new
nav-items `orientation: "horizontal" | "vertical"` appearance field, and
per-device block visibility (hide-on-mobile for ANY block incl. menu-native;
show-only-on-mobile for leaves). **Tablet is DEFERRED** (mobile-only v1 —
`MENU_RESPONSIVE_BREAKPOINT_KEYS = ["mobile"]`, reject-unknown makes `tablet` a
purely additive key-list extension later); tablet edits write the BASE, badge
"Base", matching the canvas tablet⇒desktop mapping.

## Key Changes

### 501-01 — menuDocumentV2 responsive contract (`core/services/menus/menuDocumentV2.ts`, `normalizeMenuAppearance.ts`)
- `MenuSectionV2.responsive?: { mobile?: { layout?: MenuBarLayout; navProps?: NavItemsProps } }`
  and `MenuBlockV2.responsive?: { mobile?: { visibility?: { visible: boolean } } }`
  (ALL block types) — SPARSE records, lazily created, empty records pruned on
  write, never persisted. Reject-unknown write normalizers throw
  `MenuDocumentError` with the offending `path` for unknown
  breakpoint/group/prop keys; override values reuse the SAME `fieldNormalizers`
  as the base (raw stored input never reaches CSS).
- CONSCIOUS fail-closed read: the section/native/leaf block key allowlists were
  extended with `responsive` — the stored read (`normalizeStoredMenuDocumentV2ForRead`)
  degrades the WHOLE document to empty on any unknown member (designed blast
  radius, asserted in tests). Legacy documents WITHOUT `responsive` round-trip
  byte-identically.
- Pure immutable helpers: `resolveMenuSectionAppearanceForDevice` (mobile
  inherits DESKTOP; tablet === desktop), `readMenuSectionOverrideValue` (raw
  record, badge detection), `patchMenuSectionForDevice` (desktop/tablet ⇒
  base), `clearMenuSectionOverride` (delete leaf, prune empty parents; NO
  auto-remove-on-equality), `resolveMenuBlockVisibleForDevice`,
  `hasMenuBlockVisibilityOverride`, `setMenuBlockVisibleForDevice` (mobile ⇒
  override on native AND leaf; desktop ⇒ flat, leaf-only),
  `clearMenuBlockVisibilityOverride`.
- `MenuAppearance.orientation?: "horizontal" | "vertical"` enum field in
  `normalizeMenuAppearance` + `NAV_ITEMS_PROP_KEYS`; sanitize drops invalid
  stored values fail-closed; the resolved default `"horizontal"` emits NOTHING.

### 501-02 — CSS emission + renderer stamping (`core/site/menuDocumentCss.ts`, `siteShell.tsx`)
- ONE shared `buildMenuRuleSets` consumes base + mobile-RESOLVED appearance and
  feeds BOTH `buildMenuDocumentCss` (front `@media`) and
  `buildMenuDocumentPreviewCss` (canvas flatten; tablet stays mapped to the
  desktop branch). Mobile override deltas emit per-GROUP (a triggered group
  re-emits ALL its declarations with explicit/neutral values so clearing
  reverts without leakage) AFTER the mobileMode disclosure/inline rules
  (source-order win). Orientation vertical emits
  `.site-nav-list{flex-direction:column;align-items:stretch}`.
- Per-device visibility is CSS-gated: blocks visible on at least one device
  stay DOM-rendered; menu-native wrappers get an inert `data-menu-block-id`
  stamp (nav-items on the `<nav>` LANDMARK ancestor — never `.site-nav-list`,
  sidestepping the higher-specificity display rules; brand `<a>`, utility
  `<span>`), leaf frames keep `PageBlockFrame`'s `data-block-id`; hide rules
  use the doc-scoped DUAL selector
  `[data-menu-block-id="X"],[data-block-id="X"]{display:none}` (every
  comma-list member `[data-site-menu-doc]`-prefixed, ids escaped) in the
  mobile branch (hide-on-mobile) or desktop branch (show-only-on-mobile).
  Blocks visible on NEITHER device stay render-skipped; flat leaf visibility
  WITHOUT a responsive record keeps legacy render-skip semantics unchanged.
- Byte-identity pins: a doc with NO overrides emits byte-identical CSS to
  pre-TASK-501 (front + both canvas devices, golden-pinned);
  `buildSiteShellCss(null)` untouched (`tests/unit/pages/siteShellCss.test.ts`
  changed by ZERO lines).

### 501-03 — device-forked Design editor (`core/admin/ui/menus/MenuDesignEditor.tsx`)
- `setLayoutField`/`setNavField`/the per-block visibility toggle route through
  `patchMenuSectionForDevice`/`setMenuBlockVisibleForDevice` keyed on the
  current device — event-handler writes only (no setState-in-effect; asserted
  via console.error spy). Mobile ⇒ sparse override; Desktop AND Tablet ⇒ base.
- Every appearance control is wrapped in the ported
  `MenuResponsiveControlShell`: Base/Override/Inherited badge + explicit Reset
  (`data-menu-responsive-reset`) that prunes the record and re-inherits the
  desktop value live. Panels display RESOLVED values while badges compare the
  raw override against the base. Canvas scope cue: "Mobile (overrides)" /
  "Tablet (base)" / "Desktop (base)".
- Orientation SegmentedControl in the nav-items panel; per-block "Visible on
  mobile" override toggle on Mobile (native + leaf), flat "Visible" leaf
  toggle on Desktop/Tablet; content writes (brand/cta/utility) stay FLAT and
  unwrapped on every device.

### 501-04 — tests, smoke, docs (this closure)
- Cross-cutting tests added: `tests/integration/routes/menus.test.ts` — a
  `PATCH /menus/:id` document carrying `responsive` persists per-key without
  dropping co-present `appearance`/`extras`; an invalid responsive key
  (`responsive.tablet`) maps to a 400 `menu_document_invalid` `ApiError` with
  `details.path = "document.sections[0].responsive.tablet"`.
  `tests/vitest/services/menu-document-v2.test.ts` — patch/clear immutability
  (input document never mutated).
- Verified the 501-01/02/03-owned matrices green together: responsive
  round-trips + reject-unknown + whole-doc fail-closed blast radius + legacy
  byte-identity (53 service tests), orientation enum accept/reject/sanitize,
  device-fork/badge/reset/orientation/visibility editor suites (95 vitest
  tests across the three menu suites: 53 + 20 + 22), emission-shape + dual-selector +
  stamping + byte-identity pins (19 bun render tests), site-shell runtime.
- Real-input playwright smoke (Acceptance 1-3, live at real viewports):
  mobileMode Inline + Mobile overrides (itemGap 24, orientation vertical, CTA
  hidden) render in the canvas and revert on Desktop; front `:3000` at 390px
  shows the inline nav stacked `flex-direction:column` with `gap:24px` and the
  CTA DOM-present but CSS-hidden, at 1280px the untouched base (`row`, `4px`,
  CTA visible); Reset flips Override→Inherited, the canvas re-inherits live
  (gap back to 4px, orientation override kept), and the saved document prunes
  the cleared key (`responsive.mobile.navProps` = `{"orientation":"vertical"}`
  verbatim via GET).

## Security Contract

No new endpoint, NO RBAC change, NO migration — the document rides the
existing validated `PATCH /menus/:id` envelope (`menuSchemas.ts` unchanged;
`menus.settings` is freeform jsonb). Schema-first reject-unknown with
machine-readable paths; fail-closed stored read (whole-doc degrade asserted
consciously); all emitted CSS stays inside the `[data-site-menu-doc="true"]`
scope (no unscoped attribute selector — asserted); the front renders the
published snapshot only; `buildSiteShellCss(null)` byte-identity inviolate.

## Gates

- `bun --cwd core lint` ✅, `bun --cwd core lint:types` ✅, root
  `bunx tsc -p tsconfig.json --noEmit` ✅ (test tree typechecked)
- Full vitest lane ✅ 4679/4680 passed with 1 unrelated flake
  (`posts-editor-chrome-wave.test.tsx`, TASK-497 surface — passes standalone;
  first full-glob run also showed known spurious timeout flakes, all named
  re-runs green)
- Bun lane ✅ (`menus` routes 39/39 incl. the two new responsive tests,
  `menu-document-render` 19/19, `siteShellCss` byte-identity pin with a
  ZERO-line diff, `site-shell-runtime` 8/8; full `bun run test:bun` run at
  closure)
- Real-input playwright smoke ✅ (see 501-04 above)

## Residuals (follow-ups, not silent gaps)

- **Tablet breakpoint** — deferred by design; adding `"tablet"` later is an
  additive key-list + `@media`-branch extension (reject-unknown keeps stored
  docs forward-safe).
- **`menu-drawer`** — still a reserved section type with zero editor/front
  support BY DESIGN; the per-device overrides + visibility replace the need
  for it. A removal decision stays open.
- Full-glob vitest flakes (unrelated suites) remain a known runner caveat —
  re-run named files.

## Documentation

- `_docs/PAGE_MODEL.md`: NEW "menuDocumentV2 Document Contract And Responsive
  Overrides" section (pays the TASK-499 doc debt + documents the TASK-501
  responsive contract); the pre-499 menu-design-view text
  (`MenuAppearancePanel`/`settings.menuAppearance`/`menuDesignDocument`) is
  stale-marked in the same edit.
- `_docs/_TASKS/README.md` board + Statistics: TASK-501 + all four subtasks ✅
  Done.
