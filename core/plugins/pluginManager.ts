import path from "node:path";
import {
  DEFAULT_PLUGINS_DIR,
  readPluginManifest,
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
  clearPluginRoutes,
  clearPluginRoutesForPlugin,
  getHookRegistry,
  getPluginRoutes,
} from "./sdkRuntime";
import {
  assertManifestDependencies,
  clearPluginContributions,
  registerPluginContributions,
  unregisterPluginContributions,
} from "./runtime/moduleRegistrar";
import { getSecuritySettings } from "../services/settings/securitySettings";

export type LoadedPlugin = {
  plugin: PluginRecord;
  manifest: PluginManifest;
};

function normalizeThreshold(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function isSafeModeEnv() {
  const value = process.env.PLUGINS_SAFE_MODE;
  return value === "1" || value === "true";
}

export async function isSafeMode() {
  if (isSafeModeEnv()) return true;
  const settings = await getSecuritySettings();
  return settings.plugins.safeMode;
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
  if (await isSafeMode()) return [] as LoadedPlugin[];

  const runtimeDir = options?.runtimeDir ?? DEFAULT_PLUGINS_DIR;
  const installed = await listPlugins();
  const installedPluginIds = new Set(installed.map((plugin) => plugin.name));
  const loaded: LoadedPlugin[] = [];
  clearPluginRoutes();
  clearPluginContributions();

  for (const plugin of installed) {
    if (!plugin.enabled) continue;

    const pluginDir = path.join(runtimeDir, plugin.name, plugin.version);
    clearPluginRoutesForPlugin(plugin.name);

    try {
      const manifest = await readPluginManifest(pluginDir);
      const ctx = createServerContext(plugin, runtimeDir, {
        declaredRoutes: manifest.provides.routes ?? [],
      });
      await loadPluginFromDir(pluginDir, ctx, manifest);
      if (manifest.name !== plugin.name || manifest.version !== plugin.version) {
        throw new Error("plugin_manifest_mismatch");
      }
      assertManifestDependencies(manifest, installedPluginIds);
      registerPluginContributions(manifest);
      await resetPluginErrors(plugin.name);
      loaded.push({ plugin, manifest });
    } catch (error) {
      clearPluginRoutesForPlugin(plugin.name);
      unregisterPluginContributions(plugin.name);
      await recordPluginFailure(plugin.name, error);
    }
  }

  return loaded;
}

export async function loadPluginByName(name: string, options?: { runtimeDir?: string }) {
  if (await isSafeMode()) return null;
  const plugin = await getPluginByName(name);
  if (!plugin || !plugin.enabled) return null;

  const runtimeDir = options?.runtimeDir ?? DEFAULT_PLUGINS_DIR;
  const pluginDir = path.join(runtimeDir, plugin.name, plugin.version);
  clearPluginRoutesForPlugin(plugin.name);
  const installed = await listPlugins();
  const installedPluginIds = new Set(
    installed.filter((entry) => entry.enabled).map((entry) => entry.name)
  );
  try {
    const manifest = await readPluginManifest(pluginDir);
    const ctx = createServerContext(plugin, runtimeDir, {
      declaredRoutes: manifest.provides.routes ?? [],
    });
    await loadPluginFromDir(pluginDir, ctx, manifest);
    if (manifest.name !== plugin.name || manifest.version !== plugin.version) {
      throw new Error("plugin_manifest_mismatch");
    }

    assertManifestDependencies(manifest, installedPluginIds);
    registerPluginContributions(manifest);
    await resetPluginErrors(plugin.name);
    return { plugin, manifest } as LoadedPlugin;
  } catch (error) {
    clearPluginRoutesForPlugin(plugin.name);
    unregisterPluginContributions(plugin.name);
    throw error;
  }
}
