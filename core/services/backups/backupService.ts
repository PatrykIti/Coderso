import { desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { backups, backupSchedules } from "../../db/schema";
import { getStorageSettings } from "../settings/storageSettings";
import type {
  BackupFrequency,
  BackupKind,
  BackupRecord,
  BackupSchedule,
  BackupScheduleUpdate,
  BackupStatus,
  BackupStorageDriver,
} from "./backupTypes";

const DEFAULT_FREQUENCY: BackupFrequency = "daily";
const DEFAULT_RETENTION_DAYS = 30;

const asBackupStatus = (value: string): BackupStatus => {
  if (value === "queued" || value === "running" || value === "complete" || value === "failed") {
    return value;
  }
  return "queued";
};

const asBackupKind = (value: string): BackupKind => {
  if (value === "manual" || value === "scheduled") return value;
  return "manual";
};

const asStorageDriver = (value: string): BackupStorageDriver => {
  if (value === "local" || value === "s3" || value === "azure") return value;
  return "local";
};

const asFrequency = (value: string): BackupFrequency => {
  if (value === "daily" || value === "weekly" || value === "monthly") return value;
  return DEFAULT_FREQUENCY;
};

const mapBackup = (row: typeof backups.$inferSelect): BackupRecord => ({
  id: row.id,
  status: asBackupStatus(row.status),
  kind: asBackupKind(row.kind),
  storageDriver: asStorageDriver(row.storageDriver),
  artifactPath: row.artifactPath ?? null,
  sizeBytes: row.sizeBytes ?? null,
  error: row.error ?? null,
  createdAt: row.createdAt,
  finishedAt: row.finishedAt ?? null,
});

const mapSchedule = (row: typeof backupSchedules.$inferSelect): BackupSchedule => ({
  id: row.id,
  enabled: row.enabled,
  frequency: asFrequency(row.frequency),
  retentionDays: row.retentionDays,
  storageDriver: asStorageDriver(row.storageDriver),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const assertRetentionDays = (value: number) => {
  if (!Number.isFinite(value) || value < 1 || value > 3650) {
    throw new Error("backup_schedule_invalid");
  }
};

export async function listBackups(): Promise<BackupRecord[]> {
  const rows = await db.select().from(backups).orderBy(desc(backups.createdAt));
  return rows.map(mapBackup);
}

export async function createBackup(kind: BackupKind): Promise<BackupRecord> {
  const storageSettings = await getStorageSettings();
  const [row] = await db
    .insert(backups)
    .values({
      status: "queued",
      kind,
      storageDriver: storageSettings.driver,
    })
    .returning();

  if (!row) throw new Error("backup_create_failed");
  return mapBackup(row);
}

export async function getBackupById(id: string): Promise<BackupRecord | null> {
  const [row] = await db.select().from(backups).where(eq(backups.id, id));
  if (!row) return null;
  return mapBackup(row);
}

export async function markBackupComplete(
  id: string,
  artifactPath: string,
  sizeBytes: number | null
): Promise<BackupRecord> {
  const [row] = await db
    .update(backups)
    .set({
      status: "complete",
      artifactPath,
      sizeBytes,
      finishedAt: new Date(),
      error: null,
    })
    .where(eq(backups.id, id))
    .returning();

  if (!row) throw new Error("backup_not_found");
  return mapBackup(row);
}

export async function restoreBackup(id: string): Promise<BackupRecord> {
  const backup = await getBackupById(id);
  if (!backup) throw new Error("backup_not_found");
  return backup;
}

export async function getBackupSchedule(): Promise<BackupSchedule> {
  const [row] = await db.select().from(backupSchedules).limit(1);
  if (row) return mapSchedule(row);

  const storageSettings = await getStorageSettings();
  const now = new Date();
  const [created] = await db
    .insert(backupSchedules)
    .values({
      enabled: true,
      frequency: DEFAULT_FREQUENCY,
      retentionDays: DEFAULT_RETENTION_DAYS,
      storageDriver: storageSettings.driver,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) throw new Error("backup_schedule_create_failed");
  return mapSchedule(created);
}

export async function setBackupSchedule(update: BackupScheduleUpdate): Promise<BackupSchedule> {
  const current = await getBackupSchedule();
  const retention = update.retentionDays ?? current.retentionDays;
  assertRetentionDays(retention);
  const next = {
    enabled: update.enabled ?? current.enabled,
    frequency: update.frequency ?? current.frequency,
    retentionDays: retention,
    storageDriver: update.storageDriver ?? current.storageDriver,
  };

  const [row] = await db
    .update(backupSchedules)
    .set({
      enabled: next.enabled,
      frequency: next.frequency,
      retentionDays: next.retentionDays,
      storageDriver: next.storageDriver,
      updatedAt: new Date(),
    })
    .where(eq(backupSchedules.id, current.id))
    .returning();

  if (!row) throw new Error("backup_schedule_update_failed");
  return mapSchedule(row);
}
