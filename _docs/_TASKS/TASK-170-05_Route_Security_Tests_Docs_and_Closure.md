# TASK-170-05: Route Security, Tests, Docs, and Closure
# FileName: TASK-170-05_Route_Security_Tests_Docs_and_Closure.md

**Priority:** High  
**Category:** QA/Assistant + Security + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-02, TASK-170-03, TASK-170-04  
**Status:** Done (2026-04-12)

---

## Overview

Close the action-family expansion wave with route validation, security checks, docs, and board synchronization.

## Sub-Tasks

No child task files yet. Add leaves only if scanner/gate changes are required.

## Pseudocode

```ts
await expectRouteRejectsUnknownAction();
await expectRouteRejectsMissingCsrf();
await expectRouteRequiresPermissions("execute", requiredWritePermissions);
await expectIdempotencyReplaySameActorPlanHash();
await expectIdempotencyConflictDifferentPlanHash();
```

## Files to Change

- `core/server/routes/assistantRoutes.ts`
- route validation schemas if changed
- `tests/integration/routes/assistant.test.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog file for completed implementation wave

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: route tests must prove read/write/publish permissions are enforced for new action families.
- CSRF: tests must prove POST action endpoints reject missing/invalid CSRF.
- Rate-limit bucket: `assistant`; verify when test harness supports it.
- Reject-unknown validation: tests must cover unknown action types and unknown context fields.
- Anti-abuse: no public write path.
- Idempotency: route/DB tests cover replay and conflict.
- Secret handling: tests cover redaction in errors, previews, execution results, and persisted metadata.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - all changed pure schema/registry/diff/UI suites.
- Bun:
  - assistant route suite,
  - DB-backed executor suite when `DATABASE_URL` is available,
  - relevant security tests if endpoint security behavior changes.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-task-170-action-family-expansion.md`

## Acceptance Criteria

1. New action families are covered at schema, UI, route, and executor levels.
2. Security docs match route behavior.
3. Task board and changelog are synchronized when the wave is marked Done.

## Completion Notes (2026-04-12)

- Confirmed strict schema, provider adapter, preview diff, UI review, executor, and route tests cover the expanded action families.
- Confirmed route boundary enforces per-action dry-run/execute permissions from `actionFamilyContracts`.
- Confirmed CSRF coverage remains in admin client/middleware lanes; `registerAssistantRoutes` route harness does not mount CSRF middleware directly.
- Ran lint, typecheck, targeted Vitest, Bun executor, route, and DB-backed executor validation.
