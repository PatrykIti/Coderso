# TASK-492-01-L01: Extend `loginAlerts` contract in `securitySettings.ts`

# FileName: TASK-492-01-L01-Login-Alerts-Settings-Schema-Owner.md

**Parent Subtask:** TASK-492-01
**Priority:** Medium
**Category:** Settings / Security
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** 2026-07-05
**Completed:** `<YYYY-MM-DD>`

## Overview

### Goal
Make `core/services/settings/securitySettings.ts` the single source of truth for
the extended `loginAlerts` contract: add `recipients` (email list), `webhookUrl`,
an encrypted `webhookSecret`, and a runtime `deliveryError` status — with
defaults, normalization, strict reject-unknown, encryption-at-rest for the secret,
and a public projection that hides the raw secret.

### Owning module(s) to create-or-extend
- `core/services/settings/securitySettings.ts` (extend types
  `SecuritySettings.loginAlerts`, `SecuritySettingsUpdate.loginAlerts`, a new
  `SecuritySettingsPublic` projection for `loginAlerts`, `DEFAULT_SECURITY_SETTINGS.loginAlerts`,
  the `assertAllowedKeys` block at lines 444-446, the `loginAlerts` normalize block
  at lines 571-581, and `toStoredSettings` / `toPublicSettings` for the encrypted
  `webhookSecret`).

### Source-of-truth docs
- `_docs/SECURITY_SPEC.md` (runtime config `loginAlerts`, line 173; backend-only
  secrets + redacted browser cache, lines 160-192)
- `_docs/AUTH_SPEC.md` (login-alert behavior)
- `_docs/CMS_API.md` (`PATCH /settings/security` `loginAlerts`, lines 4262-4266)

### Out-of-scope
- The route-level JSON schema and assistant policy (TASK-492-01-L02).
- Any delivery behavior or `deliveryError` *writing* (TASK-492-02); this leaf only
  defines, normalizes, persists, and projects the field.

## Security Contract
- **Endpoint visibility:** none added here. This module backs the existing
  internal `PATCH /settings/security` (`core/server/routes/settingsRoutes.ts:155`,
  `/admin/api/*`). No public surface.
- **Auth model / RBAC:** unchanged — the route is guarded by
  `requirePermission("settings:write")`. This leaf does not relax it.
- **CSRF / rate-limit:** unchanged — internal admin write (CSRF enforced by
  middleware; `admin_write` bucket). No change.
- **Validation schema-owner module + reject-unknown:** THIS module. Extend the
  existing `assertAllowedKeys(update.loginAlerts, [...])` allowlist. The
  **client-writable** keys are `enabled`, `notifyOnNewDevice`,
  `notifyOnNewLocation`, `recipients`, `webhookUrl`, `webhookSecret`.
  `deliveryError` is **service-writable only**: include it in the normalize
  allowlist so internal delivery code may persist it, but it is excluded from the
  route JSON schema (L02) and the admin-client type (`settingsClient.ts`
  `SecuritySettingsUpdate`) so admin clients cannot set/poison it. Typing
  (audit M2): the SERVER-side `SecuritySettings`/`SecuritySettingsUpdate` types
  include `deliveryError: string | null` (service-writable); the public/route
  projection excludes it. 02-L01 persists via
  `setSecuritySettings({ loginAlerts: { deliveryError } })` — typechecks only
  because the server-side update type carries the field. Unknown keys
  continue to throw `security_settings_invalid` via the existing
  `assertAllowedKeys` path.
- **Anti-abuse for public writes:** N/A — no public write is added.
- **Secret/PII handling:**
  - `webhookSecret` follows the existing `botProtection.secretKey` pattern:
    accept `string | EncryptedSecret | null`; `toStoredSettings` encrypts a raw
    string via `encryptSecret`; `toPublicSettings` exposes only
    `{ configured: boolean }` via a `hasLoginWebhookSecretConfigured` helper
    (mirror `hasBotSecretConfigured`). The raw value is resolved only at delivery
    time via a `resolveLoginWebhookSecret` helper (mirror `resolveBotSecretValue`
    → `decryptSecret`). Never returned to client cache/log.
  - `recipients` are emails (PII): normalize to trimmed/lowercased, deduped,
    `@`-validated, clamped (max 10). They stay backend-only; the public projection
    may return them for admin editing **but they are never written to redacted
    browser cache** (enforced by SECURITY_SPEC + the security gate in L02 of
    TASK-492-03).
  - `deliveryError` is stored already-sanitized (the delivery service runs
    `redactAuditText` + length clamp before persisting), so the projection is safe
    to surface read-only.

## Implementation Pseudocode

```ts
// securitySettings.ts — types
type LoginAlertsSettings = {
  enabled: boolean;
  notifyOnNewDevice: boolean;
  notifyOnNewLocation: boolean;
  recipients: string[];               // extra emails, deduped, max 10
  webhookUrl: string | null;          // https (or http for localhost)
  webhookSecret: string | EncryptedSecret | null; // HMAC signing secret
  deliveryError: string | null;       // last sanitized delivery error (read-only)
};
// SecuritySettings.loginAlerts: LoginAlertsSettings

type LoginAlertsSettingsPublic = Omit<LoginAlertsSettings, "webhookSecret"> & {
  webhookSecret: { configured: boolean };
};
// SecuritySettingsPublic.loginAlerts: LoginAlertsSettingsPublic
// SecuritySettingsUpdate.loginAlerts adds recipients?/webhookUrl?/webhookSecret?
//   (NO deliveryError in the public update type; service writes it via internal call)

const MAX_LOGIN_ALERT_RECIPIENTS = 10;

const DEFAULT loginAlerts = {
  enabled: true, notifyOnNewDevice: true, notifyOnNewLocation: true,
  recipients: [], webhookUrl: null, webhookSecret: null, deliveryError: null,
};

// normalizeLoginRecipients(value, fallback): reuse normalizeStringList(...,{lowerCase:true}),
//   then filter isLikelyEmail (import from services/security/piiEmail) and slice(0, MAX).
//   Throw security_settings_invalid on a non-string/array input (normalizeStringList already does).

// normalizeLoginWebhookUrl(value, fallback): undefined->fallback; null->null (allowNull);
//   string -> new URL(trimmed); require protocol https: (allow http: only when hostname is
//   localhost/127.0.0.1); else throw security_settings_invalid.
//   webhookUrl set with empty webhookSecret => throw security_settings_invalid
//   (fail closed: an unsigned webhook is never sent, audit L4).
//   SSRF note (audit L5): also reject private/loopback/link-local IP hosts.

// normalizeLoginWebhookSecret = reuse the existing normalizeBotSecret shape
//   (string|EncryptedSecret|null). deliveryError = normalizeString(..., {allowNull:true})
//   clamped (slice 240) — defensive; the writer already sanitizes.

// mergeSecuritySettings(): in the loginAlerts block add the four fields; extend
//   assertAllowedKeys(update.loginAlerts, [
//     "enabled","notifyOnNewDevice","notifyOnNewLocation",
//     "recipients","webhookUrl","webhookSecret","deliveryError"]).

// toStoredSettings(): encrypt loginAlerts.webhookSecret (encryptSecret) exactly like
//   botProtection.secretKey, alongside the existing botProtection encryption.

// toPublicSettings(): project loginAlerts.webhookSecret -> { configured: hasLoginWebhookSecretConfigured(...) }.

// Export helper resolveLoginWebhookSecret(secret) (decryptSecret) for the delivery service.
```

- **Data flow:** client `PATCH /settings/security` → route JSON schema (L02) →
  `setSecuritySettingsPublic` → `mergeSecuritySettings` (this contract) →
  `toStoredSettings` (encrypt secret) → `settings` jsonb. Reads:
  `getSecuritySettings` (raw, server-only) for delivery;
  `getSecuritySettingsPublic` (redacted secret) for admin.
- **Error handling:** keep the existing machine-readable
  `security_settings_invalid` domain error; the route maps it through the
  existing `withSettingsErrors` / `map*Error` boundary. NOTE (audit M1):
  `mapSettingsRouteError` (`core/server/routes/settingsRoutes.ts:65-92`) has NO
  `security_settings_invalid` case today and would fall through to a 500 — this
  leaf ADDS `case "security_settings_invalid" -> 400 ApiError` and owns
  `core/server/routes/settingsRoutes.ts` (mapSettingsRouteError) as an
  additional owning module.
- **No DB migration:** `settings.value` is `jsonb` (`core/db/schema.ts:375`);
  `normalizeStoredSettings` defaults the new fields for legacy rows. Do **not**
  add `meta/*_snapshot.json` / `_journal.json` entries.

### Regression-test shape (Bun, db-backed)
Extend `tests/unit/security/securitySettings.test.ts`:
```ts
testIfDb("loginAlerts recipients normalize, dedupe, clamp, lowercase", ...);
testIfDb("loginAlerts webhookUrl rejects non-https non-localhost", ...);
testIfDb("loginAlerts webhookSecret stored encrypted; public exposes only {configured}", ...);
testIfDb("loginAlerts rejects unknown keys (security_settings_invalid)", ...);
testIfDb("deliveryError round-trips and is clamped", ...);
```

## Testing Requirements
- **Lane:** Bun (`tests/unit/security/securitySettings.test.ts`) — the contract is
  exercised through `setSecuritySettings`/`getSecuritySettings`, which touch
  `db/client`; matches the existing test's `bun:test` + real-db gating
  (`testIfDb`).
- Assert: defaults; normalize (trim/lowercase/dedupe/clamp recipients; URL
  protocol enforcement); reject-unknown via `assertAllowedKeys`; encrypted
  `webhookSecret` at rest + `{ configured }` public projection; `deliveryError`
  round-trip + clamp; backward-compat (legacy row without the new fields loads
  with defaults).
- No DB migration artifacts.
