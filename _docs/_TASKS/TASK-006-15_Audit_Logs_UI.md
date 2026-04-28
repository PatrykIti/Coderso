# TASK-006-15: Audit Logs UI (Visual)
# FileName: TASK-006-15_Audit_Logs_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-014, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Upgrade the audit logs screen to match the new UI (filters, expanded details,
JSON preview drawer). Functional data is already covered by TASK-014.

## Reference UI

- `_docs/UI/admin_panel/15-ui-audit-logs/code.html`
- `_docs/UI/admin_panel/15-ui-audit-logs/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- Header with filters: date range, event type, severity, search.
- Main table with columns: event, actor, resource, IP, timestamp, status.
- Row action opens right drawer with details + JSON preview.

## Shadcn Components

- `Table`, `Button`, `Input`, `Select`, `Badge`, `DropdownMenu`,
  `Sheet`, `Separator`, `ScrollArea`, `Textarea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/audit/AuditList.tsx` | update | new layout |
| `core/admin/ui/audit/AuditFilters.tsx` | create | filter row |
| `core/admin/ui/audit/AuditTable.tsx` | create | table + rows |
| `core/admin/ui/audit/AuditDetailsDrawer.tsx` | create | JSON preview |

## Data + State

- `GET /audit` with filters (date range, severity, type, query).
- Selecting row loads event details (client-side from list for now).

## Unit Tests

- `tests/unit/ui/audit-list.test.tsx` updated for new layout.
- `tests/unit/ui/audit-details.test.tsx` renders drawer + JSON preview.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-audit-logs-ui.md`
