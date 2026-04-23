# TASK-203-04-02: Metadata Panel SEO URL, Taxonomy Link, and Collapsible Help
# FileName: TASK-203-04-02_Metadata_Panel_SEO_URL_Taxonomy_Link_and_Collapsible_Help.md

**Priority:** Medium
**Category:** CMS/Entries + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-203-04
**Status:** To Do

---

## Overview

Repair metadata panel guidance: hardcoded SEO URL, disabled taxonomy without a
repair path, and always-expanded help. This leaf owns `BUG-8`, `UX-3`, and
`UX-5`.

Ownership:

- `EntryEditor` owns fetching or deriving content type, site settings, content
  route, and Engine-link context, then passing it into the panel.
- `EntryMetadataPanel` stays presentational and must not fetch settings,
  content types, routes, or taxonomy config at import/render time.
- `siteSettingsClient` owns public URL/content-route normalization. It must grow
  or reuse a generic content-route resolver for the current `contentTypeSlug`;
  do not reuse the Posts-only slug helper/fallback when rendering generic
  Entries SEO previews.
- `AdminLink` plus `adminPaths` own canonical Engine navigation.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryMetadataPanel.tsx:83-110`
- `core/admin/ui/entries/EntryMetadataPanel.tsx:314-333`
- `core/admin/ui/entries/EntryMetadataPanel.tsx:382-385`
- `core/admin/ui/entries/EntryEditor.tsx:545-555`
- `core/admin/services/siteSettingsClient.ts`
- `core/admin/services/contentTypesClient.ts`
- `core/admin/ui/shared/AdminLink.tsx`
- `core/admin/utils/adminPaths.ts`
- `tests/vitest/ui/entry-metadata.test.tsx`
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `tests/vitest/admin/siteSettingsClient.test.ts`
- `tests/vitest/admin/adminPaths.test.ts` or `tests/vitest/ui/admin-link.test.tsx`
  if canonical Engine href behavior changes

## Implementation Sketch

```ts
const seoPreviewUrl =
  publicBaseUrl && routeUsesSlug
    ? `${publicBaseUrl}${entryPath}`
    : `/${contentTypeSlug}/${slug || "[slug]"}`;
```

Direction:

- concrete URL only from trustworthy site settings and route context,
- otherwise show neutral placeholder/route hint,
- route context must come from `site.contentRoutes` for the active content type,
  with a generic `/{contentTypeSlug}/:slug` hint only when no enabled route is
  configured; do not hard-code `/blog`, `/post`, `nextless.cms`, or any
  posts-specific fallback for Entries,
- taxonomy link goes to the current content type editor/settings route through
  shared helpers, e.g. `/content-types/${contentTypeId}` or
  `/content-types/${contentTypeId}/schema` resolved by `AdminLink` to the
  canonical `/coderso/engine/...` route,
- pass `contentTypeId` or an already-resolved `engineSettingsHref` from
  `EntryEditor`; do not make `EntryMetadataPanel` discover owners by fetching.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF: no new route; existing reads only.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: unchanged.
- Anti-abuse: no backend-only secrets in SEO preview props; local help-collapse
  state must not store content data.

## Testing Requirements

- configured public URL appears when available,
- fallback placeholder appears when context is missing,
- content-route resolution uses the active content type, not the Posts helper or
  a hardcoded `/blog` path,
- `nextless.cms` is not hardcoded,
- disabled taxonomy copy includes Engine settings link for the current content
  type and the test asserts the canonical href,
- help can collapse and remains accessible.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `docs/coderso/content-type-editor-and-schema-builder.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. SEO preview URL is settings/route-derived or neutral placeholder.
2. Disabled taxonomy guidance gives a direct internal repair path.
3. The repair path uses current admin navigation helpers and names the Engine
   content type editor as the owner of taxonomy enablement.
4. Help no longer permanently occupies sidebar space.
5. Generic Entries SEO preview does not reuse Posts-only route helpers or
   hardcoded blog/post paths.
