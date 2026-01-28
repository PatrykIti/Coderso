# TASK-006-34: Integrations UI (Visual)
# FileName: TASK-006-34_Integrations_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007, TASK-024  
**Status:** To Do

---

## Overview

Create the “Settings → Integrations” screen with cards for common services
(GA, Slack, Zapier, Sentry). Visual-only layer until integrations endpoints
exist.

## Reference UI

- `_docs/UI/admin_panel/34-integrations/code.html`
- `_docs/UI/admin_panel/34-integrations/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- Grid of integrations cards with connect buttons.
- Status badges (connected/not connected).

## Shadcn Components

- `Card`, `Button`, `Badge`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/IntegrationsPage.tsx` | create | main layout |
| `core/admin/ui/settings/IntegrationCard.tsx` | create | card |
| `core/admin/ui/settings/SettingsSidebar.tsx` | update | add “Integrations” |
| `core/admin/app/AdminApp.tsx` | update | route `/admin/settings/integrations` |

## Data + State

- `GET /settings/integrations`
- `POST /settings/integrations/:id/connect`

## Unit Tests

- `tests/unit/ui/integrations.test.tsx` renders cards.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-integrations-ui.md`
