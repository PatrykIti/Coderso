import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { plugins, pluginSettings } from "../../../core/db/schema";
import { loadAllPlugins } from "../../../core/plugins/pluginManager";
import { registerPlugin } from "../../../core/plugins/registry";
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

testIfDb("safe mode skips loading plugins", async () => {
  const fixture = await createPluginFixture({
    name: `safe-mode-${randomUUID()}`,
  });

  const previousRuntime = process.env.PLUGINS_RUNTIME_DIR;
  const previousSafeMode = process.env.PLUGINS_SAFE_MODE;

  process.env.PLUGINS_RUNTIME_DIR = fixture.runtimeDir;
  process.env.PLUGINS_SAFE_MODE = "1";

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

    const loaded = await loadAllPlugins({ runtimeDir: fixture.runtimeDir });
    expect(loaded.length).toBe(0);
  } finally {
    if (previousRuntime === undefined) {
      delete process.env.PLUGINS_RUNTIME_DIR;
    } else {
      process.env.PLUGINS_RUNTIME_DIR = previousRuntime;
    }

    if (previousSafeMode === undefined) {
      delete process.env.PLUGINS_SAFE_MODE;
    } else {
      process.env.PLUGINS_SAFE_MODE = previousSafeMode;
    }

    await db.delete(pluginSettings).where(eq(pluginSettings.pluginName, fixture.name));
    await db.delete(plugins).where(eq(plugins.name, fixture.name));
    await fixture.cleanup();
  }
});
