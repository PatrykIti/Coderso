import { afterEach, expect, test } from "bun:test";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { backups, settings } from "../../../core/db/schema";
import {
  createBackup,
  deleteBackup,
  getBackupById,
  listBackups,
  resolveBackupDownload,
} from "../../../core/services/backups/backupService";
import {
  __setMediaStorageAdapterForTests,
  resetMediaStorageAdapterCache,
} from "../../../core/services/media/storage";
import type {
  CanonicalStoredUpload,
  MediaStorageAdapter,
  StoredMedia,
  UploadFile,
} from "../../../core/services/media/storage/adapter";
import { resetStorageSettingsCache } from "../../../core/services/settings/storageSettings";

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

// A hermetic fake adapter — no real S3/Azure network. Records every put/delete
// so tests can assert the driver-routing + remote-cleanup contract.
type AdapterCalls = {
  put: Array<{ name: string; type: string; size: number }>;
  putMedia: number;
  delete: string[];
};

const makeFakeAdapter = (
  calls: AdapterCalls,
  overrides: Partial<MediaStorageAdapter> = {}
): MediaStorageAdapter => ({
  put: async (file: UploadFile): Promise<StoredMedia> => {
    calls.put.push({ name: file.name, type: file.type, size: file.size });
    return {
      key: `backups/2026/06/${file.name}`,
      url: `https://cdn.example.com/backups/2026/06/${file.name}`,
    };
  },
  putMedia: async (_upload: CanonicalStoredUpload): Promise<StoredMedia> => {
    calls.putMedia += 1;
    throw new Error("backup_put_media_forbidden");
  },
  delete: async (key: string) => {
    calls.delete.push(key);
  },
  get: async () => {
    throw new Error("unused");
  },
  getPublicUrl: (key: string) => `https://cdn.example.com/${key}`,
  ...overrides,
});

// Shared-DB Test Hygiene: snapshot the `storage.driver` settings row, mutate it,
// reset both caches, run `fn`, then restore the original row verbatim (even on
// failure) and reset caches again — mirrors `withStorageDriverUnset` in
// tests/unit/media/storageResolver.test.ts. NEVER leaves the shared driver set to
// s3/azure without credentials (which would break media uploads for everyone).
const withStorageDriver = async <T>(driver: string, fn: () => Promise<T>): Promise<T> => {
  if (!hasDb) return fn();
  const [existing] = await db.select().from(settings).where(eq(settings.key, "storage.driver"));
  await db
    .insert(settings)
    .values({ key: "storage.driver", value: driver, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: driver, updatedAt: new Date() },
    });
  resetStorageSettingsCache();
  resetMediaStorageAdapterCache();
  try {
    return await fn();
  } finally {
    if (existing) {
      await db
        .update(settings)
        .set({ value: existing.value, updatedAt: existing.updatedAt })
        .where(eq(settings.key, "storage.driver"));
    } else {
      await db.delete(settings).where(eq(settings.key, "storage.driver"));
    }
    resetStorageSettingsCache();
    resetMediaStorageAdapterCache();
  }
};

const createdIds: string[] = [];

afterEach(async () => {
  // Always clear any injected adapter so later suites resolve a real driver.
  __setMediaStorageAdapterForTests(null);
  resetMediaStorageAdapterCache();
  resetStorageSettingsCache();
  if (!hasDb || createdIds.length === 0) return;
  for (const id of [...createdIds]) {
    await deleteBackup(id).catch(async () => {
      await db.delete(backups).where(inArray(backups.id, [id]));
    });
  }
  createdIds.length = 0;
});

const rawRow = async (id: string) => {
  const [row] = await db.select().from(backups).where(eq(backups.id, id));
  return row;
};

testIfDb("local driver writes FS, no artifact_key", async () => {
  const created = await withStorageDriver("local", async () => {
    const backup = await createBackup({ kind: "manual", include: ["database"] });
    createdIds.push(backup.id);
    return backup;
  });

  const row = await rawRow(created.id);
  expect(row?.storageDriver).toBe("local");
  expect(row?.artifactKey).toBeNull();
  // Local artifact path is an absolute FS path, not a public URL.
  expect(row?.artifactPath?.startsWith("http")).toBe(false);
  // The artifact is genuinely on disk (download resolves inline content).
  const dl = await resolveBackupDownload(created.id);
  expect(dl.url).toBeNull();
  expect(dl.content).toContain(created.id);
});

testIfDb("s3 driver uploads via adapter and stores url + key", async () => {
  const calls: AdapterCalls = { put: [], putMedia: 0, delete: [] };
  __setMediaStorageAdapterForTests(makeFakeAdapter(calls));

  const created = await withStorageDriver("s3", async () => {
    const backup = await createBackup({ kind: "manual", include: ["database"] });
    createdIds.push(backup.id);
    return backup;
  });

  expect(calls.put.length).toBe(1);
  expect(calls.put[0]).toEqual({
    name: `coderso-backup-${created.id}.json`,
    type: "application/json",
    size: expect.any(Number),
  });
  expect(calls.put[0]!.size).toBeGreaterThan(0);
  expect(calls.putMedia).toBe(0);
  const row = await rawRow(created.id);
  expect(row?.storageDriver).toBe("s3");
  expect(row?.artifactPath).toBe(
    `https://cdn.example.com/backups/2026/06/coderso-backup-${created.id}.json`
  );
  expect(row?.artifactKey).toBe(`backups/2026/06/coderso-backup-${created.id}.json`);
  await expect(resolveBackupDownload(created.id)).resolves.toEqual({
    url: `https://cdn.example.com/backups/2026/06/coderso-backup-${created.id}.json`,
    path: null,
  });
});

testIfDb("artifact_key never leaks to the client-facing record", async () => {
  const calls: AdapterCalls = { put: [], putMedia: 0, delete: [] };
  __setMediaStorageAdapterForTests(makeFakeAdapter(calls));

  const created = await withStorageDriver("s3", async () => {
    const backup = await createBackup({ kind: "manual", include: ["database"] });
    createdIds.push(backup.id);
    return backup;
  });

  // Client-facing single fetch redacts the key.
  const fetched = await getBackupById(created.id);
  expect(fetched).not.toBeNull();
  expect(fetched!.artifactKey).toBeNull();

  // Client-facing list redacts the key too.
  const list = await listBackups({ page: 1, limit: 100 });
  const listed = list.items.find((item) => item.id === created.id);
  expect(listed).toBeDefined();
  expect(listed!.artifactKey).toBeNull();

  // But the key IS persisted server-side (proves the redaction is at the mapper).
  const row = await rawRow(created.id);
  expect(row?.artifactKey).toBe(`backups/2026/06/coderso-backup-${created.id}.json`);
});

testIfDb("deleteBackup removes the remote object for remote rows", async () => {
  const calls: AdapterCalls = { put: [], putMedia: 0, delete: [] };
  __setMediaStorageAdapterForTests(makeFakeAdapter(calls));

  await withStorageDriver("s3", async () => {
    const created = await createBackup({ kind: "manual", include: ["database"] });
    createdIds.push(created.id);
    const storedKey = `backups/2026/06/coderso-backup-${created.id}.json`;

    // Same driver on delete => remote object is deleted via the adapter.
    await deleteBackup(created.id);
    createdIds.splice(createdIds.indexOf(created.id), 1);
    expect(calls.delete).toContain(storedKey);
    expect(calls.putMedia).toBe(0);

    // Row is gone.
    const row = await rawRow(created.id);
    expect(row).toBeUndefined();
  });
});

testIfDb(
  "upload failure marks backup failed with a machine-readable, credential-free error",
  async () => {
    const calls: AdapterCalls = { put: [], putMedia: 0, delete: [] };
    const sentinel = "topsecret";
    __setMediaStorageAdapterForTests(
      makeFakeAdapter(calls, {
        put: async () => {
          // The adapter echoes a sentinel "secret" plus the real cwd — neither of
          // which sanitizeBackupError would strip; only L01's wrap keeps them out.
          throw new Error(`boom S3_SECRET_KEY=${sentinel} ${process.cwd()}`);
        },
      })
    );

    const created = await withStorageDriver("s3", async () => {
      const backup = await createBackup({ kind: "manual", include: ["database"] });
      createdIds.push(backup.id);
      return backup;
    });

    expect(created.status).toBe("failed");
    expect(created.error).toBe("backup_upload_failed");
    expect(calls.putMedia).toBe(0);
    // The sentinel secret and cwd never reach the client-visible field.
    expect(created.error).not.toContain(sentinel);
    expect(created.error).not.toContain(process.cwd());

    const row = await rawRow(created.id);
    expect(row?.status).toBe("failed");
    expect(row?.error).toBe("backup_upload_failed");
  }
);

testIfDb(
  "deleteBackup skips the remote delete on driver drift (no wrong-backend call)",
  async () => {
    const calls: AdapterCalls = { put: [], putMedia: 0, delete: [] };
    __setMediaStorageAdapterForTests(makeFakeAdapter(calls));

    // Create a remote (s3) row.
    const created = await withStorageDriver("s3", async () => {
      const backup = await createBackup({ kind: "manual", include: ["database"] });
      createdIds.push(backup.id);
      return backup;
    });
    expect((await rawRow(created.id))?.storageDriver).toBe("s3");

    // Operator switched the driver to local since create → delete must SKIP the
    // remote call (never delete against a backend that may not hold the key), while
    // still removing the row.
    await withStorageDriver("local", async () => {
      await deleteBackup(created.id);
    });
    createdIds.splice(createdIds.indexOf(created.id), 1);

    expect(calls.delete.length).toBe(0);
    expect(await rawRow(created.id)).toBeUndefined();
  }
);
