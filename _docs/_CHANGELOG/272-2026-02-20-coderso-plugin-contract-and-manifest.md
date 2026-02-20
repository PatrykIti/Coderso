# 272 - Coderso Plugin Contract and Package Manifest

- **Date:** 2026-02-20
- **Version:** 0.1.272
- **Tasks:** TASK-054-15, TASK-054-15-01, TASK-054-15-02, TASK-054-15-03, TASK-054-15-04

## Key Changes

### SDK Contract
- Added `@core/sdk/pluginManifest` with `CodersoPluginManifest` types and normalization helpers.
- Added normalization path for legacy aliases:
  - `apiVersion` -> `targetApiVersion`
  - `coreVersion` -> `targetCoreVersion`

### Runtime Validation and Registration
- Added runtime manifest validator and contribution registrar:
  - strict contribution normalization (`modules/widgets/presets/templates/routes`),
  - compatibility checks (`targetApiVersion`, `targetCoreVersion`),
  - dependency fail-fast checks during install/load.
- Integrated validator path into plugin loader/install manager flows.

### Plugin Route Hardening
- Hardened SDK route registration:
  - safe plugin route path validation,
  - write methods require explicit permission,
  - permission must be declared in manifest,
  - runtime path scoped to `/admin/api/plugins/<plugin-name>/*`.

### Internal Plugins API
- Added internal routes:
  - `GET /admin/api/plugins`
  - `POST /admin/api/plugins/manifest/validate`
- Added error mapping for invalid manifest payload (`400 plugin_manifest_invalid`).

### Tests and Documentation
- Added tests:
  - `tests/unit/plugins/pluginManifest.test.ts`
  - `tests/integration/routes/pluginsRoutes.test.ts`
- Updated docs:
  - `_docs/CODERSO_PLUGIN_CONTRACT.md` (new)
  - `_docs/STORE_API.md` (new)
  - `_docs/ARCHITECTURE.md`
  - `_docs/CMS_API.md`
  - `_docs/STORE_SPEC.md`
  - `_docs/SDK_SPEC.md`
  - `_docs/CODERSO_MODULES.md`
  - `_docs/README.md`
