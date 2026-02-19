# TASK-054-13-05-03: Wizard Execute Timeline, Rerun, Rollback, and Clone
# FileName: TASK-054-13-05-03_Wizard_Execute_Timeline_Rerun_Rollback_Clone.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-13-05-01, TASK-054-13-05-02  
**Status:** To Do

---

## Overview
Domknąć execute UX w wizardze: apply/dry-run + timeline runów + rollback + rerun + clone-as-draft z run options.

## Scope
1. Krok execute w wizardze korzysta z `useSolutionKitRuns`.
2. Apply/dry-run wysyła `plan.enabledStepIds` + metadata.
3. Timeline pokazuje statusy i szczegóły run items.
4. `Rerun` używa ostatniej konfiguracji planu.
5. `Clone as draft` odtwarza plan z `run.options.wizard` i wraca do kroku review.

## Files
- `core/admin/ui/setup/AiSiteWizard.tsx`
- `core/admin/ui/kits/hooks/useSolutionKitRuns.ts`
- `core/admin/services/solutionKitsClient.ts`

## Pseudocode
```ts
const applyDraft = async ({ dryRun }: { dryRun: boolean }) => {
  const result = await apply({
    dryRun,
    continueOnError: true,
    plan: {
      enabledStepIds,
      settingsPatch: plan.settingsPatch,
      notes: plan.notes,
    },
  })
  setLastRun(result?.run ?? null)
}

const cloneAsDraft = (run: SolutionKitInstallRunRecord) => {
  const wizard = readWizardOptions(run.options)
  if (!wizard) return
  setEnabledStepIds(wizard.enabledStepIds)
  setStep(4)
}
```

## Testing Requirements
- Unit: `cloneAsDraft` parser działa dla valid/invalid `run.options`.
- UI: execute actions renderują się i nie są aktywne bez wymaganego planu.
- UI/API: apply z plan payload + rollback action flow.

## Documentation Updates Required
- `_docs/CMS_API.md` (run options metadata semantics dla clone-as-draft)
