import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

export type PluginFixtureOptions = {
  name?: string;
  version?: string;
  serverCode?: string;
  manifestOverrides?: Record<string, unknown>;
  assets?: Record<string, string>;
};

export async function createPluginFixture(options: PluginFixtureOptions = {}) {
  const name = options.name ?? `plugin-${randomUUID()}`;
  const version = options.version ?? "1.0.0";
  const runtimeDir = await mkdtemp(path.join(tmpdir(), "coderso-plugins-"));
  const pluginDir = path.join(runtimeDir, name, version);
  const distDir = path.join(pluginDir, "dist");
  const publicDir = path.join(pluginDir, "public");

  await mkdir(distDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  const serverCode =
    options.serverCode ??
    "export default async function register(ctx){ await ctx.storage.set('loaded', true); }";

  await writeFile(path.join(distDir, "server.mjs"), serverCode, "utf8");

  const manifest = {
    name,
    version,
    apiVersion: "1",
    coreVersion: ">=0.1.0",
    entry: {
      server: "dist/server.mjs",
      client: "dist/client.mjs",
      styles: "dist/style.css",
    },
    permissions: ["admin:ui"],
    metadata: {
      title: "Fixture",
      description: "Test plugin",
    },
    integrity: {
      sha256: "fixture",
    },
    ...options.manifestOverrides,
  };

  await writeFile(
    path.join(pluginDir, "plugin.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  if (options.assets) {
    for (const [assetPath, content] of Object.entries(options.assets)) {
      const fullPath = path.join(publicDir, assetPath);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, "utf8");
    }
  }

  const cleanup = async () => {
    await rm(runtimeDir, { recursive: true, force: true });
  };

  return { runtimeDir, pluginDir, name, version, manifest, cleanup };
}
