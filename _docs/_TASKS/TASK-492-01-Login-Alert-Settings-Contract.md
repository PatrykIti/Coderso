# TASK-492-01: Login Alert Settings Contract (schema + policy)

# FileName: TASK-492-01-Login-Alert-Settings-Contract.md

**Parent Task:** TASK-492
**Priority:** Medium
**Category:** Settings / Security
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

## Overview

Extend the `loginAlerts` security-settings contract so it can carry recipient and
webhook configuration plus a runtime delivery-status field. Today the contract is
only `{ enabled, notifyOnNewDevice, notifyOnNewLocation }`
(`core/services/settings/securitySettings.ts:83-87`), but the assistant operation
policy (`core/services/assistant/operationPolicy/adminSurfacePolicies.ts:636-642`)
already references `loginAlerts.recipients`, `loginAlerts.webhookUrl`, and
`loginAlerts.deliveryError`. This subtask makes the **domain owner** module the
source of truth for the new fields and keeps the route-level JSON schema and the
assistant redaction policy consistent.

No DB migration: `security.settings` is stored in the `settings.value` `jsonb`
column (`core/db/schema.ts:373-376`); `normalizeStoredSettings` defaults any
missing fields, so existing rows remain valid.

## Sub-Tasks

| ID                 | Title                                            | Effort | Status     |
| ------------------ | ------------------------------------------------ | ------ | ---------- |
| TASK-492-01-L01    | Extend `loginAlerts` contract in `securitySettings.ts` | Small | ⏳ To Do |
| TASK-492-01-L02    | Route JSON schema + assistant redaction policy   | Small  | ⏳ To Do   |

## Dependencies
- L02 depends on L01 (the route schema mirrors the client-writable subset of the
  contract owned by `securitySettings.ts`).

## Testing Requirements
- L01: **Bun** db-backed round-trip of the new fields, extending
  `tests/unit/security/securitySettings.test.ts` (normalize, dedupe/clamp,
  reject-unknown via `assertAllowedKeys`, encrypted `webhookSecret` stored +
  public `{ configured }` projection, `deliveryError` round-trip).
- L02: **Vitest** schema reject-unknown in
  `tests/vitest/validation/securitySettingsSchema.test.ts` and assistant policy
  consistency in `tests/vitest/assistant/operation-policy-cms-resources.test.ts`.
