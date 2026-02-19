# TASK-054-13-05-02: AiSiteWizard Step Flow and Review Editor
# FileName: TASK-054-13-05-02_AiSiteWizard_Step_Flow_and_Review_Editor.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-13-05-01  
**Status:** To Do

---

## Overview
Zaimplementować wieloetapowy komponent `AiSiteWizard` (profile -> goals -> recommendation -> review -> execute) z walidacją krokową i edycją planu przed apply.

## Scope
1. Dodać komponent `AiSiteWizard` i helper walidacji stanu.
2. Krok 1/2: profil biznesu + cele + walidacja blokująca przejście.
3. Krok 3: rekomendacja zestawu + confidence + reasons.
4. Krok 4: review + edycja kroków execution (`enabledStepIds`) + preview pełnej listy zmian.
5. Integracja w `SolutionKitsPage` zamiast rozproszonego planner card flow.

## Files
- `core/admin/ui/setup/AiSiteWizard.tsx` (new)
- `core/admin/ui/setup/aiSiteWizardValidation.ts` (new)
- `core/admin/ui/kits/SolutionKitsPage.tsx`

## Pseudocode
```tsx
const [step, setStep] = useState<WizardStep>(1)
const [draft, setDraft] = useState(defaultDraft)
const [plan, setPlan] = useState<SiteBuilderPlanOutput | null>(null)

const next = async () => {
  const error = validateAiWizardStep({ step, draft, plan })
  if (error) return setError(error)
  if (step === 2 && !plan) {
    const nextPlan = await previewSolutionKitPlan(draftToPlanInput(draft))
    setPlan(nextPlan)
  }
  setStep(step + 1)
}
```

## Testing Requirements
- Unit: `validateAiWizardStep` blokuje niepoprawne przejścia.
- UI: render zawiera wszystkie kroki i review controls.
- UI: review pokazuje listę zmian dla pages/forms/content types/menus.

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md` (opis wizard flow i miejsca w module)
