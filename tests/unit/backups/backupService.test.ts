import { afterEach, expect, test } from "bun:test";
import { sql, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { backups } from "../../../core/db/schema";
import {
  createBackup,
  getBackupSchedule,
  listBackups,
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
  const created = await createBackup("manual");
  createdIds.push(created.id);

  const list = await listBackups();
  const match = list.find((item) => item.id === created.id);

  expect(match).not.toBeNull();
  expect(match?.status).toBe("queued");
  expect(match?.kind).toBe("manual");
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
