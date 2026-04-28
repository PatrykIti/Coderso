# TASK-006-14: API Keys UI (Visual)
# FileName: TASK-006-14_API_Keys_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007, TASK-020, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Create the “Settings → API Keys” visual screen based on the new HTML. This is
the UI layer only; API wiring will be handled when security settings endpoints
are implemented.

## Reference UI

- `_docs/UI/admin_panel/14-api-keys/code.html`
- `_docs/UI/admin_panel/14-api-keys/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- Header with title + “Create key” CTA.
- Keys table (name, scope, created, last used, status).
- Row actions (copy, rotate, revoke).
- Create key modal with scopes checklist.

## Shadcn Components

- `Table`, `Button`, `Input`, `Badge`, `DropdownMenu`, `Dialog`,
  `Checkbox`, `Separator`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/ApiKeysPage.tsx` | create | main layout |
| `core/admin/ui/settings/ApiKeysTable.tsx` | create | table + rows |
| `core/admin/ui/settings/ApiKeyDialog.tsx` | create | create key modal |

## Data + State

- `GET /settings/api-keys` (list)
- `POST /settings/api-keys` (create)
- `POST /settings/api-keys/:id/rotate`
- `DELETE /settings/api-keys/:id`

Use mock data until endpoints exist (TASK-020+).

## Unit Tests

- `tests/unit/ui/api-keys.test.tsx` renders table + modal.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-api-keys-ui.md`
