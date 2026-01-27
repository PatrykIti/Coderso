import { createAssetsApi, DEFAULT_PLUGINS_DIR } from "./loader";
import {
  deletePluginSetting,
  getPluginSetting,
  setPluginSetting,
  type PluginRecord,
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
  permission?: string;
};

const hookActions = new Map<string, HookRegistration[]>();
const hookFilters = new Map<string, HookRegistration[]>();
const pluginRoutes: PluginRoute[] = [];

export function getHookRegistry() {
  return { actions: hookActions, filters: hookFilters };
}

export function getPluginRoutes() {
  return [...pluginRoutes];
}

function createLogger(pluginName: string) {
  return {
    info: (...args: unknown[]) => console.info(`[plugin:${pluginName}]`, ...args),
    warn: (...args: unknown[]) => console.warn(`[plugin:${pluginName}]`, ...args),
    error: (...args: unknown[]) => console.error(`[plugin:${pluginName}]`, ...args),
  };
}

function createHooksApi(pluginName: string) {
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
    addAction: (name: string, fn: HookHandler) => add(hookActions, name, fn),
    addFilter: (name: string, fn: (value: unknown, ctx: HookContext) => unknown) =>
      add(hookFilters, name, fn as HookHandler),
    removeAction: (name: string, fn: HookHandler) => remove(hookActions, name, fn),
    removeFilter: (
      name: string,
      fn: (value: unknown, ctx: HookContext) => unknown
    ) => remove(hookFilters, name, fn as HookHandler),
  };
}

function createRoutesApi(pluginName: string, permissions: string[]) {
  const allowed = new Set(permissions);
  return {
    register: (input: {
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      path: string;
      handler: (req: Request) => Response | Promise<Response>;
      permission?: string;
    }) => {
      if (input.permission && !allowed.has(input.permission)) {
        throw new Error("plugin_permission_missing");
      }
      pluginRoutes.push({
        pluginName,
        method: input.method,
        path: input.path,
        handler: input.handler,
        permission: input.permission,
      });
    },
  };
}

function createPermissionsApi(permissions: string[]) {
  const allowed = new Set(permissions);
  return {
    has: (permission: string) => allowed.has(permission),
    require: (permission: string) => {
      if (!allowed.has(permission)) {
        throw new Error("plugin_permission_missing");
      }
    },
  };
}

function createSettingsApi(pluginName: string) {
  return {
    get: async (key: string) => getPluginSetting(pluginName, key),
    set: async (key: string, value: unknown) => {
      await setPluginSetting(pluginName, key, value);
    },
    delete: async (key: string) => {
      await deletePluginSetting(pluginName, key);
    },
  };
}

function createStorageApi(pluginName: string) {
  return {
    get: async (key: string) => getPluginSetting(pluginName, key),
    set: async (key: string, value: unknown) => {
      await setPluginSetting(pluginName, key, value);
    },
    delete: async (key: string) => {
      await deletePluginSetting(pluginName, key);
    },
  };
}

export function createServerContext(
  plugin: PluginRecord,
  runtimeDir: string = DEFAULT_PLUGINS_DIR
) {
  const permissionList = Array.isArray(plugin.permissions)
    ? plugin.permissions.filter((item) => typeof item === "string")
    : [];

  return {
    apiVersion: "1" as const,
    plugin: { name: plugin.name, version: plugin.version },
    logger: createLogger(plugin.name),
    config: {
      get: (key: string) => process.env[key] ?? null,
    },
    hooks: createHooksApi(plugin.name),
    routes: createRoutesApi(plugin.name, permissionList),
    assets: createAssetsApi(runtimeDir, plugin.name, plugin.version),
    permissions: createPermissionsApi(permissionList),
    settings: createSettingsApi(plugin.name),
    storage: createStorageApi(plugin.name),
  };
}
