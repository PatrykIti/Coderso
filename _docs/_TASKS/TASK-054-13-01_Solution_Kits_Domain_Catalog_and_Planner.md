# TASK-054-13-01: Solution Kits Domain, Catalog, and Planner
# FileName: TASK-054-13-01_Solution_Kits_Domain_Catalog_and_Planner.md

**Priority:** High  
**Category:** Domain/Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-12, TASK-101  
**Status:** In Progress (2026-02-19)

---

## Overview
Wprowadzić deterministiczny kontrakt danych dla Solution Kits i planner rekomendacji (bez magicznych side-effectów), tak aby AI/Wizard miał jawny i edytowalny plan wdrożenia.

## Scope
1. Typy domenowe kitów i planu wdrożenia.
2. Katalog v1 (5 kitów): automotive, clinic, salon, directory, ecommerce.
3. Planner serwisowy:
   - wejście: profil biznesu + cele,
   - wyjście: rekomendowany kit + kroki + konfiguracja.
4. Walidacja wejścia/wyjścia planera.

## Files
- `core/services/kits/solutionKitTypes.ts` (new)
- `core/services/kits/solutionKitsCatalog.ts` (new)
- `core/services/kits/solutionKitsService.ts` (new)
- `core/services/assistant/siteBuilderPlanner.ts` (new)
- `core/server/validation/solutionKitSchemas.ts` (new)

## Pseudocode
```ts
type PlanInput = {
  businessType: "automotive_workshop" | "medical_clinic" | ... | "custom";
  goals: SiteGoal[];
  locale: string;
  region?: string | null;
};

const recommendation = rankKits(catalog, input);
return {
  recommendedKitId: recommendation.id,
  confidence: recommendation.score,
  steps: buildPlanSteps(recommendation, input),
  settingsPatch: buildSettingsPatch(recommendation, input),
};
```

## Testing Requirements
- Unit: planner ranking + deterministic output dla tych samych danych wejściowych.
- Unit: walidacja schema dla payloadów planera.
- Unit: fallback dla `businessType=custom`.

## Documentation Updates Required
- `_docs/CODERSO_MODULES.md` (status modułu Solution Kits)
- `_docs/CMS_API.md` (kontrakt planera po tasku API)

