# TASK-359-05: Security, Sessions, API Keys, Webhooks, IP Allowlist Confirms
# FileName: TASK-359-05_Security_Sessions_API_Keys_Webhooks_IP_Allowlist_Confirms.md

**Priority:** High
**Category:** Admin UI + Security Settings + Sessions + Confirm UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-359-01, TASK-360-02
**Status:** Done (2026-06-02)

---

## Overview

Add confirmation and lockout protection for high-risk Settings actions:
clearing secrets, revoking sessions, rotating/revoking API keys, deleting or
removing webhooks, removing IP allowlist entries, and saving risky security
policy changes.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `core/admin/ui/settings/**`
- `core/admin/services/sessionsClient.ts`
- `core/admin/services/apiKeysClient.ts`
- `core/admin/services/webhooksClient.ts`
- `core/admin/services/ipAllowlistClient.ts`
- Security settings route/service owners discovered during implementation

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Security settings UI | Classify high-risk diffs and route them through shared confirm. |
| Sessions/API keys/webhooks/IP allowlist UI | Add cancel-safe confirms and one-time secret handling where needed. |
| Relevant clients/routes/services | Ensure strict schemas, CSRF, current `settings:write` or fully migrated narrower RBAC, lockout guards, and audit events. |
| Tests | Cover cancel/confirm, current session/IP safety, API key secret one-time handling, and mapped errors. |

## Implementation Pseudocode

```ts
type HighRiskSettingsChange = {
  kind:
    | "api_key_revoke"
    | "webhook_delete"
    | "ip_allowlist_remove"
    | "security_policy";
  targetLabel: string;
  consequence: string;
  requiresTypedConfirmation?: boolean;
};

function classifySecuritySettingsDiff(
  before: SecuritySettingsResponse,
  after: SecurityFormState
) {
  const risks: HighRiskSettingsChange[] = [];
  if (before.session.singleSession !== after.sessionSingleSession) {
    risks.push({
      kind: "security_policy",
      targetLabel: "Single session mode",
      consequence: "Existing sessions may be revoked.",
    });
  }
  return risks;
}
```

Data flow:

- UI computes high-risk changes before submitting.
- Risky actions open shared confirm with target, consequence, and typed
  confirmation when lockout or irreversible deletion is possible.
- Cancel makes no mutation.
- Confirm calls the specific client once with CSRF.
- Success invalidates relevant caches, refreshes rows/forms, and emits audit.

Error handling:

- Current session revoke is blocked or requires extra confirmation.
- Current-IP allowlist removal is detected or explicitly acknowledged.
- API key secret is displayed once only and never cached.
- Security policy conflicts/403 keep draft visible and refresh permissions.
- External webhook test is handled by `TASK-359-06` when side-effect semantics
  are involved.
- Restore the audit-created `Max sessions per user = 30` override to the
  product default or record an explicit dated owner/reason when intentionally
  keeping it.

## Security Contract

- Endpoint visibility: internal admin sessions/API keys/webhooks/IP allowlist/
  security settings endpoints.
- Auth model: authenticated admin session.
- RBAC: use the current v1 `settings:write` route contract for sessions/API
  keys/webhooks/IP allowlist/security settings unless this implementation
  deliberately introduces narrower high-risk permissions. Any new permission
  requires default-role/seed migration plus `_docs/RBAC_SPEC.md`,
  `_docs/CMS_API.md`, and route-test updates in the same task.
- CSRF: required for all writes/revokes/deletes/rotates/tests.
- Rate-limit bucket: `admin_write`. A new security-sensitive bucket may only be
  used after `_docs/SECURITY_SPEC.md`, runtime bucket selection, tests, and
  release gates define it.
- Reject unknown validation: strict schema-first payloads.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Secret handling: one-time API key secrets never cached or logged; submitted
  secrets are never echoed.
- Audit: all high-risk actions emit redacted audit events.
- Lockout prevention: current session/current IP/admin path/base URL changes
  require block or typed confirmation.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI: cancel paths do not call mutation; confirm paths call once.
- Bun route/service tests: CSRF, strict body validation, current or migrated
  RBAC, lockout guard, one-time API key secret handling, mapped errors, and
  audit.
- Vitest UI: API key rotate/revoke and session revoke display correct success/
  error states.
- Playwright Settings Security fixture exercises TTL/session changes and
  high-risk confirms without leaving QA overrides.
- Playwright/route evidence proves the `Max sessions per user = 30` audit
  override has been restored or explicitly documented with owner/date/reason.
- `bun run gates:coderso` if auth/security release gates are touched.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/RBAC_SPEC.md`
- `_docs/AUTH_SPEC.md`
- `_docs/AUDIT_SPEC.md`
- `_docs/CMS_API.md`
- `docs/guide/screens/security-settings.md`
- `docs/guide/screens/sessions.md`
- `docs/guide/screens/api-keys.md`
- `docs/guide/screens/webhooks.md`
- `docs/guide/screens/ip-allowlist.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- High-risk Settings actions cannot execute without confirm.
- Current session/IP lockout cases are protected.
- Secrets remain one-time/redacted and audit events are safe.

## Completion Notes

- Security high-risk policy saves, Sessions revoke/revoke-all, API key
  rotate/revoke, webhook delete, and IP allowlist remove now route through
  cancel-safe confirms.
- Current-session and current-IP lockout copy remains visible; current session
  revoke remains blocked.
- API key one-time secret handling stays out of browser cache and clears after
  the one-time secret dialog closes.
- QA override note: `Max sessions per user = 30` is intentionally retained for
  the local multi-agent Playwright audit with owner/date/reason in the report.
- Evidence: `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`,
  focused Vitest suites, lint, and typecheck.
