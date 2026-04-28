# TASK-054-18: Coderso AI Assistant Guided Builder Workflow
# FileName: TASK-054-18_Coderso_AI_Assistant_Guided_Builder_Workflow.md

**Priority:** High  
**Category:** Assistant UX + Setup Automation  
**Estimated Effort:** Large  
**Dependencies:** TASK-101, TASK-054-17  
**Status:** Done (2026-02-20)

---

## Overview
Rozszerzyc AI-guided flow o jawny executor kontraktu `plan -> actions -> execute -> validate`, tak aby nietechniczny user dostawal:
- przewidywalny plan,
- mapowanie rekomendacji na konkretne akcje systemowe,
- walidacje po wykonaniu z lista unresolved items.

## Sub-Tasks
1. `TASK-054-18-01` - site builder executor domain + schemas.
2. `TASK-054-18-02` - assistant routes/client contract for guided builder.
3. `TASK-054-18-03` - wizard UI modularization + explainable action mapping + validation UX.
4. `TASK-054-18-04` - tests, docs, changelog, kanban closure.

## Security Contract
- Visibility: `internal` (`/admin/api/assistant/*` + existing `/admin/api/solution-kits/*`).
- Auth: admin session + RBAC.
- Permissions:
  - `solution-kits:read` (`plan`, `validate`),
  - `solution-kits:write` (`execute`).
- Rate-limit buckets:
  - `admin_read` (`/assistant/site-builder/plan`, `/assistant/site-builder/validate`),
  - `admin_write` (`/assistant/site-builder/execute`).
- CSRF: required on all new `POST` mutations.

## Files to Change
- `core/services/assistant/siteBuilderExecutor.ts` (new)
- `core/services/assistant/siteBuilderPlanner.ts`
- `core/server/routes/assistantRoutes.ts`
- `core/server/validation/assistantSchemas.ts`
- `core/admin/services/assistantClient.ts`
- `core/admin/ui/setup/AiSiteWizard.tsx`
- `core/admin/ui/setup/AiSiteWizardSteps.tsx` (new)
- `core/admin/ui/setup/aiSiteWizardValidation.ts`
- `tests/unit/assistant/siteBuilderExecutor.test.ts` (new)
- `tests/integration/routes/assistant.test.ts`
- `tests/unit/admin/assistantClient.test.ts`
- `tests/unit/ui/ai-site-wizard.test.tsx`
- `_docs/ASSISTANT_SITE_BUILDER.md` (new)

## Workflow Stages
1. Intake: business type, goals, locale, pages needed.
2. Plan: recommended modules + kit + optional add-ons.
3. Confirm: user reviews each change before apply.
4. Execute: applies configuration with progress events.
5. Validate: smoke checks and unresolved items list.

## Guardrails
- No silent destructive changes.
- Every generated step is auditable.
- User can apply partial plan and skip items.

## Acceptance Criteria
1. User can launch a baseline site via wizard in one guided flow.
2. Every AI recommendation maps to explicit system action.
3. Failure states are recoverable and explain next steps.

## Testing Requirements
- Unit: planner/executor output schemas.
- Integration: execution pipeline with rollback-aware validation.
- UI: wizard render with explainable actions and unresolved checks.

## Documentation Updates Required
- `_docs/ASSISTANT_SITE_BUILDER.md` (new)
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_CHANGELOG/*.md` (when implemented)

## Completion Notes (2026-02-20)
- Delivered full guided executor contract `plan -> actions -> execute -> validate`.
- Added internal assistant API and typed admin client for site-builder flow.
- Refactored wizard UI into orchestrator + modular step renderer with explainable action map and validation UX.
- Added domain/API/client/UI tests and synced docs/changelog/kanban.
