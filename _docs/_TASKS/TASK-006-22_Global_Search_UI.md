# TASK-006-22: Global Search UI (Visual)
# FileName: TASK-006-22_Global_Search_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-013, TASK-024  
**Status:** To Do

---

## Overview

Create the global search screen with grouped results and filters. Visual-only
layer for the search functionality in TASK-013.

## Reference UI

- `_docs/UI/admin_panel/22-global-search/code.html`
- `_docs/UI/admin_panel/22-global-search/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Search input with recent searches.
- Filters by content type.
- Grouped results (pages, entries, media, users).

## Shadcn Components

- `Input`, `Button`, `Badge`, `Card`, `Separator`, `Tabs`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/search/SearchPage.tsx` | create | main layout |
| `core/admin/ui/search/SearchResults.tsx` | update | align with new design |

## Data + State

- `GET /search` with query + filters.
- Highlight matched terms.

## Unit Tests

- `tests/unit/ui/search-page.test.tsx` renders grouped results.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-global-search-ui.md`
