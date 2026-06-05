# TASK-404-03: Admin API and Client Contract
# FileName: TASK-404-03-Admin-API-and-Client-Contract.md

**Parent Task:** TASK-404
**Priority:** High
**Category:** Settings / API / Admin Clients
**Estimated Effort:** Medium
**Dependencies:** TASK-404-01, TASK-404-02
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Update strict admin API schemas, route error mapping, audit metadata, and admin
client DTOs so Settings -> Email and Settings -> Integrations expose the Resend
provider contract without leaking secrets.

---

## Security Contract

- **Endpoint visibility:** internal admin only.
- **Auth model:** authenticated admin session.
- **RBAC:** `settings:read` for reads and `settings:write` for Email Settings,
  test-send, and integration mutations.
- **CSRF:** required for `PUT /settings/email`, `POST /settings/email/test`,
  and `PATCH /settings/integrations/:id`.
- **Rate-limit bucket:** `admin_read` for reads and `admin_write` for writes.
- **Validation:** strict reject-unknown schemas. Email provider enum is
  `smtp | resend`; Resend integration config accepts only `apiKey`.
- **Anti-abuse controls:** nonce/signature/HMAC and reCAPTCHA are not
  applicable; no public write surface is added.
- **Secret handling:** route responses and admin client DTOs must expose only
  configured/status booleans for SMTP password and Resend API key.

---

## Sub-Tasks

- `TASK-404-03-L01-Email-Settings-Routes-and-Error-Mapping.md`
- `TASK-404-03-L02-Integrations-Routes-and-Admin-DTOs.md`

---

## Testing Requirements

- `bun test tests/integration/routes/emailSettings.test.ts tests/integration/routes/integrations.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/emailClient.test.ts tests/vitest/admin/integrationsClient.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`: update route payloads, error codes, and response examples.
- `_docs/INTEGRATIONS.md`: document Resend API payload shape.
- `_docs/_TASKS/README.md`: keep status rows synchronized.
- `_docs/_CHANGELOG/`: add changelog coverage when leaves close.
