import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { media, settings } from "../../../core/db/schema";
import {
  deleteMedia,
  getMediaById,
  updateMedia,
  uploadMedia,
} from "../../../core/services/media/mediaService";
import type { UploadFile } from "../../../core/services/media/storage/adapter";
import {
  resetStorageSettingsCache,
  setStorageSettings,
} from "../../../core/services/settings/storageSettings";
import { resetMediaStorageAdapterCache } from "../../../core/services/media/storage";

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

function buildUploadFile(
  name: string,
  type: string,
  content: Buffer
): UploadFile {
  return {
    name,
    type,
    size: content.length,
    arrayBuffer: async () =>
      content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
  };
}

const previousEnv = {
  MEDIA_DIR: process.env.MEDIA_DIR,
  MEDIA_BASE_URL: process.env.MEDIA_BASE_URL,
  MEDIA_STORAGE: process.env.MEDIA_STORAGE,
  MEDIA_ALLOWED_MIME: process.env.MEDIA_ALLOWED_MIME,
  MEDIA_MAX_SIZE_BYTES: process.env.MEDIA_MAX_SIZE_BYTES,
};

let tempDir: string | undefined;
let createdMediaId: string | undefined;
let createdMediaKey: string | undefined;
let existingStorageRows: Array<{ key: string; value: unknown; updatedAt: Date }> = [];

const storageKeys = [
  "storage.driver",
  "storage.local.dir",
  "storage.publicBaseUrl",
  "storage.maxSizeBytes",
  "storage.allowedMime",
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

beforeAll(async () => {
  if (!hasDb) return;

  tempDir = await mkdtemp(path.join(tmpdir(), "nextless-media-"));
  process.env.MEDIA_DIR = tempDir;
  process.env.MEDIA_BASE_URL = "http://localhost/media";
  process.env.MEDIA_STORAGE = "local";
  process.env.MEDIA_ALLOWED_MIME = "text/plain";
  process.env.MEDIA_MAX_SIZE_BYTES = "1024";

  existingStorageRows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, storageKeys));
  await db
    .delete(settings)
    .where(inArray(settings.key, storageKeys));

  await setStorageSettings({
    driver: "local",
    local: { dir: tempDir },
    publicBaseUrl: "http://localhost/media",
    allowedMime: "text/plain",
    maxSizeBytes: 1024,
  });

  resetStorageSettingsCache();
  resetMediaStorageAdapterCache();
});

afterAll(async () => {
  if (hasDb) {
    await db
      .delete(settings)
      .where(inArray(settings.key, storageKeys));
    if (existingStorageRows.length > 0) {
      for (const row of existingStorageRows) {
        await db.insert(settings).values(row).onConflictDoNothing();
      }
    }
    resetStorageSettingsCache();
    resetMediaStorageAdapterCache();
  }

  if (createdMediaId) {
    await db.delete(media).where(eq(media.id, createdMediaId));
  }

  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }

  if (previousEnv.MEDIA_DIR === undefined) {
    delete process.env.MEDIA_DIR;
  } else {
    process.env.MEDIA_DIR = previousEnv.MEDIA_DIR;
  }
  if (previousEnv.MEDIA_BASE_URL === undefined) {
    delete process.env.MEDIA_BASE_URL;
  } else {
    process.env.MEDIA_BASE_URL = previousEnv.MEDIA_BASE_URL;
  }
  if (previousEnv.MEDIA_STORAGE === undefined) {
    delete process.env.MEDIA_STORAGE;
  } else {
    process.env.MEDIA_STORAGE = previousEnv.MEDIA_STORAGE;
  }
  if (previousEnv.MEDIA_ALLOWED_MIME === undefined) {
    delete process.env.MEDIA_ALLOWED_MIME;
  } else {
    process.env.MEDIA_ALLOWED_MIME = previousEnv.MEDIA_ALLOWED_MIME;
  }
  if (previousEnv.MEDIA_MAX_SIZE_BYTES === undefined) {
    delete process.env.MEDIA_MAX_SIZE_BYTES;
  } else {
    process.env.MEDIA_MAX_SIZE_BYTES = previousEnv.MEDIA_MAX_SIZE_BYTES;
  }
});

testIfDb("upload/update/delete media", async () => {
  const content = Buffer.from("hello");
  const file = buildUploadFile("hello.txt", "text/plain", content);

  const uploaded = await uploadMedia(file, {
    alt: "Alt",
    title: "Title",
    caption: "Caption",
  });

  createdMediaId = uploaded.id;
  const row = await getMediaById(uploaded.id);
  expect(row?.alt).toBe("Alt");
  expect(row?.title).toBe("Title");
  expect(row?.caption).toBe("Caption");
  expect(row?.type).toBe("file");

  createdMediaKey = row?.key;

  const updated = await updateMedia(uploaded.id, { caption: "Updated" });
  expect(updated?.caption).toBe("Updated");

  await deleteMedia(uploaded.id);
  const missing = await getMediaById(uploaded.id);
  expect(missing).toBeNull();

  if (tempDir && createdMediaKey) {
    const storedPath = path.join(tempDir, createdMediaKey);
    await expect(stat(storedPath)).rejects.toThrow();
  }

  createdMediaId = undefined;
  createdMediaKey = undefined;
});

testIfDb("rejects disallowed mime", async () => {
  const file = buildUploadFile(
    "virus.bin",
    "application/octet-stream",
    Buffer.from("x")
  );

  await expect(uploadMedia(file, {})).rejects.toThrow("media_mime_not_allowed");
});
