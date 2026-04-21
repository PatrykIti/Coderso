# TASK-190-05-03-07: Detail Page Route Linking and Internal Admin API
# FileName: TASK-190-05-03-07_Detail_Page_Route_Linking_and_Internal_Admin_API.md

**Priority:** High
**Category:** CMS/Admin API + Detail Pages
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-03-01, TASK-190-05-03-04, TASK-190-05-03-05
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
POST   /admin/api/detail-pages/:id/preview
POST   /admin/api/detail-pages/:id/publish
POST   /admin/api/detail-pages/:id/unpublish
POST   /admin/api/detail-pages/:id/autosave
GET    /admin/api/detail-pages/:id/revisions
POST   /admin/api/detail-pages/:id/revisions/:revisionId/restore
DELETE /admin/api/detail-pages/:id/revisions/:revisionId
```

Preview endpoint response contract:

```json
{
  "token": "preview-token",
  "previewUrl": "/preview?type=detail-page&token=preview-token",
  "expiresAt": "2026-04-21T12:00:00.000Z"
}
```

Rules:

- `previewUrl` follows the same absolute/relative base URL resolution policy as
  existing page/content/widget-template preview endpoints.
- preview issuance requires a sample entry id in the internal admin request, but
  the runtime sample-entry context is stored server-side in
  `preview_tokens.context` rather than trusted from raw query params.
- `expiresAt` uses the existing preview TTL rules unless a later task defines a
  stricter detail-page-specific policy.
- The `detail-page` preview target and query contract are owned by
  `TASK-190-05-03-04`. This leaf wires the admin route to that contract and
  must not redefine preview target semantics in parallel.

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

- `site.contentRoutes` is the canonical runtime route owner for public content
  detail URLs. `detail_page_documents` do not define canonical route state in
  parallel.
- `detailPageId` links one content detail route to one detail page document.
- `setting.content-route.upsert` is extended in place:
  - omitted `detailPageId` preserves the current link,
  - `detailPageId: null` clears the link,
  - `detailPageId: "<id>"` sets/replaces the link.
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
- Update `core/services/pages/previewService.ts`
- Add `core/admin/services/detailPagesClient.ts`
- Update `core/server/routes/index.ts`
- Update `core/services/settings/settingsService.ts`
- Update `core/services/assistant/actionPlanTypes.ts`
- Update `core/services/assistant/actionPlanSchema.ts`
- Update `core/services/assistant/actionFamilyContracts.ts`
- Update `core/services/assistant/actionExecutorService.ts` for
  `setting.content-route.upsert.detailPageId`
- Update `core/site/contentRouteMatcher.ts`
- Update `core/admin/services/siteSettingsClient.ts`
- Update `core/admin/services/cachePolicy.ts`
- Update `core/admin/ui/site/siteSettingsValidation.ts`
- Update `core/admin/ui/site/SiteRouteEditor.tsx`
- Update `core/admin/ui/site/SiteSettingsPage.tsx`
- Add `tests/integration/routes/detailPages.test.ts`
- Add `tests/unit/content/detailPageDocumentService.test.ts`
- Update `tests/unit/settings/contentRoutesValidation.test.ts`
- Update `tests/unit/site/contentRouteMatcher.test.ts`
- Add `tests/vitest/admin/detailPagesClient.test.ts`
- Update `tests/vitest/admin/siteSettingsClient.test.ts`
- Update `tests/vitest/ui/site-settings.test.tsx`
- Update `tests/vitest/ui/plugin-media-site-leaf.test.tsx`
- Add settings/content route round-trip tests.

Admin client rule:

- `detailPagesClient.ts` owns list/detail/get/update/autosave/publish/unpublish/
  revisions/restore/preview wrappers plus cache hydration for the detail-page
  resource family.
- Do not push detail-page CRUD into `collectionsClient.ts` or ad-hoc local fetch
  helpers.

Preview storage rule:

- This leaf reuses the DB-backed preview-token context contract introduced in
  `TASK-190-05-03-04`.
- It must not add a second preview-session store, ad-hoc cache entry, or
  route-local server state for `sampleEntryId`.
- The route handler may call preview-service helpers, but physical preview
  storage remains owned by the shared `preview_tokens` contract.

ID contract:

- `POST /admin/api/detail-pages` may accept an explicit `id` for
  assistant/composer parity; when omitted for manual admin create, the service
  generates one and returns the normalized id in the response.
- `detail-page.upsert` and composer flows should use stable deterministic ids so
  route-link mutations can reference `detailPageId` without waiting for an
  opaque DB-generated value.
- Runtime route linking must happen through `setting.content-route.upsert`
  after the referenced detail page document id is known.

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
  - preview token issuance requires `content:read`,
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
- `POST /admin/api/detail-pages/:id/preview` returns `token`, `previewUrl`, and
  `expiresAt` with the expected detail-page preview target shape.
- The preview handler reuses the `detail-page` preview target/query contract
  introduced in `TASK-190-05-03-04`.
- Detail-page preview stores sample-entry context server-side instead of
  exposing it as an untrusted query parameter.
- Detail-page preview reuses the `preview_tokens.context` storage contract from
  `TASK-190-05-03-04`; this leaf does not invent a second persisted store.
- Settings round-trip preserves `detailPageId`.
- `setting.content-route.upsert` preserves existing `detailPageId` when the
  field is omitted, clears it when `null`, and replaces it when a string id is
  provided.
- `contentRouteMatcher` returns `detailPageId`.
- Site Settings UI/client round-trips `detailPageId`.
- Public runtime rejects content type/detail page mismatch.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cached wrappers are
  added in the same implementation slice.
- `_docs/_TASKS/README.md`
