# TASK-005-04: S3 Storage Adapter
# FileName: TASK-005-04_S3_Storage_Adapter.md

**Priority:** Medium  
**Category:** CMS/Media  
**Estimated Effort:** Medium  
**Dependencies:** TASK-005-02  
**Status:** To Do  

---

## Overview

Implement AWS S3 storage adapter using AWS SDK v3.

## Documentation Check (Required)

Before implementation, query MCP docs for `@aws-sdk/client-s3` and confirm:
- `PutObjectCommand` usage
- `DeleteObjectCommand` usage
- credential + region configuration
- presigned URLs (if needed)

## Environment Variables

- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_ENDPOINT` (optional, for S3‑compatible)
- `MEDIA_BASE_URL` (optional CDN)

## Behavior

- `put(file)` uploads object with content-type
- `delete(key)` removes object
- `getPublicUrl(key)` uses `MEDIA_BASE_URL` if present; otherwise uses bucket URL

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/media/storage/s3.ts` | implement adapter | use AWS SDK v3 |

## Tests

- Mock S3 client in unit tests.
- Verify `PutObjectCommand` + `DeleteObjectCommand` called with expected params.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-storage-and-uploads.md`
