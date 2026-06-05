# TASK-404-01-L01: Resend Connector and Secret Storage
# FileName: TASK-404-01-L01-Resend-Connector-and-Secret-Storage.md

**Parent Subtask:** TASK-404-01
**Priority:** High
**Category:** Settings / Integrations / Secrets
**Estimated Effort:** Medium
**Dependencies:** TASK-404-01
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Add the built-in `resend` integration definition and prove that the existing
integration service stores its API key as an encrypted secret, returns only
configured flags in summaries, decrypts only through backend runtime config, and
rejects unsupported config keys such as `baseUrl`.

Files to inspect/change:

- `core/services/integrations/registry.ts`
- `core/services/integrations/integrationsService.ts`
- `tests/unit/integrations/integrationsService.test.ts`
- `tests/unit/security/secretStore.test.ts`

---

## Security Contract

- **Endpoint visibility:** no new endpoints; existing internal admin
  `/settings/integrations*` routes consume this registry definition.
- **Auth model:** authenticated admin session through existing route guards.
- **RBAC:** `settings:read` for reads, `settings:write` for updates.
- **CSRF:** unchanged; `PATCH /settings/integrations/:id` requires CSRF.
- **Rate-limit bucket:** unchanged `admin_read`/`admin_write`.
- **Validation:** registry fields are the allowlist. `resend` accepts only
  `apiKey`; `baseUrl`, `token`, and arbitrary keys reject as
  `integration_config_invalid`.
- **Anti-abuse controls:** nonce/signature/HMAC and reCAPTCHA are not applicable.
- **Secret handling:** `apiKey` is type `secret`, encrypted at rest with the
  existing secret store, omitted from summaries, and decrypted only by
  `getIntegrationRuntimeConfig("resend")`.

---

## Sub-Tasks

None. This is an execution leaf.

---

## Implementation Pseudocode

Registry shape:

```ts
// core/services/integrations/registry.ts
{
  id: "resend",
  name: "Resend",
  description: "Send transactional email through Resend.",
  category: "Communication",
  scopes: ["email:send"],
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      placeholder: "re_...",
    },
  ],
}
```

Data flow:

- Admin saves `{ config: { apiKey: "re_test..." } }` through the existing
  integration update service.
- `ensureKnownKeys()` accepts only `apiKey`.
- `updateIntegration()` encrypts the key because the field type is `secret`.
- `listIntegrations()` and `getIntegration("resend")` return field summary
  `value: null`, `configured: true`.
- `getIntegrationRuntimeConfig("resend")` returns the decrypted `apiKey` only to
  backend services.

Error handling:

- Unknown integration id remains `integration_not_found`.
- Unknown Resend config key, including `baseUrl`, returns
  `integration_config_invalid`.
- Missing or invalid secret master key while saving `apiKey` remains
  `secret_master_key_invalid`.

Regression-test shape:

- `listIntegrations()` includes `resend` with one secret field.
- Saving `apiKey` marks the summary connected/configured and does not return the
  plaintext key.
- Runtime config resolves the decrypted key only in backend test code.
- Saving `{ baseUrl: "https://example.test" }` rejects.
- Existing OpenAI/OpenRouter integration tests remain green.

---

## Testing Requirements

- `set -a && source .env && set +a && bun test tests/unit/integrations/integrationsService.test.ts tests/unit/security/secretStore.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/INTEGRATIONS.md`: add built-in `resend` connector with `apiKey`.
- `_docs/SECURITY_SPEC.md`: document backend-only encrypted Resend API key.
- `_docs/_TASKS/README.md`: update status if this leaf starts/closes.
- `_docs/_CHANGELOG/`: add changelog coverage when this leaf closes.
