import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { plugins, pluginSettings } from "../../../core/db/schema";
import { registerPlugin } from "../../../core/plugins/registry";
import { createServerContext } from "../../../core/plugins/sdkRuntime";

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

const pluginA = `plugin-a-${randomUUID()}`;
const pluginB = `plugin-b-${randomUUID()}`;

async function cleanup() {
  await db.delete(pluginSettings).where(eq(pluginSettings.pluginName, pluginA));
  await db.delete(pluginSettings).where(eq(pluginSettings.pluginName, pluginB));
  await db.delete(plugins).where(eq(plugins.name, pluginA));
  await db.delete(plugins).where(eq(plugins.name, pluginB));
}

afterAll(async () => {
  if (!hasDb) return;
  await cleanup();
});

testIfDb("storage API scopes keys per plugin", async () => {
  await registerPlugin({
    name: pluginA,
    version: "1.0.0",
    apiVersion: "1",
    coreVersion: ">=0.1.0",
    permissions: ["admin:ui"],
    entry: { server: "dist/server.mjs" },
    integrity: { sha256: "test" },
  });

  await registerPlugin({
    name: pluginB,
    version: "1.0.0",
    apiVersion: "1",
    coreVersion: ">=0.1.0",
    permissions: ["admin:ui"],
    entry: { server: "dist/server.mjs" },
    integrity: { sha256: "test" },
  });

  const [recordA] = await db.select().from(plugins).where(eq(plugins.name, pluginA));
  const [recordB] = await db.select().from(plugins).where(eq(plugins.name, pluginB));

  if (!recordA || !recordB) throw new Error("plugin_seed_failed");

  const ctxA = createServerContext(recordA);
  const ctxB = createServerContext(recordB);

  await ctxA.storage.set("config", { color: "blue" });

  const valueA = await ctxA.storage.get("config");
  const valueB = await ctxB.storage.get("config");

  expect(valueA).toEqual({ color: "blue" });
  expect(valueB).toBeNull();

  await cleanup();
});
