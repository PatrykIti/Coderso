# TASK-006-19: Webhooks UI (Visual)
# FileName: TASK-006-19_Webhooks_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007, TASK-024  
**Status:** To Do

---

## Overview

Create the “Settings → Webhooks” UI screen with list, create drawer, and
events checklist. This is visual-only until webhook endpoints land.

## Reference UI

- `_docs/UI/admin_panel/19-webhooks/code.html`
- `_docs/UI/admin_panel/19-webhooks/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- Header with “Create webhook”.
- Table of webhooks (url, events, status, last delivery).
- Drawer with event checkboxes, secret, test button.

## Shadcn Components

- `Table`, `Button`, `Input`, `Badge`, `Checkbox`, `Sheet`,
  `Separator`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/WebhooksPage.tsx` | create | main layout |
| `core/admin/ui/settings/WebhooksTable.tsx` | create | table + rows |
| `core/admin/ui/settings/WebhookDrawer.tsx` | create | create/edit |

## Data + State

- `GET /settings/webhooks`
- `POST /settings/webhooks`
- `PATCH /settings/webhooks/:id`
- `DELETE /settings/webhooks/:id`
- `POST /settings/webhooks/:id/test`

## Unit Tests

- `tests/unit/ui/webhooks.test.tsx` renders table + drawer.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-webhooks-ui.md`
