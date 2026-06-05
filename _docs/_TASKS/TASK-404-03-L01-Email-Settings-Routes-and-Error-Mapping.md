# TASK-404-03-L01: Email Settings Routes and Error Mapping
# FileName: TASK-404-03-L01-Email-Settings-Routes-and-Error-Mapping.md

**Parent Subtask:** TASK-404-03
**Priority:** High
**Category:** Settings / Email / Admin API
**Estimated Effort:** Medium
**Dependencies:** TASK-404-02-L01, TASK-404-02-L02
**Status:** ⏳ To Do

---

## Overview

Update Email Settings admin route validation and error mapping for provider-aware
settings and Resend test sends.

Files to inspect/change:

- `core/server/validation/emailSchemas.ts`
- `core/server/routes/emailSettingsRoutes.ts`
- `tests/integration/routes/emailSettings.test.ts`

---

## Security Contract

- **Endpoint visibility:** internal admin only:
  `GET /settings/email`, `PUT /settings/email`, `POST /settings/email/test`,
  `GET /settings/email/logs`.
- **Auth model:** authenticated admin session.
- **RBAC:** `settings:read` for reads; `settings:write` for settings update and
  test send.
- **CSRF:** required for `PUT /settings/email` and
  `POST /settings/email/test`.
- **Rate-limit bucket:** `admin_read` for reads; `admin_write` for writes/test
  send.
- **Validation:** `emailSettingsSchema` rejects unknown fields and accepts
  provider enum only `smtp | resend`.
- **Anti-abuse controls:** nonce/signature/HMAC and reCAPTCHA are not
  applicable; this remains admin-only.
- **Secret handling:** responses expose only configured flags. Audit metadata
  records provider/key names, not SMTP passwords, Resend keys, bearer headers, or
  raw request bodies.

---

## Sub-Tasks

None. This is an execution leaf.

---

## Implementation Pseudocode

Schema shape:

```ts
export const emailSettingsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    provider: { enum: ["smtp", "resend"] },
    smtp: existingSmtpSchema,
    from: existingFromSchema,
  },
};
```

Route mapping shape:

```ts
function mapEmailSettingsError(error: unknown): ApiError | null {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "secret_master_key_invalid":
      return new ApiError("secret_master_key_invalid", "Secret master key invalid", 400);
    case "email_settings_invalid":
      return new ApiError("email_settings_invalid", "Invalid email settings", 400);
    case "email_not_configured":
      return new ApiError("email_not_configured", "Email is not configured", 400);
    case "email_recipient_invalid":
      return new ApiError("email_recipient_invalid", "Recipient invalid", 400);
    case "email_send_failed":
      return new ApiError("email_send_failed", "Test email failed", 400);
    default:
      return null;
  }
}
```

Data flow:

- `PUT /settings/email` validates strict schema, delegates to service, logs audit
  with provider/key names only.
- `POST /settings/email/test` sends through active provider via service.
- `GET /settings/email/logs` returns provider-bearing log rows.

Error handling:

- Provider enum violation fails validation or maps to `email_settings_invalid`.
- Active Resend without configured key maps to `email_not_configured`.
- Resend upstream failure maps to `email_send_failed`.
- Unexpected backend errors continue through centralized route error handling
  without exposing stack traces or driver/upstream payloads.

Regression-test shape:

- Route registration still wires all four endpoints.
- Permission guard sequence remains `settings:read`, `settings:write`,
  `settings:write`, `settings:read`.
- `PUT` rejects unknown top-level fields and `provider: "mailgun"`.
- Test route maps `email_not_configured` and `email_send_failed`.
- Logs response can include provider `resend`.

---

## Testing Requirements

- `bun test tests/integration/routes/emailSettings.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/email/emailSettingsService.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`: update Email Settings payloads, provider enum, and route
  error contract.
- `_docs/_TASKS/README.md`: update status if this leaf starts/closes.
- `_docs/_CHANGELOG/`: add changelog coverage when this leaf closes.
