import { afterAll, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { getMediaStorageAdapter } from "../../../core/services/media/storage";
import { db } from "../../../core/db/client";
import { settings } from "../../../core/db/schema";

const previousEnv = {
  MEDIA_STORAGE: process.env.MEDIA_STORAGE,
  MEDIA_BASE_URL: process.env.MEDIA_BASE_URL,
};

test("getMediaStorageAdapter defaults to local", async () => {
  delete process.env.MEDIA_STORAGE;
  process.env.MEDIA_BASE_URL = "http://localhost/media";

  const adapter = await getMediaStorageAdapter();
  expect(adapter.getPublicUrl("asset.txt")).toBe(
    "http://localhost/media/asset.txt"
  );
});

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

testIfDb("getMediaStorageAdapter rejects unknown storage without DB override", async () => {
  const [existing] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "storage.driver"));
  await db.delete(settings).where(eq(settings.key, "storage.driver"));

  process.env.MEDIA_STORAGE = "unknown";
  try {
    await expect(getMediaStorageAdapter()).rejects.toThrow(
      "media_storage_unknown:unknown"
    );
  } finally {
    if (existing) {
      await db.insert(settings).values(existing).onConflictDoNothing();
    }
  }
});

afterAll(() => {
  if (previousEnv.MEDIA_STORAGE === undefined) {
    delete process.env.MEDIA_STORAGE;
  } else {
    process.env.MEDIA_STORAGE = previousEnv.MEDIA_STORAGE;
  }
  if (previousEnv.MEDIA_BASE_URL === undefined) {
    delete process.env.MEDIA_BASE_URL;
  } else {
    process.env.MEDIA_BASE_URL = previousEnv.MEDIA_BASE_URL;
  }
});
