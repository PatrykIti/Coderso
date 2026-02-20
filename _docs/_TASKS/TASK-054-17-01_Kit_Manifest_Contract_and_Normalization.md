# TASK-054-17-01: Kit Manifest Contract and Normalization
# FileName: TASK-054-17-01_Kit_Manifest_Contract_and_Normalization.md

**Priority:** High  
**Category:** Domain Contract  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-17  
**Status:** In Progress (2026-02-20)

---

## Overview
Wprowadzic jawny kontrakt `SolutionKitManifest` i normalizator, ktory mapuje obecny katalog kitow na deterministyczny `includes`.

## Scope
1. Dodac `core/services/kits/kitManifest.ts`:
   - typy `SolutionKitManifest`,
   - builder `buildSolutionKitManifest(kitDefinition)`,
   - walidacje (unique IDs/lists, required modules, sanitized postInstallTasks).
2. Rozszerzyc `solutionKitTypes` o pole `manifest` w `SolutionKitDefinition`.
3. Upewnic sie, ze katalog kitow zawsze zwraca manifest (lazy build + cache in-memory).

## Files
- `core/services/kits/kitManifest.ts` (new)
- `core/services/kits/solutionKitTypes.ts`
- `core/services/kits/solutionKitsCatalog.ts`

## Pseudocode
```ts
const includes = {
  contentTypes: sortUnique(blueprint.contentTypes.map((item) => item.slug)),
  entries: [],
  widgets: collectWidgetTypesFromPages(blueprint.pages),
  templates: collectTemplateSlugsFromPages(blueprint.pages),
  forms: sortUnique(blueprint.forms.map((item) => item.slug)),
  menus: sortUnique(blueprint.menus.map((item) => item.location ?? item.name)),
};

return {
  id: kit.id,
  title: kit.title,
  vertical: normalizeVertical(kit.businessTypes[0]),
  includes,
  requiredModules: sortUnique(kit.recommendedModules),
  optionalModules: [],
  postInstallTasks: inferPostInstallTasks(kit),
};
```

## Testing Requirements
- Unit:
  - builder normalizuje deduplikuje `includes`,
  - invalid manifest input rzuca `solution_kit_manifest_invalid`,
  - widget/template extraction z `page.data.blocks/settings` jest stabilny.

## Documentation Updates Required
- `_docs/SOLUTION_KITS.md`

