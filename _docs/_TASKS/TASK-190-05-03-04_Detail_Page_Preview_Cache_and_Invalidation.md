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

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/server/publicSite.tsx`
- Update `core/server/utils/previewUrls.ts` if detail preview needs additional
  query metadata.
- Update `core/site/cache/siteCache.ts`
- Update entry/page/detail document services for invalidation hooks.
- Add `tests/integration/runtime/detail-page-preview-cache.test.tsx`

## Preview Contract

Options:

- Prefer existing `/preview?type=content&token=...` for entry preview when the
  target is an entry and a detail page document exists.
- If a separate target is needed, add a strict target type only after updating
  `previewService`, `previewUrls`, and docs.

Preview must:

- use current/draft entry data only through valid preview token,
- render the same detail document pipeline as public runtime,
- pass `device=desktop|tablet|mobile` into block visibility logic,
- return `410` for expired token and `404` for disabled preview/missing target.

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
- Expired token returns `410`.
- Preview disabled returns `404`.
- Public cache invalidates when entry/detail document changes.
- Query params bypass cache where current public page runtime expects that.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
