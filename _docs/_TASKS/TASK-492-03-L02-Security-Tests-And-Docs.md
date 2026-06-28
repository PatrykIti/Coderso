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
  raw `loginAlerts.webhookSecret`. **This file is fully static today** (it imports
  only pure functions + `SECURITY_SETTINGS_DEFAULTS`; no db). Because
  `getSecuritySettingsPublic` / `setSecuritySettings`
  (`core/services/settings/securitySettings.ts:693,698`) are **db-backed**, any
  round-trip added here MUST self-gate with the repo `testIfDb` pattern — replicate
  `const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());`
  `const testIfDb = hasDb ? test : test.skip;` from
  `tests/unit/security/securitySettings.test.ts` so the block `test.skip`s without a
  DB and does not break the static gate. Note the canonical encrypted-storage
  round-trip ("webhookSecret stored encrypted; public exposes only `{configured}`")
  is already owned, `testIfDb`-gated, by **TASK-492-01-L01** in that same
  `securitySettings.test.ts`; keep this gate-file assertion a focused leak guard,
  not a duplicate of the contract test.
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
// The gate file is static today; this round-trip is db-backed, so self-gate it with
// the repo testIfDb pattern (mirror tests/unit/security/securitySettings.test.ts):
//   const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
//   const testIfDb = hasDb ? test : test.skip;   // + a local canConnect() helper
testIfDb("login alert webhookSecret never leaves backend in cleartext", async () => {
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
// tests/security/codersoSecurityGate.test.ts (testIfDb = hasDb ? test : test.skip)
testIfDb("public loginAlerts.webhookSecret is {configured} only", ...);     // db round-trip
testIfDb("webhookSecret cleartext absent from public projection JSON", ...); // db round-trip
test("deliveryError is null or sanitized string", ...);                     // static fixture, no db
```

## Testing Requirements
- **Lane:** Bun — `tests/security/codersoSecurityGate.test.ts` (security gate). The
  file is **fully static today** (no db); the new cleartext round-trip is db-backed
  via `setSecuritySettings` / `getSecuritySettingsPublic`, so gate it with the repo
  `testIfDb` pattern (`const testIfDb = hasDb ? test : test.skip;` + a local
  `canConnect()`, mirroring `tests/unit/security/securitySettings.test.ts`) so it
  `test.skip`s without a DB. The canonical encrypted-storage round-trip already
  lives (testIfDb-gated) in TASK-492-01-L01's `securitySettings.test.ts`; keep this
  a focused leak guard rather than a duplicate of the contract test.
- Docs: update `_docs/SECURITY_SPEC.md`, `_docs/AUTH_SPEC.md`, `_docs/CMS_API.md`
  as above. Do **not** edit `_docs/_TASKS/README.md` or add changelog entries.
- No DB migration artifacts.
