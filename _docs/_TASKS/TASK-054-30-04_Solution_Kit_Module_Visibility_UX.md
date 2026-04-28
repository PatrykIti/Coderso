# TASK-054-30-04: Solution Kit Module Visibility UX
# FileName: TASK-054-30-04_Solution_Kit_Module_Visibility_UX.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-30-02, TASK-054-30-03  
**Status:** Done (2026-03-19)

---

## Overview

User musi widziec nie tylko efekt w sidebarze, ale tez dlaczego dany kit odblokowuje
takie, a nie inne moduly.

## Scope

1. Rozszerzyc `Selected kit details` i/lub `AiSiteWizard` o czytelny podział:
   - `Required`
   - `Recommended`
   - `Optional`
2. Pokazać, ze wybór kitu wpływa na `Coderso` sidebar.
3. Dodać copy wyjaśniające, że brak aktywnego kitu = pełny sidebar.
4. Unikać “magicznego” znikania opcji bez kontekstu.

## Files to Create / Change

- `core/admin/ui/kits/SolutionKitsPage.tsx`
- `core/admin/ui/kits/SolutionKitCard.tsx`
- `core/admin/ui/setup/AiSiteWizardSteps.tsx`
- `tests/vitest/ui/solution-kits-page.test.tsx`
- `tests/vitest/ui/ai-site-wizard.test.tsx`

## Testing Requirements

- `bun run vitest run tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/ui/ai-site-wizard.test.tsx`

## Documentation Updates Required

- `_docs/SOLUTION_KITS.md`
- `_docs/ARCHITECTURE.md`

## Completion Notes (2026-03-19)

- `SolutionKitsPage` now surfaces required, recommended, and optional module scope more clearly.
- `AiSiteWizard` module review now explains that selected kit modules can focus the Coderso sidebar.
