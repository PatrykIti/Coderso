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

This leaf must repair the current drawer -> page -> `mediaClient.updateMedia`
contract. Do not add a second save button, a second metadata endpoint, or a
media-only notification host just to show feedback.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
  - owns the async metadata/copy action result passed back to the drawer.
  - must either return a `Promise` from `handleSaveMeta` / `handleCopy` or pass
    an explicit success/failure callback/result shape that lets the drawer show
    truthful feedback.
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
  - owns field-level draft state, saving/saved/failed display, unchanged-blur
    dedupe, and keeping failed edits visible for retry.
- `core/admin/ui/media/types.ts` only if callback result typing is needed
- `core/admin/components/ui/sonner.tsx` for reference only
- `core/admin/app/AdminApp.tsx` only if the shared `Toaster` mount is missing
- `core/services/media/mediaService.ts` if metadata merge semantics need to be
  corrected so partial PATCH updates preserve omitted fields
- `core/server/routes/mediaRoutes.ts` only if route error mapping is added while
  preserving the existing `PATCH /media/:id` contract
- `tests/vitest/ui/media-details.test.tsx`
- `tests/vitest/ui-integration/media.test.tsx`
- add `tests/vitest/mediaUi/media-details-autosave.test.tsx` if the existing
  suites are too shallow for blur/failure state
- `tests/unit/media/mediaService.test.ts` if service-level partial metadata
  merge behavior changes or is clarified

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
  - failed updates must keep the edited draft visible for retry,
  - partial metadata updates must not erase omitted `title`, `alt`, or
    `caption` values.

## Implementation Notes

- `MediaDetailsDrawer` currently calls `onSave(item.id, { title, alt, caption })`
  on blur and receives no result. Feedback must be based on the actual async
  result from the existing update path, not on a local timer alone.
- `MediaLibraryPage` currently starts the update in a fire-and-forget async
  closure. Convert that boundary to a promise/result contract or a named
  callback result; do not create a parallel save service.
- `mediaService.updateMedia` currently owns metadata persistence. If any caller
  sends a partial payload, omitted fields must be preserved there, or the UI
  client must be documented and tested as always sending the complete normalized
  metadata draft.
- Clipboard feedback must be based on `navigator.clipboard.writeText()` success
  or failure. If clipboard is unavailable, the drawer must show the failure or a
  user-safe fallback state rather than silently swallowing it.

## Testing Requirements

- Vitest happy-dom coverage for:
  - blur starts saving state,
  - successful update shows saved inline text or toast,
  - failed update shows retry/failure state,
  - unchanged blur does not spam updates,
  - `Copy URL` swaps to copied state for a bounded timeout or shows toast.
- Bun coverage if service merge semantics are touched:
  - `updateMedia(id, { caption })` preserves existing `title` and `alt`,
  - explicit `null` still clears a field when that is the intended route
    contract.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md` admin UI behavior note
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Metadata blur autosave gives visible saving/saved/failed feedback.
2. Copy URL confirms success and handles clipboard failure.
3. The drawer still saves through the existing media update path.
4. Metadata PATCH behavior is non-destructive for omitted fields or fully
   documented/tested as complete-draft-only.
