# TASK-089-03: Access Logs UI Wiring
# FileName: TASK-089-03_Access_Logs_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-089-02, TASK-006-30  
**Status:** To Do

---

## Overview

Wire Access Logs UI to real API.

## UI Scope

Use:
- `core/admin/ui/access-logs/AccessLogsPage.tsx`
- `core/admin/ui/access-logs/AccessLogDetailsDrawer.tsx`

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

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-access-logs-ui-wiring.md`
