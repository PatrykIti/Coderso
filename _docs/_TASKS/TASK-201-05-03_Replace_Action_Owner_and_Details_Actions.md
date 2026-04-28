# TASK-201-05-03: Replace Action Owner and Details Actions
# FileName: TASK-201-05-03_Replace_Action_Owner_and_Details_Actions.md

**Priority:** Medium
**Category:** CMS/Media + Admin/API + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-201-05, TASK-201-02-01
**Status:** Done (2026-04-23)

---

## Overview

Make the existing `Replace` details action honest. The Playwright report treats
Replace as a useful positive flow, but the checked-out details drawer renders a
visible `Replace` button without an action owner. This leaf must either implement
same-id binary replacement through the current media owner chain or render the
affordance as unavailable and record an explicit open state during closure. The
preferred product contract is a real same-id replacement that keeps existing
references intact.

## Sub-Tasks

No child task files.

## Scope

- Wire the details `Replace` action through
  `MediaDetailsDrawer -> MediaLibraryPage -> mediaClient -> mediaRoutes ->
  mediaService`.
- Reuse the existing upload validation, storage adapter, metadata response
  shape, media cache invalidation, and cache-bus behavior.
- Preserve the media row id so page/post/entry/commerce references do not need
  rewrites.
- Update the row's key, URL, MIME type, size, original filename, and dimensions
  when the replacement lands.
- Surface replacing/success/failure feedback in the drawer without adding a
  media-only notification host.
- If same-id replacement is deliberately deferred, remove clickable styling and
  closure must mark the source report positive as open instead of claiming it is
  preserved.

Out of scope:

- media version history,
- rollback snapshots,
- batch replace,
- public replace endpoints,
- changing the storage driver interface unless current `put`/`delete` cannot
  safely satisfy the flow.

## Files to Change

- `core/admin/ui/media/MediaDetailsDrawer.tsx`
  - owns the visible action state and file-picker/replace feedback.
- `core/admin/ui/media/MediaLibraryPage.tsx`
  - owns selected item update, async result handling, and cache-safe refresh.
- `core/admin/services/mediaClient.ts`
  - owns the replace admin API wrapper, cache update, and `cacheBus` broadcast.
- `core/server/routes/mediaRoutes.ts`
  - owns internal route registration, permission checks, CSRF path, validation,
    and mapping media-domain errors to `ApiError` through the route-owned media
    mapper. Do not rely only on the existing global HTTP server fallback or add
    per-handler ad-hoc translations.
- `core/server/validation/mediaSchemas.ts`
  - owns strict replace payload validation if a new route payload is added.
- `core/services/media/mediaService.ts`
  - owns same-id replace semantics, upload validation reuse, dimension
    extraction reuse, storage update/delete ordering, and returned row shape.
- `core/services/media/storage/adapter.ts` only if the current `put`/`delete`
  contract cannot safely support replacement.
- `tests/vitest/ui/media-details.test.tsx`
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/unit/media/mediaService.test.ts`
- `tests/integration/routes/media.test.ts`

## Security Contract

- Visibility: internal admin endpoint only, for example
  `POST /media/:id/replace` under `/admin/api`.
- Auth model: authenticated admin session / admin API key where the admin stack
  already supports it.
- RBAC: `media:write`.
- CSRF: required for the mutating replace request.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation:
  - multipart/body accepts the replacement `file` only, plus any explicitly
    documented metadata fields if the final contract needs them,
  - malformed id/file payloads map to machine-readable `media_*` API errors.
- Anti-abuse:
  - replacement uses the same size and MIME allowlist as upload,
  - old storage object is deleted only after the replacement write and row update
    path can be completed safely,
  - failure states must not expose raw storage paths, signed URLs, or backend
    credentials,
  - internal delivery mode must remain protected after URL/key replacement.

## Testing Requirements

- Bun:
  - service replacement preserves the media id,
  - replacement updates key, URL, original name, MIME type, size, and dimensions,
  - non-image replacements clear image dimensions when appropriate,
  - disallowed MIME/oversized files fail through existing upload validation,
  - missing media maps to `media_not_found`,
  - route registration, permission, CSRF, validation, and route-owned mapped
    `ApiError` coverage for the replace endpoint.
- Vitest:
  - details drawer opens the replace file input and shows replacing/success/error
    states,
  - media client sends the correct multipart request with CSRF,
  - cache and selected item update after successful replacement,
  - the button is not left clickable when the action is unavailable.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The visible Replace action is either real and tested or explicitly
   unavailable with source-report open-state documentation.
2. The preferred same-id replacement path preserves references while updating
   the media binary contract.
3. Replacement reuses existing upload/storage/cache/security owners and does not
   introduce a duplicate upload flow.
