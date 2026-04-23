# TASK-201-03-03: Grid List View Mode Parity
# FileName: TASK-201-03-03_Grid_List_View_Mode_Parity.md

**Priority:** Medium
**Category:** CMS/Media + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-201-03
**Status:** Done (2026-04-23)

---

## Overview

Make the Media toolbar's grid/list switch real through the existing media
library owner path. The Playwright report lists grid/list switching as a
positive flow, but the checked-out code keeps `view` in `MediaLibraryPage` while
`MediaGrid` renders only the grid layout. This leaf preserves that positive by
fixing the current components instead of adding a parallel media browser.

## Sub-Tasks

No child task files.

## Scope

- Pass the existing `view` state from `MediaLibraryPage` into the shared media
  presentation component.
- Render distinct usable grid and list layouts from the same filtered item set.
- Keep search, filter, selected details asset, load-more state, and cache
  hydration unchanged.
- Keep `MediaPicker` behavior stable; picker can keep the default grid layout
  unless a caller explicitly opts into list mode later.

Out of scope:

- virtualized rendering,
- a second media-list data model,
- new media list endpoints,
- changing picker selection semantics.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
  - owns `view` state and passes it to the shared presenter.
- `core/admin/ui/media/MediaGrid.tsx`
  - owns grid/list presentation variants from the same `items` and selection
    props.
- `core/admin/ui/media/MediaCard.tsx`
  - may receive a `variant` prop if card/list row rendering stays simpler there.
- `core/admin/ui/media/MediaToolbar.tsx`
  - reference only unless accessibility labels for view buttons need tightening.
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/ui/media-card.test.tsx` if card variants change
- `tests/vitest/ui/media-picker.test.tsx`
- `tests/vitest/ui-integration/media.test.tsx`

## Security Contract

- Visibility: internal admin Media UI only.
- Auth model: unchanged.
- RBAC: unchanged `media:read`.
- CSRF: not applicable.
- Rate-limit bucket: unchanged `admin_read`.
- Reject-unknown validation: unchanged because no API payload changes.
- Anti-abuse:
  - view changes must not trigger repeated refetch loops,
  - list rows must not expose storage credentials or signed secret query data,
  - selection state must stay bounded to the loaded visible asset set.

## Testing Requirements

- Vitest:
  - switching the toolbar to list view renders a layout distinguishable from the
    grid view,
  - switching back to grid keeps the same filtered item set,
  - search/filter state survives view changes,
  - selected item/details drawer state remains coherent across view changes,
  - `MediaPicker` still renders and selects with its existing default grid path.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The grid/list toolbar control changes the actual media presentation.
2. Grid/list switching reuses the existing filtered/cached media state.
3. No duplicate media browser, cache path, or picker selection model is added.
