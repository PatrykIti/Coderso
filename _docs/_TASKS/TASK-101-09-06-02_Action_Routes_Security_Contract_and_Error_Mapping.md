# TASK-101-09-06-02: Action Routes, Security Contract, and Error Mapping
# FileName: TASK-101-09-06-02_Action_Routes_Security_Contract_and_Error_Mapping.md

**Priority:** High  
**Category:** API + Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-04, TASK-101-09-06-01  
**Status:** To Do

---

## Overview

Dodac internal assistant action endpoints i domknac ich kontrakt bezpieczenstwa.

## Scope

1. `POST /admin/api/assistant/actions/plan`
2. `POST /admin/api/assistant/actions/dry-run`
3. `POST /admin/api/assistant/actions/execute`

## Files to Change

- `core/server/routes/assistantRoutes.ts` (update, ~120-220 LOC)
- `core/server/validation/assistantActionSchemas.ts` (new/update, ~180-260 LOC)
- `tests/integration/routes/assistant-actions.test.ts` (new, ~220-340 LOC)
- `tests/vitest/assistant/assistant-action-route-errors.test.ts` (new, ~120-180 LOC)

## Security Contract

- Visibility: `internal`.
- Auth model: admin session cookie only.
- RBAC:
  - `plan` / `dry-run`: route floor `settings:read`,
  - `execute`: route floor `settings:write`,
  - every action additionally checks domain-specific permissions before preview/execute.
- CSRF expectations:
  - all `POST` endpoints require `X-CSRF-Token`,
  - no CSRF bypass for assistant action endpoints.
- Rate-limit bucket: `assistant`.
- Strict reject-unknown validation: `true` on every request schema.
- Anti-abuse controls:
  - no public route,
  - no nonce/HMAC path because endpoint is internal-only,
  - idempotency key required for `execute`,
  - redacted context payload and capped request size.

## Pseudocode

```ts
router.post("/assistant/actions/execute", requirePermission("settings:write"), async (ctx) => {
  validate(assistantActionExecuteSchema, ctx.body ?? {});
  return executeAssistantActionPlan(ctx.body, { actorId: ctx.user?.id ?? null });
});
```

## Sub-Tasks

1. Add schemas and route handlers.
2. Map machine-readable domain errors to API errors.
3. Cover permission, validation, and idempotency failures.

## Testing Requirements

- Bun integration for route success/failure matrix.
- Vitest unit for error mapping and schema validation.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
