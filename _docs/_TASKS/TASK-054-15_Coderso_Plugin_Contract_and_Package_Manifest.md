# TASK-054-15: Coderso Plugin Contract and Package Manifest
# FileName: TASK-054-15_Coderso_Plugin_Contract_and_Package_Manifest.md

**Priority:** High  
**Category:** Platform + SDK + Store  
**Estimated Effort:** Large  
**Dependencies:** TASK-021, TASK-022, TASK-026, TASK-054-06  
**Status:** Done (2026-02-20)

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

## Sub-Tasks
- `TASK-054-15-01`: SDK manifest contract and normalization helpers
- `TASK-054-15-02`: Core runtime manifest validator and module registrar
- `TASK-054-15-03`: Plugin routes hardening and internal plugins routes contract
- `TASK-054-15-04`: Tests, docs, changelog, and task closure

## Completion Notes (2026-02-20)
- Added SDK manifest contract (`@core/sdk/pluginManifest`) with strict normalization and legacy alias handling.
- Added runtime validator + module registrar with dependency fail-fast checks in install/load flows.
- Added internal plugin routes (`GET /plugins`, `POST /plugins/manifest/validate`) and route hardening for plugin SDK registration.
- Synchronized architecture/API/store docs and recorded changelog entry.
