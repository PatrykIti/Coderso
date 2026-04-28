# TASK-054-30: Solution Kits Module Audit and Sidebar Gating
# FileName: TASK-054-30_Solution_Kits_Module_Audit_and_Sidebar_Gating.md

**Priority:** High  
**Category:** Admin/UI + Kits + Navigation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-13, TASK-054-17, TASK-054  
**Status:** Done (2026-03-19)

---

## Overview

Wybor `Solution Kit` nie ogranicza dzis globalnej lewej nawigacji, mimo ze katalog kitow
publikuje `recommendedModules` / `manifest.requiredModules`.

Dodatkowo lista modulow per kit wyglada na miejscami niepelna wzgledem samych blueprintow,
wiec zanim podłączymy kit do sidebaru, trzeba zrobic audit i skorygowac kontrakt.

Aktualny stan po analizie:
- `SolutionKitsPage` trzyma wybor kitu lokalnie (`selectedId`) i nie persystuje go poza widokiem,
- `AdminShell` buduje sidebar z `defaultNavSections`, bez wiedzy o aktywnym kicie,
- `AiSiteWizard` pokazuje staly flow krokow i tylko informacyjnie renderuje moduly z planu,
- `recommendedModules` w katalogu nie sa dzis testowane pod katem zgodnosci z faktycznymi blueprintami
  i co najmniej czesc kitow wyglada na niepelna (np. `beauty-salon` ma content type, ale nie ma `entries`).

## Goals

1. Wybor kitu ma first-class konsekwencje w admin UI, a nie tylko w lokalnym card/wizard state.
2. Lewy sidebar `Coderso` ma zawężac sie do modulow aktywnego kitu.
3. Lista modulow per kit ma byc sprawdzalna i audytowalna na poziomie testow.
4. User ma widziec, jakie moduly dany kit faktycznie odblokowuje / rekomenduje.

## Scope

1. Persisted preference `active solution kit` po stronie admin UI.
2. Wyprowadzenie `CodersoFeatureFlags` z aktywnego kitu.
3. Audit i korekty `recommendedModules` / `manifest.requiredModules`.
4. UI visibility dla module scope na stronie kitow / wizardze.
5. QA/docs/changelog closure.

## Non-Goals

1. Nie ograniczamy top-level `Main/Tools/Admin` poza grupa `Coderso`.
2. Nie wprowadzamy nowego backendowego settings API dla kitu, jesli wystarczy local admin preference.
3. Nie zmieniamy install engine kitow w tym follow-upie.

## Architecture

Rekomendowany seam:
- `SolutionKitsPage` i `AiSiteWizard` zapisują aktywny kit do wspoldzielonego admin preference ownera,
- `AdminShell` subskrybuje te preference i na ich podstawie wylicza `CodersoFeatureFlags`,
- `buildDefaultNavSections(flags)` renderuje tylko moduly aktywnego kitu + stale `Solution Kits`,
- brak aktywnego kitu => sidebar pozostaje w trybie domyslnym (bez gatingu).

Rekomendowany persistence contract v1:
- client-side preference (`localStorage` + custom window event / storage subscription),
- bez backendowego `user-settings` rozszerzenia na tym etapie.

Rekomendowany module gating contract:
- source of truth: `selectedKit.recommendedModules` + `selectedKit.manifest.requiredModules` + `selectedKit.manifest.optionalModules`,
- `Solution Kits` (`ai-kit-wizard`) pozostaje zawsze widoczny,
- moduly nieobecne w aktywnym kicie dostaja `false` w `CodersoFeatureFlags`.

## Implementation Order

1. Persisted active-kit preference (`TASK-054-30-01`).
2. Sidebar gating i `AdminShell` integration (`TASK-054-30-02`).
3. Audit katalogu i korekty module lists (`TASK-054-30-03`).
4. UI visibility dla module scope i selected kit impact (`TASK-054-30-04`).
5. QA/docs/changelog closure (`TASK-054-30-05`).

## Sub-Tasks

1. `TASK-054-30-01_Active_Solution_Kit_Preference_and_Selection_Persistence.md`
2. `TASK-054-30-02_Coderso_Sidebar_Gating_from_Active_Kit_Modules.md`
3. `TASK-054-30-03_Solution_Kit_Module_Audit_and_Catalog_Corrections.md`
4. `TASK-054-30-04_Solution_Kit_Module_Visibility_UX.md`
5. `TASK-054-30-05_QA_Docs_Changelog_and_Closure.md`

## Files to Create / Change

- `core/admin/services/solutionKitSelection.ts` (new)
- `core/admin/ui/kits/SolutionKitsPage.tsx`
- `core/admin/ui/setup/AiSiteWizard.tsx`
- `core/admin/ui/setup/AiSiteWizardSteps.tsx`
- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/navigation/sidebarConfig.ts`
- `core/admin/ui/navigation/codersoModules.ts`
- `core/services/kits/solutionKitsCatalog.ts`
- `core/services/kits/kitManifest.ts` (if audit helper lands here)
- `tests/unit/kits/*`
- `tests/vitest/ui/solution-kits-page.test.tsx`
- `tests/vitest/ui/ai-site-wizard.test.tsx`
- `tests/vitest/ui/admin-shell-nav.test.tsx`
- `tests/vitest/admin/coderso-modules.test.ts`
- `_docs/SOLUTION_KITS.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`

## Testing Requirements

- `bun test tests/unit/kits/solutionKitsCatalog.test.ts tests/unit/kits/kitManifest.test.ts`
  Current kits unit cluster is still Bun-owned in the shipped command surface. Keep audit tests there unless the whole cluster is explicitly migrated.
- `bun run vitest run tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/ui/ai-site-wizard.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/admin/coderso-modules.test.ts tests/vitest/admin/solutionKitSelection.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/SOLUTION_KITS.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/ADMIN_NAVIGATION.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`

## Completion Notes (2026-03-19)

- Added persisted active-kit preference in admin UI.
- `AdminShell` now derives `CodersoFeatureFlags` from the active solution kit and narrows the Coderso sidebar.
- Audited and corrected solution kit module lists against actual blueprint capabilities.
- Exposed module scope more clearly in Solution Kits details and AI wizard review.
