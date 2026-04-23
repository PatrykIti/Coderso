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

## Files to Change

- `core/services/media/mediaService.ts`
- `core/services/media/storage/adapter.ts` only if the existing `get(key)` read
  contract needs a bounded helper for backfill
- `core/server/routes/mediaRoutes.ts` only if a manual/internal backfill route
  is added
- `core/server/validation/mediaSchemas.ts` only if a new route payload exists
- `core/admin/services/mediaClient.ts`
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/media/MediaDetailsPanel.tsx`
- `tests/unit/media/mediaService.test.ts`
- `tests/integration/routes/media.test.ts` if a route is added
- `tests/vitest/ui/media-details.test.tsx`
- `tests/vitest/ui/media-details-panel.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`

## Security Contract

- Visibility: internal admin/service recovery only.
- Auth model: admin session/API key if exposed through a route.
- RBAC: `media:read` for viewing, `media:write` if recovery persists updates.
- CSRF: required for any mutating route.
- Rate-limit bucket: `admin_write` for backfill mutation.
- Reject-unknown validation: any route payload must be strict.
- Anti-abuse:
  - recovery should be bounded to the selected asset or a small controlled
    batch,
  - storage read failures must surface as recoverable errors,
  - no raw storage path or credentials in browser errors.

## Testing Requirements

- Bun:
  - backfill updates missing dimensions for an existing image row,
  - backfill is a no-op when dimensions already exist,
  - route contract test if exposed through `mediaRoutes`.
- Vitest:
  - details renders `width x height px`,
  - missing image dimensions show truthful `Unknown`/pending copy instead of a
    meaningless dash,
  - non-image file info remains readable.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md` if route behavior is added
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Existing image assets can recover dimensions without manual DB edits.
2. Details UI clearly distinguishes known, unknown, and non-image dimensions.
3. Backfill does not weaken media route auth, CSRF, or validation.
