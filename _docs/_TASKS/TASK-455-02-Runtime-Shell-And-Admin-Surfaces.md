# TASK-455-02: Runtime Shell And Admin Surfaces
# FileName: TASK-455-02-Runtime-Shell-And-Admin-Surfaces.md

**Parent Task:** TASK-455
**Priority:** High
**Category:** Pages / Public Runtime / Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-455-01
**Status:** ⏳ To Do

---

## Overview

Implement the frozen contract end to end:

1. **Runtime**: `SiteHeaderNav` (desktop horizontal nav from the published
   menu tree, nested items as dropdown or flat per contract decision; mobile
   collapse via the responsive contract — CSS-only disclosure, no client JS
   framework on the public page beyond what the runtime already ships) and
   `SiteFooter` (renders the footer template document through
   `PageDocumentRender` + scoped responsive CSS). Both mounted in
   `DefaultRuntimePageShellV2` for every public render and preview.
2. **Admin**: "Site shell" card in the Settings surface — two pickers
   (published menus via the cached menus client; published page templates via
   `pageTemplatesClient`), nullable "None" option, writes through the existing
   settings PATCH route + cache invalidation; shared admin UX patterns
   (cache-hydrate, background revalidation, no mount-force refetch).
3. **Cache**: public pages cache already contains rendered HTML — settings
   writes for the two keys must invalidate the public site cache so the shell
   change propagates (use the existing invalidation helper; document the
   trigger in ADMIN_CACHE docs).

---

## Sub-Tasks

- [ ] Implement the runtime shell components + publicSite wiring (preview
      included).
- [ ] Implement the admin Site shell settings card with validated writes.
- [ ] Wire cache invalidation for the two settings keys.

---

## Implementation Pseudocode

```tsx
// pageRuntimeV2.tsx
export function DefaultRuntimePageShellV2(props) {
  return (
    <>
      {props.shell?.navigation ? <SiteHeaderNav menu={props.shell.navigation} siteName={props.siteName} /> : null}
      <main>{/* existing page content */}</main>
      {props.shell?.footerDocument ? (
        <footer data-site-footer="true">
          <PageDocumentRender document={props.shell.footerDocument} />
        </footer>
      ) : null}
    </>
  );
}
// publicSite.tsx: const shell = await resolvePublicSiteShell(); pass into
// renderPublicPageV2RuntimeHtml -> templateProps; emit footer responsive CSS
// alongside the page's (concatenate builder output, distinct scopes).
```

Expected data flow: settings -> resolver -> shell props -> server-rendered
HTML; admin card -> settings PATCH -> settings + site cache invalidation ->
next public render shows the change.

Error handling: resolver nulls render nothing; admin card surfaces
`site_shell_*` validation errors inline.

Regression-test shape:

- Bun runtime: page HTML contains `<nav>` items from the menu and
  `data-site-footer` markup; draft menu -> no nav; template unpublished ->
  no footer; preview HTML includes the shell; footer responsive CSS present.
- Vitest UI: settings card render, picker options from cached clients,
  validation error surface, write payload shape.

---

## Security Contract

- **Endpoint visibility:** public read rendering; internal settings PATCH
  (existing route).
- **Auth model:** admin session for writes.
- **RBAC:** existing settings permissions.
- **CSRF:** existing admin write path.
- **Rate-limit bucket:** unchanged.
- **Validation:** ids validated against existing records on write; only
  published records render.
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- Bun public-site suite additions (env loaded).
- Vitest settings-card suite.
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` site shell section.
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` (invalidation trigger).
