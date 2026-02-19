# TASK-054-13-06: Solution Kits Content Packs and Installers
# FileName: TASK-054-13-06_Solution_Kits_Content_Packs_and_Installers.md

**Priority:** High  
**Category:** CMS/Content  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-13-02, TASK-054-13-05  
**Status:** To Do

---

## Overview
Dostarczyć kompletne paczki startowe dla 5 kitów (content model + pages + forms + menu + SEO defaults), gotowe do użycia bez kodowania.

## Scope
1. Per-kit content types/taxonomies.
2. Per-kit pages/templates/widgets composition.
3. Per-kit forms + optional booking/reviews wiring.
4. SEO + menu defaults.
5. Installer operations mapowany na core services (bez dead code).

## Files
- `core/services/kits/catalog/*.ts` (new)
- `core/services/kits/solutionKitsInstallService.ts` (extend)
- `tests/unit/kits/kitInstallers.test.ts` (new)

## Pseudocode
```ts
installers[kit.id] = [
  ensureContentTypes(...),
  ensurePages(...),
  ensureForms(...),
  ensureMenus(...),
  ensureSeoDefaults(...),
];
```

## Testing Requirements
- Unit: każdy kit instaluje minimalny working set.
- Unit: reinstall nie dubluje rekordów.
- Unit: uninstall/rollback przywraca zależności.

## Documentation Updates Required
- `_docs/SOLUTION_KITS.md` (katalog kitów + co instaluje każdy kit)

