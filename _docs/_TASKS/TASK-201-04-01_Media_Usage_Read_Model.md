# TASK-201-04-01: Media Usage Read Model
# FileName: TASK-201-04-01_Media_Usage_Read_Model.md

**Priority:** High
**Category:** CMS/Media + Domain/Service + API
**Estimated Effort:** Medium
**Dependencies:** TASK-201-04
**Status:** To Do

---

## Overview

Create the server/service contract for answering "where is this media asset
used?" The read model must be bounded, permission-protected, and based on the
current DB/schema seams instead of hard-coded UI fixtures.

This leaf owns read-only usage discovery only. It must not introduce an
inverted reference index, a write-side media-reference pipeline, or new content
ownership unless bounded scans over the current persisted owners are proven
insufficient.

## Sub-Tasks

No child task files.

## Files to Change

- add `core/services/media/mediaUsageService.ts`
  - owns bounded usage summary discovery and reference normalization.
- `core/services/media/mediaService.ts` only if usage is exported from the media
  domain module
- `core/server/routes/mediaRoutes.ts`
  - owns internal read route registration, permission checks, strict query
    validation, and known media-domain error mapping through the media route/API
    error boundary.
- `core/server/validation/mediaSchemas.ts` only if query params are added
- `tests/unit/media/mediaUsageService.test.ts`
- `tests/integration/routes/media.test.ts`

## Security Contract

- Visibility: internal admin read endpoint only.
- Auth model: admin session/API key.
- RBAC: `media:read`; if usage spans content families, enforce/read through the
  same read permissions those summaries already require.
- CSRF: not applicable for read-only endpoint.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation:
  - media id path param must be valid and bounded,
  - optional limits must be clamped,
  - unknown query params must be rejected or normalized explicitly.
- Anti-abuse:
  - result count capped per family,
  - summaries exclude raw JSON payloads and secret settings,
  - malformed JSON references do not crash the endpoint.

## Current Reference Owners

The implementation must start from these existing owners and document any
unsupported shape as an explicit open state instead of inventing a new storage
model:

- Pages:
  - scan `pages.currentData` and `pages.publishedData` for known widget/page
    media references,
  - include page/layout media references that the current code stores as
    `background.media.assetId` or equivalent widget/module `assetId` fields,
  - return page title, id/slug, context such as draft/published data, and a
    resolvable admin destination when available.
- Content entries:
  - scan `contentEntries.data`,
  - include the owning content type slug/id needed by admin entry routes,
  - handle single media fields and multi-media arrays that match the existing
    content field contract from `_docs/MEDIA_SPEC.md`,
  - handle current media candidate object shapes used by existing resolvers and
    editors, including `{ id: "<media-id>" }`, `{ assetId: "<media-id>" }`, and
    URL objects that also carry an exact media id.
- Posts:
  - include direct `posts.featuredMediaId`,
  - scan post block documents for `attrs.mediaId`,
  - scan sanitized rich text image references such as `data-media-id` where the
    current post editor/runtime already owns that contract.
- Commerce:
  - include `commerceProducts.mediaIds`,
  - do not claim collection ownership unless a current collection field stores
    media ids.

Avoid broad substring-only matches. Normalize exact ids from known shapes first;
if a fallback text walk is needed, it must be bounded, tested against partial
string false positives, and documented as compatibility support.

Owner note:

- `mediaUsageService` owns discovery and normalization of supported persisted
  shapes. UI drawers, search helpers, and admin navigation must consume its
  summaries instead of re-scanning JSON or duplicating reference parsing.
- If a persisted owner stores a media reference shape that is not covered here,
  document the unsupported shape in this leaf or the closure report before
  adding a new scanner path.

## Testing Requirements

- Bun:
  - finds page references in `currentData` and `publishedData`,
  - finds content-entry media fields in single and multi-value shapes,
  - finds exact object-shaped references such as `{ id }` and `{ assetId }`
    without matching arbitrary unrelated `id` fields,
  - finds page/widget layout references stored as `assetId`,
  - finds post `featuredMediaId`, block `attrs.mediaId`, and rich-text
    `data-media-id` references,
  - finds commerce product `mediaIds` references,
  - ignores partial string false positives where possible,
  - returns stable ordering,
  - handles no usage,
  - handles malformed page/entry/post JSON safely,
  - caps each family result set,
  - route registration includes the usage endpoint and permission middleware,
  - not-found, malformed query, and unexpected usage-service errors map to
    machine-readable API errors instead of leaking raw error responses.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/MEDIA_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. A media id returns bounded usage summaries from real current owners.
2. The route is internal, authenticated, and read-only.
3. No raw content payloads are exposed.
