# TASK-173-01-02: Action Family Route Error Matrix
# FileName: TASK-173-01-02_Action_Family_Route_Error_Matrix.md

**Priority:** High  
**Category:** QA/Assistant + Route Contracts  
**Estimated Effort:** Medium  
**Dependencies:** TASK-173-01, TASK-170  
**Status:** To Do

---

## Overview

Create route/error coverage for each supported action family so invalid plans, missing permissions, CSRF failures, and idempotency conflicts stay machine-readable.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
for (const family of supportedActionFamilies) {
  await expectPlanRejectsUnknownFields(family);
  await expectDryRunRequiresReadPermission(family);
  await expectExecuteRequiresWritePermission(family);
  await expectExecuteRequiresIdempotencyKey(family);
}
```

## Files to Change

- `tests/integration/routes/assistant.test.ts`
- `core/server/routes/assistantRoutes.ts` only if mapping gaps are found
- `core/server/validation/assistantSchemas.ts` or assistant action schemas if split
- `_docs/CMS_API.md`

## Security Contract

- Visibility: internal action endpoints.
- Auth model: admin session.
- RBAC: matrix proves per-family read/write permission checks.
- CSRF: tests cover missing/invalid token.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: tests cover unknown fields/actions.
- Anti-abuse: no public write path.
- Idempotency: tests cover required/replay/conflict behavior for execute.
- Secret handling: route errors must not include raw sensitive payloads.

## Testing Requirements

- Vitest:
  - pure schema error cases where route not required.
- Bun:
  - route matrix for plan/dry-run/execute.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Route errors are machine-readable and documented.
2. Permission/CSRF/idempotency cases are tested per action family.
3. Error payloads remain redacted.
