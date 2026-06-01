# TASK-358-02: Session Detail and Revoke Access Contract
# FileName: TASK-358-02_Session_Detail_and_Revoke_Access_Contract.md

**Priority:** High
**Category:** Admin UI + Access Logs + Sessions + Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-358-01, TASK-359-05, TASK-360-02
**Status:** To Do

---

## Overview

Make `View full session` and `Revoke access` real, permission-gated actions for
access log rows that resolve to an active session, and truthful unavailable
states for rows that do not.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `core/admin/ui/security/AccessLogsPage.tsx`
- `core/admin/ui/security/AccessLogsTable.tsx`
- `core/admin/ui/security/AccessLogDetailsDrawer.tsx`
- Existing sessions client/routes used by Settings Security

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Access log route/service modules | Register `POST /admin/api/access-logs/:id/revoke` and resolve session state. |
| Sessions route/service modules | Reuse existing session detail/revoke primitives where available. |
| Access logs admin client | Add typed revoke client with CSRF and mapped errors. |
| Access logs UI components | Wire View full session navigation/drawer and revoke confirm/unavailable states. |
| Tests | Cover row-state matrix, RBAC split, CSRF, self-lockout guard, idempotency, and UI confirm. |

## Implementation Pseudocode

```ts
type RevokeAccessRequest = {
  accessLogId: string;
  sessionId?: string;
  actorId?: string;
  reason: "admin_manual_revoke";
};

async function revokeAccessFromLog(input: RevokeAccessRequest) {
  return apiRequest<{ ok: boolean; revokedSessionId?: string }>(
    `/access-logs/${input.accessLogId}/revoke`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
}
```

Data flow:

- Access log row classifies session state: current session, already revoked, no
  session id, expired session, other user's active session, or blocked/failed
  attempt.
- Rows with active resolvable session expose `View full session` and permission
  gated `Revoke access`.
- View full session navigates to
  `/admin/settings/security/sessions?sessionId=<id>` or opens a backed session
  detail drawer.
- Revoke opens shared confirm, posts to
  `POST /admin/api/access-logs/:id/revoke`, refreshes row/session state, and
  emits audit.

Error handling:

- Missing session relation maps to `access_log_session_not_found`.
- Already revoked sessions return idempotent success or clear conflict copy.
- Current session revoke requires extra confirmation or is blocked.
- Revoke cannot fall back to `audit:read`; it requires `sessions:write`,
  `security:write`, or a newly defined equivalent high-risk permission.

## Security Contract

- Endpoint visibility: internal admin,
  `POST /admin/api/access-logs/:id/revoke`.
- Auth model: authenticated admin session.
- RBAC: high-risk session/security write permission required; `audit:read`
  alone is insufficient.
- CSRF: required.
- Rate-limit bucket: security-sensitive/admin write.
- Reject unknown validation: strict id/body schema and self-lockout guard.
- Anti-abuse: internal session route; no nonce, HMAC, or captcha.
- Audit: revoke emits summary audit event with access log id, revoked session
  id when available, actor id when permitted, and reason.
- Secret handling: no cookies, authorization headers, session secrets, or raw
  tokens in UI/API/audit payloads.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Bun route/service tests for RBAC split, CSRF, strict body validation,
  missing session relation, already revoked session, current-session guard, and
  audit event.
- Vitest UI tests for disabled unavailable states, view session link/drawer,
  revoke confirm cancel no API call, confirm one API call, and refresh state.
- Playwright admin/restricted fixtures prove `audit:read` can view logs but
  cannot revoke, while high-risk permission can revoke with confirm.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `_docs/CMS_API.md`
- `_docs/AUTH_SPEC.md` or `_docs/RBAC_SPEC.md` if new session permission is defined
- `_docs/AUDIT_SPEC.md`
- `docs/guide/screens/access-logs.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- View/revoke actions are real or deterministically unavailable per row state.
- Revoke uses a stronger permission than `audit:read`.
- Self-lockout and already-revoked cases are explicitly handled and tested.

