# TASK-036-03: IP Allowlist UI Wiring
# FileName: TASK-036-03_IP_Allowlist_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-036-02, TASK-006-36  
**Status:** To Do

---

## Overview

Wire IP Allowlist UI to the real API.

## UI Scope

Use:
- `core/admin/ui/settings/IpAllowlistTable.tsx`
- `core/admin/ui/settings/SecuritySettingsPage.tsx` (section already exists)

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/ipAllowlistClient.ts` | list/add/remove |
| `IpAllowlistTable.tsx` | bind list + actions |

## Testing Requirements

- `tests/unit/admin/ipAllowlistClient.test.ts`
- Update `tests/unit/ui/ip-allowlist.test.tsx`

## Documentation Updates Required

- `_docs/CMS_API.md` mention allowlist UI usage.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-ip-allowlist-ui-wiring.md`
