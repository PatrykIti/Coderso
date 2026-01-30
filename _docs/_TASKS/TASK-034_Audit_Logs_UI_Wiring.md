# TASK-034: Audit Logs UI Wiring
# FileName: TASK-034_Audit_Logs_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-024, TASK-006-15  
**Status:** To Do

---

## Overview

Wire Audit Logs UI to `/audit` endpoint.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/auditClient.ts` | list audit logs |
| `core/admin/ui/audit/AuditLogsPage.tsx` | load + filter |
| `core/admin/ui/audit/AuditDetailsDrawer.tsx` | bind data |

### UX notes

- Support limit + simple filter by action (client-side v1).

## Testing Requirements

- `tests/unit/admin/auditClient.test.ts`
- Update `tests/unit/ui/audit-list.test.tsx`

## Documentation Updates Required

- `_docs/CMS_API.md` note audit logs list usage.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-audit-logs-ui-wiring.md`
