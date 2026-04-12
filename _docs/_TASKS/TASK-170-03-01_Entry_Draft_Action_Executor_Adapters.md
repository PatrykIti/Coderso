# TASK-170-03-01: Entry Draft Action Executor Adapters
# FileName: TASK-170-03-01_Entry_Draft_Action_Executor_Adapters.md

**Priority:** High  
**Category:** Core/Assistant + Content Entries  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-03, TASK-170-01-01, TASK-170-02  
**Status:** To Do

---

## Overview

Implement the first executable `entry.*` assistant action adapters through existing content entry services. Start with draft-safe actions only; publishing remains out of scope until a separate explicit publish action is designed.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
const type = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
if (!type) throw new Error("assistant_action_dependency_missing");

assertSchemaKnownFields(type.schema, action.input.values);
const existing = await deps.getEntryBySlug(type.id, action.input.slug);

return existing
  ? deps.updateEntry(existing.id, { title, slug, data: values })
  : deps.createEntry(type.id, { title, slug, data: values, authorId });
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutorService.ts`
- `tests/vitest/assistant/action-family-contracts.test.ts`
- `tests/vitest/assistant/action-plan-schema.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts` if DB-backed replay coverage changes

## Security Contract

- Visibility: internal only through existing `/admin/api/assistant/actions/*`.
- Auth model: admin session.
- RBAC: `content:read` for plan/dry-run, `content:write` for execute; no `content:publish` behavior in this leaf.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: action input rejects unknown fields and values outside the content type schema.
- Anti-abuse: no public entry write path; no nonce/HMAC/reCAPTCHA.
- Idempotency: execute remains actor/plan/hash replay-safe.
- Secret handling: previews/results/idempotency metadata must not include raw hidden fields, form submissions, sessions, or secret-like values.

## Testing Requirements

- Vitest:
  - strict schema accepts valid `entry.upsert-draft` once executable,
  - unknown input fields are rejected,
  - provider draft boundary reflects executable status after adapter lands.
- Bun:
  - dry-run create/update/noop for entry draft action,
  - execute create/update through mocked deps,
  - dependency-missing and validation-error behavior,
  - DB-backed idempotency only if persisted result shape changes.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a changelog entry when completed

## Acceptance Criteria

1. `entry.upsert-draft` executes through existing entry services.
2. Entry writes remain draft-only and schema-owned.
3. Strict schema/provider boundaries are updated with tests.
