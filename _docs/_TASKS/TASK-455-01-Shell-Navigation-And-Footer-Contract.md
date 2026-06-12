# TASK-455-01: Shell Navigation And Footer Contract
# FileName: TASK-455-01-Shell-Navigation-And-Footer-Contract.md

**Parent Task:** TASK-455
**Priority:** High
**Category:** Pages / Public Runtime / Site Shell
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Freeze the site-shell contract before implementation: settings keys, resolver
service shape, render placement, fail-closed rules, and cache strategy.

Contract to record (verify each anchor before freezing):

- Settings: `site.navigationMenuId: string | null` and
  `site.footerTemplateId: string | null` added to the settings defaults/schema
  (`core/services/settings/settingsService.ts` defaults map ~:59) with
  reject-unknown preserved; values must reference an existing menu
  (`core/services/menus/menuService.ts` `getMenu`) / page template
  (`pageTemplateLibraryService`).
- Resolver: new `core/services/pages/publicSiteShell.ts` —
  `resolvePublicSiteShell(): Promise<PublicSiteShell>` returning
  `{ navigation: MenuTree | null, footerDocument: PageDocumentV2 | null }`;
  only `published` menus and `published` templates resolve; everything else
  (missing id, draft, deleted) resolves to `null` (fail closed, no error
  page).
- Render placement: `DefaultRuntimePageShellV2`
  (`core/site/pageRuntimeV2.tsx:14`) renders `<SiteHeaderNav>` above and
  `<SiteFooter>` below the page content on EVERY public Page v2 render,
  including the tokenized preview (so authors see the real shell).
- Footer rides the existing Page v2 render pipeline (`PageDocumentRender`)
  plus responsive CSS emission for the footer document (scoped style block,
  same builder).
- Caching: shell config resolves server-side per request through the existing
  site cache; settings writes invalidate via the existing settings
  invalidation path (`invalidateSiteCachePath` usage to be confirmed —
  document the exact invalidation trigger).

---

## Sub-Tasks

- [ ] Verify anchors and freeze the contract in this file (update the bullets
      above with exact line references).
- [ ] Define `PublicSiteShell` types and the resolver module skeleton with
      machine-readable errors for the admin validation path
      (`site_shell_menu_not_found`, `site_shell_template_not_found`).

---

## Implementation Pseudocode

```ts
// core/services/pages/publicSiteShell.ts (service lane; DB-coupled is fine)
export type PublicSiteShell = {
  navigation: MenuWithItems | null;
  footerDocument: PageDocumentV2 | null;
};

export async function resolvePublicSiteShell(): Promise<PublicSiteShell> {
  const [menuId, templateId] = await getSettings(["site.navigationMenuId", "site.footerTemplateId"]);
  const menu = menuId ? await getMenu(menuId) : null;
  const template = templateId ? await getPageTemplate(templateId) : null;
  return {
    navigation: menu && menu.status === "published" ? menu : null,
    footerDocument:
      template && template.status === "published"
        ? normalizeStoredPageTemplateDocument(template.document)
        : null,
  };
}
```

Error handling: render path never throws for missing refs (null); admin write
path validates ids and maps `site_shell_*` errors via the settings route's
error mapper.

Regression-test shape: Bun service tests for publish-status gating and
fail-closed nulls; settings schema rejects unknown keys/non-string ids.

---

## Security Contract

- **Endpoint visibility:** no new endpoints in this leaf.
- **Auth model / RBAC / CSRF / rate-limit:** unchanged.
- **Validation:** settings schema owns the new keys; only published records
  render publicly.
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- Bun service tests for the resolver (env loaded).
- `bun --cwd core lint`, `bun --cwd core lint:types`.

---

## Documentation Updates Required

- Contract bullets in this file updated with verified anchors (done at freeze).
