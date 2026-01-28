# TASK-005-07: Media API Routes
# FileName: TASK-005-07_Media_API_Routes.md

**Priority:** Medium  
**Category:** CMS/Media  
**Estimated Effort:** Medium  
**Dependencies:** TASK-005-06, TASK-004-04, TASK-004-05  
**Status:** To Do  

---

## Overview

Expose REST endpoints for media upload and metadata CRUD. Must use auth + permission checks.

## Endpoints

- `POST /media` (multipart upload)
- `GET /media` (list)
- `PATCH /media/:id` (update meta)
- `DELETE /media/:id` (remove)

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/mediaRoutes.ts` | implement routes | requirePermission `media:*` |
| `core/server/validation/mediaSchemas.ts` | validate patch body | alt/title/caption |
| `core/server/server.ts` | register routes | `registerMediaRoutes` |

## Multipart Handling

Use Bun `request.formData()` and extract the `File`. Reject when missing.

## Tests

- `tests/integration/routes/media.test.ts`
  - upload endpoint exists
  - rejects disallowed MIME

## Documentation Updates Required

- `_docs/CMS_API.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-storage-and-uploads.md`
