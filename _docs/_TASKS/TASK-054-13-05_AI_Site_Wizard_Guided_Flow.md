# TASK-054-13-05: AI Site Wizard Guided Flow
# FileName: TASK-054-13-05_AI_Site_Wizard_Guided_Flow.md

**Priority:** High  
**Category:** Assistant/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-13-03, TASK-054-13-04  
**Status:** In Progress (2026-02-19)

---

## Overview
Dostarczyć guided wizard krok-po-kroku (nietechniczny UX), który buduje plan, pozwala go edytować i uruchomić apply/rollback.

## Security Contract
- **Visibility:** `internal` (admin only)
- **Auth path:** session + RBAC `solution-kits:write`
- **Rate-limit bucket:** `admin_write`
- **Prompt safety:** planner output must stay typed (`no raw prompt -> direct execution`)
- **Execution model:** `plan -> confirm -> execute` z audytem

## Scope
1. `AiSiteWizard` (multi-step): profil biznesu -> cele -> rekomendacja -> review -> execute.
2. Edycja kroków planu przed apply.
3. Postęp i status instalacji (run timeline).
4. Akcje: rerun, rollback, clone as draft.

## Sub-Tasks
- `TASK-054-13-05-01`: Wizard apply contract + planner step selection
- `TASK-054-13-05-02`: `AiSiteWizard` step flow + review editor
- `TASK-054-13-05-03`: Execute timeline + rerun/rollback/clone-as-draft UX
- `TASK-054-13-05-04`: Tests, docs, changelog, and board sync

## Files
- `core/admin/ui/setup/AiSiteWizard.tsx` (new)
- `core/admin/ui/kits/SolutionKitsPage.tsx` (integracja)
- `core/services/assistant/siteBuilderPlanner.ts` (extend)
- `tests/unit/ui/ai-site-wizard.test.tsx` (new)

## Pseudocode
```ts
const plan = await previewSolutionKitPlan(input);
const reviewed = editPlan(plan);
const run = await applySolutionKit(reviewed);
trackRunStatus(run.id);
```

## Testing Requirements
- UI: krokowa walidacja i blokada przejścia przy błędach.
- UI: plan review pokazuje pełną listę zmian.
- UI/API: execute + rollback flows.

## Documentation Updates Required
- `_docs/ASSISTANT_GUIDE.md` (wizard flow)
- `_docs/CMS_API.md` (run/status payload)
