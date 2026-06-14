# TASK-458-03: Menu Design Editor Canvas And Restricted Palette
# FileName: TASK-458-03-Menu-Design-Editor-Canvas-And-Restricted-Palette.md

**Parent Task:** TASK-458
**Priority:** High
**Category:** Menus / Page Editor V2 / Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-458-02
**Status:** ✅ Done
**Completed:** 2026-06-13

---

## Overview

Deliver the owner's menu DESIGN view: from inside a menu, a clearly visible
button opens a canvas with the rendered menu plus the page-editor floating
panel editing the menu's appearance — with the block palette restricted to
menu-appropriate blocks only.

Verified starting state:

- `MenuEditorPage` is a SplitShell FORM surface, not a canvas: PageHeader
  with Discard/Save/Publish actions, metadata card, drag-and-drop structure
  card, item drawer (`core/admin/ui/menus/MenuEditorPage.tsx:752-756,
  775-839, 893-957, 976-987`). The "Design" button lands in its PageHeader
  actions slot.
- The host seam is proven: `PageTemplateEditorPage` reuses the full
  `PageEditor` by building a `PageEditorHost`
  (`core/admin/ui/pages/templates/PageTemplateEditorPage.tsx:188-227`; host
  type at `core/admin/ui/pages/PageEditor.tsx:243-269`). Optional fields
  (publish, revisions, autosaveDocument, templateLibrary) degrade cleanly
  when omitted; `mode` is declared but never read — all menu behavior must
  come through new host fields.
- MECHANISM GAP (the core of this leaf): there is NO per-surface palette
  restriction. `sectionOptions`/`blockOptions` are MODULE-LEVEL constants
  computed once from the global capability tables
  (`PageEditor.tsx:394-422`), filtered only by the command-palette search
  query (`:2079-2094`); the same global options feed the ghost-tile and
  add-beside pre-targeted insert paths (`:1862-1875, :2131-2142`).
- `host.preview` is REQUIRED on the host type today (`PageEditor.tsx:260`)
  and menus have no preview-token route.
- Canvas render source: `SiteHeaderNav` (`core/site/siteShell.tsx:151-186`,
  zero-JS, CSS-only `<details>` mobile disclosure), fed by
  `mapMenuNodesToNavigationItems`
  (`core/services/navigation/navigationMenuMapping.ts:63-82`).
- Admin routes live inline in `AdminApp.tsx` (`/menus` `:754`, `/menus/:id`
  `:756-758`).

Deliverables:

1. **Host palette capability (NEW, generic):**
   `palette?: { sections?: PageSectionType[]; blocks?: PageBlockType[] }` on
   `PageEditorHost`. When present, it intersects the global insertable
   options EVERYWHERE insert choices surface: command palette section/block
   groups, ghost tiles, and add-beside. Absent palette = today's behavior
   (page + page-template hosts unchanged). This is host-side SCOPING only —
   the global capability tables are untouched, and the gated `navigation`
   section stays gated (`pageDocumentV2.ts:483`,
   `runtime-navigation-boundary`); the palette can only NARROW, never widen,
   the global insertable set.
2. **Route + page:** "Design" button in the `MenuEditorPage` PageHeader ->
   `/menus/:id/design` (AdminApp route, `menus:read`) hosting
   `MenuDesignEditorPage`, which builds the menu host and mounts
   `<PageEditor host={host}/>`.
3. **Menu host:** `mode: "menu"` (union extended; stays inert),
   `loadDetail`/`saveDocument` adapt the menu record (appearance from
   TASK-458-02 + extras document, below) to the editor detail shape; publish
   maps to `publishMenu`; revisions/templateLibrary omitted. `preview`:
   relax the host field to OPTIONAL with the toolbar preview affordance
   hidden when absent (consistent with how publish/revisions degrade) —
   menus get no preview-token route in this family; the live canvas is the
   preview.
4. **Canvas:** renders the LIVE `SiteHeaderNav` for this menu's items
   (via `mapMenuNodesToNavigationItems`) styled by the current appearance
   draft through `buildSiteShellCss`; the existing device switcher exercises
   the CSS-only mobile disclosure preview. Item structure stays read-only
   here (the structure editor owns it).
5. **Appearance floating panel:** the menu's `MenuAppearance` fields exposed
   through the SHARED control primitives — color swatches with transparent
   as a first-class swatch, segmented controls (alignment, transform,
   weight, dropdown direction, mobile mode), sliders (gap, padding, font
   size, border width), toggle (sticky). Edits write the appearance draft
   (undoable, same patch discipline as page props).
6. **Nav extras slot:** the restricted palette allows ONLY menu-extra
   blocks — `button` (CTA) and `image` (logo) — inserted into a dedicated
   nav extras slot rendered inside the shell header (brand/trailing area),
   persisted alongside the appearance and rendered by the public shell.

---

## Sub-Tasks

- [x] Add `palette` to `PageEditorHost` and thread it through
      `filteredSections`/`filteredBlocks`, ghost tiles, and add-beside;
      vitest proving page/template hosts are unaffected.
- [x] Relax `host.preview` to optional; hide the preview affordance when
      absent (no behavior change for existing hosts).
- [x] `/menus/:id/design` route + "Design" button + `MenuDesignEditorPage`
      host wiring (load/save/publish adapters, cache key).
- [x] Canvas: SiteHeaderNav live render with draft appearance CSS; device
      switcher mobile check.
- [x] Appearance panel via shared primitives bound to
      `normalizeMenuAppearance` fields.
- [x] Extras slot: restricted insert (button/image only), persistence with
      the menu draft, public shell render of published extras.

---

## Implementation Pseudocode

```tsx
// PageEditor.tsx — palette scoping (the one generic mechanism change)
const availableSections = editorHost.palette?.sections
  ? sectionOptions.filter((o) => editorHost.palette!.sections!.includes(o.type))
  : sectionOptions;
// same for blocks; query filtering then applies on top (existing :2079-2094)
// ghost tiles / add-beside consume availableBlocks, not the module constant.

// MenuDesignEditorPage.tsx
const host: PageEditorHost = {
  mode: "menu",
  resourceLabel: "Menu design",
  palette: { sections: [], blocks: ["button", "image"] },
  loadDetail: (id) => toMenuDesignDetail(await getMenuWithItems(id)),
  saveDocument: (id, doc) => updateMenu(id, fromMenuDesignDocument(doc)),
  publish: (id) => publishMenu(id),
  renderSettings: (p) => <MenuAppearancePanel ... />, // shared primitives
  // preview omitted -> affordance hidden
};
```

Expected data flow: open design view -> menu + appearance loaded -> canvas
shows SiteHeaderNav with `buildSiteShellCss(draftAppearance)` -> panel edits
patch the draft -> save persists via menu routes -> publish snapshots ->
public shell (TASK-458-02 bridge) reflects it.

Error handling: load failure uses the host `loadFailedMessage` path; save
errors surface `menu_appearance_invalid` field mapping; inserting any block
outside the palette is impossible by construction (options filtered at every
insert entry point — negative tests required, mirroring the TASK-452 gated
guard-rail style).

Regression-test shape: vitest — palette intersection (command palette, ghost
tiles, add-beside show ONLY button/image for the menu host; full catalog for
page hosts), preview-affordance hidden when host.preview absent, appearance
panel control wiring (swatch incl. transparent, segmented, slider patches);
Bun — extras + appearance round-trip through menu service.

---

## Security Contract

- **Endpoint visibility:** no new public endpoints; the design view uses
  existing menu admin routes.
- **Auth model / RBAC:** admin session; `menus:read` for the route,
  `menus:write` for saves (existing route enforcement).
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** palette is a host-side NARROWING filter — global
  capability gating (incl. `navigation`: `runtime-navigation-boundary`)
  remains authoritative server-side; extras/appearance validated by the
  TASK-458-02 normalizer and existing block prop schemas.
- **Anti-abuse controls:** not applicable.

## Completion Notes

- `/admin/menus/:id/design` now uses the shared editor host with a restricted
  menu palette, menu canvas, appearance panel, optional-preview behavior, and
  published extras/runtime coverage. The menu design save path writes draft
  appearance/extras only; public extras and appearance resolve from the
  `menus.settings.published` snapshot created by publish.

## Validation

- `bunx vitest run tests/vitest/admin/adminApp.test.tsx` passed with route
  resolution coverage for `/admin/menus/:id/design`.
- `bun test tests/integration/runtime/menu-design-extras-runtime.test.ts`
  passed with public snapshot isolation coverage.
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.

---

## Testing Requirements

- `bun run test:vitest` (palette mechanism, menu host, appearance panel,
  optional-preview degradation; existing PageEditor flow suites green).
- Bun: menu design round-trip + published extras render (env loaded).
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (host `palette` capability contract; optional
  preview).
- `docs/guide/` menu design view screen note.
