# TASK-020-01: Security Settings Model and Defaults
# FileName: TASK-020-01_Security_Settings_Model_and_Defaults.md

**Priority:** High
**Category:** Core/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-007-01, TASK-004-02
**Status:** Done (2026-01-30)

---

## Overview

Create the security settings model stored in DB (no envs except critical secrets), with safe defaults and validation-ready shape. This is the backbone for all middleware toggles and thresholds.

## Goals

- Store security configuration in the `settings` table under `security.*` keys (no secrets).
- Provide a typed API for `getSecuritySettings()` and `setSecuritySettings()`.
- Make updates effective at runtime (cache + reset).

## Data Model (proposed)

Use a dedicated service similar to `storageSettings.ts`, storing values in `settings` table with a single JSON payload under `security.settings`.

```ts
export type SecuritySettings = {
  requestId: {
    enabled: boolean;
    headerName: string; // default: "x-request-id"
  };
  csrf: {
    enabled: boolean;
    headerName: string; // default: "x-csrf-token"
    tokenTtlMinutes: number; // default: 30
  };
  cors: {
    allowedOrigins: string[]; // default: [] (same-origin only)
    allowCredentials: boolean; // default: true
    allowedMethods: string[]; // default: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"]
    allowedHeaders: string[]; // default: ["content-type","x-csrf-token"]
    maxAgeSeconds: number; // default: 600
  };
  rateLimit: {
    enabled: boolean; // default: true
    admin: { windowSeconds: number; maxRequests: number }; // default: 60s/120
    auth: { windowSeconds: number; maxRequests: number }; // default: 60s/20
  };
  headers: {
    enabled: boolean; // default: true
    frameOptions: "DENY" | "SAMEORIGIN"; // default: "DENY"
    contentTypeOptions: boolean; // default: true
    referrerPolicy: string; // default: "no-referrer"
    permissionsPolicy: string | null; // default: null
    csp: string | null; // default: null (admin only; avoid breaking dev)
    hsts: string | null; // default: null (enable in prod)
  };
  validation: {
    rejectUnknownFields: boolean; // default: true
  };
};
```

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/settings/securitySettings.ts` | Types, defaults, cached load, update merge, validation helpers |
| `core/db/schema.ts` | No schema changes (reuse `settings` table) |

### Service behavior

- Use `settings.key = "security.settings"` and store the full JSON object.
- Merge DB value into defaults (deep merge) on read.
- `setSecuritySettings(update)` merges partial updates into existing settings, validates, stores.
- Add `resetSecuritySettingsCache()` for runtime updates.

### Validation rules (service-level)

- Strings must be non-empty; header names lower-cased.
- Arrays must contain only strings; normalize to lowercase + trimmed.
- Numbers must be finite and > 0.
- If `cors.allowedOrigins` includes `*`, force `allowCredentials=false`.

## Testing Requirements

- [ ] `tests/unit/security/securitySettings.test.ts` defaults are applied when no DB row exists.
- [ ] `tests/unit/security/securitySettings.test.ts` invalid values throw `security_settings_invalid`.
- [ ] `tests/unit/security/securitySettings.test.ts` partial updates merge correctly.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` add config structure + defaults.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-security-settings-model.md`

## Additional Docs

- `_docs/ARCHITECTURE.md` (security runtime config).
