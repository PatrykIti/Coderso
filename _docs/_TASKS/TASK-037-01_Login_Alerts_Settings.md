# TASK-037-01: Login Alerts Settings
# FileName: TASK-037-01_Login_Alerts_Settings.md

**Priority:** Medium  
**Category:** Admin/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-020  
**Status:** Done

---

## Overview

Persist login alerts config and record alert events when enabled.

## Settings

Extend `security.settings`:
- `loginAlerts.enabled` (boolean)
- `loginAlerts.notifyOnNewDevice` (boolean)
- `loginAlerts.notifyOnNewLocation` (boolean) (v1 uses IP change as proxy)

## Logic

On login (`auth.login`):
- Compare new session `ip` + `userAgent` to last session.
- If changed and alerts enabled → write audit log `auth.login.alert`.
- Email/push notifications deferred to v2.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/settings/securitySettings.ts` | `loginAlerts` section |
| `core/services/auth/sessionService.ts` | helper to detect new device |
| `core/services/audit/auditService.ts` | log alert event |
| `tests/unit/security/securitySettings.test.ts` | defaults + validation |

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` login alerts policy.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-login-alerts-settings.md`
