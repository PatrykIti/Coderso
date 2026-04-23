# TASK-201-01-01: Metadata Autosave Status and Copy URL Feedback
# FileName: TASK-201-01-01_Metadata_Autosave_Status_and_Copy_URL_Feedback.md

**Priority:** High
**Category:** CMS/Media + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-201-01
**Status:** To Do

---

## Overview

Add explicit feedback to the existing metadata blur-autosave and copy URL
actions in `MediaDetailsDrawer`. This leaf closes `BUG-1` and `BUG-4` from the
Media Playwright summary without adding a second save contract.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/media/types.ts` only if callback result typing is needed
- `core/admin/components/ui/sonner.tsx` for reference only
- `core/admin/app/AdminApp.tsx` only if the shared `Toaster` mount is missing
- `tests/vitest/ui/media-details.test.tsx`
- `tests/vitest/ui-integration/media.test.tsx`
- add `tests/vitest/mediaUi/media-details-autosave.test.tsx` if the existing
  suites are too shallow for blur/failure state

## Security Contract

- Visibility: internal admin details drawer only.
- Auth model: unchanged admin session/API-key path.
- RBAC: existing `media:write` through `PATCH /media/:id`.
- CSRF: unchanged via `mediaClient.updateMedia`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: unchanged update schema.
- Anti-abuse:
  - error copy is user-safe and does not leak storage internals,
  - repeated blur events should dedupe unchanged payloads where practical,
  - failed updates must keep the edited draft visible for retry.

## Testing Requirements

- Vitest happy-dom coverage for:
  - blur starts saving state,
  - successful update shows saved inline text or toast,
  - failed update shows retry/failure state,
  - unchanged blur does not spam updates,
  - `Copy URL` swaps to copied state for a bounded timeout or shows toast.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md` admin UI behavior note
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Metadata blur autosave gives visible saving/saved/failed feedback.
2. Copy URL confirms success and handles clipboard failure.
3. The drawer still saves through the existing media update path.
