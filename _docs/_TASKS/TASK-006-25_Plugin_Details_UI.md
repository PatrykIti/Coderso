# TASK-006-25: Plugin Details UI (Visual)
# FileName: TASK-006-25_Plugin_Details_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-015, TASK-018, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Create the plugin details screen with tabs (overview, permissions, changelog,
settings). Visual-only layer for plugin management.

## Reference UI

- `_docs/UI/admin_panel/25-plugin-details/code.html`
- `_docs/UI/admin_panel/25-plugin-details/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Header with plugin name, version, status badge.
- Tabs: Overview, Permissions, Changelog, Settings.
- Permissions list and changelog timeline.

## Shadcn Components

- `Tabs`, `Badge`, `Button`, `Card`, `Separator`, `ScrollArea`, `Table`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/store/PluginDetailsPage.tsx` | create | main layout |
| `core/admin/ui/store/PluginDetailsTabs.tsx` | create | tabs |

## Data + State

- `GET /store/plugins/:id`
- `PATCH /store/plugins/:id`

## Unit Tests

- `tests/unit/ui/plugin-details.test.tsx` renders tabs + details.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-plugin-details-ui.md`
