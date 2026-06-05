# TASK-404-01: Resend Integration Secret Contract
# FileName: TASK-404-01-Resend-Integration-Secret-Contract.md

**Parent Task:** TASK-404
**Priority:** High
**Category:** Settings / Integrations / Secrets
**Estimated Effort:** Medium
**Dependencies:** TASK-404
**Status:** ⏳ To Do

---

## Overview

Add Resend as a built-in integration and lock the secret-handling contract before
Email Settings can select it as a delivery provider.

This subtask owns the integration registry entry, encrypted `apiKey` handling,
unknown-field rejection, key-clear/disconnected behavior, and audit redaction for
Resend-shaped secrets. It does not make Email Settings provider-aware by itself.

---

## Security Contract

- **Endpoint visibility:** no new endpoints. Existing internal admin
  integrations endpoints remain `/settings/integrations*`.
- **Auth model:** authenticated admin session through existing route guards.
- **RBAC:** `settings:read` for integration reads and `settings:write` for
  integration updates.
- **CSRF:** required for `PATCH /settings/integrations/:id`.
- **Rate-limit bucket:** `admin_read` for reads and `admin_write` for writes.
- **Validation:** the registry allowlist must accept only `apiKey` for `resend`;
  `baseUrl` and unknown keys must reject as `integration_config_invalid`.
- **Anti-abuse controls:** nonce/signature/HMAC and reCAPTCHA are not
  applicable; this remains an internal admin settings surface.
- **Secret handling:** `resend.apiKey` is encrypted at rest, redacted from API
  summaries/browser payloads/audit metadata, and decrypted only through backend
  runtime config resolution.

---

## Sub-Tasks

- `TASK-404-01-L01-Resend-Connector-and-Secret-Storage.md`
- `TASK-404-01-L02-Secret-Redaction-and-Key-Clear-State.md`

---

## Testing Requirements

- `set -a && source .env && set +a && bun test tests/unit/integrations/integrationsService.test.ts tests/unit/security/secretStore.test.ts`
- `bun test tests/unit/audit/auditService.test.ts tests/unit/audit/auditExport.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/audit-entry-actions.test.ts` if audit UI payload redaction changes.
- `bun run scan:gitleaks:worktree` and `bun run scan:semgrep` when feasible for
  the secret-bearing changes.

---

## Documentation Updates Required

- `_docs/INTEGRATIONS.md`: add Resend as a built-in integration.
- `_docs/SECURITY_SPEC.md`: document Resend API key encryption/redaction and
  fixed-origin handling.
- `_docs/_TASKS/README.md`: keep status rows synchronized.
- `_docs/_CHANGELOG/`: add changelog coverage when leaves close.
