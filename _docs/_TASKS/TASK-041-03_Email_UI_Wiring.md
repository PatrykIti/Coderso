# TASK-041-03: Email UI Wiring
# FileName: TASK-041-03_Email_UI_Wiring.md

**Priority:** Medium  
**Category:** Settings/Email  
**Estimated Effort:** Medium  
**Dependencies:** TASK-041-02, TASK-006-31  
**Status:** To Do

---

## Overview

Wire the Email settings screen to the API.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/emailClient.ts` | get/update/test/logs |
| `core/admin/ui/settings/EmailSettingsPage.tsx` | replace mock data |
| `tests/integration/ui/emailSettings.test.tsx` | render + actions |

## Notes

- Show masked password with “Update password” toggle.
- Show delivery logs in modal/list.

## Documentation Updates Required

- `_docs/CMS_API.md` UI wiring note.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-email-ui.md`
