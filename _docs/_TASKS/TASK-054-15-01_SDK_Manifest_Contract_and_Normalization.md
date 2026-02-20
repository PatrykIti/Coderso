# TASK-054-15-01: SDK Manifest Contract and Normalization
# FileName: TASK-054-15-01_SDK_Manifest_Contract_and_Normalization.md

**Priority:** High  
**Category:** SDK + Contract  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-15  
**Status:** To Do

---

## Overview
Wprowadzić oficjalny kontrakt `CodersoPluginManifest` do SDK i helpery normalizacji pod runtime walidator.

## Scope
1. Dodać `packages/sdk/src/pluginManifest.ts` z typami manifestu i helperami:
   - `isPluginManifestLike`,
   - `normalizePluginManifest`.
2. Dodać export `./pluginManifest` w `packages/sdk/package.json`.
3. Utrzymać kompatybilność z obecnym `plugin.json` (`apiVersion/coreVersion`) przez alias do `targetApiVersion/targetCoreVersion`.

## Files
- `packages/sdk/src/pluginManifest.ts` (new)
- `packages/sdk/package.json`

## Pseudocode
```ts
normalizePluginManifest(input) {
  const targetApiVersion = input.targetApiVersion ?? input.apiVersion;
  const targetCoreVersion = input.targetCoreVersion ?? input.coreVersion;
  return {
    id: normalizeSlug(input.id ?? input.name),
    name: input.name,
    version: input.version,
    targetApiVersion,
    targetCoreVersion,
    provides: normalizeProvides(input.provides),
    permissions: normalizeStringArray(input.permissions),
    dependencies: normalizeStringArray(input.dependencies),
    featureFlags: normalizeStringArray(input.featureFlags),
    migrations: normalizeMigrations(input.migrations),
  };
}
```

## Testing Requirements
- Unit: normalization alias path (`apiVersion/coreVersion` -> target fields).
- Unit: invalid ids and malformed provides are rejected by type guard path.

## Documentation Updates Required
- `_docs/CODERSO_PLUGIN_CONTRACT.md`

