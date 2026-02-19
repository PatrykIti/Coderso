# TASK-054-13: Coderso Solution Kits and AI Wizard
# FileName: TASK-054-13_Coderso_Solution_Kits_and_AI_Wizard.md

**Priority:** High  
**Category:** Product UX + Assistant + Templates  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-06..12, TASK-101  
**Status:** In Progress (2026-02-19)

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

## Sub-Tasks
- `TASK-054-13-01`: Solution Kits domain, catalog, and planner
- `TASK-054-13-02`: Install engine + idempotency + rollback log
- `TASK-054-13-03`: Internal API + RBAC for kits
- `TASK-054-13-04`: Admin UI page + cache/prefetch
- `TASK-054-13-05`: AI site wizard guided flow
- `TASK-054-13-06`: Per-kit content packs and installers
- `TASK-054-13-07`: QA/docs/changelog closure
