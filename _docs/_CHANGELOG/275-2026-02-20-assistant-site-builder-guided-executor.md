# 275 - Assistant Site Builder Guided Executor

- **Date:** 2026-02-20
- **Version:** 0.1.275
- **Tasks:** TASK-054-18, TASK-054-18-01, TASK-054-18-02, TASK-054-18-03, TASK-054-18-04

## Key Changes

### Guided Executor Domain
- Added `core/services/assistant/siteBuilderExecutor.ts` with explicit workflow contract:
  - `previewGuidedSiteBuilderPlan`
  - `executeGuidedSiteBuilder`
  - `validateGuidedSiteBuilderRun`
- Added deterministic action mapping (`stepId -> target -> resourceKey`) and enabled-step normalization.
- Added post-run validation model (`checks`, `unresolvedItems`, `status`).

### Assistant Internal API + Client
- Extended assistant routes with:
  - `POST /assistant/site-builder/plan`
  - `POST /assistant/site-builder/execute`
  - `POST /assistant/site-builder/validate`
- Added assistant site-builder request schemas in `core/server/validation/assistantSchemas.ts`.
- Added typed admin client methods in `core/admin/services/assistantClient.ts`.
- Updated server bucket mapping so site-builder endpoints use:
  - `admin_read` (`plan`, `validate`)
  - `admin_write` (`execute`)

### Wizard UX Modularization
- Split wizard rendering into `core/admin/ui/setup/AiSiteWizardSteps.tsx`.
- Refactored `core/admin/ui/setup/AiSiteWizard.tsx` into orchestrator-only container.
- Plan review now renders explainable action map before execution.
- Execute step now renders validation status/checks/unresolved items after run.

### QA
- Added/updated tests:
  - `tests/unit/assistant/siteBuilderExecutor.test.ts`
  - `tests/integration/routes/assistant.test.ts`
  - `tests/unit/admin/assistantClient.test.ts`
  - `tests/unit/ui/ai-site-wizard.test.tsx`
- Validation run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/assistant/siteBuilderExecutor.test.ts tests/integration/routes/assistant.test.ts tests/unit/admin/assistantClient.test.ts tests/unit/ui/ai-site-wizard.test.tsx`

### Documentation
- Added `_docs/ASSISTANT_SITE_BUILDER.md`.
- Updated:
  - `_docs/ASSISTANT_GUIDE.md`
  - `_docs/ARCHITECTURE.md`
  - `_docs/CMS_API.md`
  - `_docs/README.md`
