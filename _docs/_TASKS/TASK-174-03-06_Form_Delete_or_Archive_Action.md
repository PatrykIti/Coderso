# TASK-174-03-06: Form Delete or Archive Action
# FileName: TASK-174-03-06_Form_Delete_or_Archive_Action.md

**Priority:** High
**Category:** Assistant/Delete + Forms
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02, TASK-174-03
**Status:** To Do

---

## Overview

Add reviewed form delete/archive behavior.

Forms with submissions must not be hard-deleted silently. The assistant should archive/block according to existing form data retention rules.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/forms/formsService.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`
- DB-backed form tests if submission checks require DB.

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC: dry-run requires `forms:read`; execute requires `forms:write`.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict form operation schema.
- Anti-abuse: hard delete is blocked or downgraded to archive when submissions exist.
- Idempotency: execute requires idempotency key.
- Secret handling: no raw form submissions in context, UI, audit, or provider payloads.

## Testing Requirements

- Vitest:
  - planner target resolution and ambiguity handling,
  - schema rejection.
- Bun:
  - delete empty form through domain service,
  - archive/block form with submissions,
  - route permissions.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can delete or archive exact forms after review.
2. Forms with submissions are protected from silent hard delete.
3. No submission data leaks.
