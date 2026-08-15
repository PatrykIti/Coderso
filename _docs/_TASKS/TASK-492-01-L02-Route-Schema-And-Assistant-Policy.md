# TASK-492-01-L02: Route JSON schema + assistant redaction policy

# FileName: TASK-492-01-L02-Route-Schema-And-Assistant-Policy.md

**Parent Subtask:** TASK-492-01
**Priority:** Medium
**Category:** Settings / Security
**Estimated Effort:** Small
**Dependencies:** TASK-492-01-L01
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** 2026-07-05
**Completed:** `<YYYY-MM-DD>`

## Overview

### Goal
Mirror the client-writable subset of the extended `loginAlerts` contract into the
route-level JSON schema (`securitySettingsSchema`) with strict reject-unknown, and
align the assistant operation policy that already references the new fields so the
codebase is internally consistent.

### Owning module(s) to create-or-extend
- `core/server/validation/settingsSchemas.ts` — extend
  `securitySettingsSchema.properties.loginAlerts.properties` (lines 257-265).
  The route **re-uses** the contract owned by `securitySettings.ts`; the JSON
  schema is the route-boundary reject-unknown gate, not a second source of truth.
- `core/services/assistant/operationPolicy/adminSurfacePolicies.ts` — the
  `settingsLoginAlertsPolicy` (lines ~620-644) already lists `recipients` (field,
  line 636) and `redactedSecrets(["loginAlerts.recipients","loginAlerts.webhookUrl","loginAlerts.deliveryError"])`
  (lines 638-642). Add a `webhookUrl` field descriptor for completeness and add
  `loginAlerts.webhookSecret` to the redacted-secrets list.

### Source-of-truth docs
- `_docs/SECURITY_SPEC.md` (settings validation reject-unknown; redacted browser
  cache + backend-only secrets, lines 177-192; assistant secret denylist, lines
  513-529)
- `_docs/CMS_API.md` (`PATCH /settings/security`, lines 4234-4268)

### Out-of-scope
- The contract types/normalize/encryption (TASK-492-01-L01).
- Delivery and admin UI.

## Security Contract
- **Endpoint visibility:** internal — backs `PATCH /settings/security`
  (`/admin/api/*`, `core/server/routes/settingsRoutes.ts:155`).
- **Auth model / RBAC:** session-based admin; `requirePermission("settings:write")`
  (unchanged).
- **CSRF:** enforced on internal writes by middleware (unchanged).
- **Rate-limit bucket:** `admin_write` (unchanged).
- **Validation schema-owner module + reject-unknown:** `securitySettings.ts`
  owns the contract; `settingsSchemas.ts` enforces reject-unknown at the route
  boundary. Keep `additionalProperties: false` on the `loginAlerts` object so any
  unknown field (including `deliveryError`, which is service-writable only) is
  rejected from client payloads. The JSON schema intentionally **omits**
  `deliveryError`.
- **Anti-abuse for public writes:** N/A (no public write).
- **Secret/PII handling:** `webhookSecret` is accepted as a write-only string in
  the schema (validated as string) but is redacted in responses by the public
  projection (L01) and listed in the assistant `redactedSecrets`. `recipients`
  are typed as an array of strings; assistant policy keeps them redacted.

## Implementation Pseudocode

```jsonc
// settingsSchemas.ts — securitySettingsSchema.properties.loginAlerts
"loginAlerts": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "enabled": { "type": "boolean" },
    "notifyOnNewDevice": { "type": "boolean" },
    "notifyOnNewLocation": { "type": "boolean" },
    "recipients": { "type": "array", "items": { "type": "string" } },
    "webhookUrl": { "type": ["string", "null"] },
    "webhookSecret": { "type": ["string", "null"] }
    // NOTE: deliveryError intentionally absent -> additionalProperties:false rejects it
  }
}
```

```ts
// adminSurfacePolicies.ts — settingsLoginAlertsPolicy
fields: {
  ...,
  recipients: field("recipients", ["recipients","emails","odbiorcy"], "record"), // existing
  webhookUrl: field("webhookUrl", ["webhook","webhook url","webhook endpoint"], "string"), // add
},
secrets: redactedSecrets([
  "loginAlerts.recipients",
  "loginAlerts.webhookUrl",
  "loginAlerts.webhookSecret", // add
  "loginAlerts.deliveryError",
]),
```

- **Data flow:** `validate(securitySettingsSchema, ctx.body)` runs first at the
  route; on pass, the body flows to `setSecuritySettingsPublic` →
  `mergeSecuritySettings` (deep contract validation + normalize from L01).
- **Error handling:** schema rejects shape/unknown-field violations as the
  existing `validation_error`; deep semantic violations surface as
  `security_settings_invalid` (mapped by `withSettingsErrors`; 01-L01 adds the
  missing `security_settings_invalid` -> 400 case to `mapSettingsRouteError` per
  audit M1 — no OTHER new codes). Changelog 1276 pinned by the orchestrator.

### Regression-test shape
```ts
// Vitest: tests/vitest/validation/securitySettingsSchema.test.ts
test("accepts loginAlerts recipients/webhookUrl/webhookSecret", ...);
test("rejects unknown loginAlerts key (e.g. deliveryError or typo)", ...);
// Vitest: tests/vitest/assistant/operation-policy-cms-resources.test.ts
test("login alerts policy redacts recipients/webhookUrl/webhookSecret/deliveryError", ...);
```

## Testing Requirements
- **Lane:** Vitest — pure schema + policy modules with no db/runtime coupling.
  - `tests/vitest/validation/securitySettingsSchema.test.ts`: accept the new
    fields; reject unknown keys (assert `additionalProperties:false` still holds,
    including `deliveryError` being rejected from client input).
  - `tests/vitest/assistant/operation-policy-cms-resources.test.ts`: assert the
    `settingsLoginAlertsPolicy` redacted-secrets list includes
    `loginAlerts.webhookSecret` and the `webhookUrl` field descriptor exists.
- No DB migration artifacts.
