# TASK-006-21: Backups UI (Visual)
# FileName: TASK-006-21_Backups_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-024  
**Status:** To Do

---

## Overview

Create the backups screen with list, actions, and schedule card. Visual-only
until backup endpoints exist.

## Reference UI

- `_docs/UI/admin_panel/21-backups/code.html`
- `_docs/UI/admin_panel/21-backups/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Header with “Create backup”.
- Backups table (size, status, date, actions).
- Schedule card (daily/weekly toggle).

## Shadcn Components

- `Table`, `Button`, `Select`, `Badge`, `Card`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/backups/BackupsPage.tsx` | create | main layout |
| `core/admin/ui/backups/BackupsTable.tsx` | create | list |
| `core/admin/ui/backups/BackupScheduleCard.tsx` | create | schedule |
| `core/admin/app/AdminApp.tsx` | update | route `/admin/backups` |

## Data + State

- `GET /backups`
- `POST /backups`
- `POST /backups/:id/restore`
- `GET /backups/:id/download`

## Unit Tests

- `tests/unit/ui/backups.test.tsx` renders table + schedule.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-backups-ui.md`
