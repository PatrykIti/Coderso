# TASK-455: Public Site Shell Menu And Footer
# FileName: TASK-455_Public_Site_Shell_Menu_And_Footer.md

**Priority:** High
**Category:** Pages / Public Runtime / Site Shell / Admin UI
**Estimated Effort:** Large
**Dependencies:** None (consumes the shipped Menus domain, TASK-420 Page Templates, and TASK-423 responsive runtime)
**Status:** ⏳ To Do

---

## Overview

Page v2 pages render today without any global navigation or footer: the public
shell (`DefaultRuntimePageShellV2`, `core/site/pageRuntimeV2.tsx`;
`core/server/publicSite.tsx` has zero menu references) emits only the page
content. The Menus admin domain is fully shipped
(`core/services/menus/menuService.ts` — `listMenus`/`getMenu`,
`MenuWithItems`, `draft|published` status, tree builder; admin UI under
`core/admin/ui/menus/`), but nothing wires it to the public site. The
`navigation` Page section stays gated (`runtime-navigation-boundary`,
`pageDocumentV2.ts:483`) by design — navigation is a SITE concern, not a
per-page section, and this family keeps it that way.

Deliver a global site shell:

1. **Header navigation** rendered on every public Page v2 page from a
   designated published menu (settings key `site.navigationMenuId`,
   nullable = no header nav), with mobile collapse behavior consistent with
   the responsive delivery contract.
2. **Global footer** rendered on every public Page v2 page. Footer content is
   a designated **Page Template** (`site.footerTemplateId`, nullable = no
   footer) rendered through the existing Page v2 pipeline — this reuses the
   TASK-420 surface (authors build footer columns with the section-columns +
   list/heading/button blocks they already know) instead of inventing a
   second footer builder. Link columns are therefore first-class: section
   with columns 2-4 + list blocks with link items.
3. **Admin surface**: a "Site shell" settings card (Settings area) choosing
   the navigation menu and footer template from existing records, going
   through the shared settings routes/cache contract.

Non-goals: un-gating the `navigation` section (stays gated); per-page footer
overrides; menu item editing (Menus admin already owns it).

---

## Security Contract

- **Endpoint visibility:** public READ rendering only (shell rides the
  existing public page pipeline); admin writes go through the existing
  internal settings routes.
- **Auth model:** anonymous public read; admin session for settings writes.
- **RBAC:** existing settings permissions for the admin card.
- **CSRF:** existing admin write behavior (settings PATCH).
- **Rate-limit bucket:** unchanged.
- **Validation:** new settings keys validated in the settings schema
  (nullable id strings; reject-unknown preserved); only PUBLISHED menus and
  PUBLISHED page templates may render publicly (draft refs fail closed to
  no-render).
- **Anti-abuse controls:** not applicable (no public writes).

---

## Sub-Tasks

- [ ] TASK-455-01: Shell navigation and footer contract.
- [ ] TASK-455-02: Runtime shell and admin surfaces.
- [ ] TASK-455-03: Validation, live smoke, and closure.

---

## Implementation Pseudocode

```tsx
// publicSite render path (server): resolve shell config once per request
const shell = await resolvePublicSiteShell(); // { menu: MenuTree | null, footerDocument: PageDocumentV2 | null }
// DefaultRuntimePageShellV2 renders: <SiteHeaderNav menu={...}/> {page content} <SiteFooter document={...}/>
// Footer document renders through the SAME PageDocumentRender pipeline
// (responsive CSS included via the existing buildPageResponsiveCss call on
// the merged document or a second scoped style block).
```

Expected data flow:

- `site.navigationMenuId` / `site.footerTemplateId` (settings, nullable) ->
  `resolvePublicSiteShell` (service, cached per the site cache contract) ->
  shell components in `pageRuntimeV2.tsx` -> emitted on every public page,
  preview included.
- Missing/unpublished/deleted refs degrade to "render nothing" (never an
  error page); machine-readable service errors for the admin surface.

Error handling:

- Settings accept only existing record ids (validated on write; render-time
  re-checks fail closed).
- Footer template document is normalized through the Page v2 read path before
  render (same guarantees as pages).

Regression-test shape:

- Bun runtime: public page HTML contains nav links from the published menu
  and footer markup from the template; draft menu/template -> absent; no
  shell on preview-excluded contexts if the contract says so.
- Vitest: shell resolver service (Bun-free part), settings schema, admin card.

---

## Testing Requirements

- New Bun runtime coverage in the public-site suite (shell render, fail-closed
  refs) with env loaded.
- Vitest for the settings card + resolver normalization.
- `bun --cwd core lint`, `bun --cwd core lint:types`, root
  `npx tsc -p tsconfig.json --noEmit`.
- Live `coderso-dev-core-host` + `playwright-cli` smoke: configure menu +
  footer template in admin, publish, verify both render on two different
  pages and on mobile viewport.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (site shell contract section).
- `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` if shell config is
  cached as a new admin resource.
- `docs/guide/` end-user note (how to set the site menu and footer).
- `_docs/_TASKS/README.md` board + statistics; `_docs/_CHANGELOG/` entry on
  completion.
