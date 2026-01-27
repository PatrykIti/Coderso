import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { plugins, pluginSettings } from "../../../core/db/schema";
import { loadAllPlugins } from "../../../core/plugins/pluginManager";
import { registerPlugin, getPluginByName } from "../../../core/plugins/registry";
import { createPluginFixture } from "../../utils/pluginFixture";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

testIfDb("auto-disables plugin after repeated errors", async () => {
  const fixture = await createPluginFixture({
    name: `error-plugin-${randomUUID()}`,
    serverCode: "export default function register(){ throw new Error('boom'); }",
  });

  const previousRuntime = process.env.PLUGINS_RUNTIME_DIR;
  const previousThreshold = process.env.PLUGIN_ERROR_THRESHOLD;

  process.env.PLUGINS_RUNTIME_DIR = fixture.runtimeDir;
  process.env.PLUGIN_ERROR_THRESHOLD = "1";

  try {
    await registerPlugin({
      name: fixture.name,
      version: fixture.version,
      apiVersion: "1",
      coreVersion: ">=0.1.0",
      permissions: ["admin:ui"],
      entry: { server: "dist/server.mjs" },
      integrity: { sha256: "test" },
    });

    await loadAllPlugins({ runtimeDir: fixture.runtimeDir });

    const updated = await getPluginByName(fixture.name);
    expect(updated?.enabled).toBe(false);
    expect(updated?.status).toBe("error");
    expect(updated?.errorCount).toBe(1);
    expect(updated?.lastError).toContain("boom");
  } finally {
    if (previousRuntime === undefined) {
      delete process.env.PLUGINS_RUNTIME_DIR;
    } else {
      process.env.PLUGINS_RUNTIME_DIR = previousRuntime;
    }

    if (previousThreshold === undefined) {
      delete process.env.PLUGIN_ERROR_THRESHOLD;
    } else {
      process.env.PLUGIN_ERROR_THRESHOLD = previousThreshold;
    }

    await db.delete(pluginSettings).where(eq(pluginSettings.pluginName, fixture.name));
    await db.delete(plugins).where(eq(plugins.name, fixture.name));
    await fixture.cleanup();
  }
});
