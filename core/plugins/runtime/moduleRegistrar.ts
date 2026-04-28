import type { CodersoPluginManifest } from "../../../packages/sdk/src/pluginManifest";

const CORE_CODERSO_MODULES = new Set([
  "engine",
  "entries",
  "widgets",
  "templates",
  "forms",
  "posts",
  "listings",
  "filters",
  "search",
  "booking",
  "appointments",
  "reviews",
  "commerce",
  "popups",
  "mega-menu",
  "membership-portal",
  "i18n",
  "ai-kit-wizard",
]);

const CONTRIBUTION_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._:/-]{0,95})$/;

export type PluginContributionRecord = {
  pluginId: string;
  modules: string[];
  widgets: string[];
  presets: string[];
  templates: string[];
  routes: string[];
  registeredAt: string;
};

export type NormalizedManifestContributions = Pick<
  PluginContributionRecord,
  "modules" | "widgets" | "presets" | "templates" | "routes"
>;

const pluginContributions = new Map<string, PluginContributionRecord>();

function uniqueList(values: string[]) {
  return [...new Set(values)];
}

function normalizeContributionId(value: string, errorCode: string) {
  const normalized = value.trim();
  if (!CONTRIBUTION_ID_PATTERN.test(normalized)) {
    throw new Error(errorCode);
  }
  return normalized;
}

function normalizeContributionList(values: string[], errorCode: string) {
  return uniqueList(values.map((value) => normalizeContributionId(value, errorCode)));
}

function isWriteMethod(method: string) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

export function normalizePluginRoutePath(input: string) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error("plugin_route_path_invalid");
  }
  if (trimmed.includes("..") || trimmed.includes("//") || trimmed.includes("\\")) {
    throw new Error("plugin_route_path_invalid");
  }
  if (trimmed.includes("?") || trimmed.includes("#")) {
    throw new Error("plugin_route_path_invalid");
  }

  return trimmed.length > 1 && trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function buildPluginRuntimeRoutePath(pluginName: string, path: string) {
  const normalizedPath = normalizePluginRoutePath(path);
  return `/plugins/${encodeURIComponent(pluginName)}${normalizedPath}`;
}

export function assertPluginRouteContract(input: {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  permission?: string;
}) {
  normalizePluginRoutePath(input.path);
  if (isWriteMethod(input.method) && !input.permission) {
    throw new Error("plugin_route_permission_required");
  }
}

export function assertManifestDependencies(
  manifest: Pick<CodersoPluginManifest, "id" | "dependencies">,
  installedPluginIds: Iterable<string>
) {
  const installed = new Set<string>();
  for (const item of installedPluginIds) {
    installed.add(item);
  }

  for (const dependency of manifest.dependencies) {
    if (dependency === manifest.id) {
      throw new Error("plugin_dependency_self_reference");
    }
    if (!installed.has(dependency)) {
      throw new Error("plugin_dependency_missing");
    }
  }
}

export function normalizeManifestContributions(
  manifest: CodersoPluginManifest
): NormalizedManifestContributions {
  const modules = normalizeContributionList(
    manifest.provides.modules ?? [],
    "plugin_manifest_modules_invalid"
  );

  for (const moduleId of modules) {
    const isCoreModule = CORE_CODERSO_MODULES.has(moduleId);
    const isPluginScoped = moduleId.startsWith(`plugin:${manifest.id}/`);
    if (!isCoreModule && !isPluginScoped) {
      throw new Error("plugin_manifest_modules_invalid");
    }
  }

  const widgets = normalizeContributionList(
    manifest.provides.widgets ?? [],
    "plugin_manifest_widgets_invalid"
  );
  const presets = normalizeContributionList(
    manifest.provides.presets ?? [],
    "plugin_manifest_presets_invalid"
  );
  const templates = normalizeContributionList(
    manifest.provides.templates ?? [],
    "plugin_manifest_templates_invalid"
  );

  const routes = uniqueList((manifest.provides.routes ?? []).map((item) => normalizePluginRoutePath(item)));

  return {
    modules,
    widgets,
    presets,
    templates,
    routes,
  };
}

export function registerPluginContributions(manifest: CodersoPluginManifest) {
  const normalized = normalizeManifestContributions(manifest);

  const record: PluginContributionRecord = {
    pluginId: manifest.id,
    modules: normalized.modules,
    widgets: normalized.widgets,
    presets: normalized.presets,
    templates: normalized.templates,
    routes: normalized.routes,
    registeredAt: new Date().toISOString(),
  };

  pluginContributions.set(manifest.id, record);
  return record;
}

export function unregisterPluginContributions(pluginId: string) {
  pluginContributions.delete(pluginId);
}

export function getPluginContributions(pluginId: string) {
  return pluginContributions.get(pluginId) ?? null;
}

export function listPluginContributions() {
  return [...pluginContributions.values()];
}

export function clearPluginContributions() {
  pluginContributions.clear();
}
