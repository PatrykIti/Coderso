# TASK-033-02: Sessions UI Wiring
# FileName: TASK-033-02_Sessions_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-033-01, TASK-006-38  
**Status:** Done (2026-01-31)

---

## Overview

Wire Security Sessions UI to real sessions API.

## UI Scope

Use:
- `core/admin/ui/settings/SessionsPage.tsx`

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

## Changelog Entry

- `_docs/_CHANGELOG/088-2026-01-31-sessions-admin.md`
