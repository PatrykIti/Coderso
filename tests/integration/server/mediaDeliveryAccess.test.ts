import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { apiKeys, settings } from "../../../core/db/schema";
import { startHttpServer } from "../../../core/server/httpServer";
import { createApiKey } from "../../../core/services/security/apiKeysService";
import {
  resetStorageSettingsCache,
  setStorageSettings,
} from "../../../core/services/settings/storageSettings";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const DB_RUNTIME_IDLE_TIMEOUT_SECONDS = 30;

let server: ReturnType<typeof Bun.serve> | null = null;
let tempDir: string | null = null;
const createdApiKeyIds: string[] = [];
let existingStorageRows: Array<{ key: string; value: unknown; updatedAt: Date }> = [];

const storageKeys = [
  "storage.driver",
  "storage.local.dir",
  "storage.publicBaseUrl",
  "storage.maxSizeBytes",
  "storage.allowedMime",
  "storage.delivery.accessMode",
];

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const stopServer = () => {
  if (!server) return;
  server.stop(true);
  server = null;
};

const cleanupApiKeys = async () => {
  if (createdApiKeyIds.length === 0) return;
  await db.delete(apiKeys).where(inArray(apiKeys.id, [...new Set(createdApiKeyIds)]));
  createdApiKeyIds.length = 0;
};

beforeAll(async () => {
  if (!hasDb) return;

  existingStorageRows = await db.select().from(settings).where(inArray(settings.key, storageKeys));
  await db.delete(settings).where(inArray(settings.key, storageKeys));
});

beforeEach(async () => {
  if (!hasDb) return;

  tempDir = await mkdtemp(path.join(tmpdir(), "coderso-media-access-"));
  await writeFile(path.join(tempDir, "sample.txt"), "secured-media", "utf8");

  await setStorageSettings({
    driver: "local",
    local: { dir: tempDir },
    delivery: { accessMode: "internal" },
  });
  resetStorageSettingsCache();

  server = startHttpServer({
    idleTimeout: DB_RUNTIME_IDLE_TIMEOUT_SECONDS,
    port: 0,
  });
});

afterEach(async () => {
  if (!hasDb) return;

  stopServer();
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
  await cleanupApiKeys();
});

afterAll(async () => {
  if (!hasDb) return;

  stopServer();
  await cleanupApiKeys();
  await db.delete(settings).where(inArray(settings.key, storageKeys));
  if (existingStorageRows.length > 0) {
    for (const row of existingStorageRows) {
      await db
        .insert(settings)
        .values(row)
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: row.value, updatedAt: row.updatedAt },
        });
    }
  }
  resetStorageSettingsCache();
});

const runtimeUrl = () => {
  if (!server) throw new Error("server_not_started");
  return `http://127.0.0.1:${server.port}/media/sample.txt`;
};

testIfDb("internal media delivery blocks anonymous request", async () => {
  const response = await fetch(runtimeUrl());
  expect(response.status).toBe(401);
});

testIfDb("internal media delivery blocks API key without media.read scope", async () => {
  const key = await createApiKey({
    name: `media-invalid-${Date.now()}`,
    scopes: ["forms.submit"],
  });
  createdApiKeyIds.push(key.apiKey.id);

  const response = await fetch(runtimeUrl(), {
    headers: {
      authorization: `Bearer ${key.secret}`,
    },
  });

  expect(response.status).toBe(403);
});

testIfDb("internal media delivery allows API key with media.read scope", async () => {
  const key = await createApiKey({
    name: `media-valid-${Date.now()}`,
    scopes: ["media.read"],
  });
  createdApiKeyIds.push(key.apiKey.id);

  const response = await fetch(runtimeUrl(), {
    headers: {
      authorization: `Bearer ${key.secret}`,
    },
  });

  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("secured-media");
});
