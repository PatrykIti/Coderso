# TASK-359-06: Email, Storage, Integrations, Assistant Action Truthfulness
# FileName: TASK-359-06_Email_Storage_Integrations_Assistant_Action_Truthfulness.md

**Priority:** High
**Category:** Admin UI + Settings + External Actions + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-359-01, TASK-360-02, TASK-360-05
**Status:** To Do

---

## Overview

Make Settings external-action controls real or truthfully unavailable: Email
logs/test email, Storage test connection, Integration/Webhook actions, IP
Allowlist drawer semantics, and Assistant reindex.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `core/admin/ui/settings/**`
- `core/admin/services/emailClient.ts`
- `core/admin/services/webhooksClient.ts`
- `core/admin/services/integrationsClient.ts`
- `core/admin/services/ipAllowlistClient.ts`
- Assistant reindex route/service owners discovered during implementation

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Email settings UI/client/routes | Implement or disable Export Logs; confirm Send Test Email with recipient/environment preview. |
| Storage settings UI/client/routes | Implement or disable Test Connection for local/S3/Azure with redacted result payloads. |
| Integrations/Webhooks UI/client/routes | Confirm/audit secret save and webhook test/delete side effects. |
| Assistant settings UI/client/routes | Add confirm/dry-run with document/chunk counts before reindex. |
| Drawers/sheets | Add `SheetTitle` and `SheetDescription` for Webhook, Email, Integrations, and IP Allowlist drawers. |
| Tests | Cover no-op removal, external confirms, redaction, timeouts, and drawer warning-free behavior. |

## Implementation Pseudocode

```ts
type ExternalSettingsAction =
  | { kind: "email_test"; recipient: string }
  | { kind: "email_logs_export"; format: "csv" | "json" }
  | { kind: "storage_test"; driver: "local" | "s3" | "azure" }
  | { kind: "webhook_test"; webhookId: string }
  | { kind: "assistant_reindex"; dryRun: boolean };

async function executeExternalSettingsAction(action: ExternalSettingsAction) {
  const confirmed = await confirmExternalAction(action);
  if (!confirmed) return { status: "cancelled" as const };
  return settingsExternalActionsClient.execute(action);
}
```

Data flow:

- UI builds an external-action descriptor with redacted labels only.
- Confirm dialog shows environment, target, and side effect.
- Client calls the matching internal admin endpoint with CSRF.
- Server validates permission, payload, provider config, and redacts response.
- UI shows success/error toast and audit event id when available.
- Assistant reindex can dry-run document/chunk counts before mutation.

Error handling:

- Missing provider config blocks test with actionable field errors.
- External timeout maps to stable `*_test_timeout` copy.
- Secret validation failures never echo submitted secret values.
- Assistant reindex failure leaves existing index untouched or reports partial
  status only if backend supports it.
- Unsupported actions render disabled/read-only and cannot submit.

## Security Contract

- Endpoint visibility: internal admin settings/email/storage/integrations/
  assistant routes.
- Auth model: authenticated admin session.
- RBAC: settings/security/integration-specific permission matching each action;
  do not use broad write permission where a narrower high-risk permission exists.
- CSRF: required for tests, sends, exports, reindex, secret saves, and webhook
  actions.
- Rate-limit bucket: external action/security-sensitive bucket.
- Reject unknown validation: strict schemas for all action descriptors.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Secret handling: no SMTP/storage/integration/webhook secret echo; redacted
  configured flags only.
- Audit: external tests, reindex, exports, webhook actions, and secret changes
  emit redacted summary events.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI: Storage Test Connection and Email Export Logs no longer no-op or
  are disabled/read-only.
- Vitest UI: external send/test/reindex actions require explicit confirm.
- Bun route/service tests for strict validation, RBAC, CSRF, redaction, timeout
  mapping, and audit.
- Drawer accessibility warning tests for Webhook, Email, Integrations, and IP
  Allowlist sheets.
- No-op audit gate from `TASK-360-04` must not flag these controls.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/CMS_API.md`
- `_docs/AUDIT_SPEC.md`
- `docs/guide/screens/settings.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- External-action controls either execute real supported actions or are
  truthfully unavailable.
- Side-effect actions require confirmation and redacted audit.
- Settings drawers expose valid title/description semantics.

