# Assistant Site Builder

## Purpose

Assistant Site Builder is a typed guided entry point for Coderso setup:

`intake -> plan -> actions -> execute -> validate`

It is designed for non-technical users: every recommendation is mapped to explicit system actions before execution.

It now runs through the same `LLM Guide` action engine as the floating assistant panel:

`prompt -> typed plan -> dry-run -> execute`

Current implemented guide blueprint:
- `house-projects-catalog`
- shared catalog-family business blueprint packs for:
  - house projects
  - product catalog
  - portfolio projects
  - services directory
- lead capture site pack:
  - public inquiry form
  - simple landing page with form embed
- booking service business pack:
  - registered as gated until booking action adapters are implemented
- product inquiry catalog pack:
  - product catalog
  - public inquiry form
  - checkout/payment remains gated
- portfolio case-study pack:
  - portfolio catalog
  - case-study result summary
  - testimonial field
- editorial content hub pack:
  - public hub page
  - posts-feed widget
  - no post mutations
- site-kit guide actions:
  - `site-kit.recommend`
  - `site-kit.install`
  - `site-kit.validate`
- solution-kit refinements:
  - gated until LLM Guide has server-derived installed-kit resource context
- creates:
  - content type
  - custom screen
  - listing query
  - listing template
  - public catalog page
  - public detail routes

Current capability limits:
- `docs-only` answers are read-only and never return executable action plans.
- `LLM Guide` can plan, dry-run, and execute only the strict typed actions
  listed in `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`.
- Booking resources, checkout/payment setup, webhook automation, nested page
  widget patches, and installed solution-kit refinements remain gated until
  their adapters, permissions, and hardening are explicit.
- No guide flow supports arbitrary code execution or autonomous mutation
  without review/confirm.

## Runtime Contract

Core domain service:
- `core/services/assistant/siteBuilderExecutor.ts`
- `core/services/assistant/siteBuilderPlanAdapter.ts`
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

- `POST /assistant/actions/plan`
- `POST /assistant/actions/dry-run`
- `POST /assistant/actions/execute`

The old `/assistant/site-builder/*` route family is retired. Site-kit work is expressed as typed actions under `/assistant/actions/*`.

RBAC:
- base assistant action permissions:
  - `settings:read` + `content:read`: `plan`, `dry-run`
  - `settings:write` + `content:write` + `content:publish`: `execute`
- additional site-kit permissions:
  - `solution-kits:read` when planning or dry-running `site-kit.*` actions
  - `solution-kits:write` when executing `site-kit.*` actions
- site-kit actions require `LLM Guide` availability (`llmAvailable=true`) and must not run as docs-only fallback

Security:
- CSRF required on all POST endpoints
- Rate limit:
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

## Acceptance Matrix

The current `LLM Guide` acceptance matrix is maintained in
`_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`. It lists executable packs, gated packs,
route/security coverage, and the owning Bun/Vitest test lanes.
