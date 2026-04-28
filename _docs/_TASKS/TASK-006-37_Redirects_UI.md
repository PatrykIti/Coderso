# TASK-006-37: Redirects UI (Visual)
# FileName: TASK-006-37_Redirects_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Create the redirects management screen with table and create drawer. Visual-only
layer until redirects endpoints exist.

## Reference UI

- `_docs/UI/admin_panel/37-redirects/code.html`
- `_docs/UI/admin_panel/37-redirects/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Header with “Create redirect”.
- Table (from, to, type, status, last hit).
- Drawer for add/edit redirect.

## Shadcn Components

- `Table`, `Button`, `Input`, `Select`, `Badge`, `Sheet`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/redirects/RedirectsPage.tsx` | create | main layout |
| `core/admin/ui/redirects/RedirectsTable.tsx` | create | table |
| `core/admin/ui/redirects/RedirectDrawer.tsx` | create | drawer |

## Data + State

- `GET /redirects`
- `POST /redirects`
- `PATCH /redirects/:id`
- `DELETE /redirects/:id`

## Unit Tests

- `tests/unit/ui/redirects.test.tsx` renders table + drawer.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-redirects-ui.md`
