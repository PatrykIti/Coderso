# TASK-190-05-03-07: Detail Page Route Linking and Internal Admin API
# FileName: TASK-190-05-03-07_Detail_Page_Route_Linking_and_Internal_Admin_API.md

**Priority:** High
**Category:** CMS/Admin API + Detail Pages
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-03-01, TASK-190-05-03-05
**Status:** To Do

---

## Overview

Add the internal admin API and route-linking contract needed to manage
`detail_page_documents` manually and connect them to public content detail
routes.

Public users must never access detail page CRUD endpoints. Public users only hit
runtime paths such as `/projekty-domow/:slug`.

## Sub-Tasks

No child task files.

## Internal API Contract

Internal admin routes:

```text
GET    /admin/api/detail-pages?contentTypeSlug=<slug>
GET    /admin/api/detail-pages/:id
POST   /admin/api/detail-pages
PATCH  /admin/api/detail-pages/:id
POST   /admin/api/detail-pages/:id/publish
POST   /admin/api/detail-pages/:id/unpublish
POST   /admin/api/detail-pages/:id/autosave
GET    /admin/api/detail-pages/:id/revisions
POST   /admin/api/detail-pages/:id/revisions/:revisionId/restore
DELETE /admin/api/detail-pages/:id/revisions/:revisionId
```

Route-linking contract:

```ts
type ContentRouteSetting = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};
```

Rules:

- `detailPageId` links one content detail route to one detail page document.
- `setting.content-route.upsert` can set or clear `detailPageId`.
- Updating a content route must preserve `detailPageId` unless explicitly
  changed.
- `contentRouteMatcher` returns `detailPageId` for detail route matches.
- `settingsService.normalizeContentRoutes` rejects invalid `detailPageId`
  values.
- `siteSettingsClient` and Site Settings UI round-trip `detailPageId` without
  dropping it.
- Public runtime validates that the referenced detail page document belongs to
  the matched content type before rendering.

## Files to Change

- Add `core/server/routes/detailPageRoutes.ts`
- Add `core/server/validation/detailPageSchemas.ts`
- Add `core/services/content/detailPageDocumentService.ts`
- Add `core/services/content/detailPageRevisionService.ts`
- Update `core/server/routes/index.ts`
- Update `core/services/settings/settingsService.ts`
- Update `core/services/assistant/actionPlanTypes.ts`
- Update `core/services/assistant/actionPlanSchema.ts`
- Update `core/services/assistant/actionExecutorService.ts` for
  `setting.content-route.upsert.detailPageId`
- Update `core/site/contentRouteMatcher.ts`
- Update `core/admin/services/siteSettingsClient.ts`
- Update Site Settings UI route editor if it serializes content routes.
- Add `tests/integration/routes/detailPages.test.ts`
- Add `tests/unit/content/detailPageDocumentService.test.ts`
- Add settings/content route round-trip tests.

## Error Contract

Domain/service errors must stay machine-readable:

- `detail_page_invalid`
- `detail_page_not_found`
- `detail_page_conflict`
- `detail_page_route_conflict`
- `detail_page_content_type_mismatch`
- `detail_page_revision_not_found`
- `detail_page_revision_delete_forbidden`

Route boundary maps through centralized `mapDetailPageError`.

## Security Contract

- Visibility: internal admin API only (`/admin/api/detail-pages*`).
- Auth model: authenticated admin session / scoped internal API key where
  supported.
- RBAC:
  - read/list/revisions require `content:read`,
  - create/update/autosave/restore/discard require `content:write`,
  - publish/unpublish require `content:publish`.
- CSRF: all mutating routes require existing admin CSRF middleware.
- Rate-limit bucket: `admin_read` for GET, `admin_write` for mutations.
- Reject-unknown validation:
  - route payloads reject unknown fields,
  - document payloads pass `DetailPageDocument` normalizer,
  - route-linking payloads validate `detailPageId`.
- Anti-abuse:
  - no public write endpoint,
  - route patterns are safe relative paths,
  - referenced content type and detail page document must match.
- Public-write hardening: not applicable; embedded public forms use existing
  form runtime hardening.
- Secret handling:
  - no preview tokens, CSRF tokens, submissions, provider keys, or secret fields
    in response/debug/cache payloads.

## Testing Requirements

- Route registration covers all detail page endpoints.
- `mapDetailPageError` covers known errors.
- Create/update/publish/unpublish/autosave/revision flow works through route
  handlers.
- Settings round-trip preserves `detailPageId`.
- `setting.content-route.upsert` preserves existing `detailPageId` unless
  explicitly changed.
- `contentRouteMatcher` returns `detailPageId`.
- Site Settings UI/client round-trips `detailPageId`.
- Public runtime rejects content type/detail page mismatch.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cached wrappers are
  added in the same implementation slice.
- `_docs/_TASKS/README.md`
