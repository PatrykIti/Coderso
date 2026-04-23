# TASK-201-03-01: Empty State Copy and Upload Recovery CTA
# FileName: TASK-201-03-01_Empty_State_Copy_and_Upload_Recovery_CTA.md

**Priority:** Medium
**Category:** CMS/Media + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-201-03
**Status:** To Do

---

## Overview

Add explicit empty states for Media library filters and search. This closes the
empty `Documents`/`Audio` grid issue from `BUG-3` and gives users a clear upload
or filter-reset path.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaToolbar.tsx` only if reset-filter wiring belongs in
  the toolbar
- add `core/admin/ui/media/MediaEmptyState.tsx` only if it avoids duplication
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/mediaUi/mediaLibrary.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: empty-state CTAs must call existing upload/filter handlers and not
  bypass upload validation.

## Testing Requirements

- Vitest:
  - empty library state,
  - no results for type filter,
  - no results for search query,
  - upload CTA opens the existing file dialog handler,
  - reset CTA clears search/filter without changing cached data.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Documents` and `Audio` filters with no results show an empty state.
2. Search with no results shows a different recovery message.
3. Empty states do not introduce alternate upload paths.
