# TASK-190-05-03-03: Detail Page Runtime Renderer and Route Resolution
# FileName: TASK-190-05-03-03_Detail_Page_Runtime_Renderer_and_Route_Resolution.md

**Priority:** High
**Category:** Runtime + Public Pages
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-03-01, TASK-190-05-03-02
**Status:** To Do

---

## Overview

Wire detail page documents into public runtime route resolution. Public detail
routes should render composed detail page blocks when a detail page document is
configured, while preserving the existing legacy entry detail renderer as a
fallback.

The runtime entry point stays the existing content detail flow. This leaf
extends `core/site/renderPublicEntry.tsx` and `core/server/publicSite.tsx`
rather than creating a second parallel route renderer for content detail pages.
Route ownership stays with `site.contentRoutes` plus `detailPageId`; runtime
must not consult a second canonical route definition inside detail page
documents.

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/server/publicSite.tsx`
- Update `core/site/renderPublicEntry.tsx`
- Update `core/site/contentRouteMatcher.ts` only if route match metadata needs
  detail page ids from `site.contentRoutes`.
- Add `core/services/content/detailPageRuntimeResolver.ts` only if extracting
  detail-page-specific runtime resolution out of the current public runtime
  owners improves reuse; otherwise keep the resolution logic inside
  `core/server/publicSite.tsx` / `core/site/renderPublicEntry.tsx`
- Add `tests/integration/runtime/detail-page-runtime.test.tsx`

## Runtime Contract

```text
GET /catalog/:slug
  -> match content route detail
  -> load content type by route.type
  -> load entry by slug/id
  -> if route/detail document exists and entry is renderable:
       resolve detail blocks
       hydrate runtime widgets
       render through the existing content-detail runtime shell/theme flow
     else:
       render current legacy entry detail HTML
```

Public runtime rules:

- public output renders published entries only,
- preview may render draft entry/page data only with valid preview token,
- detail page shell uses the same site CSS/theme/template flow already used by
  `renderPublicEntryDetailHtml`,
- `TASK-190-05-03-07` later wires the validated `detailPageId` settings/client/
  matcher round-trip, but this leaf remains the only runtime owner that
  consumes that route metadata inside `publicSite.tsx` /
  `renderPublicEntry.tsx`,
- detail page render must not import admin UI modules,
- current theme override support for `content detail` templates remains the
  fallback seam when no linked detail document exists,
- unknown widgets render existing runtime fallback/warning behavior.

## Security Contract

- Visibility: public read runtime.
- Auth model: none for published detail pages; preview token for draft preview.
- RBAC: not applicable to public read.
- CSRF: not applicable.
- Rate-limit bucket: `public_read`.
- Reject-unknown validation: runtime consumes normalized detail page documents
  only.
- Anti-abuse: related items are clamped and published-only; no public write.
- Secret handling: resolver blocks secret-like fields before render.

## Testing Requirements

- Published entry detail renders composed detail blocks.
- Draft entry is hidden on public runtime.
- Legacy detail renderer remains fallback when no detail document exists.
- Existing theme-based content-detail template resolution remains intact for the
  fallback path.
- Content route list page behavior remains unchanged.
- Unknown detail document/widget errors produce deterministic fallback or 404,
  not a crash.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
