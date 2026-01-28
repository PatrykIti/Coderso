# TASK-006-30: Access Logs UI (Visual)
# FileName: TASK-006-30_Access_Logs_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-019, TASK-024  
**Status:** To Do

---

## Overview

Create the access logs screen (user logins, IP, device) based on the new
design. Visual-only layer for future access log endpoints.

## Reference UI

- `_docs/UI/admin_panel/30-access-logs/code.html`
- `_docs/UI/admin_panel/30-access-logs/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Header with export action.
- Filters (user, date range, status).
- Table with user, IP, device, timestamp, status.

## Shadcn Components

- `Table`, `Button`, `Select`, `Input`, `Badge`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/security/AccessLogsPage.tsx` | create | main layout |
| `core/admin/ui/security/AccessLogsTable.tsx` | create | table |

## Data + State

- `GET /security/access-logs` (future).
- Export action downloads CSV.

## Unit Tests

- `tests/unit/ui/access-logs.test.tsx` renders filters + table.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-access-logs-ui.md`
