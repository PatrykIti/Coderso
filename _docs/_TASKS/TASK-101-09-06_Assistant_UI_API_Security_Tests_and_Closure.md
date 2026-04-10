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

## Testing Requirements

- Vitest UI for review/confirm states.
- Bun integration for assistant action routes.
- Full targeted assistant lint/type/test pass.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
