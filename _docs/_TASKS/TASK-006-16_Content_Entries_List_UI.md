# TASK-006-16: Content Entries List UI (Visual)
# FileName: TASK-006-16_Content_Entries_List_UI.md

**Priority:** High  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-011, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Refine the content entries list view (dynamic content types) to match the new
design with left sidebar, filters, and row actions. This is the visual layer
for the entries list handled in TASK-011.

## Reference UI

- `_docs/UI/admin_panel/16-content-entries/code.html`
- `_docs/UI/admin_panel/16-content-entries/screen.png`

## UI Composition

**Wrapper:** `SplitShell` (left sidebar + main)

**Sections:**
- Left sidebar: content types list + search.
- Header with create button.
- Filters row (type/status/author).
- Table/grid of entries with status badges and row actions.

## Shadcn Components

- `Button`, `Input`, `Select`, `Badge`, `Table`, `DropdownMenu`,
  `Separator`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/entries/EntryList.tsx` | update | main layout |
| `core/admin/ui/entries/EntryFilters.tsx` | create | filters row |
| `core/admin/ui/entries/EntryTable.tsx` | create | table + rows |
| `core/admin/ui/entries/EntryTypeSidebar.tsx` | create | left list |
| `core/admin/ui/layouts/SplitShell.tsx` | use | wrapper |

## Data + State

- `GET /content-types` for sidebar.
- `GET /content-entries` with filters.
- Row actions: edit, duplicate, delete.

## Unit Tests

- `tests/unit/ui/content-entries.test.tsx` renders list + sidebar.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-entries-ui.md`
