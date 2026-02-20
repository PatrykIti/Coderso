import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import type { CodersoPluginManifestInput } from "../../../packages/sdk/src/pluginManifest";
import { listPlugins } from "../../plugins/registry";
import { validatePluginManifest } from "../../plugins/runtime/manifestValidator";
import { listPluginContributions } from "../../plugins/runtime/moduleRegistrar";

export type PluginsRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type PluginsRouteDeps = {
  requirePermission: (permission: string) => PluginsRouteHandler;
};

export type Router = {
  get: (path: string, ...handlers: PluginsRouteHandler[]) => void;
  post: (path: string, ...handlers: PluginsRouteHandler[]) => void;
};

function toManifestValidationError(error: unknown) {
  if (error instanceof ApiError) return error;

  const reason =
    error instanceof Error && typeof error.message === "string"
      ? error.message
      : "plugin_manifest_invalid";

  return new ApiError("plugin_manifest_invalid", "Invalid plugin manifest", 400, {
    reason,
  });
}

export function registerPluginsRoutes(router: Router, deps: PluginsRouteDeps) {
  const { requirePermission } = deps;

  router.get("/plugins", requirePermission("plugins:read"), async () => {
    const [items, contributions] = await Promise.all([
      listPlugins(),
      Promise.resolve(listPluginContributions()),
    ]);

    const contributionMap = new Map(
      contributions.map((entry) => [entry.pluginId, entry] as const)
    );

    return {
      items: items.map((plugin) => ({
        name: plugin.name,
        version: plugin.version,
        apiVersion: plugin.apiVersion,
        coreVersion: plugin.coreVersion,
        enabled: plugin.enabled,
        status: plugin.status,
        permissions: Array.isArray(plugin.permissions) ? plugin.permissions : [],
        installedAt: plugin.installedAt,
        updatedAt: plugin.updatedAt,
        lastError: plugin.lastError,
        errorCount: plugin.errorCount,
        contributions: contributionMap.get(plugin.name) ?? null,
      })),
    };
  });

  router.post(
    "/plugins/manifest/validate",
    requirePermission("plugins:manage"),
    async (ctx) => {
      try {
        const manifest = validatePluginManifest(
          (ctx.body ?? {}) as CodersoPluginManifestInput
        );
        return { manifest };
      } catch (error) {
        throw toManifestValidationError(error);
      }
    }
  );
}
