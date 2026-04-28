# TASK-201-02: Image Dimensions and File Information
# FileName: TASK-201-02_Image_Dimensions_and_File_Information.md

**Priority:** High
**Category:** CMS/Media + Domain/Service + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-201
**Status:** Done (2026-04-23)

---

## Overview

Fix the Media details `Dimensions` field at the source contract. The database
already has `media.width` and `media.height`, and the UI already tries to render
them, but uploads do not populate those fields and existing images can remain
blank. This wave makes dimensions deterministic for new image uploads and
provides a bounded recovery path for existing rows.

## Sub-Tasks

- `TASK-201-02-01_Image_Dimension_Extraction_and_Persistence.md`
- `TASK-201-02-02_Legacy_Dimension_Backfill_and_Details_Rendering.md`

## Scope

- Extract image dimensions for supported image formats during upload.
- Persist `width` and `height` through the existing media table columns.
- Add a bounded selected-asset service path for recovering dimensions on
  existing image rows when details are opened/refreshed.
- Render dimensions as `415 x 66 px` consistently.
- Distinguish `Unknown` image dimensions from non-image assets where useful.
- Treat `MediaDetailsDrawer` as the primary details surface. If
  `MediaDetailsPanel` is still exported after this wave, align it through the
  same shared dimension/display helpers; otherwise retire the component and its
  tests deliberately instead of maintaining a second details contract.

Out of scope:

- adding a heavyweight image processing pipeline unless the implementation
  proves the current stack cannot parse required dimensions safely,
- changing the storage adapter interface for write paths unless needed for
  legacy backfill reads,
- hidden DB writes from read-only media endpoints,
- client-only image probing that bypasses the service/domain dimension contract,
- storing EXIF or rich media metadata,
- introducing public dimension mutation endpoints.

## Files to Change

- `core/services/media/mediaService.ts`
- add `core/services/media/imageDimensions.ts`
- `core/services/media/storage/adapter.ts` only if the backfill contract needs
  a refined read helper
- `core/server/routes/mediaRoutes.ts` only if selected-asset recovery gets an
  explicit internal admin mutation
- `core/server/validation/mediaSchemas.ts` only if a new route payload exists
- `core/admin/services/mediaClient.ts`
- `core/admin/ui/media/MediaLibraryPage.tsx` if details-open recovery is wired
  through the page owner
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/media/MediaDetailsPanel.tsx` only if it remains exported; align
  it through the same helpers as the drawer or remove the stale secondary path
  with its tests.
- `core/admin/ui/media/utils.ts`
- `tests/unit/media/mediaService.test.ts`
- add `tests/unit/media/imageDimensions.test.ts`
- `tests/integration/routes/media.test.ts` if a route contract changes
- `tests/vitest/ui/media-details.test.tsx`
- `tests/vitest/ui/media-details-panel.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`

## Security Contract

- Visibility: internal admin/service media contract only.
- Auth model: unchanged admin session/API-key path for any admin backfill route.
- RBAC: `media:read` for detail reads; `media:write` for any persisted
  backfill/update.
- CSRF: required for any mutating backfill endpoint.
- Rate-limit bucket: `admin_read` for detail/list reads, `admin_write` for any
  persisted dimension repair.
- Reject-unknown validation: any new route payload must use
  `additionalProperties: false`.
- Anti-abuse:
  - parse only bounded file headers; do not load arbitrary unbounded content
    into memory for legacy backfill,
  - selected-asset recovery must not hide persisted writes behind read-only
    endpoints,
  - do not expose storage credentials in errors,
  - unknown/unsupported image formats should fail closed to `null`
    dimensions, not crash list/detail reads.

## Testing Requirements

- Bun:
  - image dimension parser fixtures for PNG and at least one common lossy image
    format supported by the implementation,
  - `uploadMedia` persists dimensions for images and leaves non-images null,
  - legacy selected-asset recovery updates only missing dimensions and handles
    missing storage objects safely,
  - route wiring, permission, validation, and mapped API error tests if a new
    admin endpoint is added.
- Vitest:
  - details drawer/panel renders dimensions with `px`,
  - details-open recovery calls the single client owner and updates the selected
    cached record,
  - unknown dimensions use truthful copy,
  - media client preserves width/height cache updates.
  - if `MediaDetailsPanel` is retired, replace panel-specific assertions with
    coverage proving the remaining drawer/helper path owns dimension rendering.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md` if response/backfill route behavior is documented
- `_docs/DATA_MODEL.md` only if stored field semantics change
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. New image uploads persist dimensions in `media.width` and `media.height`.
2. Existing image rows can recover dimensions through a bounded selected-asset
   internal path with an explicit trigger.
3. Details UI displays dimensions accurately and no longer shows a dead dash for
   supported images with recoverable metadata.
