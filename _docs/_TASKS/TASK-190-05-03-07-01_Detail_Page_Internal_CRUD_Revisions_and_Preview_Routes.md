# TASK-190-05-03-07-01: Detail Page Internal CRUD, Revisions, and Preview Routes
# FileName: TASK-190-05-03-07-01_Detail_Page_Internal_CRUD_Revisions_and_Preview_Routes.md

**Priority:** High
**Category:** CMS/Admin API + Detail Pages
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-03-01, TASK-190-05-03-04
**Status:** Done (2026-05-09)

---

## Overview

Add the first internal admin route family for detail-page CRUD, revisions, and
detail-template preview token issuance.

This task is now a small program, not one implementation leaf. It still owns
the route/service boundary for the resource itself, but the work is split so we
do not mix:

- CRUD/read route handlers,
- preview/publish/autosave lifecycle routes,
- revisions/restore/discard route flow

into one oversized slice. It does not
own `detailPageId` route linking in `site.contentRoutes`; that round-trip stays
with `TASK-190-05-03-07-02`.

Current slice note:
- `TASK-190-05-03-07-01-01` is landed: the internal CRUD/read route family now
  exists through `detailPageRoutes.ts` plus `detailPageDocumentService.ts`,
  including stable `contentTypeId` list filtering, canonical slug refresh on
  write, and linked-route delete conflicts.
- `TASK-190-05-03-07-01-02` is landed: dedicated preview token issuance plus
  publish/unpublish/autosave lifecycle routes now reuse the shared preview
  contract and write publish/autosave revisions through the content-domain
  owner seam.
- `TASK-190-05-03-07-01-03` is landed: revision list/restore/discard now route
  through a dedicated revision owner seam, and restore no longer acts as a
  second publish path.

## Sub-Tasks

- `TASK-190-05-03-07-01-01_Detail_Page_CRUD_and_Read_Route_Family.md`
- `TASK-190-05-03-07-01-02_Detail_Page_Preview_Publish_and_Autosave_Lifecycle_Routes.md`
- `TASK-190-05-03-07-01-03_Detail_Page_Revisions_and_Restore_Route_Flow.md`

## Files to Change

- Add `core/server/routes/detailPageRoutes.ts`
- Add `core/server/validation/detailPageSchemas.ts`
- Add `core/services/content/detailPageDocumentService.ts`
- Add `core/services/content/detailPageRevisionService.ts`
- Update `core/services/pages/previewService.ts`
- Update `core/server/routes/index.ts`
- Add `tests/integration/routes/detailPages.test.ts`
- Add `tests/unit/content/detailPageDocumentService.test.ts`

## Responsibility Boundary

- `detailPageRoutes.ts` owns the internal `/admin/api/detail-pages*` route
  family only.
- `detailPageDocumentService.ts` owns machine-readable domain errors and
  persistence orchestration only.
- `previewService.ts` remains the single preview-token storage owner; this leaf
  consumes the `detail-page` preview target introduced by `TASK-190-05-03-04`
  and must not create a second preview-session store.
- Route-link mutations through `setting.content-route.upsert.detailPageId` are
  explicitly deferred to `TASK-190-05-03-07-02`.

## Internal API Contract

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

Rules:

- list/read filtering uses `contentTypeId` as the stable join key,
- preview route issues only `type=detail-page` tokens for editing the template
  itself,
- `sampleEntryId` is stored in `preview_tokens.context`, never trusted from raw
  query params,
- delete fails with a machine-readable conflict while the document is still
  linked from `site.contentRoutes.detailPageId`,
- route handlers stay orchestration-only and map domain errors through
  `mapDetailPageError`.

## Pseudocode

```ts
router.post("/admin/api/detail-pages/:id/preview", async (ctx) => {
  const request = normalizeDetailPagePreviewRequest(ctx.body);
  const detailPage = await detailPageDocumentService.getById(ctx.params.id);
  return previewService.issueDetailPagePreview({
    detailPageId: detailPage.id,
    sampleEntryId: request.sampleEntryId,
  });
});

router.delete("/admin/api/detail-pages/:id", async (ctx) => {
  await detailPageDocumentService.delete(ctx.params.id);
  return { ok: true };
});
```

## Security Contract

- Visibility: internal admin API only (`/admin/api/detail-pages*`).
- Auth model: authenticated admin session / scoped internal API key where
  supported.
- RBAC:
  - read/list/revisions/preview require `content:read`,
  - create/update/delete/autosave/restore/discard require `content:write`,
  - publish/unpublish require `content:publish`.
- CSRF: all mutating routes require existing admin CSRF middleware.
- Rate-limit bucket: `admin_read` for GET, `admin_write` for mutations.
- Reject-unknown validation: route payloads and detail-page documents are
  strict.
- Anti-abuse: no public write endpoint; route handlers must validate
  content-type/document ownership before mutation.
- Secret handling: no preview tokens, CSRF tokens, submissions, or secret-like
  fields leak into response/debug payloads.

## Testing Requirements

- Route registration covers all internal detail-page endpoints.
- `mapDetailPageError` covers known domain errors.
- CRUD/revisions/autosave/publish/unpublish/preview flow works through route
  handlers.
- Preview response returns `token`, `previewUrl`, and `expiresAt` with the
  dedicated `detail-page` target shape.
- Preview stores sample-entry context server-side and does not expose it as an
  untrusted query parameter.
- Delete rejects linked detail pages until the route link is cleared through the
  current route owner seam.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/_TASKS/README.md`
