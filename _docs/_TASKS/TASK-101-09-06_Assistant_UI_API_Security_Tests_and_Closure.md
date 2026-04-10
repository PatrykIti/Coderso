# TASK-101-09-06: Assistant UI, API, Security, Tests, and Closure
# FileName: TASK-101-09-06_Assistant_UI_API_Security_Tests_and_Closure.md

**Priority:** High  
**Category:** Admin/UI + API + Security + QA  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09-01, TASK-101-09-02, TASK-101-09-03, TASK-101-09-04, TASK-101-09-05  
**Status:** To Do

---

## Overview

Domknac warstwe user-facing i route contracts:
- review/confirm UI,
- action API endpoints,
- security contract,
- test matrix,
- docs i board sync.

This closure task must also ensure the final UX does not fork into two competing assistant execution surfaces.

Preferred approach:
- reuse or absorb the current explainable review/execute patterns from `AiSiteWizard`,
- do not ship one review UX for site builder and another unrelated one for generic guide actions unless there is a proven product reason.

## Files to Change

- `core/server/routes/assistantRoutes.ts` (update, ~120-220 LOC)
- `core/server/validation/assistantActionSchemas.ts` (new/update, ~180-260 LOC)
- `core/admin/services/assistantClient.ts` (update, ~100-180 LOC)
- `core/admin/ui/assistant/AssistantPanel.tsx` (update, ~120-220 LOC)
- `core/admin/ui/assistant/components/ActionPlanReview.tsx` (new, ~180-280 LOC)
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx` (new, ~120-220 LOC)

## Sub-Tasks

- `TASK-101-09-06-01_Review_Confirm_UX_and_Partial_Success_States.md`
- `TASK-101-09-06-02_Action_Routes_Security_Contract_and_Error_Mapping.md`
- `TASK-101-09-06-03_Unit_Integration_UI_Test_Matrix_and_Docs_Closure.md`
- `TASK-101-09-06-04_Deep_Interaction_DB_Parity_and_Runtime_Acceptance_Test_Wave.md`

## Testing Requirements

- Vitest UI for review/confirm states.
- Bun integration for assistant action routes.
- acceptance coverage for the `house projects catalog` business scenario.
- Full targeted assistant lint/type/test pass.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
