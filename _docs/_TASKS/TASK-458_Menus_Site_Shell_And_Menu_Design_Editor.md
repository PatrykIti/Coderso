# TASK-458: Menus Site Shell And Menu Design Editor
# FileName: TASK-458_Menus_Site_Shell_And_Menu_Design_Editor.md

**Priority:** High
**Category:** Menus / Admin UI / Public Runtime / Page Editor V2
**Estimated Effort:** Very Large
**Dependencies:** None (consumes the shipped TASK-455 site shell and the TASK-421 floating-panel control primitives)
**Status:** 🚧 In Progress
**Started:** 2026-06-13

---

## Overview

Two owner requirements reshape the Menus surface:

1. **Site-shell config moves to Menus.** The navigation-menu + footer-template
   pickers (TASK-455) currently live as a `shell` section inside the monolithic
   Site Settings form (`core/admin/ui/site/SiteSettingsPage.tsx:759-778`,
   saved only via the page-wide `performSave` at `:469-481`). The owner wants
   them reachable from the Menus surface instead: a "Site shell" button in the
   `MenuListPage` PageHeader actions slot
   (`core/admin/ui/menus/MenuListPage.tsx:663-684`) opening a self-contained
   dialog. Once that lands, the Settings -> site -> shell section MUST BE
   REMOVED (explicit owner instruction) — one home, not two. The relocation is
   cheap because `SiteShellCard` is already presentational
   (`core/admin/ui/site/SiteShellCard.tsx:160-249`) and the settings client
   builds PARTIAL PATCH payloads — keys are included only when present in the
   update object (`core/admin/services/siteSettingsClient.ts:263-268`) — with
   server-side reference validation via `assertSiteShellMenuExists` /
   `assertSiteShellTemplateExists` mapping to machine-readable
   `site_shell_*` errors (`core/server/routes/settingsRoutes.ts:86-94, 178,
   204`; `core/services/pages/publicSiteShell.ts:96-127`).

2. **Menus get a DESIGN editor.** Editing a menu's APPEARANCE is impossible
   today: the menus table models structure only — id, name, location, status,
   timestamps, NO settings/appearance column (`core/db/schema.ts:1076-1090`)
   — and the public `SiteHeaderNav` look is a hardcoded CSS string constant,
   `SITE_SHELL_CSS` (`core/site/siteShell.tsx:58-84`), injected wholesale by
   `renderPublicPage.tsx:366`. The only appearance vocabulary in the codebase
   is the legacy navigation widget's `NavigationStyle`
   (`core/widgets/core/navigation.tsx:79-119`), which nothing maps to the
   shell. The owner wants a clearly visible button inside a menu opening a
   design view: a canvas with the rendered menu plus the page-editor floating
   panel editing the menu's appearance, with the block palette restricted to
   menu-appropriate blocks only.

This family delivers, in order: (01) the Site shell dialog on the Menus list
and removal of the Settings shell section; (02) a persisted, normalized menu
appearance model (`settings` jsonb column on `menus`) and a builder that
parameterizes `SITE_SHELL_CSS` from it with the CURRENT look as fail-closed
defaults — legacy menus render byte-identical; (03) the design editor at
`/menus/:id/design` hosting the shared `PageEditor` via the `editorHost` seam
(precedent: `PageTemplateEditorPage.tsx:188-227`) with a NEW host capability
`palette?: { sections?: PageSectionType[]; blocks?: PageBlockType[] }` —
the seam has zero palette-scoping today (insertables are module-level
constants from the global capability tables, `PageEditor.tsx:394-422`,
filtered only by the search query at `:2079-2094`); (04) validation and live
smoke.

Non-goals: un-gating the global `navigation` section (stays
`runtime-navigation-boundary`, `pageDocumentV2.ts:483` — restriction is
host-scoped only); menu ITEM editing (the structure editor already owns it);
footer appearance (the footer is a Page Template and already has the full
editor).

---

## Security Contract

- **Endpoint visibility:** no new public endpoints. Admin writes ride the
  existing internal settings PATCH (site shell dialog) and the existing menu
  routes (appearance persistence). Public surface is READ-only CSS emission.
- **Auth model:** admin session for all writes; anonymous public read of the
  rendered shell.
- **RBAC:** existing settings permissions for the shell dialog; existing
  `menus:read` / `menus:write` for appearance and the design editor (admin
  routes `/menus`, `/menus/:id` already gate on `menus:read`,
  `core/admin/app/AdminApp.tsx:754-758`).
- **CSRF:** unchanged — existing admin write behavior on both route families.
- **Rate-limit bucket:** unchanged.
- **Validation:** site-shell ids keep the server-side existence checks
  (`assertSiteShell*` -> `site_shell_menu_not_found` /
  `site_shell_template_not_found`). Menu appearance is schema-owned by a new
  `normalizeMenuAppearance` module: enum/clamped/token-backed values only
  (color values restricted to the hex / `var(--color-*)` / rgb / hsl /
  `transparent` shapes, cf. the navigation widget color schema,
  `navigation.tsx:121-135`); reject-unknown preserved. Public CSS is built
  ONLY from schema-clamped values — no raw string interpolation of stored
  input into the stylesheet.
- **Anti-abuse controls:** not applicable (no public writes).

---

## Sub-Tasks

- [x] TASK-458-01: Site shell relocation to the Menus surface and Settings
      shell-section removal.
- [x] TASK-458-02: Menu appearance model (`settings` jsonb + normalizer) and
      the SITE_SHELL_CSS parameterization bridge.
- [x] TASK-458-03: Menu design editor canvas, host palette restriction
      mechanism, appearance floating panel, and nav extras slot.
- [ ] TASK-458-04: Validation, live smoke, and closure.

## Progress Notes

- 2026-06-13: Implementation leaves TASK-458-01 through TASK-458-03 are
  complete with targeted route/runtime/admin coverage, lint, typecheck, root
  typecheck, DB reachability, release gates, and docs updates. Parent remains
  open until TASK-458-04 records the live dev-host Playwright smoke for
  restyle -> publish, Settings shell removal, and restricted menu palette.

---

## Implementation Pseudocode

```ts
// (01) Menus list header: self-contained dialog wrapping the existing card
<PageHeader title="Menus" actions={<><SiteShellDialogButton/> ...bulk + New</>}/>
// SiteShellDialog: own getSiteSettings load -> SiteShellCard (presentational)
// -> scoped partial PATCH { navigationMenuId, footerTemplateId } only.

// (02) Appearance model + CSS bridge
menus.settings: jsonb // normalizeMenuAppearance(value): MenuAppearance
// vocabulary (NavigationStyle-inspired): surface/link/hover/active colors
// (transparent allowed), itemGap/padding, alignment, fontSize/Weight/
// textTransform, border, shadow, sticky, dropdownDirection, mobileMode
buildSiteShellCss(appearance: MenuAppearance | null): string
// null/legacy -> exactly the current SITE_SHELL_CSS output (fail closed)

// (03) Design editor host
// AdminApp route "/menus/:id/design" -> MenuDesignEditorPage
const host: PageEditorHost = {
  mode: "menu", // inert today; union extended
  palette: { sections: [...], blocks: ["button", "image"] }, // NEW capability
  loadDetail / saveDocument: menu appearance <-> editor document adapter,
  renderSettings: appearance panel via shared primitives,
};
// Canvas renders the live SiteHeaderNav for this menu's items; extras slot
// hosts the restricted blocks (CTA button, logo image).
```

Expected data flow: appearance edited in the design view -> persisted on the
menu record (draft) via existing menu update routes -> `publishMenu` carries
it to the published snapshot (publish/draft lifecycle,
`core/services/menus/menuService.ts:155-157`) -> `resolvePublicSiteShell`
loads the published menu -> `buildSiteShellCss(appearance)` replaces the
static `SITE_SHELL_CSS` injection in `renderPublicPage.tsx` -> every public
page reflects the menu's look.

Error handling: missing/invalid appearance normalizes to the legacy defaults
(never a render error); dialog save surfaces the existing `site_shell_*`
field errors (`SiteShellCard.tsx:92-101` mapper); design-editor save failures
follow the PageEditor host save-error contract.

Regression-test shape: byte-identity test for `buildSiteShellCss(null)` vs
the current constant; normalizer clamp/reject-unknown suites; dialog
load/save/partial-PATCH vitest; host palette-filter vitest (restricted
options in command palette, ghost tiles, add-beside); Bun runtime test that a
published appearance changes the emitted shell CSS and a draft change does
not.

---

## Testing Requirements

- `bun run test:vitest` (admin dialog, SiteSettingsPage without shell
  section, PageEditor palette restriction, appearance panel).
- Bun suites: menu service appearance round-trip + publish lifecycle, shell
  CSS builder, public-site shell render (env loaded).
- `bun --cwd core lint`, `bun --cwd core lint:types`, root
  `npx tsc -p tsconfig.json --noEmit`.
- Live `coderso-dev-core-host` + `playwright-cli` smoke per TASK-458-04
  (restyle -> publish -> front reflects; settings section gone; palette
  restricted).

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (site shell appearance contract; host palette
  capability).
- `_docs/DATA_MODEL.md` (menus.settings column).
- `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` if dialog/menu cache
  keys change.
- `docs/guide/` end-user notes (Site shell from Menus; menu design view).
- `_docs/_TASKS/README.md` board + statistics; `_docs/_CHANGELOG/` entry on
  completion.
