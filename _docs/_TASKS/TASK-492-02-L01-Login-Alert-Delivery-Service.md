# TASK-492-02-L01: Login-alert delivery service (email + signed webhook)

# FileName: TASK-492-02-L01-Login-Alert-Delivery-Service.md

**Parent Subtask:** TASK-492-02
**Priority:** Medium
**Category:** Settings / Security
**Estimated Effort:** Small
**Dependencies:** TASK-492-01-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

## Overview

### Goal
Create a dedicated, dependency-injectable service that delivers a login alert over
two channels: (1) email to the affected user plus configured `recipients` via the
existing `sendSystemEmail`, and (2) a signed POST to `webhookUrl` reusing the
existing webhook HMAC pattern. It records the last sanitized failure into
`loginAlerts.deliveryError` and never throws to its caller.

### Owning module(s) to create-or-extend
- **Create** `core/services/auth/loginAlertDeliveryService.ts` (new). Pattern it
  after `core/services/auth/setPasswordEmailService.ts` (HTML/text builder,
  `escapeHtml`, `sendSystemEmail`).
- Reuse: `sendSystemEmail` / `assertSystemEmailConfigured`
  (`core/services/email/emailSettingsService.ts:575,565`),
  `createWebhookSignature` (`core/services/webhooks/signing.ts:12`), the
  `X-Coderso-*` / `X-Nextless-*` header convention (mirror `setWebhookHeader` in
  `core/services/webhooks/deliveryService.ts:17-20`), `redactAuditText`
  (`core/services/audit/auditRedaction.ts`), `resolveLoginWebhookSecret` +
  `setSecuritySettings` (`core/services/settings/securitySettings.ts`).

### Source-of-truth docs
- `_docs/SECURITY_SPEC.md` (webhook HMAC `<ts>.<payload>` signing; backend-only
  secrets; PII redaction seams, lines 160-192, 257-303)
- `_docs/AUTH_SPEC.md` (login alert semantics)
- `_docs/CMS_API.md` (`PATCH /settings/security` `loginAlerts`)

### Out-of-scope
- The `POST /auth/login` wiring (TASK-492-02-L02).
- Registering a webhook in the `webhooks` table: the login-alert webhook is a raw
  URL; it must **not** go through `enqueueWebhookDelivery` / `deliverWebhook`
  (those require a `webhookId`).

## Security Contract
- **Endpoint visibility:** none — this is a server-side service invoked from the
  existing public auth endpoint; it exposes no new route.
- **Auth model / RBAC:** runs inside an authenticated-login transaction (the user
  already proved credentials). No additional RBAC.
- **CSRF / rate-limit:** N/A (no new endpoint); the login path already enforces
  the `auth` bucket + bot protection.
- **Validation schema-owner module + reject-unknown:** consumes the already
  normalized `loginAlerts` settings from `getSecuritySettings`; it performs no
  raw-payload parsing.
- **Anti-abuse for public writes:** N/A.
- **Outbound webhook signing:** when `webhookSecret` is configured, sign the JSON
  body as `HMAC_SHA256(secret, "<timestamp>.<payload>")` via
  `createWebhookSignature` and send `X-Coderso-Signature` / `X-Coderso-Timestamp`
  (+ `X-Nextless-*` mirrors) and `X-Coderso-Event: auth.login.alert`. Enforce a
  request timeout via `AbortController` (mirror `deliveryService.ts`, ~8s) and a
  small attempt budget; no unbounded retries inside the login path.
- **Secret/PII handling:**
  - Resolve `webhookSecret` only here via `resolveLoginWebhookSecret`
    (`decryptSecret`); never log or echo it.
  - Email is sent through `sendSystemEmail`, which already logs deliveries with
    `redactAuditText` and clamps errors. The webhook payload carries the
    **minimum** PII: `userId`, a masked email (local-part masked), the
    `newDevice`/`newLocation` booleans, and an ISO timestamp. Do **not** include
    raw passwords, session tokens, or the full previous IP/UA; if location/IP is
    included it must be the new-event coarse value only and pass through the
    redaction seam.
  - On failure, write `loginAlerts.deliveryError =
    redactAuditText(message).slice(0, 240)` via `setSecuritySettings`; never store
    the raw secret/URL credentials.

## Implementation Pseudocode

```ts
// loginAlertDeliveryService.ts
export type LoginAlertDeliveryInput = {
  user: { id: string; email: string; name?: string | null }; // email already PII-resolved by caller
  flags: { newDevice: boolean; newLocation: boolean };
  current: { ip: string | null; userAgent: string | null };
  at: Date;
};

export type LoginAlertDeliveryDeps = {
  getSettings?: typeof getSecuritySettings;       // default real
  sendEmail?: typeof sendSystemEmail;             // default real
  fetchImpl?: typeof fetch;                        // default global fetch
  recordError?: (message: string | null) => Promise<void>; // default -> setSecuritySettings
};

const maskEmail = (email: string) => { /* keep domain, mask local-part */ };

export async function deliverLoginAlert(
  input: LoginAlertDeliveryInput,
  deps: LoginAlertDeliveryDeps = {}
): Promise<{ email: "sent" | "skipped" | "failed"; webhook: "sent" | "skipped" | "failed" }> {
  const settings = (await (deps.getSettings ?? getSecuritySettings)()).loginAlerts;
  let lastError: string | null = null;

  // ----- email channel -----
  let emailStatus: "sent" | "skipped" | "failed" = "skipped";
  const recipients = dedupe([input.user.email, ...settings.recipients]);
  if (recipients.length > 0) {
    try {
      const { subject, text, html } = buildLoginAlertEmail(input); // escapeHtml, like setPasswordEmail
      await Promise.all(recipients.map((to) =>
        (deps.sendEmail ?? sendSystemEmail)({ to, subject, text, html })));
      emailStatus = "sent";
    } catch (err) {
      emailStatus = "failed";
      lastError = sanitize(err); // redactAuditText + slice(240)
    }
  }

  // ----- webhook channel -----
  let webhookStatus: "sent" | "skipped" | "failed" = "skipped";
  if (settings.webhookUrl) {
    try {
      const payload = JSON.stringify({
        event: "auth.login.alert",
        userId: input.user.id,
        email: maskEmail(input.user.email),
        newDevice: input.flags.newDevice,
        newLocation: input.flags.newLocation,
        at: input.at.toISOString(),
      });
      const headers = new Headers({ "Content-Type": "application/json" });
      setHeader(headers, "Event", "auth.login.alert");
      const secret = resolveLoginWebhookSecret(settings.webhookSecret);
      if (secret) {
        const sig = createWebhookSignature(secret, payload);
        setHeader(headers, "Signature", sig.signature);
        setHeader(headers, "Timestamp", sig.timestamp);
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await (deps.fetchImpl ?? fetch)(settings.webhookUrl,
        { method: "POST", headers, body: payload, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      webhookStatus = "sent";
    } catch (err) {
      webhookStatus = "failed";
      lastError = sanitize(err);
    }
  }

  // ----- persist last delivery status (best-effort) -----
  try {
    await (deps.recordError ?? defaultRecordError)(lastError);
  } catch { /* swallow: status write must never break login */ }

  return { email: emailStatus, webhook: webhookStatus };
}

// defaultRecordError(msg) -> setSecuritySettings({ loginAlerts: { deliveryError: msg } })
//   (deliveryError is in the service normalize allowlist from L01)
```

- **Data flow:** caller (L02) → `deliverLoginAlert` → email via `sendSystemEmail`
  + signed `fetch(webhookUrl)` → persist `deliveryError`. Returns a status object
  for audit metadata; **never throws**.
- **Error handling:** all channel failures are caught, sanitized
  (`redactAuditText` + `slice(240)`), and surfaced through the return value +
  `deliveryError`. Machine-readable: keep channel statuses as a typed union
  (`sent|skipped|failed`); no `ApiError` is constructed here (no route boundary).
- **No DB migration.**

### Regression-test shape (Bun)
```ts
// tests/unit/auth/loginAlertDelivery.test.ts (bun:test)
test("emails affected user + configured recipients, deduped", ...);    // injected sendEmail spy
test("signs webhook with HMAC and X-Coderso-Signature when secret set", ...); // injected fetchImpl
test("skips webhook when no webhookUrl; skips email when no recipients", ...);
test("captures sanitized deliveryError and never throws on failure", ...); // sendEmail/fetch reject
test("webhook payload contains masked email, no secret, no raw UA", ...);
```

## Testing Requirements
- **Lane:** Bun (`tests/unit/auth/loginAlertDelivery.test.ts`) — the module wires
  to the email service and outbound `fetch` (runtime I/O); inject `sendEmail`,
  `fetchImpl`, `getSettings`, and `recordError` so the test needs no real SMTP/db.
- Assert: recipient composition + dedupe; HMAC signature header + `<ts>.<payload>`
  contract; channel skip logic; failure isolation (no throw) + sanitized
  `deliveryError`; masked-email / no-secret payload invariants.
- No DB migration artifacts.
