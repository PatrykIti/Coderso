# TASK-054-30-03: Solution Kit Module Audit and Catalog Corrections
# FileName: TASK-054-30-03_Solution_Kit_Module_Audit_and_Catalog_Corrections.md

**Priority:** High  
**Category:** Kits + Product Contract  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-17-01  
**Status:** To Do

---

## Overview

Zanim kit zacznie sterować sidebar navigation, lista modulow per kit musi byc
wiarygodna. Ten task robi jawny audit i korekty katalogu.

## Scope

1. Zweryfikowac, czy `recommendedModules` zawiera tylko znane `CodersoModuleId`.
2. Zweryfikowac, czy modulowa lista nie pomija obvious capabilities wynikających z blueprintu:
   - `contentTypes.length > 0` => co najmniej `entries`
   - widgety listing/search/filter => odpowiednio `listings` / `search` / `filters`
   - widgety commerce => `commerce`
   - booking flows/forms => `booking` / `forms`
3. Skorygowac co najmniej oczywiste braki wykryte w analizie:
   - `beauty-salon` prawdopodobnie wymaga `entries`
   - `small-ecommerce` prawdopodobnie wymaga `entries`, a `listings` wymaga potwierdzenia albo usuniecia
4. Zdecydowac, co jest `recommended`, a co `optional`, jesli katalog to rozroznia.

## Files to Create / Change

- `core/services/kits/solutionKitsCatalog.ts`
- `core/services/kits/kitManifest.ts` (if normalization/audit helper lands here)
- `tests/unit/kits/solutionKitsCatalog.test.ts`
- `tests/unit/kits/kitManifest.test.ts`
- `tests/unit/kits/solutionKitModuleAudit.test.ts` (new, if needed)

## Testing Requirements

- `bun test tests/unit/kits/solutionKitsCatalog.test.ts tests/unit/kits/kitManifest.test.ts`

## Documentation Updates Required

- `_docs/SOLUTION_KITS.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`

