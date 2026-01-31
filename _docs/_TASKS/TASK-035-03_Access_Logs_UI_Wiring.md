# TASK-035-03: Access Logs UI Wiring
# FileName: TASK-035-03_Access_Logs_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-035-02, TASK-006-30  
**Status:** Done (2026-01-31)

---

## Overview

Wire Access Logs UI to real API.

## UI Scope

Use:
- `core/admin/ui/security/AccessLogsPage.tsx`
- `core/admin/ui/security/AccessLogDetailsDrawer.tsx`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/accessLogsClient.ts` | list logs |
| `AccessLogsPage.tsx` | load + filters |
| `AccessLogDetailsDrawer.tsx` | bind details |

## Testing Requirements

- `tests/unit/admin/accessLogsClient.test.ts`
- Update `tests/unit/ui/access-logs.test.tsx`

## Documentation Updates Required

- `_docs/CMS_API.md` access logs UI usage.

## Changelog Entry

- `_docs/_CHANGELOG/090-2026-01-31-access-logs-core.md`
