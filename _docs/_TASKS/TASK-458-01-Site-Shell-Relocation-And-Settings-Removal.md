# TASK-458-01: Site Shell Relocation And Settings Removal
# FileName: TASK-458-01-Site-Shell-Relocation-And-Settings-Removal.md

**Parent Task:** TASK-458
**Priority:** High
**Category:** Menus / Admin UI / Settings
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-06-13

---

## Overview

Move the site-shell configuration (global navigation menu + footer template)
out of Site Settings onto the Menus surface, then remove the Settings shell
section entirely (explicit owner instruction — one home, not two).

Verified starting state:

- `SiteShellCard` is a self-contained PRESENTATIONAL card — props `values`,
  `menus`, `templates`, `errors`, `disabled`, `onChange`; two Select pickers
  with published-only options plus a sticky "not published" entry for the
  current selection; empty-state links to `/admin/menus` and
  `/admin/advanced/page-templates`
  (`core/admin/ui/site/SiteShellCard.tsx:160-249`, option builders `:47-85`,
  `resolveSiteShellFieldErrors` mapping `site_shell_*` codes `:92-101`).
- It is currently hosted under `activeSection === "shell"` in
  `SiteSettingsPage` and coupled to the page-level form: values from
  `form.navigationMenuId/footerTemplateId`, persisted only via the page-wide
  save (`core/admin/ui/site/SiteSettingsPage.tsx:759-778` mount,
  `:469-481` performSave, `:449-506` risk gate).
- The settings client builds a PARTIAL PATCH payload — keys included only
  when present in the update object
  (`core/admin/services/siteSettingsClient.ts:263-268`) — so a scoped save
  from another page is feasible without touching unrelated settings.
- The settings routes validate referenced ids via
  `assertSiteShellMenuExists` / `assertSiteShellTemplateExists` and return
  machine-readable `site_shell_menu_not_found` /
  `site_shell_template_not_found`
  (`core/server/routes/settingsRoutes.ts:86-94, 178, 204`;
  `core/services/pages/publicSiteShell.ts:96-127`).
- `MenuListPage` has a PageHeader actions slot currently holding the
  bulk-actions bar and the "New" button
  (`core/admin/ui/menus/MenuListPage.tsx:663-684`) — the "Site shell" button
  lands there.

Deliverables:

1. `SiteShellDialog` (new, under `core/admin/ui/menus/` or
   `core/admin/ui/site/`): a self-contained Dialog wrapping the existing
   presentational `SiteShellCard` with its OWN lifecycle — `getSiteSettings`
   load on open, busy/error state, scoped partial PATCH of exactly
   `navigationMenuId` + `footerTemplateId` on save, `site_shell_*` field-error
   mapping reused. The dialog loads its own menus + page-templates option
   data (the list page already loads menus; the page-templates listing client
   is a NEW dependency for this surface — load lazily on dialog open, not on
   page mount).
2. "Site shell" button in the `MenuListPage` PageHeader actions slot opening
   the dialog.
3. REMOVAL from `SiteSettingsPage`: the `shell` section body, its nav entry,
   the `navigationMenuId`/`footerTemplateId` fields in the page form state and
   in the `performSave` payload, and the now-unused imports. The settings
   KEYS, client payload mapping, server validation, and `publicSiteShell`
   resolver are untouched — only the Settings UI surface goes away.
4. Decision (recorded by parent): the navigation-menu and footer-template
   pickers STAY coupled in one dialog (the card is reused as-is); no
   `SiteShellValues` reshaping in this leaf.

---

## Sub-Tasks

- [x] Build `SiteShellDialog` (load on open, scoped partial save, error
      mapping, lazy menus/templates options fetch).
- [x] Wire the "Site shell" button into the `MenuListPage` PageHeader actions
      slot.
- [x] Remove the shell section, nav entry, form fields, and save-payload keys
      from `SiteSettingsPage`; update its tests.
- [x] Update admin prefetch/cache wiring if the dialog introduces new cached
      reads (`core/admin/utils/adminPrefetch.ts`, cachePolicy keys).

## Completion Notes

- Site shell configuration now lives on the Menus surface through the scoped
  dialog. The Settings shell section and stale copy were removed, and admin
  route/prefetch coverage was updated.

## Validation

- `bunx vitest run tests/vitest/admin/adminApp.test.tsx` passed.
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.

---

## Implementation Pseudocode

```tsx
// SiteShellDialog.tsx
function SiteShellDialog({ open, onOpenChange }) {
  // on open: parallel load
  const [settings, menus, templates] = await Promise.all([
    getSiteSettings(),            // existing client
    listMenus(),                  // existing client
    listPageTemplates(),          // existing client (new dep on this surface)
  ]);
  // local values state seeded from settings.navigationMenuId/footerTemplateId
  const save = () =>
    updateSiteSettings({ navigationMenuId, footerTemplateId }) // PARTIAL:
    // client emits only these two keys (siteSettingsClient.ts:263-268)
      .catch((e) => setErrors(resolveSiteShellFieldErrors(e)));
  return (
    <Dialog>
      <SiteShellCard values={...} menus={...} templates={...}
        errors={errors} disabled={busy} onChange={...}/>
      <DialogFooter> Cancel / Save </DialogFooter>
    </Dialog>
  );
}
```

Expected data flow: dialog open -> own load -> edit -> scoped PATCH (two keys
only) -> server `assertSiteShellReferencesExist` -> settings cache
invalidation exactly as today -> public shell reflects on next render.
`SiteSettingsPage` no longer reads or writes these keys.

Error handling: load failure -> dialog-level retry state (never a blank
form); save failure -> field-level `site_shell_*` errors via the existing
mapper; unknown errors -> generic dialog error, values preserved.

Regression-test shape: vitest for the dialog (open-load, scoped payload
asserts EXACTLY two keys, error mapping, busy/disabled states); updated
`SiteSettingsPage` tests proving the shell section/nav entry are gone and the
save payload no longer contains the shell keys; existing
`siteSettingsClient` partial-PATCH tests stay green.

---

## Security Contract

- **Endpoint visibility:** no new endpoints — existing internal settings
  GET/PATCH only.
- **Auth model / RBAC:** admin session; existing settings write permission
  (the dialog lives on a `menus:read` page but the SAVE authorization is the
  settings route's, unchanged — server-side enforcement is what counts).
- **CSRF:** unchanged (settings PATCH).
- **Rate-limit bucket:** unchanged.
- **Validation:** unchanged server-side (`assertSiteShell*`,
  reject-unknown); the dialog never widens the payload beyond the two keys.
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- `bun run test:vitest` (new dialog suite; updated SiteSettingsPage,
  adminPrefetch, siteSettingsClient suites as touched).
- `bun --cwd core lint`, `bun --cwd core lint:types`.

---

## Documentation Updates Required

- `docs/guide/` screens touching Site settings / Menus (shell config moved).
- `_docs/ADMIN_CACHE_MAP.md` if new cached reads are introduced on the Menus
  surface.
