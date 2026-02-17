# TASK-054-17: Coderso Presets, Templates, and Kits Contract
# FileName: TASK-054-17_Coderso_Presets_Templates_and_Kits_Contract.md

**Priority:** High  
**Category:** CMS/Templates + Setup UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-07, TASK-054-13, TASK-055  
**Status:** To Do

---

## Goal
Standardize how presets, templates, and full kits are packaged and installed.

## Files to Change
- `_docs/SOLUTION_KITS.md`
- `_docs/TEMPLATE_CONTRACTS.md`
- `core/services/kits/kitManifest.ts` (new)
- `core/services/kits/kitInstaller.ts` (new)
- `core/services/templates/templateInstaller.ts` (new)
- `core/server/routes/solutionKitsRoutes.ts`
- `core/admin/ui/kits/SolutionKitsPage.tsx`

## Kit Manifest Contract
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
- E2E: one-click kit setup to working frontend page.

## Documentation Updates Required
- `_docs/SOLUTION_KITS.md`
- `_docs/TEMPLATE_CONTRACTS.md`
- `_docs/_CHANGELOG/*.md` (when implemented)
