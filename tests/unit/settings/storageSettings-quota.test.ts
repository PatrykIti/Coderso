import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { settings } from "../../../core/db/schema";
import {
  checkQuota,
  getStorageSettings,
  resetStorageSettingsCache,
  setStorageSettings,
} from "../../../core/services/settings/storageSettings";

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

const quotaKeys = ["storage.quota.totalBytes", "storage.quota.planLabel"];

const previousKey = process.env.MEDIA_SECRET_MASTER_KEY;
const testKey = Buffer.alloc(32, 7).toString("base64");
let existingRows: Array<{ key: string; value: unknown; updatedAt: Date }> = [];

beforeAll(async () => {
  process.env.MEDIA_SECRET_MASTER_KEY = testKey;
  if (!hasDb) return;
  existingRows = await db.select().from(settings).where(inArray(settings.key, quotaKeys));
});

afterEach(async () => {
  if (!hasDb) return;
  await db.delete(settings).where(inArray(settings.key, quotaKeys));
  resetStorageSettingsCache();
});

afterAll(async () => {
  if (hasDb) {
    await db.delete(settings).where(inArray(settings.key, quotaKeys));
    for (const row of existingRows) {
      await db.insert(settings).values(row).onConflictDoNothing();
    }
    resetStorageSettingsCache();
  }
  if (previousKey === undefined) delete process.env.MEDIA_SECRET_MASTER_KEY;
  else process.env.MEDIA_SECRET_MASTER_KEY = previousKey;
});

// ---- checkQuota (pure) ----

test("checkQuota reports exceed and overage", () => {
  expect(checkQuota(900, 200, 1000)).toEqual({ exceeded: true, over: 100 });
  expect(checkQuota(500, 200, 1000)).toEqual({ exceeded: false, over: 0 });
});

test("checkQuota treats null/undefined total as unlimited", () => {
  expect(checkQuota(9999, 9999, null)).toEqual({ exceeded: false, over: 0 });
  expect(checkQuota(9999, 9999, undefined)).toEqual({ exceeded: false, over: 0 });
});

// ---- setter / getter round-trip ----

testIfDb("quota round-trips and trims planLabel", async () => {
  await setStorageSettings({ quota: { totalBytes: 1000, planLabel: "  Pro  " } });
  const read = await getStorageSettings();
  expect(read.quota.totalBytes).toBe(1000);
  expect(read.quota.planLabel).toBe("Pro");
});

testIfDb("negative totalBytes is rejected", async () => {
  await expect(setStorageSettings({ quota: { totalBytes: -5 } })).rejects.toThrow(
    "storage_settings_invalid"
  );
});

testIfDb("null totalBytes clears the quota (unlimited)", async () => {
  await setStorageSettings({ quota: { totalBytes: 2048 } });
  await setStorageSettings({ quota: { totalBytes: null } });
  const read = await getStorageSettings();
  expect(read.quota.totalBytes).toBeNull();
});

testIfDb("planLabel caps at 60 chars and empty clears to null", async () => {
  await setStorageSettings({ quota: { planLabel: "x".repeat(100) } });
  let read = await getStorageSettings();
  expect(read.quota.planLabel?.length).toBe(60);

  await setStorageSettings({ quota: { planLabel: "   " } });
  read = await getStorageSettings();
  expect(read.quota.planLabel).toBeNull();
});
