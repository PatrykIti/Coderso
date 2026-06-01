import { afterEach, expect, test } from "bun:test";
import { sql, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { backups } from "../../../core/db/schema";
import {
  createBackup,
  deleteBackup,
  getBackupSchedule,
  markBackupComplete,
  normalizeBackupInclude,
  listBackups,
  resolveBackupDownload,
  restoreBackup,
  setBackupSchedule,
} from "../../../core/services/backups/backupService";

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

const createdIds: string[] = [];

afterEach(async () => {
  if (!hasDb || createdIds.length === 0) return;
  await db.delete(backups).where(inArray(backups.id, [...createdIds]));
  createdIds.length = 0;
});

testIfDb("createBackup adds backup and listBackups returns it", async () => {
  const created = await createBackup({ kind: "manual", include: ["database", "settings"] });
  createdIds.push(created.id);

  const list = await listBackups({ page: 1, limit: 5 });
  const match = list.items.find((item) => item.id === created.id);

  expect(match).not.toBeNull();
  expect(match?.status).toBe("queued");
  expect(match?.kind).toBe("manual");
  expect(list.total).toBeGreaterThanOrEqual(1);
  expect(list.worker.queuedCount).toBeGreaterThanOrEqual(1);
});

test("normalizeBackupInclude defaults, dedupes, and rejects invalid selections", () => {
  expect(normalizeBackupInclude(undefined)).toEqual(["database", "media"]);
  expect(normalizeBackupInclude(["media", "media", "database"])).toEqual(["media", "database"]);
  expect(() => normalizeBackupInclude([])).toThrow("backup_include_required");
  expect(() => normalizeBackupInclude(["unknown"])).toThrow("backup_include_invalid");
});

testIfDb("queued backups reject restore and download until a worker completes them", async () => {
  const created = await createBackup({ kind: "manual", include: ["database"] });
  createdIds.push(created.id);

  await expect(restoreBackup(created.id)).rejects.toThrow("backup_not_ready");
  await expect(resolveBackupDownload(created.id)).rejects.toThrow("backup_not_ready");
});

testIfDb("completed backups require a worker-provided download URL", async () => {
  const localArtifact = await createBackup({ kind: "manual", include: ["database"] });
  const urlArtifact = await createBackup({ kind: "manual", include: ["database"] });
  createdIds.push(localArtifact.id, urlArtifact.id);

  await markBackupComplete(localArtifact.id, "/var/backups/local.zip", 42);
  await markBackupComplete(urlArtifact.id, "https://backups.example.test/url.zip", 42);

  await expect(resolveBackupDownload(localArtifact.id)).rejects.toThrow("backup_artifact_invalid");
  await expect(resolveBackupDownload(urlArtifact.id)).resolves.toEqual({
    url: "https://backups.example.test/url.zip",
    path: null,
  });
});

testIfDb("deleteBackup removes only the targeted row", async () => {
  const first = await createBackup({ kind: "manual", include: ["database"] });
  const second = await createBackup({ kind: "manual", include: ["database"] });
  createdIds.push(first.id, second.id);

  await expect(deleteBackup(first.id)).resolves.toEqual({ ok: true, id: first.id });
  createdIds.splice(createdIds.indexOf(first.id), 1);

  const remaining = await listBackups({ page: 1, limit: 50 });
  expect(remaining.items.some((item) => item.id === first.id)).toBe(false);
  expect(remaining.items.some((item) => item.id === second.id)).toBe(true);
});

testIfDb("getBackupSchedule returns defaults and setBackupSchedule updates", async () => {
  const current = await getBackupSchedule();
  expect(current.frequency).toBe("daily");
  expect(current.retentionDays).toBeGreaterThan(0);

  const updated = await setBackupSchedule({
    frequency: "weekly",
    retentionDays: current.retentionDays,
    enabled: current.enabled,
    storageDriver: current.storageDriver,
  });

  expect(updated.frequency).toBe("weekly");

  await setBackupSchedule({
    frequency: current.frequency,
    retentionDays: current.retentionDays,
    enabled: current.enabled,
    storageDriver: current.storageDriver,
  });
});
