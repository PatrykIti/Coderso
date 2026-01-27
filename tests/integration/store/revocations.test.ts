import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { plugins, pluginSettings } from "../../../core/db/schema";
import { applyRevocations } from "../../../core/plugins/installService";
import { getPluginByName, registerPlugin } from "../../../core/plugins/registry";

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

const pluginName = `revoked-${randomUUID()}`;
const pluginVersion = "1.0.0";
let server: ReturnType<typeof Bun.serve> | null = null;

async function cleanup() {
  await db.delete(pluginSettings).where(eq(pluginSettings.pluginName, pluginName));
  await db.delete(plugins).where(eq(plugins.name, pluginName));
  if (server) {
    server.stop();
    server = null;
  }
}

afterAll(async () => {
  if (!hasDb) return;
  await cleanup();
});

testIfDb("revocations disable installed plugins", async () => {
  await registerPlugin({
    name: pluginName,
    version: pluginVersion,
    apiVersion: "1",
    coreVersion: ">=0.1.0",
    permissions: ["admin:ui"],
    entry: { server: "dist/server.mjs" },
    integrity: { sha256: "test" },
  });

  server = Bun.serve({
    port: 0,
    fetch() {
      return Response.json({
        updatedAt: new Date().toISOString(),
        revoked: [
          { name: pluginName, version: pluginVersion, reason: "cve" },
        ],
      });
    },
  });

  const previousBase = process.env.STORE_BASE_URL;
  process.env.STORE_BASE_URL = `http://127.0.0.1:${server.port}`;

  try {
    const revoked = await applyRevocations();
    expect(revoked).toEqual([{ name: pluginName, version: pluginVersion }]);

    const updated = await getPluginByName(pluginName);
    expect(updated?.enabled).toBe(false);
  } finally {
    if (previousBase === undefined) {
      delete process.env.STORE_BASE_URL;
    } else {
      process.env.STORE_BASE_URL = previousBase;
    }
  }
});
