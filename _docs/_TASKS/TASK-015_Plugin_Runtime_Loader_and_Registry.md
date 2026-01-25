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
core/server/middleware/
  pluginErrorGuard.ts
admin/ui/plugins/
  PluginErrorBoundary.tsx
```

---

## Sub-Tasks

### TASK-015-1: Plugin registry service

**Status:** To Do

Registry keeps install state, enabled flag, version, last error, and
permissions.

Example:

```ts
async function setPluginEnabled(name: string, enabled: boolean) {
  await db.update(plugins).set({ enabled, updatedAt: new Date() })
    .where(eq(plugins.name, name));
}
```

---

### TASK-015-2: Plugin settings storage

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

---

### TASK-015-3: Runtime loader (server)

**Status:** To Do

Rules:
- Load ESM from `plugins-runtime/<name>/<version>/dist/server.mjs`.
- Call `register(ctx)` only after compatibility checks.
- Disallow side effects at import time (best effort).

Example:

```ts
const mod = await import(serverEntryUrl);
await mod.default(serverContext);
```

---

### TASK-015-4: Assets mapping

**Status:** To Do

Expose plugin public assets under:
`/plugins/<name>/<version>/...`.

Add helper for assets URL in SDK (see TASK-016).

---

### TASK-015-5: Safe mode and error handling

**Status:** To Do

- Safe mode disables all plugins (env or setting).
- Error guard for hooks/routes; log and continue.
- Auto-disable plugin after N errors.
- Watchdog/timeouts for hook execution.

Example:

```ts
async function runWithTimeout<T>(work: Promise<T>, ms: number) {
  return Promise.race([
    work,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}
```

---

### TASK-015-6: Admin UI error boundaries

**Status:** To Do

Wrap plugin UI with error boundaries and show fallback when a plugin
throws in admin UI.

---

## Testing Requirements

- [ ] Loader rejects plugin with incompatible apiVersion.
- [ ] Safe mode loads core without plugins.
- [ ] Plugin auto-disables after repeated errors.
- [ ] Assets are served from plugin public path.

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
