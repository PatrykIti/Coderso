# TASK-054-15: Coderso Plugin Contract and Package Manifest
# FileName: TASK-054-15_Coderso_Plugin_Contract_and_Package_Manifest.md

**Priority:** High  
**Category:** Platform + SDK + Store  
**Estimated Effort:** Large  
**Dependencies:** TASK-021, TASK-022, TASK-026, TASK-054-06  
**Status:** To Do

---

## Goal
Define a strict plugin manifest contract so third-party modules can extend Coderso safely with UI, widgets, routes, and presets.

## Files to Change
- `_docs/ARCHITECTURE.md`
- `_docs/STORE_API.md`
- `_docs/CODERSO_PLUGIN_CONTRACT.md` (new)
- `packages/sdk/src/pluginManifest.ts` (new)
- `core/plugins/runtime/manifestValidator.ts` (new)
- `core/plugins/runtime/moduleRegistrar.ts` (new)
- `core/server/routes/pluginsRoutes.ts`
- `tests/unit/plugins/pluginManifest.test.ts`

## Manifest Contract
```ts
export type CodersoPluginManifest = {
  id: string;
  name: string;
  version: string;
  targetApiVersion: string;
  provides: {
    modules?: string[];
    widgets?: string[];
    presets?: string[];
    templates?: string[];
    routes?: string[];
  };
  permissions?: string[];
  dependencies?: string[];
  featureFlags?: string[];
  migrations?: Array<{ id: string; file: string }>;
};
```

## Runtime Registration Flow
```ts
validateManifest(manifest);
assertApiCompatibility(manifest.targetApiVersion);
assertDependencies(manifest.dependencies);
registerModuleContributions(manifest.provides);
```

## Security Guardrails
- Manifest schema validation mandatory.
- Route scope restrictions for plugin routes.
- Permission declaration required for write capabilities.
- Feature flags required for beta modules.

## Acceptance Criteria
1. Plugins cannot register invalid widgets/modules.
2. Missing dependencies and version mismatch fail fast.
3. Store ingestion validates contract before publish.

## Testing Requirements
- Unit: manifest schema and compatibility checks.
- Integration: install, enable, disable, rollback flows.
- Security: plugin route permission boundaries.

## Documentation Updates Required
- `_docs/CODERSO_PLUGIN_CONTRACT.md` (new)
- `_docs/STORE_API.md`
- `_docs/_CHANGELOG/*.md` (when implemented)
