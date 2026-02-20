# TASK-054-13-06: Solution Kits Content Packs and Installers
# FileName: TASK-054-13-06_Solution_Kits_Content_Packs_and_Installers.md

**Priority:** High  
**Category:** CMS/Content  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-13-02, TASK-054-13-05  
**Status:** In Progress (2026-02-20)

---

## Overview
Dostarczyć kompletne paczki startowe dla 5 kitów (content model + pages + forms + menu + SEO defaults), gotowe do użycia bez kodowania.

## Scope
1. Per-kit content types/taxonomies.
2. Per-kit pages/templates/widgets composition.
3. Per-kit forms + optional booking/reviews wiring.
4. SEO + menu defaults.
5. Installer operations mapowany na core services (bez dead code).

## Security Contract
- **Visibility:** `internal` (`/admin/api/solution-kits/*`)
- **Auth path:** session + RBAC `solution-kits:write`
- **Rate-limit bucket:** `admin_write`
- **Execution safety:** typed catalog payload only; no raw prompt execution.
- **Mutation controls:** CSRF required for apply/rollback.

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

## Sub-Tasks
- `TASK-054-13-06-01`: Solution kit pack schema and catalog enrichment
- `TASK-054-13-06-02`: Installer extensions (taxonomies, form fields, menu items, SEO defaults)
- `TASK-054-13-06-03`: Regression tests for per-kit install/reinstall/rollback
- `TASK-054-13-06-04`: Docs, changelog, and task board closure
