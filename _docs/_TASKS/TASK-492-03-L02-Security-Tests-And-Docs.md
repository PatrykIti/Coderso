# TASK-492-03-L02: Security-gate tests + docs (SECURITY/AUTH/CMS_API)

# FileName: TASK-492-03-L02-Security-Tests-And-Docs.md

**Parent Subtask:** TASK-492-03
**Priority:** Medium
**Category:** Settings / Security
**Estimated Effort:** Small
**Dependencies:** TASK-492-01, TASK-492-02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

## Overview

### Goal
Add the cross-cutting security assertions that the new secret/PII fields never
leak to the client, and update the three source-of-truth docs to describe the now
delivered login alert and its recipient/webhook settings.

### Owning module(s) to create-or-extend
- `tests/security/codersoSecurityGate.test.ts` — extend with assertions that the
  public security-settings projection and the admin redacted cache never expose a
  raw `loginAlerts.webhookSecret`.
- `_docs/SECURITY_SPEC.md`, `_docs/AUTH_SPEC.md`, `_docs/CMS_API.md` — doc updates.

### Source-of-truth docs
- `_docs/SECURITY_SPEC.md` (runtime config `loginAlerts`, line 173; redacted
  browser cache + backend-only secrets, lines 177-192)
- `_docs/AUTH_SPEC.md` (login flow + alert behavior)
- `_docs/CMS_API.md` (`PATCH /settings/security` `loginAlerts`, lines 4262-4266)

### Out-of-scope
- Per-leaf unit/route/UI tests (owned by L01/L02 of subtasks 01–03); this leaf is
  the cross-cutting security gate + documentation.

## Security Contract
- **Endpoint visibility:** validates the existing internal `GET`/`PATCH
  /settings/security` projection (`/admin/api/*`); adds no endpoint.
- **Auth model / RBAC:** asserts the contract, not a new permission.
- **CSRF / rate-limit:** N/A (test + docs).
- **Validation schema-owner module:** confirms `securitySettings.ts` (owner) and
  `settingsSchemas.ts` (route reject-unknown) agree; no new schema.
- **Anti-abuse for public writes:** N/A.
- **Secret/PII handling (the property under test):**
  - `getSecuritySettingsPublic().loginAlerts.webhookSecret` must be
    `{ configured: boolean }`, never the raw/encrypted value.
  - No `loginAlerts.webhookSecret` value may appear in any redacted browser-cache
    payload (`cacheKeys.settingsRedacted`) or debug/log output.
  - `deliveryError` must be a sanitized string (already `redactAuditText`-clamped)
    or `null` — assert it contains no secret-shaped substring in the gate fixture.

## Implementation Pseudocode

```ts
// tests/security/codersoSecurityGate.test.ts (bun:test) — add
test("login alert webhookSecret never leaves backend in cleartext", async () => {
  await setSecuritySettings({
    loginAlerts: { webhookUrl: "https://example.com/hook", webhookSecret: "s3cr3t-value" },
  });
  const pub = await getSecuritySettingsPublic();
  expect(pub.loginAlerts.webhookSecret).toEqual({ configured: true });
  expect(JSON.stringify(pub)).not.toContain("s3cr3t-value");
});
```

```md
<!-- _docs/SECURITY_SPEC.md (line ~173) -->
- loginAlerts (notifyOnNewDevice, notifyOnNewLocation, recipients, webhookUrl,
  webhookSecret [backend-only, exposed as {configured}], deliveryError [read-only])

<!-- note webhookSecret + raw recipients stay out of redacted browser cache -->

<!-- _docs/AUTH_SPEC.md -->
- A new-device / new-location login now emits a notification: email to the account
  owner (+ configured recipients) and an optional HMAC-signed webhook, in addition
  to the auth.login.alert audit record. Delivery is best-effort and never blocks
  the login response; the last failure is stored as security.settings.loginAlerts.deliveryError.

<!-- _docs/CMS_API.md (loginAlerts example, lines 4262-4266) -->
"loginAlerts": {
  "enabled": true,
  "notifyOnNewDevice": true,
  "notifyOnNewLocation": true,
  "recipients": ["security@example.com"],
  "webhookUrl": "https://example.com/login-hook",
  "webhookSecret": "set-once-write-only"   // response returns { "configured": true }
}
// deliveryError is read-only (server-written), not accepted in PATCH input.
```

- **Data flow / error handling:** test-only + docs; no runtime code path changes
  here.
- **No DB migration.**

### Regression-test shape (Bun)
```ts
// tests/security/codersoSecurityGate.test.ts
test("public loginAlerts.webhookSecret is {configured} only", ...);
test("webhookSecret cleartext absent from public projection JSON", ...);
test("deliveryError is null or sanitized string", ...);
```

## Testing Requirements
- **Lane:** Bun — `tests/security/codersoSecurityGate.test.ts` (security gate;
  db-backed via `setSecuritySettings` / `getSecuritySettingsPublic`, gated like
  the existing security/settings tests).
- Docs: update `_docs/SECURITY_SPEC.md`, `_docs/AUTH_SPEC.md`, `_docs/CMS_API.md`
  as above. Do **not** edit `_docs/_TASKS/README.md` or add changelog entries.
- No DB migration artifacts.
