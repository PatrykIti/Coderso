import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { plugins, pluginSettings } from "../../../core/db/schema";
import {
  getPluginByName,
  getPluginSetting,
  registerPlugin,
  setPluginEnabled,
  setPluginSetting,
  deletePluginSetting,
} from "../../../core/plugins/registry";

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

const pluginName = `plugin-${randomUUID()}`;

afterAll(async () => {
  if (!hasDb) return;
  await db.delete(pluginSettings).where(eq(pluginSettings.pluginName, pluginName));
  await db.delete(plugins).where(eq(plugins.name, pluginName));
});

testIfDb("registers plugin and manages settings", async () => {
  const registered = await registerPlugin({
    name: pluginName,
    version: "1.0.0",
    apiVersion: "1",
    coreVersion: ">=0.1.0",
    permissions: ["admin:ui"],
    entry: { server: "dist/server.mjs" },
    integrity: { sha256: "test" },
  });

  expect(registered?.name).toBe(pluginName);

  const disabled = await setPluginEnabled(pluginName, false);
  expect(disabled?.enabled).toBe(false);

  await setPluginSetting(pluginName, "config.theme", { mode: "dark" });
  const stored = await getPluginSetting(pluginName, "config.theme");
  expect(stored).toEqual({ mode: "dark" });

  await deletePluginSetting(pluginName, "config.theme");
  const cleared = await getPluginSetting(pluginName, "config.theme");
  expect(cleared).toBeNull();

  const updated = await getPluginByName(pluginName);
  expect(updated?.enabled).toBe(false);
});
