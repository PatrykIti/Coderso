# TASK-190-07: Action Assembly, Execution, and No-Duplicate Safety
# FileName: TASK-190-07_Action_Assembly_Execution_and_No_Duplicate_Safety.md

**Priority:** High
**Category:** Assistant/Core + Execution Safety
**Estimated Effort:** Large
**Dependencies:** TASK-190-03, TASK-190-04, TASK-190-05, TASK-190-06 for full closure
**Status:** Done (2026-05-10)

---

## Overview

Convert a composition graph into a strict `AssistantActionPlan` that reuses
current typed actions and avoids duplicate resources.

Execution stays inside the current `actionExecutorService` boundary. This slice
adds assembler/matcher/metadata helpers around the existing executor; it does
not introduce a second blueprint-specific execution flow.

Business value:
- Mixed blueprint plans can execute safely.
- Existing setups can be refined instead of reinstalled.
- Review/dry-run can show clear resource ownership and changes.

Current slice note:
- assembler ordering/dedupe are landed for the current catalog/form/page
  fragments,
- the local setup planner now uses the composed path for supported
  mixed-capability and primary-plus-gated setup requests,
- listing query assembly now widens projection fields automatically when merged
  listing facets or listing-template card bindings need additional runtime
  fields, while schema-backed missing-field drift falls back to typed
  `facet_field_missing`,
- DB-backed no-duplicate checks and existing-resource reuse are landed through
  the bounded resource catalog plus `blueprintExistingResourceMatcher.ts`;
  broader review metadata now lands through `blueprintCompositionMetadata.ts`.
- Composed ready/needs-input plans now carry strict `metadata.blueprintComposition`
  diagnostics for primary/adjunct/gated choices, merged resources, reuse matches,
  conflicts, and deterministic candidate scores.
- Generic detail-page resource packaging remains owned by `TASK-190-05-03-08`,
  not by this action-assembly closure.

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

Touched files:

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/assistant/actionDiffService.ts`
- `core/services/assistant/actionExecutionStore.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts`

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
- Targeted planner tests for the supported live composed setup path.
- Bun DB-backed no-duplicate tests in the existing `actionExecutorService`
  executor lane.
- Existing assistant execute/dry-run tests remain green.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
