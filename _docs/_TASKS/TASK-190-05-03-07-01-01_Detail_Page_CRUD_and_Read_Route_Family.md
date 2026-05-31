# TASK-190-05-03-07-01-01: Detail Page CRUD and Read Route Family
# FileName: TASK-190-05-03-07-01-01_Detail_Page_CRUD_and_Read_Route_Family.md

**Priority:** High
**Category:** CMS/Admin API + Detail Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-01
**Status:** Done (2026-05-08)

---

## Overview

Implement the internal list/detail/create/update/delete route family for detail
pages plus the document-service boundary those routes consume.

Current slice note:
- `detailPageRoutes.ts` now registers the internal list/detail/create/update/
  delete endpoints behind the existing `content:read` / `content:write`
  permission seams.
- `detailPageDocumentService.ts` now owns list/read/create/update/delete
  persistence orchestration, UUID generation for manual create, canonical
  `contentTypeSlug` refresh on write, and linked-route delete conflicts through
  `detail_page_route_conflict`.
- `detailPageSchemas.ts` now validates the stable `contentTypeId` list filter
  plus strict top-level create/update envelopes, while document normalization
  remains owned by the content-domain detail-page schema/service seam.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/server/routes/detailPageRoutes.ts`
- Add `core/server/validation/detailPageSchemas.ts`
- Add `core/services/content/detailPageDocumentService.ts`
- Update `core/server/routes/index.ts`
- Add `tests/integration/routes/detailPages.test.ts`
- Add `tests/unit/content/detailPageDocumentService.test.ts`

## Contract

- list/read filtering uses `contentTypeId` as the stable join key,
- delete returns a machine-readable conflict while the document is still linked
  from `site.contentRoutes.detailPageId`,
- route handlers stay orchestration-only and map document errors through
  `mapDetailPageError`.

## Pseudocode

```ts
router.patch("/admin/api/detail-pages/:id", async (ctx) => {
  const payload = normalizeDetailPageUpdate(ctx.body);
  return detailPageDocumentService.update(ctx.params.id, payload);
});

router.delete("/admin/api/detail-pages/:id", async (ctx) => {
  await detailPageDocumentService.delete(ctx.params.id);
  return { ok: true };
});
```

## Security Contract

- Visibility: internal admin API only.
- Auth model: authenticated admin session / scoped internal API key where supported.
- RBAC:
  - read/list require `content:read`,
  - create/update/delete require `content:write`.
- CSRF: all mutating routes require existing admin CSRF middleware.
- Rate-limit bucket: `admin_read` / `admin_write`.
- Reject-unknown validation: route payloads and documents are strict.
- Anti-abuse: no public write endpoint and no out-of-band route-link mutation.
- Secret handling: no preview tokens or secret-like fields leak into responses.

## Testing Requirements

- route registration covers list/detail/create/update/delete endpoints,
- `mapDetailPageError` covers document not found/conflict/invalid cases,
- delete rejects linked detail pages until the route link is cleared.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`

## Progress Notes

- 2026-05-11: Follow-up drift pass aligned the route validation envelope with
  the content-domain `DetailPageDocument.related` owner field. The route schema
  now accepts `related` and keeps legacy/mistyped `relatedSources` rejected as
  an unknown document field before service normalization.
