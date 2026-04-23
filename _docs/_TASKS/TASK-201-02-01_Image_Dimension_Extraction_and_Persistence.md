# TASK-201-02-01: Image Dimension Extraction and Persistence
# FileName: TASK-201-02-01_Image_Dimension_Extraction_and_Persistence.md

**Priority:** High
**Category:** CMS/Media + Domain/Service
**Estimated Effort:** Medium
**Dependencies:** TASK-201-02
**Status:** To Do

---

## Overview

Populate `media.width` and `media.height` when images are uploaded. This should
be owned by the media service/domain layer so every admin upload path receives
the same result.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/media/mediaService.ts`
- add `core/services/media/imageDimensions.ts`
- `tests/unit/media/mediaService.test.ts`
- add `tests/unit/media/imageDimensions.test.ts`

## Security Contract

- Visibility: service-side upload contract behind internal admin upload route.
- Auth/RBAC/CSRF/rate-limit: unchanged because uploads still go through
  `POST /media`.
- Reject-unknown validation: unchanged upload schema.
- Anti-abuse:
  - parser reads bounded headers/buffers only,
  - unsupported/corrupt images return null dimensions without bypassing MIME
    validation,
  - no dependency may execute external binaries or shell commands.

## Testing Requirements

- Bun:
  - parser returns dimensions for supported fixtures,
  - parser returns null for unsupported/corrupt/non-image buffers,
  - `uploadMedia` persists dimensions for images,
  - `uploadMedia` leaves dimensions null for documents/audio.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Uploading an image stores `width` and `height`.
2. Uploading a non-image keeps dimensions empty.
3. Dimension extraction failures do not fail otherwise valid uploads unless the
   file itself violates existing upload rules.
