# TASK-054-09: Coderso Forms and Automation Suite
# FileName: TASK-054-09_Coderso_Forms_and_Automation_Suite.md

**Priority:** High  
**Category:** CMS/Forms + Integrations + Security  
**Estimated Effort:** Large  
**Dependencies:** TASK-038, TASK-038-07, TASK-054-06  
**Status:** To Do

---

## Goal
Expand forms into full no-code automation stack (JetFormBuilder-like), while keeping security-first defaults.

## Features
- Post-submit actions: email, webhook, create/update entry, CRM sync, redirect, conditional flow.
- Multi-step forms and save-progress.
- Form presets for lead capture and service intake.
- Central action logs + retries for external actions.

## Files to Change
- `core/services/forms/formActionsService.ts` (new)
- `core/services/forms/formAutomationRunner.ts` (new)
- `core/server/routes/formsRoutes.ts`
- `core/server/routes/formActionsRoutes.ts` (new)
- `core/admin/ui/forms/FormActionsPanel.tsx` (new)
- `core/admin/ui/forms/FormActionLogsPage.tsx` (new)

## Pseudocode
```ts
for (const action of form.actions) {
  if (!matchesCondition(action.when, submission)) continue;
  await runAction(action, submissionContext);
}
```

## Acceptance Criteria
1. User can configure automation visually without code.
2. Failed external actions are visible and retryable.
3. Public form security remains enforced (nonce, captcha when enabled, rate limits).
