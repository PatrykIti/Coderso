# TASK-054-13-01: Solution Kits Domain, Catalog, and Planner
# FileName: TASK-054-13-01_Solution_Kits_Domain_Catalog_and_Planner.md

**Priority:** High  
**Category:** Domain/Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-12, TASK-101  
**Status:** Done (2026-02-19)

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

## Completion Notes (2026-02-19)
- Added typed solution-kits domain contracts and catalog for five starter verticals:
  - `automotive-workshop`, `medical-clinic`, `beauty-salon`, `services-directory`, `small-ecommerce`.
- Implemented deterministic planner engine:
  - `core/services/assistant/siteBuilderPlanner.ts`
  - output includes transparent `steps`, scoring `recommendations`, and `settingsPatch`.
- Added solution kits service facade:
  - `core/services/kits/solutionKitsService.ts`
- Added validation and internal routes:
  - `core/server/validation/solutionKitSchemas.ts`
  - `core/server/routes/solutionKitsRoutes.ts`
  - route registration in `core/server/routes/index.ts`.
- Added RBAC permissions:
  - `solution-kits:read`
  - `solution-kits:write`
- Added admin client + page foundation with cache/prefetch integration:
  - `core/admin/services/solutionKitsClient.ts`
  - `core/admin/ui/kits/*`
  - route wiring in `core/admin/app/AdminApp.tsx`
  - cache and prefetch wiring in `core/admin/services/cachePolicy.ts` and `core/admin/utils/adminPrefetch.ts`.
- Added/updated test coverage:
  - `tests/unit/assistant/siteBuilderPlanner.test.ts`
  - `tests/unit/kits/solutionKitsService.test.ts`
  - `tests/integration/routes/solutionKitsRoutes.test.ts`
  - `tests/unit/admin/solutionKitsClient.test.ts`
  - `tests/unit/ui/solution-kits-page.test.tsx`
  - plus updated nav/permissions/path/prefetch tests.
