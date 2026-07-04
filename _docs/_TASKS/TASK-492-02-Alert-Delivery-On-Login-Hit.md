# TASK-492-02: Alert Delivery on Login Hit (email + signed webhook)

# FileName: TASK-492-02-Alert-Delivery-On-Login-Hit.md

**Parent Task:** TASK-492
**Priority:** Medium
**Category:** Settings / Security
**Estimated Effort:** Small
**Dependencies:** TASK-492-01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

## Overview

Turn the detection-only login-alert branch into an actual notification. Today the
`shouldAlert` branch in `POST /auth/login`
(`core/server/routes/authRoutes.ts:232-252`) only writes an `auth.login.alert`
audit record. This subtask adds a dedicated delivery service that emails the
affected user plus configured recipients (via `sendSystemEmail`) and POSTs a
signed payload to `webhookUrl` when configured, then wires it into the login path
behind an injectable dependency so it stays testable in the Bun route lane.

Delivery is **best-effort and non-blocking for login**: a failed email/webhook
must never fail the login response; failures are sanitized, recorded as the
`loginAlerts.deliveryError` status (from TASK-492-01), and logged via the audit
record metadata.

## Sub-Tasks

| ID                 | Title                                          | Effort | Status     |
| ------------------ | ---------------------------------------------- | ------ | ---------- |
| TASK-492-02-L01    | Login-alert delivery service (email + webhook) | Small  | ⏳ To Do   |
| TASK-492-02-L02    | Wire delivery into `POST /auth/login`          | Small  | ⏳ To Do   |

## Dependencies
- Depends on TASK-492-01 (consumes `recipients`, `webhookUrl`, `webhookSecret`,
  and writes `deliveryError`).
- L02 depends on L01.

## Testing Requirements
- L01: **Bun** unit (`tests/unit/auth/loginAlertDelivery.test.ts`) with injected
  `sendSystemEmail` + `fetch` deps — assert recipient composition, signed-webhook
  headers/HMAC, error sanitization, and that no throw escapes.
- L02: **Bun** route integration extending `tests/integration/routes/auth.test.ts`
  — assert the login response still returns on delivery failure and that the
  delivery dep is invoked only when `shouldAlert` is true.
