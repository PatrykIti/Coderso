# TASK-170-03: Executor Adapters and Domain Service Reuse
# FileName: TASK-170-03_Executor_Adapters_and_Domain_Service_Reuse.md

**Priority:** High  
**Category:** Core/Assistant + Core/Services  
**Estimated Effort:** Large  
**Dependencies:** TASK-170-01, TASK-170-02  
**Status:** In Progress (2026-04-12)

---

## Overview

Implement execution for selected new action families by delegating to existing domain services. This task must not add assistant-only direct DB writes for resources that already have service contracts.

## Sub-Tasks

- `TASK-170-03-01_Entry_Draft_Action_Executor_Adapters.md`
- `TASK-170-03-02_Menu_SEO_Media_Action_Executor_Adapters.md`
- `TASK-170-03-03_Form_Page_Listing_Patch_Executor_Adapters.md`
- `TASK-170-03-04_Executor_Adapter_Docs_Tests_and_Closure.md`

## Pseudocode

```ts
async function executeAction(action, deps, actor) {
  const handler = getAssistantActionHandler(executeRegistry, action.type);
  const normalized = normalizeActionInput(action);
  const result = await handler.execute({ input: normalized.input, deps, actor });

  return redactExecutionResult({
    actionId: action.id,
    status: result.status,
    resourceId: result.resourceId,
    adminHref: result.adminHref,
    publicHref: result.publicHref,
  });
}
```

## Files to Change

- `core/services/assistant/actionExecutorService.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionExecutionStore.ts` only if result payload shape changes
- domain services selected by the action family contracts
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts`

## Security Contract

- Visibility: internal execute only through `/admin/api/assistant/actions/execute`.
- Auth model: admin session.
- RBAC: route and domain services must enforce write/publish permissions; registry metadata is advisory only.
- CSRF: existing POST CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: execute accepts only strict validated plans.
- Anti-abuse: no public write path.
- Idempotency: persistent replay by actor, plan id, and plan hash remains mandatory.
- Secret handling: execution results and persisted idempotency payloads must be redacted.

## Testing Requirements

- Vitest:
  - pure adapter helpers only if extracted without DB/runtime imports.
- Bun:
  - executor success/failure/noop tests,
  - DB-backed idempotency replay and conflict tests,
  - known domain error mapping tests.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. New writes go through existing domain services.
2. Known errors are machine-readable at service level and mapped at route boundary.
3. Idempotency replay remains stable after result shape changes.

## Progress Notes

- 2026-04-12: Split executor adapter work into entry, menu/SEO/media, form/page/listing patch, and closure leaves before implementation.
