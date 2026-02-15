# TASK-020-11-04: Security Settings Model + API Expansion
# FileName: TASK-020-11-04_Security_Settings_Model_and_API_Expansion.md

**Priority:** High  
**Category:** Core/Security + Settings  
**Estimated Effort:** Medium  
**Dependencies:** TASK-020-11-01  
**Status:** Done  

---

## Overview

Extend `security.settings` to support per-bucket rate limits and bot protection configuration. Ensure strict validation and safe defaults.

---

## Goals

1. Add per-bucket limits to the settings schema.
2. Add bot protection config (enabled, provider, keys).
3. Provide safe defaults + runtime validation.

---

## Pseudocode

```ts
security.rateLimit = {
  enabled: true,
  buckets: {
    auth: { windowSeconds: 60, maxRequests: 10 },
    admin_read: { windowSeconds: 60, maxRequests: 600 },
    admin_write: { windowSeconds: 60, maxRequests: 120 },
    public_read: { windowSeconds: 60, maxRequests: 300 },
    public_write: { windowSeconds: 60, maxRequests: 30 },
    assistant: { windowSeconds: 60, maxRequests: 30 }
  }
}
```

---


Add `botProtection`:

```ts
botProtection: {
  enabled: boolean; // default: false
  provider: "recaptcha_v3";
  siteKey: string | null;
  secretKey: string | null; // stored encrypted (required when enabled)
  thresholds: {
    login: number;
    reset: number;
    public_write: number;
  };
  enforceOnLocalhost: boolean; // default: true (dev enforcement)
}
```

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/services/settings/securitySettings.ts` | Add buckets + bot protection fields |
| `core/server/validation/settingsSchemas.ts` | Validate new schema |
| `core/admin/services/settingsClient.ts` | Expose new settings fields |
| `tests/unit/settings/securitySettings.test.ts` | Validate defaults + updates |

---

## Testing Requirements

- `tests/unit/settings/securitySettings.test.ts`
- `tests/unit/security/rateLimit.test.ts`

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/SETTINGS.md`
