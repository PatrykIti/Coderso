# TASK-409-02-L01: Provider Settings and Normalization
# FileName: TASK-409-02-L01-Provider-Settings-and-Normalization.md

**Parent Subtask:** TASK-409-02
**Priority:** High
**Category:** Settings / Email / Domain
**Estimated Effort:** Medium
**Dependencies:** TASK-409-01-L01
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Extend the email settings domain contract from SMTP-only to
`provider: "smtp" | "resend"` while preserving existing SMTP settings and
legacy databases that do not have `email.provider`.

Files to inspect/change:

- `core/services/email/emailSettingsService.ts`
- `core/server/validation/emailSchemas.ts`
- `core/admin/services/emailClient.ts`
- `tests/unit/email/emailSettingsService.test.ts`
- `tests/vitest/admin/emailClient.test.ts`

---

## Security Contract

- **Endpoint visibility:** no new endpoint; this leaf changes service/client
  contract consumed by existing internal admin endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** provider enum is exactly `smtp | resend`; unknown providers
  map to `email_settings_invalid`.
- **Anti-abuse controls:** no public write surface is added.
- **Secret handling:** Email Settings stores only provider id, sender metadata,
  and existing SMTP fields. It must never persist Resend API keys.

---

## Sub-Tasks

None. This is an execution leaf.

---

## Implementation Pseudocode

Domain shape:

```ts
export type EmailProviderId = "smtp" | "resend";

export type EmailSettingsPublic = {
  provider: EmailProviderId;
  smtp: {
    host: string | null;
    port: number | null;
    secure: boolean;
    user: string | null;
    password: { configured: boolean };
  };
  resend: {
    integrationId: "resend";
    apiKey: { configured: boolean };
    status: "connected" | "disconnected";
  };
  from: { name: string | null; email: string | null };
  status: { provider: EmailProviderId; configured: boolean };
};
```

Normalizer shape:

```ts
const EMAIL_PROVIDER_IDS = ["smtp", "resend"] as const;

function normalizeEmailProvider(value: unknown): EmailProviderId {
  if (value === undefined || value === null || value === "") return "smtp";
  if (value === "smtp" || value === "resend") return value;
  throw new Error("email_settings_invalid");
}
```

Data flow:

- `loadEmailRecords()` reads current settings rows.
- Missing `email.provider` defaults to `smtp` for public and internal settings.
- `updateEmailSettings({ provider: "resend" })` stores only `email.provider`.
- Existing `email.smtp.*` keys are left untouched when switching provider.
- Public response includes `resend` configured-state metadata without a key.

Error handling:

- Invalid provider values throw `email_settings_invalid`.
- Invalid field types keep existing `email_settings_invalid` behavior.
- Missing Resend key is not an update error; delivery readiness is handled by
  provider-aware configured-state and send resolution.

Regression-test shape:

- Existing DB rows without `email.provider` read as `provider: "smtp"`.
- Switching to `resend` does not clear SMTP host/user/password configured flags.
- Switching back to `smtp` reuses saved SMTP settings.
- `GET`/client DTO shape does not expose Resend API key plaintext.
- Email schema rejects `provider: "mailgun"` and unknown top-level fields.

---

## Testing Requirements

- `set -a && source .env && set +a && bun test tests/unit/email/emailSettingsService.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/emailClient.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`: provider enum and response shape.
- `_docs/SETTINGS.md`: `email.provider` default and compatibility behavior.
- `_docs/_TASKS/README.md`: update status if this leaf starts/closes.
- `_docs/_CHANGELOG/`: add changelog coverage when this leaf closes.
