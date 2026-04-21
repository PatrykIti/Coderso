# TASK-190-05-03-04: Detail Page Preview, Cache, and Invalidation
# FileName: TASK-190-05-03-04_Detail_Page_Preview_Cache_and_Invalidation.md

**Priority:** High
**Category:** Runtime + Preview + Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-03
**Status:** To Do

---

## Overview

Extend preview and cache behavior for composed detail pages. Detail page documents
must preview safely and invalidate public cache when related entries or detail
documents change.

This leaf owns the `detail-page` preview target and query-string contract.
Later route/API leaves, including `/admin/api/detail-pages/:id/preview`, must
reuse this contract instead of introducing a parallel preview target shape.

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/server/publicSite.tsx`
- Update `core/services/pages/previewService.ts`
- Update `core/server/utils/previewUrls.ts` if detail preview needs additional
  query metadata.
- Update `core/site/cache/siteCache.ts`
- Update entry/page/detail document services for invalidation hooks.
- Add `tests/integration/runtime/detail-page-preview-cache.test.tsx`

## Preview Contract

Detail pages have two distinct preview modes.

### Detail Template Preview

Use a dedicated preview target for editing the detail template itself:

```text
/preview?type=detail-page&token=<token>&device=desktop
```

Rules:

- `token` targets `detail_page_documents.id`.
- preview issuance stores `sampleEntryId` in preview-token metadata or a linked
  preview session row; runtime must not trust an arbitrary sample entry id from
  query params.
- Runtime renders `current_document`, not `published_document`.
- The sample entry must be published by default.
- If previewing against a draft entry is needed, use content preview mode with a
  valid content preview token instead of trusting raw sample-entry query input.
- `device` is optional and uses the existing `desktop|tablet|mobile` contract.

### Entry Detail Preview

Use the existing content preview target for previewing a specific entry:

```text
/preview?type=content&token=<entry-token>&detailPageId=<detail-page-id>&device=desktop
```

Rules:

- `token` targets the content entry or post.
- Runtime resolves the entry draft allowed by the token.
- `detailPageId` is optional; when omitted, runtime uses the active published
  detail document for the entry content type.
- Runtime never trusts arbitrary route/detail document ids from query params
  without validating the token target and content type relationship.

Preview must:

- use current/draft entry data only through valid preview token,
- render the same detail document pipeline as public runtime,
- pass `device=desktop|tablet|mobile` into block visibility logic,
- return `410` for expired token and `404` for disabled preview/missing target.

Implementation notes:

- Update `previewService` target types to include `detail-page`.
- Extend preview token storage/validation so detail-page preview can carry the
  server-issued sample entry context instead of relying on raw query params.
- Update `previewUrls` builders for detail-template preview URLs.
- Update `_docs/PREVIEW_SPEC.md` and `_docs/CMS_API.md`.
- Do not log preview tokens or sample entry data in diagnostics.

## Cache Contract

Invalidation triggers:

- entry publish/unpublish/update/delete,
- content route update,
- detail page document update,
- form referenced by detail page update,
- listing/query/template changes used by related sections.

Pseudocode:

```ts
export async function invalidateDetailPageCacheForEntry(entry) {
  const routes = await getContentRoutesForType(entry.typeSlug);
  for (const route of routes) {
    invalidateSiteCachePath(resolveDetailPath(route.detailPath, entry));
  }
}
```

## Security Contract

- Visibility: public read preview/cache behavior.
- Auth model: preview token only for draft preview.
- RBAC: no public write.
- CSRF: not applicable.
- Rate-limit bucket: `public_read`.
- Reject-unknown validation: preview query is strict.
- Anti-abuse: cache keys derive from normalized safe paths only.
- Secret handling: preview/cache diagnostics cannot log tokens or secret fields.

## Testing Requirements

- Valid content preview token renders composed detail page draft.
- Valid detail-page preview token renders `current_document` with a selected
  published sample entry from server-issued preview context.
- Detail-page preview with a draft sample entry and no content preview token
  returns `404`.
- Entry preview with `detailPageId` verifies the detail page belongs to the
  entry content type.
- Expired token returns `410`.
- Preview disabled returns `404`.
- Public cache invalidates when entry/detail document changes.
- Query params bypass cache where current public page runtime expects that.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
