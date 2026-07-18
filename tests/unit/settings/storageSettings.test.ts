import { afterAll, beforeAll, expect, test } from "bun:test";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { settings } from "../../../core/db/schema";
import { resetMediaStorageAdapterCache } from "../../../core/services/media/storage";
import {
  getStorageSettingRecord,
  getStorageSettings,
  getStorageSettingsInternal,
  resetStorageSettingsCache,
  setStorageSettings,
} from "../../../core/services/settings/storageSettings";
import { isEncryptedSecret } from "../../../core/services/security/secretStore";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const dbTestTimeoutMs = 15_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const previousKey = process.env.MEDIA_SECRET_MASTER_KEY;
const testKey = Buffer.alloc(32, 9).toString("base64");

const storageKeys = [
  "storage.driver",
  "storage.local.dir",
  "storage.publicBaseUrl",
  "storage.maxSizeBytes",
  "storage.allowedMime",
  "storage.delivery.accessMode",
  "storage.s3.bucket",
  "storage.s3.region",
  "storage.s3.accessKey",
  "storage.s3.secretKey",
  "storage.s3.endpoint",
  "storage.azure.container",
  "storage.azure.account",
  "storage.azure.key",
  "storage.azure.connectionString",
];

type SettingRow = typeof settings.$inferSelect;

let storageRowsBeforeSuite: SettingRow[] = [];
let storageRowsSnapshotCaptured = false;

beforeAll(async () => {
  if (hasDb) {
    const rows = await db.select().from(settings).where(inArray(settings.key, storageKeys));
    storageRowsBeforeSuite = rows.map((row) => ({
      ...row,
      value: structuredClone(row.value),
      updatedAt: new Date(row.updatedAt.getTime()),
    }));
    storageRowsSnapshotCaptured = true;
  }

  process.env.MEDIA_SECRET_MASTER_KEY = testKey;
  resetStorageSettingsCache();
  resetMediaStorageAdapterCache();
}, dbTestTimeoutMs);

afterAll(async () => {
  try {
    if (hasDb && storageRowsSnapshotCaptured) {
      try {
        await db.transaction(async (tx) => {
          await tx.delete(settings).where(inArray(settings.key, storageKeys));
          if (storageRowsBeforeSuite.length > 0) {
            await tx.insert(settings).values(storageRowsBeforeSuite);
          }
        });
      } catch {
        throw new Error("storage_settings_test_restore_failed");
      }
    }
  } finally {
    if (previousKey === undefined) {
      delete process.env.MEDIA_SECRET_MASTER_KEY;
    } else {
      process.env.MEDIA_SECRET_MASTER_KEY = previousKey;
    }
    resetStorageSettingsCache();
    resetMediaStorageAdapterCache();
  }
}, dbTestTimeoutMs);

testIfDb("setStorageSettings encrypts secrets and returns masked values", async () => {
  await setStorageSettings({
    driver: "s3",
    publicBaseUrl: "https://cdn.example.com",
    maxSizeBytes: 2048,
    allowedMime: "image/*",
    delivery: { accessMode: "internal" },
    s3: {
      bucket: "media-bucket",
      region: "us-east-1",
      accessKey: "AKIA_TEST",
      secretKey: "SECRET_TEST",
    },
  });

  const publicSettings = await getStorageSettings();
  expect(publicSettings.driver).toBe("s3");
  expect(publicSettings.delivery.accessMode).toBe("internal");
  expect(publicSettings.s3.accessKey.configured).toBe(true);
  expect(publicSettings.s3.secretKey.configured).toBe(true);

  const internalSettings = await getStorageSettingsInternal();
  expect(internalSettings.s3.accessKey).toBe("AKIA_TEST");
  expect(internalSettings.s3.secretKey).toBe("SECRET_TEST");
  expect(internalSettings.delivery.accessMode).toBe("internal");

  const record = await getStorageSettingRecord("storage.s3.accessKey");
  expect(record).not.toBeNull();
  expect(isEncryptedSecret(record?.value)).toBe(true);
});
