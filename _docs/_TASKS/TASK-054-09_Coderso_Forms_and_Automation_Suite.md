# TASK-054-09: Coderso Forms and Automation Suite
# FileName: TASK-054-09_Coderso_Forms_and_Automation_Suite.md

**Priority:** High  
**Category:** CMS/Forms + Integrations + Security  
**Estimated Effort:** Large  
**Dependencies:** TASK-038, TASK-038-07, TASK-054-06  
**Status:** In Progress (2026-02-18)

---

## Overview
Expand Coderso Forms from schema + submissions into a complete automation workflow:
- post-submit action pipeline (email, webhook, entry sync, redirect, success override),
- conditional action execution,
- action run logs with retry,
- admin UI for non-technical users.

The suite must preserve current security defaults for public submissions (nonce + rate limit + optional reCAPTCHA) and keep backward compatibility with existing forms.

## Scope
1. Action contract and deterministic validation.
2. DB model for form actions and execution logs.
3. Automation runner with typed action executors.
4. Admin API routes for configure/list/retry action runs.
5. Form builder UI: "Automation" panel.
6. Action logs screen in Coderso Forms.
7. Runtime submit integration (response includes automation outcome).
8. Unit/integration/UI tests and docs updates.

## Non-Goals
- Full marketing CRM adapters for every provider.
- Visual flowchart editor with branching canvas.
- Background queue workers (initial delivery is synchronous with safe timeout caps).

## Sub-Tasks
- `TASK-054-09-01`: Action Contract + Validation
- `TASK-054-09-02`: DB Schema + Migration (actions + logs)
- `TASK-054-09-03`: Automation Runner + Built-in Executors
- `TASK-054-09-04`: Routes + Security + Retry API
- `TASK-054-09-05`: Admin UI (Builder Automation Panel + Logs)
- `TASK-054-09-06`: QA, Tests, Docs, Changelog

## Implementation Order
1. Contract + schema/migration.
2. Service layer and runner.
3. Route integration and submission response wiring.
4. Admin client/UI wiring.
5. Full test matrix + docs/changelog.

## Progress Update (2026-02-18)
- Completed in this iteration:
  - contract + migration (`form_actions`, `form_action_runs`),
  - automation runner + retry flow + route wiring,
  - admin `Automation` panel and `Action logs` screen,
  - unit/integration/UI tests + docs/changelog updates.
- Remaining for full task closure:
  - multi-step + save-progress UX,
  - form presets for common flows,
  - advanced async delivery/retry policies (queue worker mode).

## Files to Create
- `core/services/forms/formActionsContract.ts`
- `core/services/forms/formActionsService.ts`
- `core/services/forms/formAutomationRunner.ts`
- `core/services/forms/formActionTemplating.ts`
- `core/server/routes/formActionsRoutes.ts`
- `core/server/validation/formActionSchemas.ts`
- `core/admin/ui/forms/FormActionsPanel.tsx`
- `core/admin/ui/forms/FormActionLogsPage.tsx`
- `tests/unit/forms/formActionsContract.test.ts`
- `tests/unit/forms/formAutomationRunner.test.ts`
- `tests/integration/routes/formActionsRoutes.test.ts`

## Files to Update
- `core/db/schema.ts`
- `core/db/migrations/*` + `core/db/migrations/meta/*`
- `core/services/forms/submissionService.ts`
- `core/server/routes/formsRoutes.ts`
- `core/server/routes/index.ts`
- `core/admin/services/formsClient.ts`
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/forms/FormBuilderPage.tsx`
- `core/admin/services/cachePolicy.ts`
- `tests/integration/routes/forms.test.ts`
- `tests/unit/admin/formsClient.test.ts`
- `tests/unit/ui/form-builder.test.tsx`

## Pseudocode
```ts
const actions = await listFormActions(formId);
for (const action of actions.sort(byOrderIndex)) {
  const shouldRun = evaluateCondition(action.condition, submission.payload);
  if (!shouldRun) {
    await logActionRun({ status: "skipped" });
    continue;
  }

  try {
    const outcome = await executeAction(action, context);
    await logActionRun({ status: "success", outcome });
    mergeAutomationResult(finalResult, outcome);
  } catch (error) {
    await logActionRun({ status: "failed", error });
    if (!action.continueOnError) break;
  }
}
return finalResult;
```

## Acceptance Criteria
1. Admin can configure multiple ordered actions per form without code.
2. Actions support at least: email, webhook, entry sync (create/update), redirect, success message override.
3. Conditions support at least: always, equals, not-equals, exists, not-exists.
4. Failed actions are stored in logs and can be retried from UI/API.
5. Existing forms without actions keep current behavior.
6. Public submit security stays enforced (nonce + rate limit + optional reCAPTCHA).
7. All new logic is covered by unit/integration/UI tests.

## Testing Requirements
- Unit: contract normalization, condition evaluation, templating, each executor.
- Unit (DB): action CRUD and log persistence.
- Integration: forms submit with action pipeline, retry endpoint behavior.
- UI: builder automation section and logs page states (loading/empty/error/success).
- Regression: existing form CRUD and submission tests pass.

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md`
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_CACHE.md` (new cache keys if added)
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
