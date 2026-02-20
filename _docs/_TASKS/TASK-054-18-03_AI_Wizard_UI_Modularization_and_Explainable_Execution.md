# TASK-054-18-03: AI Wizard UI Modularization and Explainable Execution
# FileName: TASK-054-18-03_AI_Wizard_UI_Modularization_and_Explainable_Execution.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-18-01, TASK-054-18-02  
**Status:** Done (2026-02-20)

---

## Overview
Rozbic `AiSiteWizard` na mniejsze komponenty i dodać explainable UX (actions map + unresolved checks po execute).

## Scope
1. Dodać `AiSiteWizardSteps.tsx` i przenieść rendering kroków 1..5.
2. `AiSiteWizard` zostaje orchestrator container (state + hooks).
3. Step `Plan review`:
   - render mapy działań (`step -> target -> resource`).
4. Step `Execute`:
   - po apply pokazać wynik walidacji (`ok/warning/failed`) i unresolved list.

## Files
- `core/admin/ui/setup/AiSiteWizard.tsx`
- `core/admin/ui/setup/AiSiteWizardSteps.tsx` (new)
- `core/admin/ui/setup/aiSiteWizardValidation.ts`
- `tests/unit/ui/ai-site-wizard.test.tsx`

## Pseudocode
```tsx
const planResult = await previewSiteBuilderPlan(...);
setPlan(planResult.plan);
setActionMap(planResult.actions);

const execution = await apply(...);
const validation = await validateSiteBuilderRun({ runId: execution.run.id });
setValidation(validation);
```

## Testing Requirements
- UI tests:
  - render action map sections,
  - render validation unresolved state,
  - preserves current wizard baseline sections.

## Documentation Updates Required
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`

## Completion Notes (2026-02-20)
- Split wizard rendering into `core/admin/ui/setup/AiSiteWizardSteps.tsx`.
- Refactored `core/admin/ui/setup/AiSiteWizard.tsx` into orchestrator/state container.
- Integrated wizard with assistant site-builder endpoints for plan + execute.
- Added explainable action mapping in plan review step.
- Added validation status/checks/unresolved items panel in execute step.
- Expanded UI tests in `tests/unit/ui/ai-site-wizard.test.tsx`.
