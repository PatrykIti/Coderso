# TASK-101-09-04-02: Execution, Idempotency, Revisions, and Audit Hooks
# FileName: TASK-101-09-04-02_Execution_Idempotency_Revisions_and_Audit_Hooks.md

**Priority:** High
**Category:** Core/Assistant + Security + Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-04-01
**Status:** Done (2026-04-12)

---

## Overview

Execute path juz istnieje, ale retry/idempotency nie jest jeszcze trwale bezpieczne.

Already done:
- `executeAssistantActionPlan` wymaga `idempotencyKey`,
- process-local cache zwraca ten sam wynik dla powtorzonego klucza w tym samym procesie,
- `assistant.actions.execute` audit event jest emitowany,
- pages/entries publish flows uzywaja istniejacych domain service hooks tam, gdzie sa wywolane.

Implemented in this slice:
- persistent idempotency/replay-safe result loading across restart/process,
- idempotency conflict detection scoped by actor/plan/hash,
- redacted stored result payload,
- DB migration artifacts for `assistant_action_executions`.

## Target Contract

```ts
const existing = await deps.getExecutionByIdempotencyKey(key);
if (existing) return existing.result;

const result = await executeThroughRegistry(plan, ctx);
await deps.saveExecutionResult({ idempotencyKey: key, planId: plan.id, result });
await deps.logAudit(redactExecutionAudit(result));
return result;
```

## Security Contract

- Visibility: internal through existing `/assistant/actions/execute`.
- Auth: admin session.
- RBAC: existing route/domain checks remain authority.
- CSRF: existing execute POST CSRF.
- Rate-limit: `assistant`.
- Idempotency:
  - required key stays mandatory,
  - persistent replay must be scoped to actor/plan/hash to avoid cross-user replay,
  - result payload must be redacted before storage if it contains metadata.
- DB:
  - if DB storage is added, include SQL migration, `meta/*_snapshot.json`, and `meta/_journal.json`.
- Secret handling:
  - no provider keys, session/cookie/CSRF data, form submissions, raw entry values, or secret-like settings in stored/audit metadata.

## Files to Change

- `core/services/assistant/actionExecutorService.ts`
- `core/services/audit/auditService.ts` only if audit metadata helper ownership changes
- optional new storage module:
  - `core/services/assistant/actionExecutionStore.ts`
- optional DB artifacts:
  - migration SQL,
  - Drizzle schema/meta files
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts` when DB storage lands and `DATABASE_URL` is reachable
- `tests/integration/routes/assistant.test.ts`

## Sub-Tasks

1. Define idempotency record ownership and key scope.
2. Persist replay-safe result or explicitly document non-DB fallback if persistence is postponed.
3. Redact audit/idempotency metadata.
4. Verify revision behavior for page publish and entry publish paths already exposed through domain services.
5. Keep route response shape stable unless docs/API are updated.

## Testing Requirements

- Bun executor tests for idempotency replay, actor requirement, idempotency requirement, and audit metadata.
- DB-backed idempotency tests only when persistent DB store lands and `DATABASE_URL` is reachable.
- Route tests for execute idempotency key forwarding remain in `tests/integration/routes/assistant.test.ts`.
- Vitest only for pure redaction/helper functions if extracted.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/ARCHITECTURE.md`

## Completion Notes (2026-04-12)

- Added `assistant_action_executions` DB table and migration artifacts.
- Added `actionExecutionStore.ts` with plan hashing, replay lookup, and save path.
- `executeAssistantActionPlan` uses DB-backed idempotency by default and falls back to process-local cache only when injected deps omit the store.
- Added route mapping for `assistant_action_idempotency_conflict`.
- Added `db:migrate` and `db:generate` root scripts.

## Validation (2026-04-12)

- `bun run db:migrate`
- `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.db.test.ts`
- `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
