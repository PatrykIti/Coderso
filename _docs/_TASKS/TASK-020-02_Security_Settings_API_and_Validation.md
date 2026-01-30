# TASK-020-02: Security Settings API and Validation
# FileName: TASK-020-02_Security_Settings_API_and_Validation.md

**Priority:** High
**Category:** Core/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-020-01, TASK-004-06
**Status:** Done (2026-01-30)

---

## Overview

Expose security settings through admin API endpoints with strict validation and audit logging. This powers the Admin UI configuration.

## Goals

- `GET /settings/security` returns current security config.
- `PATCH /settings/security` updates config (CSRF-protected, RBAC-protected).
- Validation rejects unknown or invalid values.
- Audit log entry on update.

## API Contract

```
GET /admin/api/settings/security
200 { ...SecuritySettings }

PATCH /admin/api/settings/security
Body: Partial<SecuritySettings>
200 { ...SecuritySettings }
400 validation_error
```

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/validation/settingsSchemas.ts` | `securitySettingsSchema` (partial update) |
| `core/server/routes/settingsRoutes.ts` | `GET/PATCH /settings/security` endpoints |
| `core/services/settings/securitySettings.ts` | `getSecuritySettings` + `setSecuritySettings` exports |
| `core/admin/services/settingsClient.ts` | `getSecuritySettings` + `updateSecuritySettings` functions |

### Validation approach

- Use AJV schema with `additionalProperties: false` per object.
- Allow partial updates by making top-level properties optional.
- Normalize headers/origins to lowercase on save (service-level).

### Audit logging

Reuse the existing audit helper used in `settingsRoutes.ts` for storage updates:

- action: `settings.update`
- targetType: `settings`
- targetId: `security`
- metadata: `{ scope: "security" }`

## Testing Requirements

- [ ] `tests/integration/routes/securitySettings.test.ts` returns defaults when empty.
- [ ] `tests/integration/routes/securitySettings.test.ts` rejects invalid payload.
- [ ] `tests/integration/routes/securitySettings.test.ts` updates and persists values.

## Documentation Updates Required

- `_docs/CMS_API.md` add `/settings/security` endpoints and payload example.
- `_docs/SECURITY_SPEC.md` mention admin-configured settings endpoint.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-security-settings-api.md`
