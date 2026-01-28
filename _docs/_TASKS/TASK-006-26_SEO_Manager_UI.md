# TASK-006-26: SEO Manager UI (Visual)
# FileName: TASK-006-26_SEO_Manager_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002, TASK-003, TASK-024  
**Status:** To Do

---

## Overview

Create the SEO manager screen (scores, quick edit drawer). Visual-only layer
until SEO endpoints exist.

## Reference UI

- `_docs/UI/admin_panel/26-seo-manager/code.html`
- `_docs/UI/admin_panel/26-seo-manager/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Filters and search.
- Table with SEO score, title, description, status.
- Drawer for quick edit + SERP preview.

## Shadcn Components

- `Table`, `Button`, `Input`, `Badge`, `Sheet`, `Textarea`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/seo/SeoManagerPage.tsx` | create | main layout |
| `core/admin/ui/seo/SeoTable.tsx` | create | table + rows |
| `core/admin/ui/seo/SeoDrawer.tsx` | create | quick edit |
| `core/admin/app/AdminApp.tsx` | update | route `/admin/seo` |

## Data + State

- `GET /seo/items` (future).
- `PATCH /seo/items/:id` (future).

## Unit Tests

- `tests/unit/ui/seo-manager.test.tsx` renders table + drawer.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-seo-manager-ui.md`
