# 430. TASK-105 Forms Automation Runner Dependency Split

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-12, TASK-105-12-03

## Key Changes

### Architecture / Testing
- Extracted the Bun-free automation orchestration and action execution flow into `core/services/forms/formAutomationRunnerCore.ts`.
- Converted `core/services/forms/formAutomationRunner.ts` into a thin runtime wrapper with lazy default deps for action persistence, form settings lookup, email transport/settings, and entry persistence.
- Moved the pure automation runner suite from `tests/unit/forms/formAutomationRunner.test.ts` into `tests/vitest/forms/formAutomationRunnerCore.test.ts`.
- Updated runner ownership docs so the forms automation core is now explicitly treated as Vitest-owned while route/runtime boundaries remain in Bun.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/forms/formAutomationRunnerCore.test.ts`
  - `tests/vitest/forms/formRuntimeResolver.test.ts`
  - `tests/vitest/forms/submissionNonce.test.ts`
  - `tests/vitest/posts/post-block-runtime-renderer.test.tsx`
- Bun route smoke passed for:
  - `tests/integration/routes/forms.test.ts`
  - `tests/integration/routes/formActionsRoutes.test.ts`
- The Bun route smoke was executed after loading env from `../Nextless/.env` because this worktree does not contain its own `.env`.

### Outcome
- This closes `TASK-105-12`; the remaining `TASK-105` backlog is now direct product coverage work rather than mixed-module runner-eligibility cleanup.
