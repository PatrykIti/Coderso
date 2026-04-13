# TASK-174-03-04: Content Type and Entry Delete Actions
# FileName: TASK-174-03-04_Content_Type_and_Entry_Delete_Actions.md

**Priority:** High
**Category:** Assistant/Delete + Content
**Estimated Effort:** Large
**Dependencies:** TASK-174-02, TASK-174-03
**Status:** Done (2026-04-13)

---

## Overview

Add reviewed delete actions for content types and entries.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/content/typeService.ts`
- `core/services/content/entryService.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`
- DB-backed content tests where required.

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC: dry-run requires `content:read`; execute requires `content:write`; published entry deletion requires publish permission if existing domain policy requires it.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict schemas reject unknown fields.
- Anti-abuse: content type delete blocks when entries/screens/listings exist unless included in same reviewed plan.
- Idempotency: execute requires idempotency key.
- Secret handling: no raw entry data values in provider/UI/audit unless redacted summaries.

## Testing Requirements

- Vitest:
  - target resolution and ambiguity handling,
  - schema rejection.
- Bun:
  - entry delete through `deleteEntry`,
  - content type delete through `deleteContentType`,
  - dependency conflict when related entries/screens/listings exist,
  - route permissions.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can delete exact draft/content entries after review.
2. Assistant blocks unsafe content type deletion with dependency conflicts.
3. Domain services own deletion.

## Completion Notes (2026-04-13)

- Added executable `entry.delete`.
- Added executable `content-type.delete`.
- Planner can build an entry delete plan from active entry route context.
- Planner can build a content type delete plan from an exact server-side resource catalog target.
- Planner blocks content type delete when `entryCount > 0`.
- Execute calls existing domain services:
  - `entryService.deleteEntry`,
  - `typeService.deleteContentType`.
- Execute revalidates exact expected targets before mutation.
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
