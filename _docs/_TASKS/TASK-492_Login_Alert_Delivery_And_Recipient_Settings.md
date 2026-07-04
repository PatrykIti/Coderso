# TASK-492: Login Alert Delivery (Email + Webhook) & Recipient Settings

# FileName: TASK-492_Login_Alert_Delivery_And_Recipient_Settings.md

**Priority:** Medium
**Category:** Settings / Security
**Estimated Effort:** Small
**Dependencies:** None (extends existing login-alert detection + email/webhook infra)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

## Business Goal

Login-alert **detection** already works: on `POST /auth/login`,
`core/server/routes/authRoutes.ts` (lines 207-252) calls `evaluateLoginAlert`
(`core/services/auth/sessionService.ts:86`) and, when the security settings
opt-in matches a new-device / new-location hit, writes a single `auth.login.alert`
audit record. **No user is ever notified** — nothing is emailed or webhooked, so
the feature is invisible to the account owner and to a security team.

This task closes that gap: deliver the login alert over the existing email
infrastructure (`sendSystemEmail`) **and/or** a signed webhook (reusing the
existing webhook HMAC pattern), and add the missing **recipient settings**
(`recipients`, `webhookUrl`, signing secret) plus a runtime `deliveryError`
status to the `loginAlerts` security-settings contract. The assistant operation
policy (`core/services/assistant/operationPolicy/adminSurfacePolicies.ts:636-642`)
**already references** `loginAlerts.recipients`, `loginAlerts.webhookUrl`, and
`loginAlerts.deliveryError` as redacted secrets — fields that do not yet exist in
the schema. This task makes the schema and the assistant policy consistent.

## Scope

### In scope
- Extend the `loginAlerts` security-settings contract (owner:
  `core/services/settings/securitySettings.ts`) with `recipients` (email list),
  `webhookUrl`, an encrypted `webhookSecret` (required to satisfy the webhook
  HMAC security contract), and a runtime-written `deliveryError` status field.
- Extend the route-level JSON schema (`securitySettingsSchema.loginAlerts` in
  `core/server/validation/settingsSchemas.ts`) with strict reject-unknown for the
  client-writable subset, and align the assistant redaction policy.
- Deliver the alert on hit: email the affected user (plus configured recipients)
  via `sendSystemEmail`, and POST a signed payload to `webhookUrl` when
  configured, wired into the `POST /auth/login` login-alert branch.
- Wire the existing admin **no-op** controls on `LoginAlertsPage.tsx`
  (recipients input, email/webhook channel toggles) to real persistence and
  surface the last `deliveryError`.
- Tests in the correct lanes + docs (`SECURITY_SPEC`, `AUTH_SPEC`, `CMS_API`).

### Out of scope
- Any change to the **detection** heuristic in `evaluateLoginAlert` (new-device /
  new-location logic stays as-is).
- A new admin route or webhook-registry entry: the login-alert webhook is a raw
  URL in security settings, not a row in the `webhooks` table, so it does **not**
  flow through `enqueueWebhookDelivery` / `deliverWebhook`.
- Brute-force threshold control (separate `data-no-op-control` placeholder owned
  elsewhere) and the unrelated security sub-tabs.
- 2FA / active-session management surfaces.

### What the TASK-479 reskin already covers vs. what this task adds
- **TASK-479 reskin already covers** the visual shell of `LoginAlertsPage.tsx`:
  the email/webhook channel rows, the "Custom Email List" field, and the
  brute-force input exist as **disabled `data-no-op-control` placeholders** (see
  lines 285/332/368/381) with the disclaimer "Advanced login alert recipients and
  brute-force controls are not wired yet."
- **This task adds** the backend contract, the actual delivery on login hit, and
  the real persistence/wiring for the recipients + channel controls so the
  placeholder UI becomes functional.

## Sub-Tasks

| ID            | Title                                         | Effort | Status     |
| ------------- | --------------------------------------------- | ------ | ---------- |
| TASK-492-01   | Login Alert Settings Contract (schema + policy)| Small  | ⏳ To Do |
| TASK-492-02   | Alert Delivery on Login Hit (email + webhook) | Small  | ⏳ To Do   |
| TASK-492-03   | Admin Editor Wiring, Tests & Docs             | Small  | ⏳ To Do   |

## Testing Requirements
- **Vitest** (`tests/vitest/*`, `tests/vitest/ui-integration/*`): route JSON
  schema reject-unknown for the new `loginAlerts` fields; assistant policy
  redaction consistency; admin `LoginAlertsPage` recipient/channel wiring and
  `deliveryError` rendering.
- **Bun** (`tests/unit/*`, `tests/integration/routes/*`, `tests/security/*`):
  `securitySettings` normalize/round-trip for the new fields (db-backed,
  extending `tests/unit/security/securitySettings.test.ts`); the new login-alert
  delivery service (injected email + fetch deps); the `POST /auth/login` wiring
  (extending `tests/integration/routes/auth.test.ts`); and the security gate
  asserting `webhookSecret`/`recipients` never leak to client cache/logs.
- No DB migration: `security.settings` is a `jsonb` blob
  (`core/db/schema.ts:375`, key `security.settings`); new fields are
  backward-compatibly defaulted by `normalizeStoredSettings`. No
  `meta/*_snapshot.json` / `_journal.json` changes.

## Documentation Updates Required
- `_docs/SECURITY_SPEC.md` — extend the `loginAlerts` runtime-config list
  (line 173) with `recipients`, `webhookUrl`, signing secret (backend-only), and
  `deliveryError`; confirm webhookSecret/recipients stay backend-only and out of
  redacted browser cache (lines 177-192).
- `_docs/AUTH_SPEC.md` — document that a new-device/new-location login now emits a
  notification (email/webhook) in addition to the `auth.login.alert` audit record.
- `_docs/CMS_API.md` — update the `PATCH /settings/security` `loginAlerts` example
  (lines 4262-4266) with the new client-writable fields and note that
  `webhookSecret` returns only a `{ configured }` flag and `deliveryError` is
  read-only.

## Notes
- Webhook signing reuses `createWebhookSignature`
  (`core/services/webhooks/signing.ts:12`) and the `X-Coderso-*` / `X-Nextless-*`
  header convention from `deliveryService.ts` (`setWebhookHeader`), but issues the
  request directly (raw `webhookUrl`, not a registered webhook id).
- `webhookSecret` mirrors the existing encrypted-secret pattern used for
  `botProtection.secretKey` (`encryptSecret` / `decryptSecret` /
  `isEncryptedSecret`, `hasBotSecretConfigured`, `resolveBotSecretValue`) so the
  raw value never reaches the client; public projection exposes only
  `{ configured: boolean }`.
- Implement in dependency order: 01 (contract) → 02 (delivery + wiring) → 03
  (admin editor + tests + docs).
