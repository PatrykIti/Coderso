# TASK-006-03: Media Library UI (Visual)
# FileName: TASK-006-03_Media_Library_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-005, TASK-024
**Status:** Done (2026-01-26)

---

## Overview

Implement the media library UI with a grid/list toggle, search/filter toolbar,
and a details sidebar.

## Reference UI

- `_docs/UI/admin_panel/3-media-library/code.html`
- `_docs/UI/admin_panel/3-media-library/screen.png`

## UI Composition

**Wrapper:** `SplitShell`

**Sections:**
- Header with title + upload action.
- Toolbar (search, filter chips, view toggle).
- Grid of media cards (image, doc, audio variants).
- Details sidebar with metadata + edit fields + actions.

## Shadcn Components

- `Button`, `Input`, `Tabs`/`ToggleGroup`, `Card`, `Badge`, `Textarea`,
  `DropdownMenu`, `ScrollArea`, `Separator`, `Dialog` (for delete confirm).

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/media/MediaLibraryPage.tsx` | create | screen layout |
| `core/admin/ui/media/MediaToolbar.tsx` | create | search + filters |
| `core/admin/ui/media/MediaGrid.tsx` | create | grid/list view |
| `core/admin/ui/media/MediaCard.tsx` | create | item card |
| `core/admin/ui/media/MediaDetailsPanel.tsx` | create | right panel |
| `core/admin/ui/layouts/SplitShell.tsx` | use | wrapper |

## Data + State

- `GET /media` for items and pagination.
- `POST /media` for uploads.
- `PATCH /media/:id` for metadata updates.
- `DELETE /media/:id` for removals.

## Unit Tests

- `tests/unit/ui/media-library.test.tsx` renders toolbar + grid.
- `tests/unit/ui/media-card.test.tsx` renders file type badges.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-library-ui.md`
