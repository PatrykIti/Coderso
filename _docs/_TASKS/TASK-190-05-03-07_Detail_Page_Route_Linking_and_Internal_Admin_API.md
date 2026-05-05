# TASK-190-05-03-07: Detail Page Route Linking and Internal Admin API
# FileName: TASK-190-05-03-07_Detail_Page_Route_Linking_and_Internal_Admin_API.md

**Priority:** High
**Category:** CMS/Admin API + Detail Pages
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-03-01, TASK-190-05-03-04
**Status:** To Do

---

## Overview

Add the internal admin API and route-linking contract needed to manage
`detail_page_documents` manually and connect them to public content detail
routes.

Public users must never access detail page CRUD endpoints. Public users only hit
runtime paths such as `/projekty-domow/:slug`.

This task is now a small program, not one implementation leaf. It still owns
the end-to-end `detailPageId` round-trip plus the internal detail-page admin
API, but the work is split so we do not mix:

- CRUD/revisions/preview route handlers and services,
- `detailPageId` settings/action/UI/matcher round-trip,
- admin client/cache/delete parity

into one oversized slice.

## Sub-Tasks

- `TASK-190-05-03-07-01_Detail_Page_Internal_CRUD_Revisions_and_Preview_Routes.md`
- `TASK-190-05-03-07-02_DetailPageId_Content_Route_Roundtrip_and_Matcher_Metadata.md`
- `TASK-190-05-03-07-03_Detail_Page_Admin_Client_Cache_and_Delete_Conflict_Parity.md`

## Internal API Contract

Internal admin routes:

```text
GET    /admin/api/detail-pages?contentTypeId=<id>
GET    /admin/api/detail-pages/:id
POST   /admin/api/detail-pages
PATCH  /admin/api/detail-pages/:id
DELETE /admin/api/detail-pages/:id
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

- internal read/list filtering for detail pages is keyed by stable
  `contentTypeId`, in line with `TASK-190-05-03-01` and the collection-
  workspace route family; `contentTypeSlug` may remain normalized response data
  or route-facing label, but it must not become the canonical admin filter or
  join key for this slice,
- `previewUrl` follows the same absolute/relative base URL resolution policy as
  existing page/content/widget-template preview endpoints.
- preview issuance requires a sample entry id in the internal admin request, but
  the runtime sample-entry context is stored server-side in
  `preview_tokens.context` rather than trusted from raw query params.
- `POST /admin/api/detail-pages/:id/preview` always issues the dedicated
  `type=detail-page` preview token for draft/current detail-template preview; it
  must not synthesize `type=content&detailPageId=...` URLs as a back door to
  `current_document`.
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
- this leaf widens the current Site Settings route contract in place through
  `settingsService.ts`, `siteSettingsClient.ts`, `siteSettingsValidation.ts`,
  `SiteRouteEditor.tsx`, and `SiteSettingsPage.tsx`; it must not create a second
  detail-page route-link store, hidden settings alias, or detail-page-local
  route metadata bag.
- `contentRouteMatcher` returns `detailPageId` for detail route matches.
- `contentRouteMatcher.ts` remains a pure matcher over normalized
  `site.contentRoutes`; it surfaces stored `detailPageId` for runtime consumers
  but does not perform DB lookups, existence checks, or fallback inference.
- `settingsService.normalizeContentRoutes` rejects invalid `detailPageId`
  values.
- `settingsService.normalizeContentRoutes` remains a structural settings owner:
  it validates safe route shape plus the shared `detailPageId` format contract,
  but referential checks such as document existence, content-type ownership, and
  delete/unlink conflicts stay in the detail-page service, route handlers, and
  runtime owner seams instead of turning settings normalization into a second
  DB-backed validator.
- `siteSettingsClient` and Site Settings UI round-trip `detailPageId` without
  dropping it.
- `setting.content-route.upsert` remains the only assistant/manual write seam
  for canonical route linkage. `detail-page.upsert` and detail-page CRUD may
  create or update documents, but they must not mutate `site.contentRoutes`
  out-of-band.
- `TASK-190-05-03-03` remains the single runtime owner for consuming validated
  `detailPageId` route metadata inside `publicSite.tsx` /
  `renderPublicEntry.tsx` and rejecting content-type mismatches before render;
  this leaf supplies the admin/settings/matcher round-trip that runtime owner
  consumes and must not add a second parallel runtime validation path.

## Files to Change

- Add `core/server/routes/detailPageRoutes.ts`
- Add `core/server/validation/detailPageSchemas.ts`
- Add `core/services/content/detailPageDocumentService.ts`
- Add `core/services/content/detailPageRevisionService.ts`
- Update `core/services/pages/previewService.ts`
- Add `core/admin/services/detailPagesClient.ts`
- Update `core/admin/services/assistantClient.ts`
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
- Update `tests/unit/assistant/actionExecutorService.test.ts`
- Update `tests/unit/assistant/actionExecutorService.db.test.ts`
- Add `tests/vitest/admin/detailPagesClient.test.ts`
- Update `tests/vitest/admin/assistantClient.test.ts`
- Update `tests/vitest/assistant/action-plan-schema.test.ts`
- Update `tests/vitest/assistant/action-family-contracts.test.ts` only if
  `actionFamilyContracts.ts` widens the executable route-link contract metadata
- Update `tests/vitest/admin/siteSettingsClient.test.ts`
- Update `tests/vitest/ui/site-settings-validation.test.ts`
- Update `tests/vitest/ui/site-settings.test.tsx`
- Update `tests/vitest/ui/plugin-media-site-leaf.test.tsx`
- Add settings/content route round-trip tests.

Admin client rule:

- `detailPagesClient.ts` owns list/detail/get/update/autosave/publish/unpublish/
  revisions/restore/preview wrappers plus cache hydration for the detail-page
  resource family.
- `cachePolicy.ts` owns one detail-page cache-key family, not one flat list key:
  - `detailPages:list` for unfiltered list reads if they exist,
  - `detailPages:list:contentType:<contentTypeId>` for content-type-filtered
    list reads,
  - `detailPages:detail:<id>` for one document read,
- `detailPagesClient.ts` owns selecting the correct list cache key from the
  current query args so filtered workspace/editor reads do not collide with a
  future unfiltered list view or with another content type,
- `siteSettingsClient.ts`, `siteSettingsValidation.ts`, `SiteRouteEditor.tsx`,
  and `SiteSettingsPage.tsx` remain the manual/admin transport owners for
  `detailPageId` route linking. `detailPagesClient.ts` owns detail-page document
  CRUD only and must not absorb route-link mutations.
- `assistantClient.ts` owns mapping validated `detail-page.upsert` execution
  results onto that same cache-key family so assistant-driven edits reuse the
  same cache invalidation path as manual admin flows.
- `detailPagesClient.ts` must follow the current admin cache contract already
  used by pages/custom screens: local cache hydrate, background revalidation,
  and `cacheBus` broadcast invalidate/update events.
- Do not push detail-page CRUD into collection-workspace helpers owned by
  `contentTypesClient.ts` or ad-hoc local fetch helpers.

Preview storage rule:

- This leaf reuses the DB-backed preview-token context contract introduced in
  `TASK-190-05-03-04`.
- It must not add a second preview-session store, ad-hoc cache entry, or
  route-local server state for `sampleEntryId`.
- The route handler may call preview-service helpers, but physical preview
  storage and `preview_tokens.context` serialization remain owned by the shared
  `previewService.ts` + `preview_tokens` contract.

ID contract:

- `POST /admin/api/detail-pages` may accept an explicit `id` for
  assistant/composer parity; when omitted for manual admin create, the service
  generates one and returns the normalized id in the response.
- `detail-page.upsert` and composer flows should use stable deterministic
  UUID-compatible ids so route-link mutations can reference `detailPageId`
  without waiting for an opaque DB-generated value.
- This leaf consumes the UUID-compatible id contract defined in
  `TASK-190-05-03-01`; route handlers, `detailPagesClient.ts`, and
  `setting.content-route.upsert` must validate against that shared contract
  rather than accepting arbitrary string ids.
- Runtime route linking must happen through `setting.content-route.upsert`
  after the referenced detail page document id is known.

## Pseudocode

```ts
// 07-01
router.post("/admin/api/detail-pages/:id/preview", async (ctx) => {
  const request = normalizeDetailPagePreviewRequest(ctx.body);
  return issueDetailPagePreviewToken(request);
});

// 07-02
export const mergeContentRouteDetailPageId = (currentRoute, input) => ({
  ...currentRoute,
  ...(Object.prototype.hasOwnProperty.call(input, "detailPageId")
    ? { detailPageId: input.detailPageId }
    : {}),
});

// 07-03
export const invalidateDetailPageAdminCaches = ({ id, contentTypeId }) => {
  cacheBus.invalidate(`detailPages:detail:${id}`);
  cacheBus.invalidate(`detailPages:list:contentType:${contentTypeId}`);
};
```

Delete contract:

- The first admin API must keep lifecycle parity with existing internal content
  resources and therefore includes `DELETE /admin/api/detail-pages/:id`.
- Delete stays manual-admin/API only in this slice; it does not imply that a
  generic assistant `detail-page.delete` action exists in the same wave.
- Delete must not silently mutate route ownership. If the document is still
  referenced by `site.contentRoutes.detailPageId`, the service returns a
  machine-readable conflict and the operator must clear the route link first via
  Site Settings / `setting.content-route.upsert`.
- After unlink, delete removes the document plus owned revisions and invalidates
  the same detail-page admin cache keys as other mutations.
- Content-type delete must also be protected from the opposite direction: if a
  content type still owns any `detail_page_documents`, the content-type delete
  flow returns `content_type_has_detail_pages` and does not delete the content
  type. This is a content-type boundary error, not a `mapDetailPageError`
  replacement, but this leaf must keep the detail-page route/admin API contract
  aligned with that dependency.

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
  - create/update/delete/autosave/restore/discard require `content:write`,
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
- Content-type delete route/service coverage maps `content_type_has_detail_pages`
  through the existing content-type error boundary when detail-page documents
  still reference the content type.
- Create/update/delete/publish/unpublish/autosave/revision flow works through
  route handlers.
- `POST /admin/api/detail-pages/:id/preview` returns `token`, `previewUrl`, and
  `expiresAt` with the expected detail-page preview target shape.
- The preview handler reuses the `detail-page` preview target/query contract
  introduced in `TASK-190-05-03-04`.
- Detail-page preview stores sample-entry context server-side instead of
  exposing it as an untrusted query parameter.
- Detail-page preview reuses the `preview_tokens.context` storage contract from
  `TASK-190-05-03-04`; this leaf does not invent a second persisted store.
- Detail-page list/read filtering uses `contentTypeId` as the stable content-
  type join key; mutable `contentTypeSlug` remains advisory response data only.
- Settings round-trip preserves `detailPageId`.
- `setting.content-route.upsert` preserves existing `detailPageId` when the
  field is omitted, clears it when `null`, and replaces it when a string id is
  provided.
- Linked detail pages reject delete with a machine-readable route conflict until
  the canonical route link is cleared through the existing route owner seam.
- `detailPagesClient.ts` exposes delete and invalidates the detail-page list /
  detail cache-key family, including the active `contentTypeId`-scoped list key
  when the current read is filtered, through the same admin cache contract as
  comparable resources.
- `contentRouteMatcher` returns `detailPageId`.
- Site Settings UI/client round-trips `detailPageId`.
- `tests/vitest/assistant/action-plan-schema.test.ts` covers strict
  `setting.content-route.upsert` shape for `detailPageId`, including the
  current owner semantics for omitted value vs `null` vs string id.
- `tests/unit/assistant/actionExecutorService.test.ts` and
  `tests/unit/assistant/actionExecutorService.db.test.ts` cover dry-run /
  execute behavior for preserving, clearing, and replacing `detailPageId`
  through the existing `setting.content-route.upsert` seam instead of a second
  route-link executor path.
- If `actionFamilyContracts.ts` changes in this leaf, the corresponding
  `tests/vitest/assistant/action-family-contracts.test.ts` assertions stay in
  sync with the executable route-link contract metadata and permissions.
- `tests/vitest/ui/site-settings-validation.test.ts` covers local form
  validation for the optional `detailPageId` shape/UUID-compatible contract,
  while referential checks still stay with the detail-page owner seams.
- `tests/vitest/ui/site-settings.test.tsx` and
  `tests/vitest/ui/plugin-media-site-leaf.test.tsx` cover Site Settings /
  `SiteRouteEditor` round-trip for `detailPageId` without inventing route-local
  state outside the existing settings editor flow.
- settings/content-route validation tests cover shape/UUID-contract rules in the
  settings seam, while document existence/content-type mismatch coverage stays
  with the detail-page route/runtime owners.
- Cross-slice parity: once `TASK-190-05-03-03` consumes the validated route
  metadata from this leaf, public runtime rejects content type/detail page
  mismatch without introducing a second route registry.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
