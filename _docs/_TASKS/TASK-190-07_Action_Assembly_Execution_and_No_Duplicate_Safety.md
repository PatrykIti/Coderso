# TASK-190-07: Action Assembly, Execution, and No-Duplicate Safety
# FileName: TASK-190-07_Action_Assembly_Execution_and_No_Duplicate_Safety.md

**Priority:** High
**Category:** Assistant/Core + Execution Safety
**Estimated Effort:** Large
**Dependencies:** TASK-190-03, TASK-190-04, TASK-190-05, TASK-190-06
**Status:** To Do

---

## Overview

Convert a composition graph into a strict `AssistantActionPlan` that reuses
current typed actions and avoids duplicate resources.

Business value:
- Mixed blueprint plans can execute safely.
- Existing setups can be refined instead of reinstalled.
- Review/dry-run can show clear resource ownership and changes.

## Sub-Tasks

- `TASK-190-07-01_Composition_Action_Assembler.md`
- `TASK-190-07-02_No_Duplicate_Idempotency_and_Existing_Resource_Reuse.md`
- `TASK-190-07-03_Composition_Review_Metadata_and_Diagnostics.md`

## Architecture

New owner files:

- `core/services/assistant/blueprints/blueprintActionAssembler.ts`
- `core/services/assistant/blueprints/blueprintExistingResourceMatcher.ts`
- `core/services/assistant/blueprints/blueprintCompositionMetadata.ts`
- `tests/vitest/assistant/blueprint-action-assembler.test.ts`
- `tests/vitest/assistant/blueprint-composition-metadata.test.ts`
- `tests/unit/assistant/blueprintCompositionExecutor.test.ts`

Touched files:

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/assistant/actionDiffService.ts`
- `core/services/assistant/actionExecutionStore.ts`

## Acceptance Criteria

1. Composer output normalizes through `actionPlanSchema`.
2. Existing actions are reused; no parallel executor.
3. Duplicate resource keys are detected before action assembly.
4. Existing resource catalog can switch create into update/reuse where supported.
5. Dry-run explains composed resources and gated modules.
6. Review metadata explains primary/adjunct/gated choices and merge decisions.

## Security Contract

- Visibility: internal assistant action flow.
- Auth model: existing admin session.
- RBAC: unchanged, per-action permissions remain authoritative.
- CSRF: unchanged.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: assembled actions pass existing strict schemas.
- Anti-abuse: no provider-to-executor payload path.
- Secret handling: execution payloads remain redacted and audit-safe.

## Testing Requirements

- Vitest assembler tests.
- Bun DB-backed no-duplicate tests.
- Existing assistant execute/dry-run tests remain green.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
