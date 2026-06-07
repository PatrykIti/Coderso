# TASK-409-01-L02: Secret Redaction and Key Clear State
# FileName: TASK-409-01-L02-Secret-Redaction-and-Key-Clear-State.md

**Parent Subtask:** TASK-409-01
**Priority:** High
**Category:** Security / Audit / Integrations
**Estimated Effort:** Medium
**Dependencies:** TASK-409-01-L01
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Harden secret redaction for Resend-shaped API keys and define the key-clear
state for the Resend integration.

Clearing `resend.apiKey` through the integration drawer must make the integration
disconnected. If Email Settings still selects `resend`, the provider remains
selected but unconfigured until a key is saved again or the provider is switched.

Files to inspect/change:

- `core/services/audit/auditRedaction.ts`
- `core/services/integrations/integrationsService.ts`
- `tests/unit/audit/auditService.test.ts`
- `tests/unit/audit/auditExport.test.ts`
- `tests/unit/integrations/integrationsService.test.ts`
- `tests/vitest/ui/audit-entry-actions.test.ts`

---

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF:** unchanged for existing integration writes.
- **Rate-limit bucket:** unchanged.
- **Validation:** clearing `apiKey` is an allowed `null` value for the known
  secret field. Unknown keys remain rejected.
- **Anti-abuse controls:** nonce/signature/HMAC and reCAPTCHA are not applicable.
- **Secret handling:** redact Resend key strings such as `re_...`, bearer
  headers, authorization-like strings, and nested metadata before audit storage,
  export, UI rendering, or logs.

---

## Sub-Tasks

None. This is an execution leaf.

---

## Implementation Pseudocode

Redaction shape:

```ts
const redactionPatterns = [
  // existing patterns...
  /\bre_[a-zA-Z0-9_-]{8,}\b/g,
];
```

Key-clear behavior:

```ts
await updateIntegration("resend", { config: { apiKey: null } });
const summary = await getIntegration("resend");
summary.status; // "disconnected"
summary.fields.find((field) => field.key === "apiKey")?.configured; // false
```

Data flow:

- Integration update accepts `apiKey: null`.
- Service persists `config.apiKey = null`.
- Summary treats null secret value as not configured.
- Email service later treats active provider `resend` with missing key as
  `email_not_configured`.
- Audit redaction runs on any metadata/export payload that accidentally contains
  raw `re_...` strings or bearer headers.

Error handling:

- Empty/cleared key is valid as a state transition, not a secret-store error.
- Active Resend delivery without key is handled by the email service as
  `email_not_configured`, not by this leaf.
- Redaction should be conservative: replace matching secret strings with
  `[REDACTED]` without throwing.

Regression-test shape:

- Raw string `re_superSecretValue` is redacted.
- Nested metadata containing `Authorization: Bearer re_...` is redacted.
- Audit export tests do not expose `re_...`.
- Clearing `resend.apiKey` marks integration disconnected and runtime config
  returns null for `apiKey`.

---

## Testing Requirements

- `bun test tests/unit/audit/auditService.test.ts tests/unit/audit/auditExport.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/integrations/integrationsService.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/audit-entry-actions.test.ts` if audit UI output is touched.
- `bun run scan:gitleaks:worktree`
- `bun run scan:semgrep`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`: mention Resend key redaction and clear/disconnected
  state.
- `_docs/INTEGRATIONS.md`: document clearing the key disconnects Resend.
- `_docs/_TASKS/README.md`: update status if this leaf starts/closes.
- `_docs/_CHANGELOG/`: add changelog coverage when this leaf closes.
