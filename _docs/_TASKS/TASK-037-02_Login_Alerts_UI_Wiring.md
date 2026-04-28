# TASK-037-02: Login Alerts UI Wiring
# FileName: TASK-037-02_Login_Alerts_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-037-01, TASK-006-41  
**Status:** Done

---

## Overview

Wire Login Alerts UI to security settings.

## UI Scope

Use:
- `core/admin/ui/settings/LoginAlertsPage.tsx`
- `core/admin/ui/settings/SecuritySettingsPage.tsx` (if alerts shown there too)

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/settingsClient.ts` | extend types for loginAlerts |
| `LoginAlertsPage.tsx` | load + save settings |

## Testing Requirements

- Update `tests/unit/ui/login-alerts.test.tsx`
- Update `tests/unit/security/securitySettings.test.ts` for new defaults.

## Documentation Updates Required

- `_docs/CMS_API.md` login alerts settings payload.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-login-alerts-ui-wiring.md`
