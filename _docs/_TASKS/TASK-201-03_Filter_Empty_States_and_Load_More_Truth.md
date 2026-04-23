# TASK-201-03: Filter Empty States and Load More Truth
# FileName: TASK-201-03_Filter_Empty_States_and_Load_More_Truth.md

**Priority:** High
**Category:** CMS/Media + Admin/UI + Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-201
**Status:** To Do

---

## Overview

Make the Media library list state truthful. The current UI renders an empty
area for filters with no matching files and always shows `Load More Assets`,
even when all assets are already loaded. This wave adds explicit empty states
and a real loaded-count/has-more contract.

## Sub-Tasks

- `TASK-201-03-01_Empty_State_Copy_and_Upload_Recovery_CTA.md`
- `TASK-201-03-02_Pagination_Has_More_Contract_and_Loaded_Counts.md`
- `TASK-201-03-03_Grid_List_View_Mode_Parity.md`

## Scope

- Render distinct empty states for no assets, no filtered type results, and no
  search results.
- Hide `Load More Assets` when there is nothing to load.
- Add loaded-count copy such as `Showing 7 of 7` when useful.
- Make the existing grid/list toolbar state change the actual rendered media
  layout while preserving the same filtered item set.
- Preserve cached list hydration and background revalidation behavior.
- Add pagination metadata only if the current API/client cannot represent
  `hasMore` from available data.

Out of scope:

- infinite scrolling,
- virtualized grid/list rendering,
- a broad media search backend rewrite,
- changing storage adapters.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaToolbar.tsx`
- `core/admin/ui/media/MediaGrid.tsx`
- `core/admin/ui/media/MediaCard.tsx` if list/card variants are needed
- `core/admin/services/mediaClient.ts`
- `core/server/routes/mediaRoutes.ts` only if list pagination metadata is added
- `core/server/validation/mediaSchemas.ts` only if query validation is added
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/mediaUi/mediaLibrary.test.tsx`
- `tests/vitest/ui-integration/media.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/integration/routes/media.test.ts` if route response/query changes

## Security Contract

- Visibility: internal admin list UI and `GET /media`.
- Auth model: unchanged admin session/API-key path.
- RBAC: `media:read`.
- CSRF: not applicable for reads; unchanged for upload/delete mutations.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: if query params are added, unknown params must be
  rejected or ignored through an explicit schema contract.
- Anti-abuse:
  - pagination limits must be clamped,
  - search/filter inputs must remain bounded and not leak raw DB errors,
  - no forced refetch loops on mount or filter changes.

## Testing Requirements

- Vitest:
  - empty library state,
  - empty type filter state for Documents/Audio,
  - empty search state,
  - load-more hidden when all loaded,
  - load-more visible only when `hasMore` is true,
  - grid/list switching renders distinct usable views from the same filtered
    assets,
  - cache hydration still skips blocking loading state.
- Bun:
  - route/client pagination tests if the API contract changes.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md` if list query/response changes
- `_docs/ADMIN_CACHE.md` only if cache semantics change
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Empty filters/searches show useful recovery copy and upload CTA.
2. `Load More Assets` is not rendered when there are no more assets.
3. Media list caching remains consistent after upload, metadata update, and
   delete.
4. Grid/list switching is a real presentation change, not toolbar-only state.
