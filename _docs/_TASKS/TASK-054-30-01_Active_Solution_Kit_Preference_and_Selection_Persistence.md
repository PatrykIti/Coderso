# TASK-054-30-01: Active Solution Kit Preference and Selection Persistence
# FileName: TASK-054-30-01_Active_Solution_Kit_Preference_and_Selection_Persistence.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-13-04, TASK-054-17-03  
**Status:** Done (2026-03-19)

---

## Overview

Wybor kitu musi przestac byc lokalnym state tylko dla `SolutionKitsPage`.
Potrzebujemy wspoldzielonego ownera preference, zeby inne warstwy admin UI
(w szczegolnosci `AdminShell`) mogly reagowac na aktywny kit.

## Architecture

Rekomendowany owner:
- `core/admin/services/solutionKitSelection.ts` (new)

Contract v1:
```ts
type ActiveSolutionKitPreference = SolutionKitId | null;

getActiveSolutionKitId(): SolutionKitId | null
setActiveSolutionKitId(next: SolutionKitId | null): void
subscribeActiveSolutionKitId(listener): () => void
```

Persistence:
- `localStorage` key, np. `nextless.solutionKits.activeKit.v1`
- custom browser event dla tego samego tabu
- `storage` event support dla innych tabow

## Sub-Tasks

1. Utworzyc owner preference z read/write/subscribe.
2. Podpiac `SolutionKitsPage` pod ten owner zamiast czystego lokalnego `selectedId`.
3. Podpiac `AiSiteWizard` tak, aby `onSelectKit` aktualizowalo persisted active kit.
4. Zachowac back-compat: brak preference => UI dalej moze pokazywac pierwszy kit jako lokalny fallback, ale bez wymuszania globalnego gatingu.

## Files to Create / Change

- `core/admin/services/solutionKitSelection.ts` (new)
- `core/admin/ui/kits/SolutionKitsPage.tsx`
- `core/admin/ui/setup/AiSiteWizard.tsx`
- `tests/vitest/admin/solutionKitSelection.test.ts` (new)
- `tests/vitest/ui/solution-kits-page.test.tsx`
- `tests/vitest/ui/ai-site-wizard.test.tsx`

## Testing Requirements

- `bun run vitest run tests/vitest/admin/solutionKitSelection.test.ts tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/ui/ai-site-wizard.test.tsx`

## Documentation Updates Required

- `_docs/SOLUTION_KITS.md`
- `_docs/CMS_API.md`

## Completion Notes (2026-03-19)

- Added `core/admin/services/solutionKitSelection.ts`.
- `SolutionKitsPage` now writes the active solution kit to shared admin preference storage.
- `AiSiteWizard` selection flow now updates the same persisted active kit.
