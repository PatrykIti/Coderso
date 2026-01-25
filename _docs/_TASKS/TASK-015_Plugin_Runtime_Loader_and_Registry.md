# TASK-015: Plugin Runtime Loader and Registry
# FileName: TASK-015_Plugin_Runtime_Loader_and_Registry.md

**Priority:** High
**Category:** Core/Plugins
**Estimated Effort:** Large
**Dependencies:** TASK-001, TASK-004
**Status:** To Do

---

## Overview

Implement the runtime plugin registry and loader. Plugins are loaded from
`plugins-runtime` without rebuilding core. Provide safe mode, error
isolation, and auto-disable on repeated failures.

**Goals:**
- Registry for installed plugins.
- Runtime load/unload with ESM entrypoints.
- Safe mode and error handling.

---

## Architecture

```
core/plugins/
  registry.ts
  loader.ts
  pluginManager.ts
  compat.ts
core/server/middleware/
  pluginErrorGuard.ts
admin/ui/plugins/
  PluginErrorBoundary.tsx

tests/unit/plugins/
  registry.test.ts
  loader.test.ts
  compat.test.ts
```

---

## Sub-Tasks

### TASK-015-01_Plugin_registry_service

**Status:** To Do

Registry keeps install state, enabled flag, version, last error, and
permissions.

Rules:
- Store `api_version`, `core_version`, `installed_at`, `updated_at`.
- `last_error` holds last runtime error (truncated).
- `status` values: installed, disabled, error.

Example:

```ts
async function setPluginEnabled(name: string, enabled: boolean) {
  await db.update(plugins).set({ enabled, updatedAt: new Date() })
    .where(eq(plugins.name, name));
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/plugins/registry.ts` | registry CRUD |
| `core/db/schema.ts` | plugins + plugin_settings tables |

Registry sketch:

```ts
export async function listPlugins() {
  return db.select().from(plugins).orderBy(plugins.name);
}
```

---

### TASK-015-02_Plugin_settings_storage

**Status:** To Do

- Backed by `plugin_settings` table.
- Scoped by plugin name.
- Used by SDK SettingsAPI.

Example:

```ts
async function setPluginSetting(pluginName: string, key: string, value: unknown) {
  await db.insert(pluginSettings).values({ pluginName, key, value })
    .onConflictDoUpdate({
      target: [pluginSettings.pluginName, pluginSettings.key],
      set: { value },
    });
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/plugins/registry.ts` | settings helpers |

---

### TASK-015-03_Runtime_loader_server

**Status:** To Do

Rules:
- Load ESM from `plugins-runtime/<name>/<version>/dist/server.mjs`.
- Call `register(ctx)` only after compatibility checks.
- Disallow side effects at import time (best effort).
- Validate `plugin.json` manifest on load.

Example:

```ts
const mod = await import(serverEntryUrl);
await mod.default(serverContext);
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/plugins/loader.ts` | dynamic import + register |
| `core/plugins/compat.ts` | apiVersion/coreVersion checks |

Loader sketch:

```ts
export async function loadPlugin(entryPath: string, ctx: ServerContext) {
  const mod = await import(entryPath);
  if (typeof mod.default !== "function") throw new Error("Missing register()");
  await mod.default(ctx);
}
```

Compat sketch:

```ts
export function isCompatible(meta) {
  return semver.satisfies(CORE_VERSION, meta.coreVersion);
}
```

---

### TASK-015-04_Assets_mapping

**Status:** To Do

Expose plugin public assets under:
`/plugins/<name>/<version>/...`.

Rules:
- Block path traversal (sanitize path).
- Cache headers for immutable assets.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/plugins/loader.ts` | map public assets |
| `core/server/router.ts` | static route for plugin assets |

Assets guard sketch:

```ts
if (path.includes("..")) return new Response("Invalid path", { status: 400 });
```

---

### TASK-015-05_Safe_mode_and_error_handling

**Status:** To Do

- Safe mode disables all plugins (env or setting).
- Error guard for hooks/routes; log and continue.
- Auto-disable plugin after N errors.
- Watchdog/timeouts for hook execution.
- Track error counts per plugin in memory + persist to DB.

Example:

```ts
async function runWithTimeout<T>(work: Promise<T>, ms: number) {
  return Promise.race([
    work,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/plugins/pluginManager.ts` | safe mode + auto-disable |
| `core/server/middleware/pluginErrorGuard.ts` | error isolation |

Error guard sketch:

```ts
export async function runPluginSafe(fn: () => Promise<void>) {
  try { await fn(); } catch (err) { logPluginError(err); }
}
```

Plugin manager sketch:

```ts
export async function loadAllPlugins() {
  if (process.env.PLUGINS_SAFE_MODE === "1") return [];
  const installed = await listPlugins();
  return Promise.all(installed.filter(p => p.enabled).map(loadPluginEntry));
}
```

---

### TASK-015-06_Admin_UI_error_boundaries

**Status:** To Do

Wrap plugin UI with error boundaries and show fallback when a plugin
throws in admin UI.

Fallback:
- Display plugin name and version.
- Provide "disable plugin" button.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/plugins/PluginErrorBoundary.tsx` | error boundary |

Error boundary sketch:

```tsx
<PluginErrorBoundary plugin={plugin}>
  <PluginPage />
</PluginErrorBoundary>
```

---

## Testing Requirements

- [ ] `tests/unit/plugins/compat.test.ts` rejects incompatible apiVersion.
- [ ] `tests/unit/plugins/loader.test.ts` loads valid plugin.
- [ ] `tests/unit/plugins/registry.test.ts` toggles enabled state.
- [ ] `tests/integration/plugins/safeMode.test.ts` loads core without plugins.
- [ ] `tests/integration/plugins/autoDisable.test.ts` disables on error.
- [ ] `tests/integration/plugins/assets.test.ts` serves public assets.

---

## New Files to Create

- `core/plugins/registry.ts`
- `core/plugins/loader.ts`
- `core/plugins/pluginManager.ts`
- `core/plugins/compat.ts`
- `core/server/middleware/pluginErrorGuard.ts`
- `admin/ui/plugins/PluginErrorBoundary.tsx`
- `tests/unit/plugins/registry.test.ts`
- `tests/unit/plugins/loader.test.ts`
- `tests/unit/plugins/compat.test.ts`
- `tests/integration/plugins/safeMode.test.ts`
- `tests/integration/plugins/autoDisable.test.ts`
- `tests/integration/plugins/assets.test.ts`

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (loader behavior and safe mode).
- `_docs/SECURITY_SPEC.md` (auto-disable and watchdog).
- `_docs/SDK_SPEC.md` (assets and hook context usage).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-plugin-runtime-loader.md`
- Notes: plugin registry, loader, safe mode.

---

## Additional Docs

- `_docs/STORE_SPEC.md`
