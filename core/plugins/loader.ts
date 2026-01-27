import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertCompatible } from "./compat";
import type { RouteContext, RouteHandler, Router } from "../server/router";

export type PluginManifest = {
  name: string;
  version: string;
  apiVersion: string;
  coreVersion: string;
  entry: {
    server: string;
    client?: string;
    styles?: string;
  };
  permissions: string[];
  metadata?: Record<string, unknown>;
  integrity: Record<string, string>;
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
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return assertManifest(parsed);
}

export function assertManifest(value: Record<string, unknown>): PluginManifest {
  const name = value.name;
  const version = value.version;
  const apiVersion = value.apiVersion;
  const coreVersion = value.coreVersion;
  const entry = value.entry as Record<string, unknown> | undefined;
  const permissions = value.permissions as unknown;
  const integrity = value.integrity as Record<string, unknown> | undefined;

  if (typeof name !== "string" || !name) throw new Error("plugin_manifest_invalid");
  if (typeof version !== "string" || !version) throw new Error("plugin_manifest_invalid");
  if (typeof apiVersion !== "string" || !apiVersion) throw new Error("plugin_manifest_invalid");
  if (typeof coreVersion !== "string" || !coreVersion) throw new Error("plugin_manifest_invalid");
  if (!entry || typeof entry !== "object") throw new Error("plugin_manifest_invalid");
  if (typeof entry.server !== "string" || !entry.server) throw new Error("plugin_manifest_invalid");
  if (!Array.isArray(permissions) || !permissions.every((item) => typeof item === "string")) {
    throw new Error("plugin_manifest_invalid");
  }
  if (!integrity || typeof integrity.sha256 !== "string") {
    throw new Error("plugin_manifest_invalid");
  }

  return {
    name,
    version,
    apiVersion,
    coreVersion,
    entry: {
      server: entry.server,
      client: typeof entry.client === "string" ? entry.client : undefined,
      styles: typeof entry.styles === "string" ? entry.styles : undefined,
    },
    permissions,
    metadata:
      value.metadata && typeof value.metadata === "object"
        ? (value.metadata as Record<string, unknown>)
        : undefined,
    integrity: integrity as Record<string, string>,
  };
}

export async function loadPluginFromDir(
  pluginDir: string,
  ctx: ServerContext
): Promise<PluginManifest> {
  const manifest = await readPluginManifest(pluginDir);
  assertCompatible({ apiVersion: manifest.apiVersion, coreVersion: manifest.coreVersion });

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
