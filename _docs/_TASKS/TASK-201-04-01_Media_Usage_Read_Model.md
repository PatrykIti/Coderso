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

## Sub-Tasks

No child task files.

## Files to Change

- add `core/services/media/mediaUsageService.ts`
- `core/services/media/mediaService.ts` only if usage is exported from the media
  domain module
- `core/server/routes/mediaRoutes.ts`
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

## Testing Requirements

- Bun:
  - finds page/content-entry/post/commerce references that store direct media
    IDs,
  - ignores partial string false positives where possible,
  - returns stable ordering,
  - handles no usage,
  - route registration includes the usage endpoint and permission middleware.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/MEDIA_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. A media id returns bounded usage summaries from real current owners.
2. The route is internal, authenticated, and read-only.
3. No raw content payloads are exposed.
