# TASK-054-18: Coderso AI Assistant Guided Builder Workflow
# FileName: TASK-054-18_Coderso_AI_Assistant_Guided_Builder_Workflow.md

**Priority:** High  
**Category:** Assistant UX + Setup Automation  
**Estimated Effort:** Large  
**Dependencies:** TASK-101, TASK-054-17  
**Status:** To Do

---

## Goal
Provide a guided AI flow that helps non-technical users configure modules, kits, templates, and forms in a controlled, explainable way.

## Files to Change
- `core/services/assistant/siteBuilderPlanner.ts` (new)
- `core/services/assistant/siteBuilderExecutor.ts` (new)
- `core/server/routes/assistantRoutes.ts`
- `core/admin/ui/setup/AiSiteWizard.tsx` (new)
- `core/admin/ui/setup/AiSiteWizardSteps.tsx` (new)
- `_docs/ASSISTANT_SITE_BUILDER.md` (new)

## Workflow Stages
1. Intake: business type, goals, locale, pages needed.
2. Plan: recommended modules + kit + optional add-ons.
3. Confirm: user reviews each change before apply.
4. Execute: applies configuration with progress events.
5. Validate: smoke checks and unresolved items list.

## Pseudocode
```ts
const plan = await generateSitePlan(input);
const approval = await requestUserApproval(plan);
if (!approval.accepted) return;

for (const step of plan.steps) {
  await executeStep(step);
  emitProgress(step.id, "done");
}

return runPostInstallChecks(plan);
```

## Guardrails
- No silent destructive changes.
- Every generated step is auditable.
- User can apply partial plan and skip items.

## Acceptance Criteria
1. User can launch a baseline site via wizard in one guided flow.
2. Every AI recommendation maps to explicit system action.
3. Failure states are recoverable and explain next steps.

## Testing Requirements
- Unit: planner output schema.
- Integration: execution pipeline with rollback points.
- E2E: wizard full flow for at least two verticals.

## Documentation Updates Required
- `_docs/ASSISTANT_SITE_BUILDER.md` (new)
- `_docs/ARCHITECTURE.md`
- `_docs/_CHANGELOG/*.md` (when implemented)
