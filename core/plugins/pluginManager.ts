import path from "node:path";
import {
  DEFAULT_PLUGINS_DIR,
  loadPluginFromDir,
  type PluginManifest,
} from "./loader";
import {
  formatPluginError,
  getPluginByName,
  listPlugins,
  resetPluginErrors,
  type PluginRecord,
  updatePluginErrorState,
} from "./registry";
import {
  createServerContext,
  getHookRegistry,
  getPluginRoutes,
} from "./sdkRuntime";

export type LoadedPlugin = {
  plugin: PluginRecord;
  manifest: PluginManifest;
};

function normalizeThreshold(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function isSafeMode() {
  const value = process.env.PLUGINS_SAFE_MODE;
  return value === "1" || value === "true";
}

export { getPluginRoutes, getHookRegistry };

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
