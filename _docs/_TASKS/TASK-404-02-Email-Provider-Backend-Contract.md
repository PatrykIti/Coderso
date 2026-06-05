# TASK-404-02: Email Provider Backend Contract
# FileName: TASK-404-02-Email-Provider-Backend-Contract.md

**Parent Task:** TASK-404
**Priority:** High
**Category:** Settings / Email / Backend
**Estimated Effort:** Large
**Dependencies:** TASK-404-01
**Status:** ⏳ To Do

---

## Overview

Make the backend email contract provider-aware. This subtask owns provider
normalization, SMTP backward compatibility, shared transport interfaces, Resend
egress, delivery logs, and Form Action email automation alignment.

---

## Security Contract

- **Endpoint visibility:** no new endpoints in this subtask; backend services
  are consumed by existing internal admin routes and internal form automation.
- **Auth model:** not changed in this subtask.
- **RBAC:** not changed in this subtask; route leaves enforce `settings:*`.
- **CSRF:** not applicable to service helpers.
- **Rate-limit bucket:** not changed; test-send routing remains `admin_write`.
- **Validation:** service/domain helpers own provider normalization and
  configured-state checks. Invalid providers must remain machine-readable.
- **Anti-abuse controls:** no public write surface is added.
- **Secret handling:** Resend API keys are resolved only through backend runtime
  integration config. Delivery logs and action run payloads must not include
  SMTP passwords, Resend API keys, bearer headers, or upstream request bodies.
- **External egress:** Resend sends only to fixed
  `https://api.resend.com/emails`, with backend-only `Authorization: Bearer`
  headers and bounded idempotency/User-Agent headers.

---

## Sub-Tasks

- `TASK-404-02-L01-Provider-Settings-and-Normalization.md`
- `TASK-404-02-L02-Provider-Transport-and-Delivery-Logs.md`
- `TASK-404-02-L03-Form-Automation-Provider-Resolution.md`

---

## Testing Requirements

- `set -a && source .env && set +a && bun test tests/unit/email/emailSettingsService.test.ts tests/unit/integrations/integrationsService.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/email/emailProvider.test.ts tests/vitest/forms/formAutomationRunnerCore.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`: provider-aware configured-state and delivery logs.
- `_docs/SETTINGS.md`: email provider keys and defaults.
- `_docs/SECURITY_SPEC.md`: backend-only Resend egress and no secret logs.
- `_docs/_TASKS/README.md`: keep status rows synchronized.
- `_docs/_CHANGELOG/`: add changelog coverage when leaves close.
