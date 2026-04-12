# TASK-170-03-04: Executor Adapter Docs, Tests, and Closure
# FileName: TASK-170-03-04_Executor_Adapter_Docs_Tests_and_Closure.md

**Priority:** High  
**Category:** QA/Assistant + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-03-01, TASK-170-03-02, TASK-170-03-03  
**Status:** Done (2026-04-12)

---

## Overview

Close the executor adapter wave with route/security docs, test matrix validation, task board sync, and changelog.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
for (const executableFamily of newlyExecutableFamilies) {
  await expectSchemaAccepts(family.validPlan);
  await expectDryRunMetadata(family.plan);
  await expectExecuteUsesDomainService(family.plan);
  await expectIdempotencyReplay(family.plan);
}
```

## Files to Change

- `tests/vitest/assistant/*`
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts` if DB-backed behavior changes
- `tests/integration/routes/assistant.test.ts` if route permissions/error mapping change
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog file for `TASK-170-03`

## Security Contract

- Visibility: validates internal assistant action endpoints.
- Auth model: admin session.
- RBAC: route/domain permission behavior must match executable action families.
- CSRF: existing action endpoint CSRF remains required.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: route/schema tests cover unsupported action types and extra fields.
- Anti-abuse: no public write path added by this closure.
- Idempotency: replay/conflict behavior remains stable.
- Secret handling: previews/results/idempotency/audit metadata are redacted.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest suites for schema, registry, diff, and pure helpers.
- Bun executor suites for domain-service adapters.
- Route tests if assistant route permissions or error mapping changed.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-task-170-03-executor-adapters.md`

## Acceptance Criteria

1. Newly executable action families have schema, dry-run, execute, and idempotency coverage.
2. Docs match executable behavior and security constraints.
3. `TASK-170-03` can be moved to Done.

## Completion Notes (2026-04-12)

- Added route-level per-action permission enforcement for assistant dry-run/execute based on `actionFamilyContracts`.
- Confirmed newly executable action families have strict schema/provider tests plus Bun executor coverage.
- Added route tests proving action-specific read/write permissions are requested.
- Synced task board and changelog for the full executor adapter wave.
