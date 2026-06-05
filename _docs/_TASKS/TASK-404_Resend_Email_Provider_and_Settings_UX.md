# TASK-404: Resend Email Provider and Settings UX (Index)
# FileName: TASK-404_Resend_Email_Provider_and_Settings_UX.md

**Priority:** High
**Category:** Settings / Email / Integrations
**Estimated Effort:** Large
**Dependencies:** TASK-041, TASK-042, TASK-155, TASK-157
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Settings -> Email currently behaves as if every outbound mail setup is manual
SMTP. That creates weak UX and a secret-handling mismatch for API-first mail
providers such as Resend, where the admin should configure an encrypted API key
once in Settings -> Integrations and then select that provider in Settings ->
Email.

This family implements Resend as a first-class email delivery provider while
preserving the existing SMTP setup:

- Add a built-in `resend` connector in Settings -> Integrations with an
  encrypted `apiKey` field. Do not expose a configurable `baseUrl` in v1; the
  backend uses the fixed Resend API origin.
- Extend the Email Settings domain contract from `provider: "smtp"` to
  `provider: "smtp" | "resend"`.
- Keep SMTP settings as the manual/default path and preserve existing SMTP
  values when switching providers.
- When `resend` is selected in Settings -> Email, hide the manual SMTP fields
  and show provider status plus a link/action to configure the Resend
  integration.
- Keep sender identity (`from.name`, `from.email`), test email, delivery logs,
  dirty-state protection, autosave, and secret redaction working for both
  providers.

Source-of-truth constraints reviewed:

- `_docs/CMS_API.md` Email Settings and Integrations contracts.
- `_docs/INTEGRATIONS.md` integration secret model.
- `_docs/SETTINGS.md` Settings and assistant secret-bearing surface policy.
- `_docs/SECURITY_SPEC.md` secret storage, CSRF, cache, and scanner rules.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` redacted settings cache
  rules.
- `_docs/TESTING_STRATEGY.md` Bun/Vitest lane ownership.
- Official Resend docs: send email uses fixed origin `https://api.resend.com`,
  `POST /emails`, bearer API-key auth, `from`, `to`, `subject`, `html` or
  `text`, and optional idempotency keys.

External consultation completed for this family:

- Codex sub-agent format pass: confirmed the parent must be converted into a
  physical task family with execution leaves.
- Codex sub-agent technical pass: identified dependency order, touched files,
  Resend fixed-origin egress, form automation, audit redaction, API/client
  updates, UX, and closure work.
- Claude CLI read-only pass with `--effort max`: confirmed the parent was
  structurally non-compliant as a monolithic task and provided correction
  requirements for child files, security contracts, pseudocode, tests, and board
  synchronization.

---

## Security Contract

- **Endpoint visibility:** internal admin only for all Coderso endpoints in this
  family. No public write endpoint is added.
- **Auth model:** authenticated admin session for
  `GET /settings/email`, `PUT /settings/email`, `POST /settings/email/test`,
  `GET /settings/email/logs`, `GET /settings/integrations`,
  `GET /settings/integrations/:id`, and
  `PATCH /settings/integrations/:id`.
- **RBAC:** `settings:read` for reads; `settings:write` for Email Settings
  updates, Resend integration updates, and test-send mutations.
- **CSRF:** required for admin/internal writes:
  `PUT /settings/email`, `POST /settings/email/test`, and
  `PATCH /settings/integrations/:id`.
- **Rate-limit bucket:** `admin_read` for reads and `admin_write` for writes/test
  send. The external Resend API call must run only from the backend.
- **Validation:** `core/server/validation/emailSchemas.ts` owns the Email
  Settings provider enum, and the integrations registry-owned field allowlist
  owns Resend config keys. Unknown fields must remain rejected.
- **Anti-abuse controls:** nonce/signature/HMAC and reCAPTCHA are not applicable
  because this is not a public write surface. Test sends are admin-only,
  permission-gated, CSRF-protected, audit-logged, and rate-limited.
- **Secret handling:** Resend `apiKey` is stored only in `integrations.config` as
  an encrypted `secret` field. Email settings must store only the active provider
  id, SMTP fields, and sender metadata. Browser payloads may contain only
  configured/status booleans and non-secret labels; never return or cache API
  keys, SMTP passwords, bearer tokens, raw authorization headers, or decrypted
  integration runtime config.
- **SSRF guard:** Resend delivery uses fixed
  `https://api.resend.com/emails`. Do not store or accept arbitrary endpoint
  URLs in Email Settings or Integrations for this family.
- **External egress:** the Resend transport must send `Authorization: Bearer`
  only in backend fetch headers, include a bounded `User-Agent`, and keep
  delivery logs/audit metadata free of request payload dumps or secrets.

---

## Architecture

Current owners:

- `core/services/integrations/registry.ts` owns built-in integration definitions.
- `core/services/integrations/integrationsService.ts` owns encrypted integration
  config storage and backend runtime config decryption.
- `core/services/email/emailSettingsService.ts` owns email settings keys,
  normalization, configured-state checks, delivery logs, and system/test sends.
- `core/services/email/emailProvider.ts` owns SMTP transport creation through
  Nodemailer and becomes the shared provider-transport adapter owner.
- `core/services/forms/formAutomationRunner.ts` and
  `core/services/forms/formAutomationRunnerCore.ts` adapt email delivery for
  Form Actions and currently assume SMTP-shaped settings.
- `core/services/audit/auditRedaction.ts` owns audit metadata/string redaction
  for token-like upstream payloads.
- `core/server/routes/emailSettingsRoutes.ts` and
  `core/server/routes/integrationsRoutes.ts` own route orchestration and
  `ApiError` mapping.
- `core/admin/services/emailClient.ts` and
  `core/admin/services/integrationsClient.ts` own admin DTOs.
- `core/admin/ui/settings/EmailSettingsPage.tsx`, `SmtpCard.tsx`,
  `EmailLogsDrawer.tsx`, `IntegrationsPage.tsx`, and `IntegrationDrawer.tsx`
  own the admin UX.

Target shape:

- `EmailProviderId = "smtp" | "resend"` lives in the email service/domain
  contract and is re-exported to admin clients as needed.
- Existing databases with no `email.provider` key read as `smtp`; no SQL
  migration is required unless the implementation changes table shape.
- Existing `email.smtp.*` keys stay intact for backwards compatibility and
  provider switching.
- Resend credentials live in fixed integration id `resend`:
  `config.apiKey` (`secret`, required). No `baseUrl` field is exposed in v1.
- `getEmailSettings()` returns a backwards-compatible response that still
  includes `smtp`, `from`, and `status`, plus Resend provider status metadata.
- `status.configured` is provider-aware: SMTP requires current SMTP credentials
  and sender email; Resend requires `from.email` plus configured `resend.apiKey`.
- SMTP and Resend adapters return the same shared `EmailTransport` /
  `EmailMessage` shape, and form automation uses the same provider-aware seam.
- Admin Email Settings uses a provider selector: `Manual SMTP` vs `Resend`.
  Selecting Resend hides SMTP host/port/user/password inputs and shows Resend
  integration configured state with a configure action.

---

## Sub-Tasks

Physical task family:

- `TASK-404-01-Resend-Integration-Secret-Contract.md`
  - `TASK-404-01-L01-Resend-Connector-and-Secret-Storage.md`
  - `TASK-404-01-L02-Secret-Redaction-and-Key-Clear-State.md`
- `TASK-404-02-Email-Provider-Backend-Contract.md`
  - `TASK-404-02-L01-Provider-Settings-and-Normalization.md`
  - `TASK-404-02-L02-Provider-Transport-and-Delivery-Logs.md`
  - `TASK-404-02-L03-Form-Automation-Provider-Resolution.md`
- `TASK-404-03-Admin-API-and-Client-Contract.md`
  - `TASK-404-03-L01-Email-Settings-Routes-and-Error-Mapping.md`
  - `TASK-404-03-L02-Integrations-Routes-and-Admin-DTOs.md`
- `TASK-404-04-Admin-UX-Validation-and-Closure.md`
  - `TASK-404-04-L01-Email-Settings-Provider-UX.md`
  - `TASK-404-04-L02-Integrations-Provider-UX.md`
  - `TASK-404-04-L03-Validation-Docs-Changelog-and-Board-Closure.md`

---

## Implementation Order

1. Land `TASK-404-01-L01` and `TASK-404-01-L02` first so the Resend connector,
   secret redaction, and key-clear state exist before Email Settings can select
   Resend.
2. Land `TASK-404-02-L01` then `TASK-404-02-L02` so provider settings normalize
   before delivery resolves the active transport.
3. Land `TASK-404-02-L03` after the shared transport exists so Form Actions do
   not keep a hidden SMTP-only path.
4. Land `TASK-404-03-L01` and `TASK-404-03-L02` after backend contracts exist so
   route schemas, error mapping, audit metadata, and admin DTOs match the
   service behavior.
5. Land `TASK-404-04-L01` and `TASK-404-04-L02` after clients expose the new
   DTOs.
6. Land `TASK-404-04-L03` last with docs, changelog, final validation, board
   movement, and closure evidence.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- DB-backed Bun service tests for the relevant leaf after loading env when
  available: `set -a && source .env && set +a`.
- Bun route tests for API leaves.
- Vitest tests for Bun-free email provider, form automation, admin clients, and
  admin/UI leaves.
- Secret scanner checks on the secret-bearing leaves when feasible:
  `bun run scan:gitleaks:worktree` and `bun run scan:semgrep`; otherwise record
  scanner validation as CI-only.
- `bun run gates:coderso` during closure.
- `git diff --check` for this task-family planning split and every docs-only
  closure pass.

---

## Documentation Updates Required

- `_docs/CMS_API.md`: update Email Settings request/response examples, provider
  enum, configured-state rules, route error contract, and delivery log provider
  examples.
- `_docs/INTEGRATIONS.md`: add built-in `resend` connector fields and backend
  runtime usage notes.
- `_docs/SETTINGS.md`: document email provider keys and invariant that Resend
  API keys live in Integrations, not Email Settings.
- `_docs/SECURITY_SPEC.md`: mention Resend API key as a provider credential that
  stays encrypted/backend-only and uncached in browser storage; document the
  fixed Resend endpoint/SSRF guard.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`: update only if the
  implementation introduces any new cached email/integration resource; otherwise
  explicitly keep credential-bearing Email/Integration endpoints uncached.
- `docs/guide/screens/email-settings.md` and
  `docs/guide/screens/integrations.md`: update user-facing setup instructions
  for selecting Resend and configuring the encrypted API key.
- `_docs/_TASKS/README.md`: keep this family and every child/leaf status in sync.
- `_docs/_CHANGELOG/`: add task-linked changelog coverage when each leaf or the
  family is completed.
