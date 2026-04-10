# Assistant Site Builder

## Purpose

Assistant Site Builder is a typed guided workflow for Coderso setup:

`intake -> plan -> actions -> execute -> validate`

It is designed for non-technical users: every recommendation is mapped to explicit system actions before execution.

The newer `LLM Guide` action engine follows the same explainable pattern inside the floating assistant panel:

`prompt -> typed plan -> dry-run -> execute`

Current implemented guide blueprint:
- `house-projects-catalog`
- creates:
  - content type
  - custom screen
  - listing query
  - listing template
  - public catalog page
  - public detail routes

## Runtime Contract

Core domain service:
- `core/services/assistant/siteBuilderExecutor.ts`
- generic guide runtime:
  - `core/services/assistant/actionPlannerService.ts`
  - `core/services/assistant/actionExecutorService.ts`

Public functions:
- `previewGuidedSiteBuilderPlan(input)`
- `executeGuidedSiteBuilder(input)`
- `validateGuidedSiteBuilderRun({ runId })`

## Data Model

Plan result contains:
- `plan` (existing site builder recommendation output)
- `selectedKitId`, `selectedKitTitle`
- `enabledStepIds`
- `actions[]` where each action has:
  - `stepId`
  - `target` (`settings`, `content_type`, `form`, `page`, `menu`, `template`, `qa`)
  - `resourceKey`
  - `title`, `description`
  - `required`
- `modules` (`required`, `recommended`, `optional`)

Execute result extends plan result with:
- `execution` (solution kit install response)
- `validation`:
  - `status`: `ok | warning | failed`
  - `checks[]`
  - `unresolvedItems[]`

## Internal API

All endpoints are internal (`/admin/api/*`) and session-protected:

- `POST /assistant/site-builder/plan`
- `POST /assistant/site-builder/execute`
- `POST /assistant/site-builder/validate`
- `POST /assistant/actions/plan`
- `POST /assistant/actions/dry-run`
- `POST /assistant/actions/execute`

RBAC:
- `solution-kits:read`: `plan`, `validate`
- `solution-kits:write`: `execute`

Security:
- CSRF required on all POST endpoints
- Rate limit:
  - `admin_read`: `plan`, `validate`
  - `admin_write`: `execute`
  - `assistant`: action-plan / dry-run / execute endpoints

## Admin UI

Primary UI:
- `core/admin/ui/setup/AiSiteWizard.tsx` (state/orchestration)
- `core/admin/ui/setup/AiSiteWizardSteps.tsx` (step rendering)

Wizard stages:
1. Business profile
2. Goals
3. Recommendation
4. Plan review (step toggles + explainable action map)
5. Execute (apply/dry-run + validation checks + unresolved list)

## Auditability

Execution writes assistant metadata to run options (`assistantSiteBuilder`), including:
- selected kit
- enabled step IDs
- concrete actions

This keeps rerun/diagnostics deterministic and inspectable.
