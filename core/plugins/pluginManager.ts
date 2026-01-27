import path from "node:path";
import {
  DEFAULT_PLUGINS_DIR,
  createAssetsApi,
  loadPluginFromDir,
  type PluginManifest,
  type ServerContext,
} from "./loader";
import {
  formatPluginError,
  getPluginByName,
  listPlugins,
  resetPluginErrors,
  setPluginSetting,
  deletePluginSetting,
  getPluginSetting,
  type PluginRecord,
  updatePluginErrorState,
} from "./registry";

export type HookContext = {
  requestId: string;
  method?: string;
  path?: string;
  locale?: string;
  session?: { id: string; userId: string };
  user?: { id: string; email: string; roles: string[] };
  ip?: string;
  userAgent?: string;
};

type HookHandler = (payload: unknown, ctx: HookContext) => unknown;

type HookRegistration = {
  pluginName: string;
  handler: HookHandler;
};

export type PluginRoute = {
  pluginName: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  handler: (req: Request) => Response | Promise<Response>;
};

export type LoadedPlugin = {
  plugin: PluginRecord;
  manifest: PluginManifest;
};

const hookActions = new Map<string, HookRegistration[]>();
const hookFilters = new Map<string, HookRegistration[]>();
const pluginRoutes: PluginRoute[] = [];

function normalizeThreshold(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function isSafeMode() {
  const value = process.env.PLUGINS_SAFE_MODE;
  return value === "1" || value === "true";
}

export function getPluginRoutes() {
  return [...pluginRoutes];
}

export function getHookRegistry() {
  return {
    actions: hookActions,
    filters: hookFilters,
  };
}

function createLogger(pluginName: string) {
  return {
    info: (...args: unknown[]) => console.info(`[plugin:${pluginName}]`, ...args),
    warn: (...args: unknown[]) => console.warn(`[plugin:${pluginName}]`, ...args),
    error: (...args: unknown[]) => console.error(`[plugin:${pluginName}]`, ...args),
  };
}

function createHooksApi(pluginName: string): ServerContext["hooks"] {
  const add = (store: Map<string, HookRegistration[]>, name: string, handler: HookHandler) => {
    const entries = store.get(name) ?? [];
    entries.push({ pluginName, handler });
    store.set(name, entries);
  };

  const remove = (
    store: Map<string, HookRegistration[]>,
    name: string,
    handler: HookHandler
  ) => {
    const entries = store.get(name);
    if (!entries) return;
    store.set(
      name,
      entries.filter((entry) => entry.handler !== handler)
    );
  };

  return {
    addAction: (name, fn) => add(hookActions, name, fn),
    addFilter: (name, fn) => add(hookFilters, name, fn),
    removeAction: (name, fn) => remove(hookActions, name, fn),
    removeFilter: (name, fn) => remove(hookFilters, name, fn),
  };
}

function createRoutesApi(pluginName: string): ServerContext["routes"] {
  return {
    register: (input) => {
      pluginRoutes.push({
        pluginName,
        method: input.method,
        path: input.path,
        handler: input.handler,
      });
    },
  };
}

function createPermissionsApi(permissions: string[]): ServerContext["permissions"] {
  const allowed = new Set(permissions);
  return {
    has: (permission) => allowed.has(permission),
    require: (permission) => {
      if (!allowed.has(permission)) {
        throw new Error("plugin_permission_missing");
      }
    },
  };
}

function createSettingsApi(pluginName: string): ServerContext["settings"] {
  return {
    get: async (key) => getPluginSetting(pluginName, key),
    set: async (key, value) => {
      await setPluginSetting(pluginName, key, value);
    },
    delete: async (key) => {
      await deletePluginSetting(pluginName, key);
    },
  };
}

function createStorageApi(pluginName: string): ServerContext["storage"] {
  return {
    get: async (key) => getPluginSetting(pluginName, key),
    set: async (key, value) => {
      await setPluginSetting(pluginName, key, value);
    },
    delete: async (key) => {
      await deletePluginSetting(pluginName, key);
    },
  };
}

function createServerContext(plugin: PluginRecord, runtimeDir: string): ServerContext {
  const permissionList = Array.isArray(plugin.permissions)
    ? plugin.permissions.filter((item) => typeof item === "string")
    : [];

  return {
    apiVersion: "1",
    plugin: { name: plugin.name, version: plugin.version },
    logger: createLogger(plugin.name),
    config: {
      get: (key) => process.env[key] ?? null,
    },
    hooks: createHooksApi(plugin.name),
    routes: createRoutesApi(plugin.name),
    assets: createAssetsApi(runtimeDir, plugin.name, plugin.version),
    permissions: createPermissionsApi(permissionList),
    settings: createSettingsApi(plugin.name),
    storage: createStorageApi(plugin.name),
  };
}

export async function recordPluginFailure(name: string, error: unknown) {
  const plugin = await getPluginByName(name);
  if (!plugin) return null;

  const threshold = normalizeThreshold(process.env.PLUGIN_ERROR_THRESHOLD, 3);
  const nextCount = plugin.errorCount + 1;
  const shouldDisable = nextCount >= threshold;
  const currentStatus = plugin.status as "installed" | "disabled" | "error";

  const updated = await updatePluginErrorState(name, {
    errorCount: nextCount,
    lastError: formatPluginError(error),
    status: shouldDisable ? "error" : currentStatus,
    enabled: shouldDisable ? false : plugin.enabled,
  });

  return { plugin: updated, shouldDisable };
}

export async function loadAllPlugins(options?: { runtimeDir?: string }) {
  if (isSafeMode()) return [] as LoadedPlugin[];

  const runtimeDir = options?.runtimeDir ?? DEFAULT_PLUGINS_DIR;
  const installed = await listPlugins();
  const loaded: LoadedPlugin[] = [];

  for (const plugin of installed) {
    if (!plugin.enabled) continue;

    const pluginDir = path.join(runtimeDir, plugin.name, plugin.version);
    const ctx = createServerContext(plugin, runtimeDir);

    try {
      const manifest = await loadPluginFromDir(pluginDir, ctx);
      if (manifest.name !== plugin.name || manifest.version !== plugin.version) {
        throw new Error("plugin_manifest_mismatch");
      }
      await resetPluginErrors(plugin.name);
      loaded.push({ plugin, manifest });
    } catch (error) {
      await recordPluginFailure(plugin.name, error);
    }
  }

  return loaded;
}

export async function loadPluginByName(name: string, options?: { runtimeDir?: string }) {
  const plugin = await getPluginByName(name);
  if (!plugin || !plugin.enabled) return null;

  const runtimeDir = options?.runtimeDir ?? DEFAULT_PLUGINS_DIR;
  const pluginDir = path.join(runtimeDir, plugin.name, plugin.version);
  const ctx = createServerContext(plugin, runtimeDir);

  const manifest = await loadPluginFromDir(pluginDir, ctx);
  if (manifest.name !== plugin.name || manifest.version !== plugin.version) {
    throw new Error("plugin_manifest_mismatch");
  }

  await resetPluginErrors(plugin.name);
  return { plugin, manifest } as LoadedPlugin;
}
