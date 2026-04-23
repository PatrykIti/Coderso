# TASK-201-02-02: Legacy Dimension Backfill and Details Rendering
# FileName: TASK-201-02-02_Legacy_Dimension_Backfill_and_Details_Rendering.md

**Priority:** Medium
**Category:** CMS/Media + Admin/UI + Domain/Service
**Estimated Effort:** Medium
**Dependencies:** TASK-201-02-01
**Status:** To Do

---

## Overview

Repair the user-visible dimension gap for existing image rows and make the
details UI render dimension state truthfully. This leaf covers the current QA
case where an uploaded PNG opens in a browser with known dimensions but the
Media details panel still shows a dash.

## Sub-Tasks

No child task files.

## Scope

- Reuse the parser and persistence contract from `TASK-201-02-01`; do not add a
  second dimension parser or UI-only image probing path.
- Add a deterministic selected-asset recovery trigger for image rows that have
  missing `width` / `height` when the details drawer opens or refreshes.
- Prefer a narrow internal admin mutation such as `POST /media/:id/dimensions/recover`
  if dimensions must be persisted. Do not make `GET /media/:id` perform hidden
  writes.
- Keep the trigger owned by `MediaLibraryPage` / `mediaClient` orchestration and
  the recovery itself owned by `mediaService`; `MediaDetailsDrawer` should render
  loading/success/failure state from that owner path instead of reading image
  pixels itself.
- Do not move recovery or rendering responsibility into `MediaDetailsPanel`.
  That component is a secondary/test-covered surface in the current tree; align
  it through the same helpers only if it remains supported.
- Update the selected item and media list cache from the recovered media row so
  the drawer, grid/list, and picker see one consistent record shape.
- If selected-asset recovery cannot be implemented safely in this leaf, document
  the exact blocker and leave the source report item open; do not close `BUG-2`
  with truthful-copy-only rendering.

## Files to Change

- `core/services/media/mediaService.ts`
- `core/services/media/storage/adapter.ts` only if the existing `get(key)` read
  contract needs a bounded helper for backfill
- `core/server/routes/mediaRoutes.ts` if selected-asset recovery is exposed
  through an internal admin mutation
- `core/server/validation/mediaSchemas.ts` if a recovery route payload/query
  exists
- `core/admin/services/mediaClient.ts`
- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/media/MediaDetailsPanel.tsx` only if kept as a supported
  secondary surface; otherwise remove the stale component/tests in the same
  cleanup.
- `tests/unit/media/mediaService.test.ts`
- `tests/integration/routes/media.test.ts` if a recovery route is added
- `tests/vitest/ui/media-details.test.tsx`
- `tests/vitest/ui/media-details-panel.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`

## Security Contract

- Visibility: internal admin/service recovery only.
- Auth model: admin session/API key if exposed through a route.
- RBAC: `media:read` for viewing, `media:write` for any persisted recovery.
- CSRF: required for any mutating route.
- Rate-limit bucket: `admin_write` for backfill mutation.
- Reject-unknown validation: any route payload must be strict.
- Anti-abuse:
  - recovery should be bounded to the selected asset or a small controlled
    batch,
  - recovery must not hide a write behind a read-only endpoint,
  - storage read failures must surface as recoverable errors,
  - no raw storage path or credentials in browser errors.

## Testing Requirements

- Bun:
  - backfill updates missing dimensions for an existing image row,
  - backfill is a no-op when dimensions already exist,
  - selected-asset recovery reuses the `TASK-201-02-01` parser and persists the
    returned dimensions,
  - route contract test if exposed through `mediaRoutes`,
  - any backfill route maps validation/not-found/storage failures through the
    media route/API error boundary instead of raw error responses.
- Vitest:
  - opening or refreshing details for an image with missing dimensions starts the
    single owner recovery request,
  - successful recovery updates the selected item and cached media record,
  - recovery failure leaves metadata editing usable and shows user-safe copy,
  - details renders `width x height px`,
  - missing image dimensions show truthful `Unknown`/pending copy instead of a
    meaningless dash,
  - non-image file info remains readable.
  - `MediaDetailsPanel` assertions are required only while that component
    remains a supported export; otherwise closure must prove it was retired
    cleanly and no caller imports it.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md` if route behavior is added
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Existing image assets can recover dimensions without manual DB edits.
2. The selected-asset recovery trigger is explicit, tested, and owned by the
   existing page/client/service path.
3. Details UI clearly distinguishes known, pending/recoverable, unknown, and
   non-image dimensions.
4. Backfill does not weaken media route auth, CSRF, read/write semantics, or
   validation.
