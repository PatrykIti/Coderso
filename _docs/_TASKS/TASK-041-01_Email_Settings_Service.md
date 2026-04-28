# TASK-041-01: Email Settings Service
# FileName: TASK-041-01_Email_Settings_Service.md

**Priority:** Medium  
**Category:** Settings/Email  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007-01  
**Status:** Done (2026-01-31)

---

## Overview

Implement storage + delivery helpers for email settings.

## Service API

Create `core/services/email/emailSettingsService.ts`:
- `getEmailSettings()`
- `updateEmailSettings(input)` (encrypt secrets)
- `sendTestEmail(to)`
- `listDeliveryLogs()`

Create `core/services/email/emailProvider.ts`:
- `createTransport(settings)`
- `sendMail(message)`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/email/emailSettingsService.ts` | config + test send |
| `core/services/email/emailProvider.ts` | SMTP provider |
| `core/db/schema.ts` | `email_delivery_logs` table |
| `tests/unit/email/emailSettingsService.test.ts` | update + test |

## Notes

- Use settings storage for SMTP host/port/user; encrypt password.
- `email_delivery_logs` stores last 50 deliveries.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` secret encryption.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-email-service.md`
