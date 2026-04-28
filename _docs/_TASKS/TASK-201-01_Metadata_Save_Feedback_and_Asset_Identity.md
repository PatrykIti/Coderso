# TASK-201-01: Metadata Save Feedback and Asset Identity
# FileName: TASK-201-01_Metadata_Save_Feedback_and_Asset_Identity.md

**Priority:** High
**Category:** CMS/Media + Admin/UI + UX + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-201
**Status:** Done (2026-04-23)

---

## Overview

Repair the trust and readability issues in the Media details surface. The
Playwright report confirms that metadata autosave works, but users get no
confirmation after blur and no feedback after copying a URL. The same surface
also promotes UUID-like storage filenames over user-facing asset names and does
not warn when image alt text is missing.

## Sub-Tasks

- `TASK-201-01-01_Metadata_Autosave_Status_and_Copy_URL_Feedback.md`
- `TASK-201-01-02_Human_Readable_Naming_and_Missing_Alt_Signals.md`

## Scope

- Add visible saved/saving/failed feedback for metadata blur autosave.
- Add copied/failed feedback for `Copy URL`.
- Prefer `title`, then `originalName`, then storage filename for card/header
  display.
- Default title for new uploads from the original filename when no explicit
  title is supplied.
- Treat `Original File Name` as read-only identity in this family. It may be
  displayed as supporting technical metadata, but the editable rename surface is
  `title`.
- Mark image assets with missing alt text in the details drawer and, if
  practical, on cards.

Out of scope:

- changing the media metadata schema beyond existing `title`, `alt`, and
  `caption`,
- adding AI-generated alt text,
- changing runtime asset URLs or storage keys,
- adding editable `originalName` / original-file rename semantics,
- adding media folders/tags.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/media/MediaCard.tsx`
- `core/admin/ui/media/types.ts`
- `core/admin/ui/media/utils.ts`
- `core/admin/services/mediaClient.ts`
- `core/services/media/mediaService.ts`
- `tests/vitest/ui/media-details.test.tsx`
- `tests/vitest/ui/media-card.test.tsx`
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/ui-integration/media.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/unit/media/mediaService.test.ts` if upload title defaulting moves to
  the service contract

## Security Contract

- Visibility: internal admin Media UI and existing `/admin/api/media*` metadata
  routes only.
- Auth model: unchanged admin session/API-key path.
- RBAC: `media:read` for display, `media:write` for metadata updates.
- CSRF: unchanged for `PATCH /media/:id` and uploads.
- Rate-limit bucket: existing `admin_write` for mutation.
- Reject-unknown validation: unchanged `mediaUpdateSchema` unless title
  defaulting requires an explicit upload schema note.
- Anti-abuse:
  - feedback must not expose raw storage errors beyond user-safe copy,
  - display names must not expose backend-only storage credentials,
  - missing-alt warnings must not block non-image assets.

## Testing Requirements

- Vitest:
  - metadata blur shows saving/saved/failed states and calls `updateMedia`,
  - copy URL shows `Copied` state and failure fallback,
  - cards/details render title/original filename before UUID-like storage names,
  - `Original File Name` remains read-only while `title` owns user-facing rename
    behavior,
  - image assets without alt show an accessibility warning,
  - `MediaPicker` keeps its current selected-grid semantics.
- Bun:
  - run `tests/unit/media/mediaService.test.ts` if title defaulting is
    implemented server-side.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md` if upload/default title behavior becomes part of the
  server contract
- `_docs/PLAYWRIGHT/SUMMARY-MEDIA.md` during closure
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Metadata autosave no longer feels silent; success and error states are
   visible and deterministic.
2. `Copy URL` confirms success or reports failure without leaving users guessing.
3. Cards and details display readable names while preserving storage IDs as
   technical metadata only.
4. Missing alt text is visible for images and does not produce false warnings
   for documents/audio.
