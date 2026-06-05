# TASK-404-03-L02: Integrations Routes and Admin DTOs
# FileName: TASK-404-03-L02-Integrations-Routes-and-Admin-DTOs.md

**Parent Subtask:** TASK-404-03
**Priority:** High
**Category:** Settings / Integrations / Admin Clients
**Estimated Effort:** Medium
**Dependencies:** TASK-404-01-L01, TASK-404-03-L01
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Update integration route coverage and admin client DTOs so the Resend connector
is exposed as a secret-bearing integration while staying redacted in browser
payloads.

Files to inspect/change:

- `core/server/routes/integrationsRoutes.ts`
- `core/server/validation/integrationsSchemas.ts`
- `core/admin/services/emailClient.ts`
- `core/admin/services/integrationsClient.ts`
- `tests/integration/routes/integrations.test.ts`
- `tests/vitest/admin/emailClient.test.ts`
- `tests/vitest/admin/integrationsClient.test.ts`

---

## Security Contract

- **Endpoint visibility:** internal admin only:
  `GET /settings/integrations`, `GET /settings/integrations/:id`,
  `PATCH /settings/integrations/:id`.
- **Auth model:** authenticated admin session.
- **RBAC:** `settings:read` for reads; `settings:write` for updates.
- **CSRF:** required for `PATCH /settings/integrations/:id`.
- **Rate-limit bucket:** `admin_read` for reads; `admin_write` for updates.
- **Validation:** route schema stays strict and service registry rejects unknown
  Resend config keys such as `baseUrl`.
- **Anti-abuse controls:** nonce/signature/HMAC and reCAPTCHA are not
  applicable.
- **Secret handling:** admin DTOs expose `configured` only for secret fields;
  no plaintext `apiKey` or decrypted runtime config reaches browser clients.

---

## Sub-Tasks

None. This is an execution leaf.

---

## Implementation Pseudocode

Client DTO shape:

```ts
export type EmailSettingsResponse = {
  provider: "smtp" | "resend";
  smtp: SmtpSummary;
  resend: {
    integrationId: "resend";
    apiKey: { configured: boolean };
    status: "connected" | "disconnected";
  };
  from: FromSummary;
  status: { provider: "smtp" | "resend"; configured: boolean };
};
```

Integration route assertion shape:

```ts
await updateIntegration("resend", { config: { baseUrl: "https://evil.test" } });
// throws integration_config_invalid through route mapping
```

Data flow:

- Existing integrations list/detail routes include Resend from registry.
- Existing update route delegates unknown-key validation to integration service.
- Admin clients type the Resend field as a redacted secret summary.
- Email client types include Resend summary and provider-aware status.

Error handling:

- Unknown Resend field -> `integration_config_invalid`.
- Missing Resend integration id should not happen once registry includes it, but
  unknown ids still map to `integration_not_found`.
- Secret master key errors still map to `secret_master_key_invalid`.

Regression-test shape:

- Integration route tests cover Resend detail exists.
- Integration update route maps `{ config: { baseUrl: "..." } }` to 400
  `integration_config_invalid`.
- Admin integration client never exposes secret `value` for Resend `apiKey`.
- Email client tests cover provider union and Resend summary fields.

---

## Testing Requirements

- `bun test tests/integration/routes/integrations.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/emailClient.test.ts tests/vitest/admin/integrationsClient.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`: update Integrations and Email Settings response summaries.
- `_docs/INTEGRATIONS.md`: document Resend field redaction.
- `_docs/_TASKS/README.md`: update status if this leaf starts/closes.
- `_docs/_CHANGELOG/`: add changelog coverage when this leaf closes.
