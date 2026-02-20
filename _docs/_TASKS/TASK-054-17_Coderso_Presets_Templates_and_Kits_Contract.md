# TASK-054-17: Coderso Presets, Templates, and Kits Contract
# FileName: TASK-054-17_Coderso_Presets_Templates_and_Kits_Contract.md

**Priority:** High  
**Category:** CMS/Templates + Setup UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-07, TASK-054-13, TASK-055  
**Status:** Done (2026-02-20)

---

## Overview
Ustandaryzowac kontrakt manifestu kitow oraz instalacje presetow/template'ow tak, aby:
- instalacja byla idempotentna,
- kolizje nazw byly rozwiazywane deterministycznie,
- rollback odtwarzal snapshot,
- admin widzial czytelny plan `includes` + `postInstallTasks`.

## Sub-Tasks
1. `TASK-054-17-01` - Kit manifest contract + normalization.
2. `TASK-054-17-02` - Template/preset installer with deterministic collisions.
3. `TASK-054-17-03` - Solution kits API + admin UX contract exposure.
4. `TASK-054-17-04` - QA, docs, changelog, kanban closure.

## Files to Change
- `_docs/SOLUTION_KITS.md`
- `_docs/TEMPLATE_CONTRACTS.md` (new)
- `core/services/kits/kitManifest.ts` (new)
- `core/services/kits/kitInstaller.ts` (new)
- `core/services/templates/templateInstaller.ts` (new)
- `core/services/kits/solutionKitTypes.ts`
- `core/services/kits/solutionKitsCatalog.ts`
- `core/services/kits/solutionKitsService.ts`
- `core/server/routes/solutionKitsRoutes.ts`
- `core/server/validation/solutionKitSchemas.ts`
- `core/admin/services/solutionKitsClient.ts`
- `core/admin/ui/kits/SolutionKitsPage.tsx`

## Security Contract
- Endpointy: `internal` (`/admin/api/solution-kits/*`).
- Auth: sesja admin + RBAC (`solution-kits:read`, `solution-kits:write`).
- Rate-limit: bucket `admin_read` dla GET, `admin_write` dla POST.
- Anti-abuse: CSRF dla write (zachowane przez `apiRequest` + serwerowe middleware).
- Brak publicznych write endpointow w tym tasku.

## Manifest Contract (Target)
```ts
export type SolutionKitManifest = {
  id: string;
  title: string;
  vertical: string;
  includes: {
    contentTypes: string[];
    entries: string[];
    widgets: string[];
    templates: string[];
    forms: string[];
    menus: string[];
  };
  requiredModules: string[];
  optionalModules?: string[];
  postInstallTasks?: string[];
};
```

## Installer Rules
- Idempotent import.
- Namespace collisions handled with deterministic suffixing.
- Rollback snapshot on failure.

## Pseudocode
```ts
beginInstallTransaction();
try {
  applyContentTypes(manifest.includes.contentTypes);
  applyTemplates(manifest.includes.templates);
  applyWidgets(manifest.includes.widgets);
  applyForms(manifest.includes.forms);
  applyMenus(manifest.includes.menus);
  commitInstallTransaction();
} catch (error) {
  rollbackInstallTransaction();
  throw error;
}
```

## Acceptance Criteria
1. Kit import works repeatedly without corrupting data.
2. Admin sees clear success/errors and post-install tasks.
3. Templates and presets remain editable after install.

## Testing Requirements
- Unit: manifest validator and collision strategy.
- Integration: install -> rollback -> reinstall flow.
- UI: kits page shows `includes` and post-install tasks from manifest.

## Documentation Updates Required
- `_docs/SOLUTION_KITS.md`
- `_docs/TEMPLATE_CONTRACTS.md`
- `_docs/_CHANGELOG/*.md` (when implemented)

## Completion Notes (2026-02-20)
- Added normalized `SolutionKitManifest` contract and catalog wiring.
- Added template install/rollback layer with deterministic collision strategy and marker-based ownership.
- Wired solution kits service to run template install phase and persist run metadata (`options.manifest`, `options.kitInstaller`).
- Updated kits UI and API docs to expose manifest/includes and post-install checklist.
