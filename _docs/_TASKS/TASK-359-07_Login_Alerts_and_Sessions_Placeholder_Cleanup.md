# TASK-359-07: Login Alerts and Sessions Placeholder Cleanup
# FileName: TASK-359-07_Login_Alerts_and_Sessions_Placeholder_Cleanup.md

**Priority:** High
**Category:** Admin UI + Settings + Login Alerts + Sessions + UX Truthfulness
**Estimated Effort:** Medium
**Dependencies:** TASK-359-01, TASK-359-05, TASK-360-04
**Status:** To Do

---

## Overview

Clean up active-looking Login Alerts and Sessions placeholders. Sticky/topbar
actions must use the same handlers, supported controls must persist through a
strict schema, and unsupported controls/buttons must be disabled or removed.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `core/admin/ui/settings/**`
- `core/admin/services/sessionsClient.ts`
- Security/login-alert settings route/service owners discovered during
  implementation

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Login Alerts settings UI | Wire topbar and sticky save/discard to the same handlers or remove sticky bar. |
| Login Alerts schema/service | Persist brute-force threshold, recipients, custom email list, and channels or render controls disabled/read-only. |
| Sessions settings UI | Make Change Password/Security Settings buttons navigate to supported routes or remove/disable them. |
| Tests | Cover sticky actions, unsupported controls, recipient validation, and sessions link-buttons. |

## Implementation Pseudocode

```ts
type LoginAlertsPayload = {
  enabled: boolean;
  notifyOnNewDevice: boolean;
  notifyOnNewLocation: boolean;
  bruteForceThreshold?: number;
  recipients?: string[];
  channels?: Array<"email" | "webhook">;
};

function buildLoginAlertsPayload(form: LoginAlertsFormState): LoginAlertsPayload {
  return strictNormalizeLoginAlerts({
    enabled: form.enabled,
    notifyOnNewDevice: form.notifyOnNewDevice,
    notifyOnNewLocation: form.notifyOnNewLocation,
    bruteForceThreshold: form.bruteForceThreshold,
    recipients: parseEmailList(form.recipients),
    channels: form.channels,
  });
}
```

Data flow:

- Topbar and sticky actions call the same save/discard handlers.
- Unsupported controls render disabled and do not enter dirty-state snapshots.
- Supported controls normalize into one `loginAlerts` payload.
- Save updates settings and refreshes local form from the server response.
- Sessions link-buttons route to supported pages/dialogs or render unavailable.

Error handling:

- Invalid recipient emails block save with field errors.
- Unsupported channel/webhook configuration remains disabled.
- API 403 refreshes permission snapshot and keeps draft visible.
- Discard restores the last server response.

## Security Contract

- Endpoint visibility: internal admin settings/sessions endpoints.
- Auth model: authenticated admin session.
- RBAC: `settings:read` for read; `settings:write` or specific security
  permission for Login Alerts writes; session revokes remain owned by
  `TASK-359-05`.
- CSRF: required for writes.
- Rate-limit bucket: admin write/security-sensitive where applicable.
- Reject unknown validation: strict Login Alerts schema and email recipient
  validation.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Secret handling: no webhook/channel secrets in Login Alerts payload or cache.
- Audit: Login Alerts writes emit redacted summary events if existing settings
  write audit policy requires them.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI: sticky save/discard works through same handlers or sticky bar is
  absent.
- Vitest UI/domain: brute-force slider, recipients, custom email list, and
  channels persist or are disabled/read-only and cannot submit.
- Recipient validation tests for invalid email entries.
- Vitest UI: Sessions Change Password/Security Settings buttons navigate or are
  not active.
- No-op audit gate from `TASK-360-04` must not flag Login Alerts/Sessions.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/CMS_API.md` if Login Alerts payload changes
- `docs/guide/screens/settings.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Login Alerts controls are persisted or truthfully unavailable.
- Sticky and topbar actions do not diverge.
- Sessions buttons do not remain active no-ops.

