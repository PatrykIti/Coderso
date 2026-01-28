# TASK-006-38: Security Sessions UI (Visual)
# FileName: TASK-006-38_Security_Sessions_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-020, TASK-024  
**Status:** To Do

---

## Overview

Create the “Security → Sessions” screen with active sessions list and revoke
actions. Visual-only layer until security endpoints exist.

## Reference UI

- `_docs/UI/admin_panel/38-security-sessions/code.html`
- `_docs/UI/admin_panel/38-security-sessions/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- Active sessions table (device, location, last active).
- Revoke actions.

## Shadcn Components

- `Table`, `Button`, `Badge`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/SessionsPage.tsx` | create | main layout |
| `core/admin/ui/settings/SessionsTable.tsx` | create | table |
| `core/admin/ui/settings/SettingsSidebar.tsx` | update | keep security nav |
| `core/admin/app/AdminApp.tsx` | update | route `/admin/settings/security/sessions` |

## Data + State

- `GET /settings/security/sessions`
- `POST /settings/security/sessions/:id/revoke`

## Unit Tests

- `tests/unit/ui/security-sessions.test.tsx` renders table.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-security-sessions-ui.md`
