# TASK-101-09-04-02: Execution, Idempotency, Revisions, and Audit Hooks
# FileName: TASK-101-09-04-02_Execution_Idempotency_Revisions_and_Audit_Hooks.md

**Priority:** High  
**Category:** Core/Assistant + Security + Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-04-01  
**Status:** To Do

---

## Overview

Execute path ma byc bezpieczny dla retry i zgodny z produktowymi kontraktami rewizji oraz audytu.

## Files to Change

- `core/services/assistant/actionExecutorService.ts` (new, ~220-320 LOC)
- `core/services/assistant/actions/*` (update, ~200-340 LOC)
- `core/services/audit/auditService.ts` (update, ~20-40 LOC)
- `tests/vitest/assistant/action-executor-service.test.ts` (new, ~180-260 LOC)

## Pseudocode

```ts
if (await hasProcessedIdempotencyKey(key)) {
  return loadPreviousExecutionResult(key);
}

const result = await executeThroughDomainServices(plan, ctx);
await writeAuditTrail(result);
await saveIdempotencyResult(key, result);
```

## Sub-Tasks

1. Add idempotency guards and replay-safe result loading.
2. Route mutating actions through existing revision hooks.
3. Emit audit entries with redacted metadata.

## Testing Requirements

- Vitest unit for idempotency replay.
- Vitest unit for audit/revision hook orchestration.
- Bun integration for mutation flow where service boundaries are runtime-owned.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/ARCHITECTURE.md`
