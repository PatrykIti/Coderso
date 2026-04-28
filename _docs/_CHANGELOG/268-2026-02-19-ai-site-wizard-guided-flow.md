# 268 - AI Site Wizard Guided Flow for Solution Kits

- **Date:** 2026-02-19
- **Version:** 0.1.268
- **Tasks:** TASK-054-13, TASK-054-13-05, TASK-054-13-05-01, TASK-054-13-05-02, TASK-054-13-05-03, TASK-054-13-05-04

## Key Changes

### Wizard UX
- Added `AiSiteWizard` multi-step flow in `Coderso -> Solution Kits`:
  - `Business profile`
  - `Goals`
  - `Recommendation`
  - `Plan review`
  - `Execute`
- Added step-level validation gates to block invalid transitions.
- Added plan review editing with execution step toggles (`enabledStepIds`).

### Apply Contract Extension
- Extended `POST /admin/api/solution-kits/:id/apply` payload with optional typed `plan` block:
  - `enabledStepIds`
  - `settingsPatch`
  - `notes`
- Backend now filters kit resource blueprint by selected steps before install run execution.
- Install run metadata now stores wizard snapshot in `run.options.wizard` for deterministic rerun/clone flows.

### Execute Timeline Actions
- Execute step now includes:
  - `Apply kit`
  - `Dry run`
  - `Rerun`
  - `Rollback latest`
  - `Clone as draft`
- `Clone as draft` restores plan configuration from `run.options.wizard`.

### Tests
- Added/updated tests for planner filtering, schema validation, client payloads, and UI wizard rendering:
  - `tests/unit/assistant/siteBuilderPlanner.test.ts`
  - `tests/unit/server/solutionKitSchemas.test.ts`
  - `tests/unit/admin/solutionKitsClient.test.ts`
  - `tests/unit/ui/ai-site-wizard.test.tsx`
  - `tests/unit/ui/solution-kits-page.test.tsx`

### Documentation
- Updated:
  - `_docs/CMS_API.md`
  - `_docs/ARCHITECTURE.md`
  - `_docs/CODERSO_MODULES.md`
  - `_docs/README.md`
- Added:
  - `_docs/ASSISTANT_GUIDE.md`
