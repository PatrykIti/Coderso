# TASK-006-29: Widget Library UI (Visual)
# FileName: TASK-006-29_Widget_Library_UI.md

**Priority:** High  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-009, TASK-024  
**Status:** To Do

---

## Overview

Create the widget library screen with categories, search, and preview cards.
Visual-only layer for TASK-009.

## Reference UI

- `_docs/UI/admin_panel/29-widget-library/code.html`
- `_docs/UI/admin_panel/29-widget-library/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Left sidebar with categories.
- Search + filters.
- Grid of widget cards with insert/favorite actions.

## Shadcn Components

- `Button`, `Input`, `Badge`, `Card`, `ScrollArea`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/widgets/WidgetLibraryPage.tsx` | create | main layout |
| `core/admin/ui/widgets/WidgetCard.tsx` | create | widget preview |
| `core/admin/app/AdminApp.tsx` | update | route `/admin/widgets` |

## Data + State

- `GET /widgets`
- `POST /widgets/:id/favorite`

## Unit Tests

- `tests/unit/ui/widget-library.test.tsx` renders grid + sidebar.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-library-ui.md`
