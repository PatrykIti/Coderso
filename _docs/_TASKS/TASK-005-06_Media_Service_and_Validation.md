# TASK-005-06: Media Service + Validation
# FileName: TASK-005-06_Media_Service_and_Validation.md

**Priority:** Medium  
**Category:** CMS/Media  
**Estimated Effort:** Medium  
**Dependencies:** TASK-005-01, TASK-005-02, TASK-005-03  
**Status:** To Do  

---

## Overview

Implement media service for upload/update/delete, with validation for size and MIME type. Persist metadata in DB.

## Validation Rules

- `MAX_UPLOAD_MB` (env, default 20MB)
- MIME whitelist (images, pdf, video?) configured in `MEDIA_SPEC.md`
- reject unknown MIME with `validation_error`

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/media/mediaService.ts` | upload/update/delete | use adapter + DB |
| `core/server/validation/mediaSchemas.ts` | payload validators | update metadata |

## Service API (sketch)

```ts
export async function upload(file: File, userId?: string) {}
export async function updateMeta(id: string, input: { alt?: string; title?: string; caption?: string }) {}
export async function remove(id: string) {}
```

## Tests

- `tests/unit/media/mediaService.test.ts`
  - upload creates DB record
  - reject disallowed mime
  - delete removes adapter + DB row

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/SECURITY_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-storage-and-uploads.md`
