import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { RouteContext, RouteHandler, Router } from "../server/router";
import type {
  CodersoPluginManifest,
  CodersoPluginManifestInput,
} from "../../packages/sdk/src/pluginManifest";
import { toLegacyManifestShape, validatePluginManifest } from "./runtime/manifestValidator";

export type PluginManifest = CodersoPluginManifest & {
  apiVersion: string;
  coreVersion: string;
};

export type AssetsAPI = {
  getUrl: (assetPath: string) => string;
  getPublicPath: (assetPath: string) => string;
};

export type ServerContext = {
  apiVersion: "1";
  plugin: { name: string; version: string };
  logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  config: { get: (key: string) => string | null };
  hooks: {
    addAction: (name: string, fn: (payload: unknown, ctx: unknown) => void) => void;
    addFilter: (name: string, fn: (value: unknown, ctx: unknown) => unknown) => void;
    removeAction: (name: string, fn: (payload: unknown, ctx: unknown) => void) => void;
    removeFilter: (name: string, fn: (value: unknown, ctx: unknown) => unknown) => void;
  };
  routes: {
    register: (input: {
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      path: string;
      handler: (req: Request) => Response | Promise<Response>;
      permission?: string;
    }) => void;
  };
  assets: AssetsAPI;
  permissions: {
    has: (permission: string) => boolean;
    require: (permission: string) => void;
  };
  settings: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  storage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
};

const runtimeRoot = process.cwd().endsWith(`${path.sep}core`)
  ? path.resolve(process.cwd(), "..")
  : process.cwd();

export const DEFAULT_PLUGINS_DIR =
  process.env.PLUGINS_RUNTIME_DIR ??
  path.resolve(runtimeRoot, "plugins-runtime");

function ensureRelativePath(assetPath: string) {
  const normalized = assetPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    throw new Error("plugin_asset_path_invalid");
  }
  return normalized;
}

function resolveSafePath(baseDir: string, relativePath: string) {
  const resolved = path.resolve(baseDir, relativePath);
  const normalizedBase = path.resolve(baseDir) + path.sep;
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error("plugin_path_invalid");
  }
  return resolved;
}

export function getPluginAssetUrl(name: string, version: string, assetPath: string) {
  const safePath = ensureRelativePath(assetPath);
  return `/plugins/${name}/${version}/${safePath}`;
}

export function getPluginAssetPath(
  runtimeDir: string,
  name: string,
  version: string,
  assetPath: string
) {
  const safePath = ensureRelativePath(assetPath);
  return path.join(runtimeDir, name, version, "public", safePath);
}

export function createAssetsApi(
  runtimeDir: string,
  name: string,
  version: string
): AssetsAPI {
  return {
    getUrl: (assetPath) => getPluginAssetUrl(name, version, assetPath),
    getPublicPath: (assetPath) =>
      getPluginAssetPath(runtimeDir, name, version, assetPath),
  };
}

export async function readPluginManifest(pluginDir: string): Promise<PluginManifest> {
  const manifestPath = path.join(pluginDir, "plugin.json");
  const raw = await readFile(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as CodersoPluginManifestInput;
  const validated = validatePluginManifest(parsed);
  return toLegacyManifestShape(validated);
}

export async function loadPluginFromDir(
  pluginDir: string,
  ctx: ServerContext,
  manifestInput?: PluginManifest
): Promise<PluginManifest> {
  const manifest = manifestInput ?? (await readPluginManifest(pluginDir));

  const entryPath = resolveSafePath(pluginDir, manifest.entry.server);
  await stat(entryPath);

  const entryUrl = pathToFileURL(entryPath).href;
  const mod = await import(entryUrl);
  if (typeof mod.default !== "function") {
    throw new Error("plugin_register_missing");
  }

  await mod.default(ctx);
  return manifest;
}

export function createPluginAssetHandler(options?: {
  runtimeDir?: string;
  cacheSeconds?: number;
}): RouteHandler {
  const runtimeDir = options?.runtimeDir ?? DEFAULT_PLUGINS_DIR;
  const cacheSeconds = options?.cacheSeconds ?? 31536000;

  return async (ctx: RouteContext) => {
    const { name, version, path: assetPath } = ctx.params;
    if (!name || !version || !assetPath) {
      return new Response("Not found", { status: 404 });
    }

    let resolvedPath: string;
    try {
      resolvedPath = resolveSafePath(
        path.join(runtimeDir, name, version, "public"),
        assetPath
      );
    } catch {
      return new Response("Invalid path", { status: 400 });
    }

    try {
      const data = await readFile(resolvedPath);
      return new Response(data, {
        status: 200,
        headers: {
          "Cache-Control": `public, max-age=${cacheSeconds}, immutable`,
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  };
}

export function registerPluginAssetRoutes(
  router: Router,
  options?: { runtimeDir?: string; cacheSeconds?: number }
) {
  router.static(
    "/plugins/:name/:version/*",
    createPluginAssetHandler(options)
  );
}
