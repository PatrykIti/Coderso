# TASK-054-15-02: Core Runtime Manifest Validator and Module Registrar
# FileName: TASK-054-15-02_Core_Runtime_Manifest_Validator_and_Module_Registrar.md

**Priority:** High  
**Category:** Core/Plugins  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-15-01  
**Status:** Done (2026-02-20)

---

## Overview
Zaimplementować runtime walidator manifestu i rejestrator contributionow (`modules/widgets/presets/templates/routes`) z twardą walidacją.

## Scope
1. Dodać `core/plugins/runtime/manifestValidator.ts`.
2. Dodać `core/plugins/runtime/moduleRegistrar.ts`.
3. Podpiąć walidator do `core/plugins/loader.ts` i `core/plugins/installService.ts`.
4. Wymusić fail-fast dla:
   - niekompatybilnego API/core version,
   - brakujących dependency pluginów,
   - invalid route/path definitions.

## Files
- `core/plugins/runtime/manifestValidator.ts` (new)
- `core/plugins/runtime/moduleRegistrar.ts` (new)
- `core/plugins/loader.ts`
- `core/plugins/installService.ts`
- `core/plugins/pluginManager.ts` (if dependency checks on load required)

## Pseudocode
```ts
validatePluginManifest(raw) {
  const manifest = normalizePluginManifest(raw);
  assertCompatible({
    apiVersion: manifest.targetApiVersion,
    coreVersion: manifest.targetCoreVersion,
  });
  assertValidProvides(manifest.provides);
  return manifest;
}

assertDependencies(manifest, installedPlugins) {
  for (const dep of manifest.dependencies) {
    if (!installedPlugins.has(dep)) throw new Error("plugin_dependency_missing");
  }
}

registerModuleContributions(manifest) {
  registry.set(manifest.id, {
    modules: manifest.provides.modules,
    widgets: manifest.provides.widgets,
    presets: manifest.provides.presets,
    templates: manifest.provides.templates,
    routes: manifest.provides.routes,
  });
}
```

## Testing Requirements
- Unit: validator rejects malformed provides and invalid ids.
- Unit: dependency check fails when required plugin missing.
- Unit: registrar stores normalized contributions and supports clear-on-disable path.

## Documentation Updates Required
- `_docs/CODERSO_PLUGIN_CONTRACT.md`
- `_docs/ARCHITECTURE.md`

## Completion Notes (2026-02-20)
- Added runtime manifest validator with compatibility and contribution normalization.
- Added module registrar for normalized plugin contributions.
- Added dependency fail-fast checks in install/load flows.
- Wired loader/install/plugin manager to strict manifest validation path.
