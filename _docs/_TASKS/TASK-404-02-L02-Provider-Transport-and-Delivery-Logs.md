# TASK-404-02-L02: Provider Transport and Delivery Logs
# FileName: TASK-404-02-L02-Provider-Transport-and-Delivery-Logs.md

**Parent Subtask:** TASK-404-02
**Priority:** High
**Category:** Settings / Email / Transport
**Estimated Effort:** Large
**Dependencies:** TASK-404-01-L01, TASK-404-02-L01
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Create a shared email transport interface for SMTP and Resend, add a backend-only
Resend fetch adapter, resolve the active provider in `sendSystemEmail()`, and
record provider-aware delivery logs without secrets.

Files to inspect/change:

- `core/services/email/emailProvider.ts`
- `core/services/email/emailSettingsService.ts`
- `tests/unit/email/emailSettingsService.test.ts`
- `tests/vitest/email/emailProvider.test.ts` (new)

---

## Security Contract

- **Endpoint visibility:** no new endpoints; existing test-send route calls this
  backend service.
- **Auth model:** unchanged.
- **RBAC:** unchanged in this leaf.
- **CSRF:** unchanged in this leaf.
- **Rate-limit bucket:** unchanged; route layer remains `admin_write`.
- **Validation:** idempotency keys, if supplied internally, are bounded before
  egress.
- **Anti-abuse controls:** no public write surface is added.
- **Secret handling:** Resend API key is read only from backend runtime
  integration config. Delivery logs store provider, recipient, subject, message
  id, sanitized status/error only.
- **External egress:** fixed `https://api.resend.com/emails`, backend-only
  `Authorization: Bearer`, bounded `User-Agent`, optional bounded
  `Idempotency-Key`, no arbitrary URL.

---

## Sub-Tasks

None. This is an execution leaf.

---

## Implementation Pseudocode

Shared transport shape:

```ts
export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  idempotencyKey?: string;
};

export type EmailTransport = {
  sendMail: (message: EmailMessage) => Promise<EmailSendResult>;
};
```

Resend adapter shape:

```ts
const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const USER_AGENT = "Coderso Email/1.0";

export function createResendTransport(config: {
  apiKey: string;
  fetchImpl?: typeof fetch;
}): EmailTransport {
  const apiKey = config.apiKey.trim();
  if (!apiKey) throw new Error("email_provider_invalid");
  const fetchImpl = config.fetchImpl ?? fetch;
  return {
    async sendMail(message) {
      const response = await fetchImpl(RESEND_EMAILS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": USER_AGENT,
          ...(message.idempotencyKey
            ? { "Idempotency-Key": clampIdempotencyKey(message.idempotencyKey) }
            : {}),
        },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });
      const body = await parseJsonSafe(response);
      if (!response.ok) throw new Error(sanitizeProviderError(body, response.status));
      return { messageId: typeof body.id === "string" ? body.id : null };
    },
  };
}
```

Provider resolution shape:

```ts
async function resolveConfiguredEmail(settings = await getEmailSettingsInternal()) {
  if (settings.provider === "smtp") return resolveSmtpConfiguredEmail(settings);
  const config = await getIntegrationRuntimeConfig("resend");
  const apiKey = normalizeSecret(config?.apiKey);
  if (!apiKey || !settings.from.email) throw new Error("email_not_configured");
  return {
    provider: "resend",
    from: formatSender(settings.from),
    transport: await createResendTransport({ apiKey }),
  };
}
```

Data flow:

- `sendSystemEmail()` validates recipient, reads internal settings, resolves
  active provider, sends through shared transport, and logs `provider`.
- SMTP behavior stays backward-compatible.
- Resend failures are sanitized before delivery log persistence.

Error handling:

- Missing active provider config -> `email_not_configured`.
- Invalid/blank Resend API key -> `email_not_configured` or
  `email_provider_invalid` mapped by caller to `email_not_configured`.
- Resend non-2xx/network failure -> delivery log `failed`, sanitized error,
  throw `email_send_failed`.

Regression-test shape:

- Resend adapter sends to fixed endpoint with expected headers/body.
- Adapter never accepts/uses configurable `baseUrl`.
- Success returns message id from Resend body.
- Failure logs sanitized error without `Authorization` or `re_...`.
- `sendTestEmail()` records delivery log provider `resend` when active.

---

## Testing Requirements

- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/email/emailProvider.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/email/emailSettingsService.test.ts tests/unit/integrations/integrationsService.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`: delivery logs provider examples.
- `_docs/SECURITY_SPEC.md`: fixed Resend endpoint and sanitized delivery errors.
- `_docs/_TASKS/README.md`: update status if this leaf starts/closes.
- `_docs/_CHANGELOG/`: add changelog coverage when this leaf closes.
