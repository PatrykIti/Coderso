import { expect, test } from "bun:test";
import path from "node:path";
import { createServerContext } from "../../../core/plugins/sdkRuntime";
import type { PluginRecord } from "../../../core/plugins/registry";

const plugin = {
  id: "p1",
  name: "seo-boost",
  version: "1.2.3",
  apiVersion: "1",
  coreVersion: ">=0.1.0",
  enabled: true,
  status: "installed",
  permissions: ["admin:ui"],
  entry: { server: "dist/server.mjs" },
  integrity: { sha256: "hash" },
  signature: null,
  installedAt: new Date(),
  updatedAt: new Date(),
  lastError: null,
  errorCount: 0,
} as PluginRecord;

test("assets api returns versioned urls", () => {
  const runtimeDir = path.join(process.cwd(), "plugins-runtime");
  const ctx = createServerContext(plugin, runtimeDir);
  const url = ctx.assets.getUrl("icons/icon.svg");
  const publicPath = ctx.assets.getPublicPath("icons/icon.svg");

  expect(url).toBe("/plugins/seo-boost/1.2.3/icons/icon.svg");
  expect(publicPath).toBe(
    path.join(runtimeDir, "seo-boost", "1.2.3", "public", "icons", "icon.svg")
  );
});
