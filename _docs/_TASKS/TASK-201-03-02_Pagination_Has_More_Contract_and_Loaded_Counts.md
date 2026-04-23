# TASK-201-03-02: Pagination Has-More Contract and Loaded Counts
# FileName: TASK-201-03-02_Pagination_Has_More_Contract_and_Loaded_Counts.md

**Priority:** Medium
**Category:** CMS/Media + Admin/UI + API
**Estimated Effort:** Medium
**Dependencies:** TASK-201-03
**Status:** Done (2026-04-23)

---

## Overview

Make `Load More Assets` depend on real list state. The current button is always
visible and can be clicked after all files are already shown. This leaf either
uses existing full-list data to hide it or adds a strict paginated read contract
when the implementation needs server-side paging.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/services/mediaClient.ts`
- `core/server/routes/mediaRoutes.ts` if server-side pagination is added
- `core/server/validation/mediaSchemas.ts` if query validation is added
- `core/services/media/mediaService.ts` if list pagination moves into service
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/integration/routes/media.test.ts` if route response/query changes
- `tests/unit/media/mediaService.test.ts` if service pagination changes

## Security Contract

- Visibility: internal admin `GET /media` list contract.
- Auth model: unchanged.
- RBAC: `media:read`.
- CSRF: not applicable for read.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation:
  - if `limit`/`cursor`/`offset` are added, clamp limits and reject unknown or
    malformed params through a schema/helper.
- Anti-abuse:
  - list limits must be deterministic and bounded,
  - no client loop that can repeatedly fetch the same page forever,
  - cache entries must include enough data to avoid mixing paginated and
    full-list shapes.

## Testing Requirements

- Vitest:
  - button hidden for fully loaded lists,
  - button disabled/loading while fetching the next page,
  - loaded-count text remains correct after filter/search,
  - media cache invalidation clears stale pagination state.
- Bun if API changes:
  - `GET /media` validates pagination params,
  - `hasMore` and total/next cursor are deterministic,
  - unauthorized access still fails via existing route middleware,
  - malformed pagination and media-list domain errors map through the media
    route/API error boundary instead of leaking raw error responses.

## Documentation Updates Required

- `_docs/CMS_API.md` if the response shape changes
- `_docs/ADMIN_CACHE.md` if media cache shape changes
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Load More Assets` is visible only when more assets can be loaded.
2. Clicking it either loads a new page or is not possible.
3. Loaded counts do not drift after uploads, deletes, metadata updates, or
   filter/search changes.
