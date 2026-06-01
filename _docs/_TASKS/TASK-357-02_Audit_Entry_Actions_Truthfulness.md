# TASK-357-02: Audit Entry Actions Truthfulness
# FileName: TASK-357-02_Audit_Entry_Actions_Truthfulness.md

**Priority:** High
**Category:** Admin UI + Audit Logs + UX Truthfulness + Redaction
**Estimated Effort:** Medium
**Dependencies:** TASK-357-01, TASK-360-04
**Status:** To Do

---

## Overview

Make Audit row/drawer actions truthful: `Copy JSON` must copy redacted JSON with
feedback, while `Export entry`, `Share Log`, and `Report` must either perform a
supported action or render as unavailable.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `core/admin/ui/audit/AuditTable.tsx`
- `core/admin/ui/audit/AuditDetailsDrawer.tsx`
- Audit redaction helpers discovered during implementation

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/audit/AuditDetailsDrawer.tsx` | Wire actions to shared implementations or render disabled/unavailable states. |
| `core/admin/ui/audit/AuditTable.tsx` | Reuse the same action handlers from row menu and details drawer. |
| Audit redaction helper module | Add or reuse `buildPublicAuditEntryPayload` and `redactAuditPayload`. |
| Tests | Cover clipboard success/failure, disabled actions, shared handler use, and redaction. |

## Implementation Pseudocode

```ts
async function copyAuditEntryJson(entry: AuditLogEntry) {
  const payload = JSON.stringify(buildPublicAuditEntryPayload(entry), null, 2);
  await navigator.clipboard.writeText(payload);
  toast.success("Audit entry copied.");
}

function buildPublicAuditEntryPayload(entry: AuditLogEntry) {
  return {
    id: entry.id,
    event: entry.event,
    actor: entry.actor,
    resource: entry.resource,
    severity: entry.severity,
    createdAt: entry.createdAt,
    payload: redactAuditPayload(entry.payload),
  };
}
```

Data flow:

- Row menu and details drawer call the same action implementation.
- `Copy JSON` builds redacted payload at click time and writes to Clipboard API.
- Success/failure toasts expose the outcome.
- Unsupported actions render disabled or hidden with explicit unavailable copy,
  not active-looking no-op buttons.

Error handling:

- Clipboard unavailable or denied shows a failure toast and does not silently
  succeed.
- Redaction removes tokens, cookies, password-like keys, authorization headers,
  CSRF tokens, reset tokens, and session IDs.
- Disabled unsupported actions are not focusable as active commands.

## Security Contract

- Endpoint visibility: none for copy/unavailable actions; if entry export is
  implemented here, use the internal audit export contract from `TASK-357-03`.
- Auth model/RBAC: unchanged for UI-only copy of already-loaded audit entry;
  any server action requires `audit:read`.
- CSRF: none for Clipboard API; required for server export POST if added.
- Rate-limit bucket: unchanged unless a server action is added.
- Reject unknown validation: unchanged unless a server action is added.
- Anti-abuse: no public write endpoint.
- Redaction: copied/exported/shareable entry payload must use the same
  redaction helper as details drawer/export.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI tests for clipboard success, clipboard failure, and disabled
  unsupported actions.
- Redaction unit tests for tokens/cookies/password-like keys.
- Vitest UI test proving row menu and drawer use equivalent action behavior.
- No-op audit gate from `TASK-360-04` must not flag remaining Audit actions.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `_docs/AUDIT_SPEC.md` if redaction payload shape is clarified
- `docs/guide/screens/audit-logs.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- `Copy JSON` copies redacted JSON and reports success/failure.
- Unsupported Audit actions no longer appear as active commands.
- Row and drawer actions behave consistently.

