# TASK-054-13: Coderso Solution Kits and AI Wizard
# FileName: TASK-054-13_Coderso_Solution_Kits_and_AI_Wizard.md

**Priority:** High  
**Category:** Product UX + Assistant + Templates  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-06..12, TASK-101  
**Status:** To Do

---

## Goal
Deliver prebuilt vertical kits and an AI setup wizard so low-technical users can launch complete websites quickly (e.g., automotive workshop management site).

## Solution Kits (v1)
- Automotive workshop
- Medical clinic
- Beauty salon
- Local services directory
- Small e-commerce

## Kit Contents
- Preconfigured content model and taxonomies.
- Prebuilt pages/templates/widgets/forms.
- Suggested menu/navigation and SEO defaults.
- Optional booking and review setup when relevant.

## Files to Change
- `core/services/kits/solutionKitsService.ts` (new)
- `core/server/routes/solutionKitsRoutes.ts` (new)
- `core/admin/ui/kits/SolutionKitsPage.tsx` (new)
- `core/admin/ui/setup/AiSiteWizard.tsx` (new)
- `core/services/assistant/siteBuilderPlanner.ts` (new)
- `_docs/SOLUTION_KITS.md` (new)

## Pseudocode
```ts
const plan = await assistantPlanSite({
  businessType: "automotive_workshop",
  goals,
  region,
});

await applyKit({
  kitId: plan.recommendedKit,
  options: plan.configuration,
});
```

## Acceptance Criteria
1. User can launch a working site from kit in guided flow.
2. AI wizard outputs editable, transparent configuration steps.
3. Kit install is idempotent, reversible, and documented.
