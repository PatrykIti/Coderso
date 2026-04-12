# TASK-170-03-02-02: SEO Document Upsert Executor Adapter
# FileName: TASK-170-03-02-02_SEO_Document_Upsert_Executor_Adapter.md

**Priority:** High  
**Category:** Core/Assistant + SEO  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-03-02-01  
**Status:** Done (2026-04-12)

---

## Overview

Promote `seo.document.upsert` from contract-only to executable by delegating to existing SEO document services.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
assertKnownSeoTarget(action.input.targetType, action.input.targetId);
const existing = await deps.getSeoDocumentByTarget(targetType, targetId);
const next = normalizeSeoInput(action.input.seo);
return deps.upsertSeoDocument({ targetType, targetId, ...next });
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutorService.ts`
- `tests/vitest/assistant/action-plan-schema.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: `content:read` for plan/dry-run, `content:write` for execute.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: unknown target types and extra SEO fields are rejected.
- Anti-abuse: no public write endpoint.
- Idempotency: upsert must update/noop rather than duplicate SEO documents.
- Secret handling: no private canonical URLs or secret-like metadata in previews/results.

## Testing Requirements

- Vitest:
  - strict schema accepts valid SEO action,
  - unknown target type/fields reject.
- Bun:
  - dry-run create/update/noop,
  - execute delegates to SEO service.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Acceptance Criteria

1. SEO action uses existing SEO service.
2. Target scope is explicit and strict.
3. Re-execution remains idempotent.

## Completion Notes (2026-04-12)

- Promoted `seo.document.upsert` from contract-only to executable assistant action type.
- Added strict input normalization for `targetType`, `targetId`, and nested SEO fields.
- Added dry-run/execute adapter logic through existing `getSeoDocumentByTarget` and `upsertSeoDocument`, with page/entry target checks through existing domain services.
- Added Vitest schema/provider/registry contract coverage and Bun executor coverage for create/update/noop behavior.
