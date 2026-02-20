# TASK-054-17-02: Template and Preset Installer Service
# FileName: TASK-054-17-02_Template_and_Preset_Installer_Service.md

**Priority:** High  
**Category:** Services/Installer  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-17-01  
**Status:** To Do

---

## Overview
Dostarczyc warstwe instalatora dla template/preset resources i zepnac ja z istniejacym flow install/rollback kitow.

## Scope
1. Dodac `templateInstaller.ts`:
   - deterministic collision strategy (`name`, `slug` suffix `-kit-{kitId}-{n}`),
   - upsert/update/noop detection,
   - snapshot payload dla rollback.
2. Dodac `kitInstaller.ts`:
   - orchestration adapter nad `solutionKitsInstallService`,
   - transakcja z rollback snapshot,
   - public API do apply/dry-run/reinstall.
3. Rozszerzyc service output o wyniki template/preset operations (resource type `template`).

## Files
- `core/services/templates/templateInstaller.ts` (new)
- `core/services/kits/kitInstaller.ts` (new)
- `core/services/kits/solutionKitsInstallService.ts`
- `core/services/widgets/widgetTemplateService.ts` (read/update helpers if needed)

## Pseudocode
```ts
const target = findTemplateBySlug(slug) ?? findTemplateByName(name);
if (!target) return createTemplate(input);
if (isEquivalent(target, input)) return noop(target);
if (collisionButDifferentOwnership(target, kitId)) {
  const namespaced = withDeterministicSuffix(input, kitId, nextIndex(target));
  return createTemplate(namespaced);
}
return updateTemplate(target.id, input);
```

## Testing Requirements
- Unit:
  - collision suffix determinism,
  - noop on identical payload,
  - update path preserves editable fields.
- Integration:
  - install -> rollback -> reinstall with templates.

## Documentation Updates Required
- `_docs/SOLUTION_KITS.md`
- `_docs/TEMPLATE_CONTRACTS.md`

