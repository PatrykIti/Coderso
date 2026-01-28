# TASK-006-27: Themes UI (Visual)
# FileName: TASK-006-27_Themes_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-008, TASK-024  
**Status:** To Do

---

## Overview

Create the themes list screen with profile cards, preview thumbnails, and
activation actions. Visual-only layer for TASK-008.

## Reference UI

- `_docs/UI/admin_panel/27-themes/code.html`
- `_docs/UI/admin_panel/27-themes/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Active theme card.
- Theme profiles grid with actions (activate, duplicate, edit).
- Filter/search row.

## Shadcn Components

- `Card`, `Button`, `Input`, `Badge`, `DropdownMenu`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/themes/ThemesPage.tsx` | create | main layout |
| `core/admin/ui/themes/ThemeCard.tsx` | create | profile card |
| `core/admin/app/AdminApp.tsx` | update | route `/admin/themes` |

## Data + State

- `GET /themes`
- `POST /themes/:id/activate`
- `POST /themes/:id/duplicate`

## Unit Tests

- `tests/unit/ui/themes.test.tsx` renders grid + actions.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-themes-ui.md`
