# TASK-006-23: Media Details UI (Visual)
# FileName: TASK-006-23_Media_Details_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-012, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Create the media details drawer UI (preview, metadata, usage) based on the new
design. Visual-only layer for TASK-012.

## Reference UI

- `_docs/UI/admin_panel/23-media-details/code.html`
- `_docs/UI/admin_panel/23-media-details/screen.png`

## UI Composition

**Wrapper:** `AdminShell` (drawer)

**Sections:**
- Preview panel with file info.
- Editable metadata fields (alt, title, caption).
- File details (size, mime, dimensions).
- Usage list.

## Shadcn Components

- `Sheet`, `Button`, `Input`, `Textarea`, `Badge`, `Separator`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/media/MediaDetailsDrawer.tsx` | create | drawer |
| `core/admin/ui/media/MediaLibraryPage.tsx` | update | trigger drawer |

## Data + State

- `GET /media/:id`
- `PATCH /media/:id`
- `DELETE /media/:id`

## Unit Tests

- `tests/unit/ui/media-details.test.tsx` renders drawer.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-details-ui.md`
