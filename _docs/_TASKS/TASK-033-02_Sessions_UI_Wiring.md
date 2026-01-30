# TASK-033-02: Sessions UI Wiring
# FileName: TASK-033-02_Sessions_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-033-01, TASK-006-38  
**Status:** To Do

---

## Overview

Wire Security Sessions UI to real sessions API.

## UI Scope

Use:
- `core/admin/ui/security/SessionsPage.tsx`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/sessionsClient.ts` | list + revoke |
| `SessionsPage.tsx` | bind list + revoke actions |

## Testing Requirements

- `tests/unit/admin/sessionsClient.test.ts`
- Update `tests/unit/ui/security-sessions.test.tsx`

## Documentation Updates Required

- `_docs/CMS_API.md` mention sessions list usage.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-sessions-ui-wiring.md`
