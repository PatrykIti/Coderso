# Plugins, SDK & Store

Plugins are how you extend Coderso without forking core. They are prebuilt ESM bundles that install, upgrade, and roll back **at runtime — no core rebuild, no redeploy** ("like PHP, but modern"). This page walks the runtime model, the `@core/sdk` you build against, and the Store that distributes plugins.

## Why this matters

Core is a CI-built, typed SSR React + Bun artifact. You should never have to touch it to add a feature. Instead, you ship a small ESM bundle, the Store verifies and signs it, and a running Coderso instance downloads, verifies, unpacks, and `import()`s it live. The everyday extension loop stays as immediate as WordPress while core stays a properly built artifact.

One important boundary: **plugins run in the same process as core — there is no sandbox.** Safety comes from *curation* (Store scanning + signing) plus runtime guardrails (timeouts, error thresholds, revocations), not isolation. Treat plugin code as trusted code.

## Runtime plugin model

A plugin is a prebuilt bundle with up to three artifacts:

| File | Required | Purpose |
| --- | --- | --- |
| `dist/server.mjs` | yes | Default-exported `register` (server entry) |
| `dist/client.mjs` | optional | Admin pages / blocks (client entry) |
| `dist/style.css` | optional | Styles, classes prefixed `.plugin-<name>-*` |

**ESM only, no CJS.** `react`, `react-dom`, `react/jsx-runtime(-dev)`, and `@core/sdk/{server,client,shared}` must be declared as `peerDependencies` and marked external — core supplies the runtime implementations. React/react-dom must match core's major. No `node_modules` or TS/TSX ships at runtime.

### Manifest normalization

The manifest is `plugin.json`. `normalizePluginManifest` (in `packages/sdk/src/pluginManifest.ts`) accepts legacy aliases (`apiVersion → targetApiVersion`, `coreVersion → targetCoreVersion`, missing `id → name`), then validates. In the v1 runtime, `id` must equal `name` and match `^[a-z0-9][a-z0-9._-]{1,62}$`. `entry.server` and `integrity` are required; bad input throws coded errors like `plugin_manifest_invalid`.

### Declared contributions

A plugin declares what it provides under `provides`. The valid keys are:

```
modules · widgets · presets · templates · routes
```

`provides.modules` entries must be a core module id (`engine`, `entries`, `widgets`, …) or a plugin-scoped `plugin:<plugin-id>/<module>` — anything else is `plugin_manifest_modules_invalid`. Core keeps a normalized, in-memory contributions registry per plugin, reset on full reload and on per-plugin updates.

### Safe relative routes

Plugin routes are **relative paths only**. `normalizePluginRoutePath` requires a leading `/` and rejects `..`, `//`, `\`, `?`, and `#` (→ `plugin_route_path_invalid`). At runtime the path is scoped under `/plugins/<encoded-name><path>`; management/admin route forms are scoped under `/admin/api/plugins/<plugin-name>/*`.

### Explicit write permissions

Any `POST | PUT | PATCH | DELETE` route without a `permission` is rejected (`plugin_route_permission_required`). At registration the supplied `permission` must be listed in the plugin's declared `permissions` (else `plugin_permission_missing`), and if `provides.routes` is declared, the path must appear there (else `plugin_route_not_declared`).

### Internal admin scoping

Plugin management endpoints live under `/admin/api/*`, gated by RBAC `plugins:read` / `plugins:manage` and routed through admin rate-limit buckets. There is no public write surface.

```
GET  /admin/api/plugins                      installed list + contribution snapshot
POST /admin/api/plugins/manifest/validate    dry-run manifest validator
```

Plugins never touch the database directly — data access is only through SDK APIs (Settings/Storage) and core endpoints.

## Install / upgrade / rollback lifecycle

Plugins are unpacked to a persistent runtime dir (not in git):

```
PLUGINS_RUNTIME_DIR   # defaults to <repoRoot>/plugins-runtime
└── <name>/<version>/        # entry + assets
    └── public/              # served at /plugins/:name/:version/* (1-year immutable cache)
```

**Install** (`core/plugins/installService.ts`, ordered):

1. Fetch metadata + signature; require `STORE_PUBLIC_KEY` (else `store_public_key_missing`).
2. Verify ed25519 signature over canonical metadata (`store_signature_invalid`).
3. Assert compatibility.
4. Download bytes, then verify sha256 of the raw ZIP (`store_checksum_mismatch`).
5. Unzip to a temp dir; validate manifest; assert `name`/`version` match metadata (`plugin_manifest_mismatch`).
6. Assert dependencies against installed **enabled** plugins (`plugin_dependency_missing`).
7. Stat `entry.server` (+ optional client/styles).
8. Atomic publish: remove target, then `rename(tempDir, targetDir)`.
9. Register (records integrity sha256 + optional keyId/signature), audit `plugins.install`/`plugins.update`, then load via dynamic `import()` of `server.mjs`.

**Upgrade** (`updatePluginFromStore`) reuses the full install path and re-verifies. Whether an update applies automatically is governed by `PLUGIN_UPDATE_MODE`:

| Mode | Behavior |
| --- | --- |
| `manual` | Never auto-updates |
| `auto-security` (default) | Auto-updates only `release.type === "security"` |
| `auto-all` | Auto-updates any release |

A `force` flag bypasses the policy. A version switch is just a new path = a new `import()`.

**Rollback / revocation.** There is no version-rollback function in `installService`; recovery is via **revocations**. Core periodically (≈hourly) fetches `revocations.json`; `applyRevocations` disables matching `name`+`version` via `setPluginEnabled(false)` and audits `plugins.disable`. Revocation also blocks installs.

**Failure isolation.** `runPluginSafe` / `runWithTimeout` wrap plugin actions with a timeout (`PLUGIN_TIMEOUT_MS`, default 5000ms). `recordPluginFailure` increments an error count; at `PLUGIN_ERROR_THRESHOLD` (default 3) the plugin is set to status `error` and `enabled=false`. Setting `PLUGINS_SAFE_MODE=1` (or the `plugins.safeMode` security setting) loads no plugins at all — a clean recovery switch.

> These knobs (`PLUGINS_RUNTIME_DIR`, `PLUGINS_SAFE_MODE`, `PLUGIN_UPDATE_MODE`, `PLUGIN_ERROR_THRESHOLD`, `PLUGIN_TIMEOUT_MS`, `STORE_PUBLIC_KEY`, `STORE_BASE_URL`) are infra ENV applied at boot. Changing them is a restart-level operation.

## The SDK (`packages/sdk`)

The public package is `@core/sdk` (`"type": "module"`, `sideEffects: false`, `API_VERSION = "1"`) with subpath exports:

| Import | What you get |
| --- | --- |
| `@core/sdk/server` | `definePlugin`, `ServerContext` |
| `@core/sdk/client` | `defineAdmin`, `registerBlocks`, `ClientContext` |
| `@core/sdk/shared` | shared types |
| `@core/sdk/pluginManifest` | `normalizePluginManifest`, manifest types |

**Server entry.** Default-export a `definePlugin` registration:

```ts
import { definePlugin } from "@core/sdk/server";

export default definePlugin((ctx) => {
  // ctx: logger, config.get, hooks, routes, assets,
  //      permissions, settings, storage, apiVersion, plugin {name, version}
});
```

- `hooks`: `addAction` / `addFilter` (+ `remove*`). Handlers receive `(payload, HookContext)`; `HookContext` carries `requestId` and optional `method/path/locale/session/user{id,email,roles}/ip/userAgent`. Example extension point: the `commerce:checkout:adapters` filter.
- `routes.register({ method, path, handler, permission? })` — relative path, write methods require `permission`.
- `settings` / `storage`: async `get` / `set` / `delete`. `permissions`: `has` / `require`. `assets`: `getUrl` / `getPublicPath`.

**Client entry (optional).** Export `registerAdmin = defineAdmin(...)` and/or `registerBlocks` from `@core/sdk/client`. `ClientContext` gives `ui`, `blocks`, `assets`, `permissions`, `settings`, `http.fetch`. `ui` registers admin pages / dashboard widgets / settings sections (each a React `ComponentType`); `blocks.registerBlock({ type, schema, render, editor? })` adds content blocks.

**Runtime contract.** `register(ctx)` must be idempotent and side-effect-free at import time — all registrations go through the SDK, never at module top level.

## The Store workspace

`store/` (package `@coderso/store`) is the backend that lists, scans, signs, and serves plugin packages. It is currently a scaffold workspace — its `dev`/`test` scripts are `echo` stubs and implementation directories are not yet present. The *consuming* client lives in core (`core/store/{client,verifier,downloader,updater}.ts`) and the admin browse UI under `core/admin/ui/store/*`.

**Goals:** secure distribution by curation; stable metadata + core-side verification; publish/update without rebuilding core.
**Non-goals:** sandboxing untrusted code; building plugins in the store.

**Publish pipeline:** upload ZIP → manifest validation → security scan → store metadata/artifacts → sign `metadata.json` → publish.

**Security scan (v1):** SAST (Semgrep over the ESM bundle); bundle analysis (flags duplicated React/ReactDOM bundled inside); CVE via SBOM (OSV/NVD); secrets scan; license scan (MIT/Apache-2.0/BSD-2/BSD-3/ISC allowed; GPL/AGPL restricted; unknown → warning/block); peer-dependency check. Heuristics flag `eval`/`new Function`, dynamic import from user input, `child_process`/`fs` access, and beaconing. A `scanStatus` of `failed` blocks publish; `warning` needs manual approval.

**Metadata flow:** `metadata.json` (name, version, apiVersion, coreVersion, `checksum.sha256`, `files.download`, security, `release{type,channel}`, `signature.keyId`) + a detached `metadata.sig` (ed25519, base64, signed over canonical minified lexicographically-sorted JSON) + the ZIP. Core's verify order is: signature → checksum → manifest contract → compatibility/deps → install + load.

## Solution kits & template contracts

Solution kits are starter packs across six verticals (`automotive-workshop`, `medical-clinic`, `beauty-salon`, `local-service-business`, `services-directory`, `small-ecommerce`). Each seeds a content type, a form, pages, menus, and derived template seeds. The manifest type `SolutionKitManifest` lives in `core/services/kits/kitManifest.ts`.

Install is **internal only** and two-phase via `POST /admin/api/solution-kits/:id/apply`: (1) core resources via `solutionKitsInstallService`; (2) template seeds via `templateInstaller`. Run metadata records a manifest snapshot, `templateInstallSummary`, and `templateRollbackPlan`.

Template seeds carry an idempotent ownership marker appended to their description:

```
[nextless-kit-template:<kitId>:<templateKey>]
```

A managed template with the same payload is a `noop`; a different payload is an `update`; a missing one is a `create`. **Unmanaged templates are never silently overwritten** — name collisions resolve to a deterministic suffix (`Name`, `Name (2)`, …). Rollback runs via `POST /admin/api/solution-kits/:id/rollback`, reversing template actions then core resources from stored snapshots.

## Build a plugin

1. **Scaffold** an ESM TypeScript package. Add `peerDependencies` `react`, `react-dom`, `@core/sdk` (matching core's major); add `@core/sdk` as a devDependency for types.
2. **Author the server entry**: `export default definePlugin((ctx) => {…})`. Register hooks/routes/settings; keep import side-effect-free and `register` idempotent.
3. **(Optional) client entry**: `defineAdmin` / `registerBlocks` for admin pages, widgets, or content blocks.
4. **Declare routes safely**: relative paths, each listed in `provides.routes`; write methods get a `permission` listed in `permissions`.
5. **Write `plugin.json`**: `id` (= `name`), `version`, `targetApiVersion: "1"`, `targetCoreVersion`, `entry`, `provides`, `permissions`, `dependencies`, `featureFlags`, `migrations`, `integrity`. Dry-run validate with `POST /admin/api/plugins/manifest/validate`.
6. **Bundle to ESM**: produce `dist/server.mjs` (default `register`), optional `dist/client.mjs`, optional `dist/style.css`. Mark all externals external; prefix CSS classes `.plugin-<name>-*`.
7. **Package + checksum**: ZIP the prebuilt plugin and compute its SHA256 (optionally a CycloneDX SBOM and a source tarball).
8. **Publish to store** (`POST /publish`) with a per-plugin token — passes manifest validation and the scan suite, then the store signs `metadata.json`.
9. **Install in an environment**: core fetches metadata + sig, verifies signature → checksum → manifest → compatibility/deps, unzips, atomically renames into `plugins-runtime/<name>/<version>/`, registers, audits, and loads.
10. **Operate**: failures auto-disable to `error`; `PLUGINS_SAFE_MODE` disables all loading; revocations auto-disable compromised versions; upgrades follow `PLUGIN_UPDATE_MODE`.

## Where to go deeper

- [`_docs/SDK_SPEC.md`](../../_docs/SDK_SPEC.md) — full `@core/sdk` surface and contracts.
- [`_docs/CODERSO_PLUGIN_CONTRACT.md`](../../_docs/CODERSO_PLUGIN_CONTRACT.md) — the `plugin.json` manifest and runtime contract.
- [`_docs/STORE_SPEC.md`](../../_docs/STORE_SPEC.md) — publish pipeline, scanning, metadata, and signing.
- [`_docs/SOLUTION_KITS.md`](../../_docs/SOLUTION_KITS.md) — kit manifests, install/rollback, template contracts.
- Sibling pages: [`./runtime-model.md`](./runtime-model.md) for the no-restart model, [`./security.md`](./security.md) for the trust-by-curation stance, and [`./testing.md`](./testing.md) for how to verify your changes.
