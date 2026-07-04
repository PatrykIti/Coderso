# 1208 - TASK-499 Menu Items Restyle and Design Tab (menuDocumentV2)

**Date:** 2026-07-01
**Version:** Unreleased
**Tasks:** TASK-499, TASK-499-01, TASK-499-02, TASK-499-03, TASK-499-04, TASK-499-05
**Type:** Admin UI/Content (Menus)/Navigation/Page Builder/Visual Refresh/QA/Docs/Task Board

## Overview

Two-part remediation of the Menus admin, kept on the two surfaces the data model
already separates: PART 1 re-skins the items/routes editor (`/menus/:id`) to the
prototype three-pane frame; PART 2 flips the "Design" tab (`/menus/:id/design`)
off the legacy dark-panel chrome onto the shared `CanvasEditor` builder shell over
a NEW dedicated `menuDocumentV2` contract, with a document-driven front renderer
that falls back to today's byte-identical default menu whenever Design is empty.

## Key Changes

### PART 1 — Items editor restyle (TASK-499-01)
- Re-skinned `MenuEditorPage` onto a new shared `core/admin/ui/shared/EditorFrame.tsx`
  (a chrome/three-pane port of the prototype `EditorPreviewFrame`) that IMPORTS the
  shipped `EditorRail.tsx` primitives (does not fork `EditorRailGroup`/`EditorRailItem`);
  extended `EditorRail` so disabled/title-bearing items route to the `<button>` branch
  with disabled styling (the deferred Posts/Categories rail items no longer look live).
- Compacted `MenuItemRow` toward the prototype: bare `size-4` `GripVertical` +
  `CornerDownRight` + `pl-8`, url-only subline — the letter-avatar and the redundant
  "Sub-item of X" text hint were REMOVED (the prototype row has neither). DnD drop
  intents, keyboard move/indent/outdent, `RowDropIndicator`, and the a11y markers
  (`data-menu-drag-handle`, Drag/Move/Indent/Outdent aria-labels,
  `data-menu-nested-indent`, `data-menu-row-active`) are kept byte-stable.
- Added one real model field, `openInNewTab` (plus a `variant` display-as field),
  threaded through the always-on "Item settings" inspector (the inspector wrapper
  owns the Switch; `MenuItemForm` gains no Switch). `menuItemSettings.ts` gains both
  keys, fail-soft; the `menuItemsSchema` per-item `settings` allowlist gains both,
  still `additionalProperties:false`. Navigation mapping emits `target:"blank"` and
  `variant:"button"`, OMITTING the default `variant:"link"`, so navigation meta
  `toEqual` snapshots stay exact; `SiteNavItem` reads `meta.variant` for the
  menu-native button class via inline style/data-attr (no `buildSiteShellCss` edit).

### PART 2 — menuDocumentV2 contract + persistence (TASK-499-02)
- Added `core/services/menus/menuDocumentV2.ts` with its OWN section/block enums and
  its OWN `MENU_DOCUMENT_SCHEMA_VERSION` (start `1`) — Option B: the page schema
  (`pageDocumentV2.ts`) is NOT polluted with menu types. Reuses ONLY the shared leaf
  validators (button/image/divider/spacer/block-style/visibility/box-spacing via the
  public page normalizers) and `normalizeMenuAppearance`'s validated color/number/enum
  shapes; raw stored input never reaches CSS.
- Strict write normalizer rejects unknown sections/blocks/props (incl. cross-subset
  props) with a machine-readable `menu_document_invalid` + offending `path`; the
  stored-read normalizer is fail-closed (unreadable/absent/lower/unknown version ⇒
  empty document ⇒ resolver returns `null` ⇒ legacy appearance+extras path ⇒ default
  look). Non-destructive legacy adapter (`buildMenuDocumentFromLegacy`) seeds a
  document on first Design open WITHOUT writing until the user saves.
- `menuService` `UpdateMenuInput.document`: per-key envelope merge/publish that keeps
  `appearance`/`extras` intact; an emptied `document` deletes the key (envelope may
  collapse to `null` ⇒ default look). `resolvePublishedMenuDocument` reads the
  `published` snapshot only. `document` rides the EXISTING `PATCH /menus/:id`
  (`menuUpdateSchema` gains `document`); `menuRoutes` `mapMenuError` gains an
  `isMenuDocumentError` branch emitting the path-keyed 400 shape.

### PART 2 — Design tab shared-shell editor + PageEditor menu-host retirement (TASK-499-03)
- Added a thin `core/admin/ui/menus/MenuDesignEditor.tsx` on the shared
  `CanvasEditor` shell + the floating `editorControls/*` primitives (NOT a
  generalization of `PageEditor` over a document contract); `MenuDesignEditorPage`
  renders it and drops the PageEditor menu host. The `nav-items` "positions" block
  binds the published item tree with nesting; add/remove/reorder menu blocks via the
  composer. The Design tab ships Undo/Redo + DeviceSwitcher + panel toggle; the Pages
  **Layers** overlay is served by the `MenuBarPanel` "Blocks" list (shallow
  single-section menu doc), a documented scope decision, not a dropped affordance.
- Retired `PageEditor`'s `mode==="menu"` legacy chrome: deleted all
  `useLegacyChrome`/`panelTone`/`useBuilderChrome` conditionals, collapsing
  `useBuilderChrome` to always-true; narrowed the `pageEditorHostContract` mode union
  to `["page","page-template"]`. `host.canvasChrome` is RETAINED as a shared seam.
  Mode-independent classes (e.g. the drag-dot) are untouched.

### PART 2 — Front renderer + non-destructive default fallback (TASK-499-04)
- Added `SiteHeaderMenuDocumentRender` + `navigationDocument` render prop; the new
  `core/site/menuDocumentCss.ts` emits document CSS scoped under `[data-site-menu-doc]`
  (front `buildMenuDocumentCss` + device-forced admin-canvas
  `buildMenuDocumentPreviewCss`) — it NEVER alters `buildSiteShellCss`.
  `DefaultRuntimePageShellV2` adds a branch ABOVE the existing default: empty document
  ⇒ `SiteHeaderNav` (byte-identical default), non-empty ⇒ document render, cleared ⇒
  default. `renderPublicPage` emits base-only head CSS when a document is active.

### Closure (TASK-499-05)
- Full regression matrix green together: menu-editor / menu-editor-shell-wave
  (Add-Item re-pointed at the typed "Pages" rail item, dropped the "Menu Structure"
  heading assert, `operations` `toEqual` preserved) / menu-item-row (behavior+a11y
  byte-stable; the letter-avatar + "Sub-item of X" pure-visual asserts REMOVED, not
  updated) / menu-tree (DnD + keyboard, not weakened) / menu-item-form (no Switch) /
  the new `menu-design-editor.test.tsx` (shared chrome, NOT `bg-slate-950`) /
  `editor-frame.test.tsx` / menu-document-v2 / validation/menuSchemas /
  page-editor-host-contract (mode union) / menusClient / navigation +
  navigation-editor-wave (exact meta `toEqual` via default-variant omission) /
  menu-list-page(-actions); plus the bun suites (menuService per-key merge +
  document-only PATCH guard; menus route `document` round-trip + new 400
  `menu_document_invalid`; site-shell-runtime default/legacy + variant button;
  `siteShellCss` byte-identity — ZERO lines changed).
- The 30KB TASK-458-03/495-02 `menu-design-editor-flow.test.tsx` (bare `mode:"menu"`
  host + `bg-slate-950` asserts) was RETIRED (deleted) by 499-03 and SUPERSEDED by
  `menu-design-editor.test.tsx` — a tracked retirement, not an untracked breaking suite.

## Notes

- **No new public surface.** `document` rides the existing `PATCH /menus/:id`;
  `openInNewTab`/`variant` ride the existing `PUT /menus/:id/items` →
  `replaceMenuItems` per-item `settings`. No new route, no RBAC change, no DB
  migration (`menus.settings` and `menu_items.settings` are freeform jsonb).
- **Byte-identity preserved.** `buildSiteShellCss(null)` and the all-defaults model
  reproduce the legacy stylesheet exactly; the document path is purely additive under
  `[data-site-menu-doc]`.
- **Decisions.** Option B (dedicated `menuDocumentV2`, no page-schema pollution) and
  a thin `MenuDesignEditor` on the shared shell (not a `PageEditor` generalization)
  were chosen to isolate menu regressions from the Pages editor. Posts/Categories rail
  items ship deferred/disabled (typed but handler-less).
- **Residuals (follow-ups, not silent gaps).** `core/services/menus/menuDesignDocument.ts`
  and the legacy `normalizeMenuAppearance` + `menuNavExtras` render path are left in
  place as DEFERRED dead code so `menu-nav-extras.test.ts` stays green; deletable once
  that suite is migrated and the menu host no longer hosts `PageEditor`. Phase-2
  `search`/`account`/`language` menu blocks remain out of scope.

## Validation

- `bun --cwd core lint`, `bun --cwd core lint:types` — clean.
- Vitest menu + page-editor lanes (menu-editor*, menu-item-*, menu-tree,
  menu-design-editor, editor-frame, menu-document-v2, menuSchemas, menusClient,
  page-editor-host-contract, page-editor-* / pageBuilder, navigation +
  navigation-editor-wave, page-runtime-shell-branch, menu-document-render) — all green.
- Bun lane (menuService, menus route, site-shell-runtime, menu-design-extras-runtime,
  siteShellCss byte-identity) — all pass.

## Task Board

- Flipped TASK-499 and TASK-499-01..05 from `To Do` to `Done`; updated Statistics
  (To Do 347→341, Done 2746→2752). Reconciled the board Priority for TASK-499 to
  `High` to match the parent task file.
