# TASK-101-09-04-02: Execution, Idempotency, Revisions, and Audit Hooks
# FileName: TASK-101-09-04-02_Execution_Idempotency_Revisions_and_Audit_Hooks.md

**Priority:** High  
**Category:** Core/Assistant + Security + Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-04-01  
**Status:** In Progress (2026-04-11)

---

## Overview

Execute path ma byc bezpieczny dla retry i zgodny z produktowymi kontraktami rewizji oraz audytu.

## Files to Change

- `core/services/assistant/actionExecutorService.ts` (new, ~220-320 LOC)
- `core/services/assistant/actions/*` (update, ~200-340 LOC)
- `core/services/audit/auditService.ts` (update, ~20-40 LOC)
- `tests/vitest/assistant/action-executor-service.test.ts` (new only if executor becomes Bun-free, ~180-260 LOC)
- `tests/unit/assistant/actionExecutorService.test.ts` (Bun-owned fallback if module remains runtime-coupled)

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

- Vitest unit for idempotency/audit orchestration only after extraction removes import-time runtime coupling.
- If the module still imports DB/settings/runtime services on load, keep the suite in Bun.
- Bun integration for mutation flow where service boundaries are runtime-owned.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/ARCHITECTURE.md`

## Audit Notes (2026-04-11)

- Execute path, audit event, and retry-safe idempotency cache are implemented.
- Idempotency is currently process-local memory, not persisted storage.
- Broader revision integration remains open where individual domain resources need richer revision hooks.
