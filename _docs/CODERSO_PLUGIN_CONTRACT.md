# Coderso Plugin Contract

Source of truth for plugin package manifest and runtime registration rules.

## Manifest (`plugin.json`)

```json
{
  "id": "seo-boost",
  "name": "seo-boost",
  "version": "1.0.0",
  "targetApiVersion": "1",
  "targetCoreVersion": ">=0.1.0 <0.2.0",
  "entry": {
    "server": "dist/server.mjs",
    "client": "dist/client.mjs",
    "styles": "dist/style.css"
  },
  "provides": {
    "modules": ["plugin:seo-boost/custom-module"],
    "widgets": ["plugin:seo-boost/seo-overview"],
    "routes": ["/sync", "/webhook"]
  },
  "permissions": ["content:read", "content:write"],
  "dependencies": ["forms-plus"],
  "featureFlags": ["seo-beta"],
  "migrations": [{ "id": "001_init", "file": "migrations/001.sql" }],
  "integrity": { "sha256": "..." }
}
```

## Backward-Compatible Aliases

Runtime accepts legacy fields and normalizes them:
- `apiVersion` -> `targetApiVersion`
- `coreVersion` -> `targetCoreVersion`
- missing `id` -> fallback to `name`

Guardrail:
- normalized `id` must equal `name` in v1 runtime contract.

## Validation Rules

- manifest must pass schema normalization and compatibility checks,
- `targetApiVersion` + `targetCoreVersion` must satisfy core compatibility,
- dependency ids must exist in installed enabled plugins,
- contribution ids are normalized and deduplicated,
- `provides.modules` must be either:
  - current core module id (`engine`, `entries`, ...); the accepted `widgets`
    and `templates` module ids are deprecated manifest-read aliases only, or
  - plugin-scoped id: `plugin:<plugin-id>/<module>`.

Contribution semantics:
- `provides.widgets` declares configurable **Admin Dashboard** widgets only.
- Content/editor extensions use SDK `blocks.registerBlock` and the owning
  domain section/block contract; they are not declared as widgets.
- `provides.presets` and `provides.templates` are retained normalized manifest
  fields for installed-package compatibility. They do not create generic
  widget presets/templates or an admin authoring surface; new use requires an
  explicit typed Page/domain contract first.

## Route Registration Contract

Plugin server routes are registered through SDK and enforced by core:
- path must be a safe relative route (`/sync`, `/webhook`),
- path traversal / query/hash fragments are rejected,
- write methods (`POST`, `PUT`, `PATCH`, `DELETE`) require explicit `permission`,
- permission must be declared in plugin `permissions`,
- route must be declared in manifest `provides.routes` when declaration list is provided,
- runtime path is scoped to:
  - `/admin/api/plugins/<plugin-name>/*`.

## Runtime Contributions Registry

Core stores normalized contributions per plugin in memory at load time:
- `modules`, `widgets`, `presets`, `templates`, `routes`.

Here `widgets` is Dashboard-only. `presets`/`templates` remain passive legacy
metadata unless a separate domain-owned block/Page Template adapter explicitly
consumes them; normalization alone never enables authoring.

Registry is reset on full plugin reload (`loadAllPlugins`) and per-plugin updates.

## Internal Admin API

Permissions: `plugins:read`, `plugins:manage`

- `GET /admin/api/plugins`
  - returns installed plugin list + normalized contribution snapshot.
- `POST /admin/api/plugins/manifest/validate`
  - validates manifest payload (dry-run),
  - returns normalized manifest,
  - invalid payload -> `400 plugin_manifest_invalid`.

## Security

- endpoints are internal only (`/admin/api/*`),
- RBAC enforced (`plugins:read` / `plugins:manage`),
- routed through admin rate-limit buckets (`admin_read` / `admin_write`),
- no public write surface introduced by this contract.
