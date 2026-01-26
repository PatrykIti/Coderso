# TASK-006-05: Plugin Store UI
# FileName: TASK-006-05_Plugin_Store_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-017, TASK-018, TASK-024
**Status:** To Do

---

## Overview

Implement the plugin store UI: search + filters, grid of plugin cards, and a
modal with security analysis details.

## Reference UI

- `_docs/UI/admin_panel/5-plugin-store/code.html`
- `_docs/UI/admin_panel/5-plugin-store/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Search + filter chips.
- Plugin card grid with status badges.
- Details modal with tabs (overview, security, changelog).

## Shadcn Components

- `Card`, `Badge`, `Button`, `Dialog`, `Tabs`, `Progress`, `Input`,
  `Separator`, `Tooltip`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/store/PluginStorePage.tsx` | create | screen layout |
| `core/admin/ui/store/PluginFilters.tsx` | create | search + chips |
| `core/admin/ui/store/PluginCard.tsx` | create | grid card |
| `core/admin/ui/store/PluginDetailsDialog.tsx` | create | modal |
| `core/admin/ui/layouts/AdminShell.tsx` | use | wrapper |

## Data + State

- `GET /store/plugins` for listings.
- `POST /store/plugins/:id/install` for install action.
- `GET /store/plugins/:id` for details + analysis.

## Unit Tests

- `tests/unit/ui/plugin-store.test.tsx` renders grid + modal.
- `tests/unit/ui/plugin-card.test.tsx` renders status badge.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-plugin-store-ui.md`

