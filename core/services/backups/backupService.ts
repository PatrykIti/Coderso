import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import {
  backups,
  backupSchedules,
  contentEntries,
  contentTypes,
  media,
  menuItems,
  menus,
  pages,
  posts,
  redirects,
  themeProfiles,
  themeRoutes,
} from "../../db/schema";
import { getStorageSettings } from "../settings/storageSettings";
import { exportConfig } from "../tools/importExportService";
import type {
  BackupCreateInput,
  BackupDeleteResult,
  BackupDownload,
  BackupFrequency,
  BackupIncludeOption,
  BackupKind,
  BackupListQuery,
  BackupListResult,
  BackupRecord,
  BackupSchedule,
  BackupScheduleUpdate,
  BackupStatus,
  BackupStorageDriver,
  BackupWorkerHealth,
} from "./backupTypes";
import { backupIncludeOptions } from "./backupTypes";

const DEFAULT_FREQUENCY: BackupFrequency = "daily";
const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_INCLUDE: BackupIncludeOption[] = ["database", "media"];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const QUEUE_WARNING_MINUTES = 15;
const BACKUP_ARTIFACT_VERSION = 1;
const BACKUP_ARTIFACT_CONTENT_TYPE = "application/json";

const getBackupStorageDir = () =>
  path.resolve(process.cwd(), process.env.BACKUP_DIR ?? "storage/backups");

const isPathInside = (baseDir: string, targetPath: string) =>
  targetPath === baseDir || targetPath.startsWith(`${baseDir}${path.sep}`);

const resolveBackupArtifactPath = (id: string) => {
  const baseDir = getBackupStorageDir();
  return {
    baseDir,
    filePath: path.join(baseDir, `coderso-backup-${id}.json`),
    fileName: `coderso-backup-${id}.json`,
  };
};

const isBackupIncludeOption = (value: unknown): value is BackupIncludeOption =>
  typeof value === "string" && (backupIncludeOptions as readonly string[]).includes(value);

export function normalizeBackupInclude(input: unknown): BackupIncludeOption[] {
  const raw = input === undefined ? DEFAULT_INCLUDE : input;
  if (!Array.isArray(raw)) throw new Error("backup_include_invalid");
  const selected: BackupIncludeOption[] = [];
  for (const value of raw) {
    if (!isBackupIncludeOption(value)) throw new Error("backup_include_invalid");
    if (!selected.includes(value)) selected.push(value);
  }
  if (selected.length === 0) throw new Error("backup_include_required");
  return selected;
}

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

const isPublicDownloadUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const redactArtifactPath = (value: string | null | undefined) => {
  if (!value) return null;
  return isPublicDownloadUrl(value) ? value : "local";
};

const mapBackup = (
  row: typeof backups.$inferSelect,
  options: { redactArtifactPath?: boolean } = {}
): BackupRecord => ({
  id: row.id,
  status: asBackupStatus(row.status),
  kind: asBackupKind(row.kind),
  storageDriver: asStorageDriver(row.storageDriver),
  artifactPath:
    options.redactArtifactPath === false
      ? (row.artifactPath ?? null)
      : redactArtifactPath(row.artifactPath),
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

const normalizePositiveInteger = (value: number | undefined, fallback: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), 1), max);
};

const matchesQuery = (backup: BackupRecord, query: string) => {
  if (!query) return true;
  const needle = query.toLowerCase();
  return [
    backup.id,
    backup.status,
    backup.kind,
    backup.storageDriver,
    backup.error ?? "",
    backup.artifactPath ?? "",
  ].some((value) => value.toLowerCase().includes(needle));
};

const buildWorkerHealth = (items: BackupRecord[]): BackupWorkerHealth => {
  const queued = items.filter((item) => item.status === "queued" || item.status === "running");
  const oldestQueuedAt = queued.reduce<Date | null>((oldest, item) => {
    if (!oldest || item.createdAt < oldest) return item.createdAt;
    return oldest;
  }, null);
  const warningCutoff = Date.now() - QUEUE_WARNING_MINUTES * 60 * 1000;
  const isAged = Boolean(oldestQueuedAt && oldestQueuedAt.getTime() < warningCutoff);

  return {
    mode: "internal",
    healthy: queued.length === 0 || !isAged,
    queuedCount: queued.length,
    oldestQueuedAt,
    message:
      queued.length === 0
        ? "CMS backup worker is ready."
        : isAged
          ? "CMS backup worker has jobs running longer than expected."
          : "CMS backup worker is processing backup jobs.",
  };
};

const sanitizeBackupError = (error: unknown) => {
  const raw = error instanceof Error ? error.message : String(error);
  if (!raw || raw === "[object Object]") return "Backup worker failed.";
  return raw
    .replaceAll(process.cwd(), "[cwd]")
    .replaceAll(getBackupStorageDir(), "[backup-dir]")
    .slice(0, 240);
};

const buildDatabaseSnapshot = async () => {
  const [
    pageRows,
    contentTypeRows,
    contentEntryRows,
    postRows,
    mediaRows,
    menuRows,
    menuItemRows,
    themeProfileRows,
    themeRouteRows,
    redirectRows,
  ] = await Promise.all([
    db.select().from(pages),
    db.select().from(contentTypes),
    db.select().from(contentEntries),
    db.select().from(posts),
    db.select().from(media),
    db.select().from(menus),
    db.select().from(menuItems),
    db.select().from(themeProfiles),
    db.select().from(themeRoutes),
    db.select().from(redirects),
  ]);

  return {
    pages: pageRows,
    contentTypes: contentTypeRows,
    contentEntries: contentEntryRows,
    posts: postRows,
    media: mediaRows,
    menus: menuRows,
    menuItems: menuItemRows,
    themeProfiles: themeProfileRows,
    themeRoutes: themeRouteRows,
    redirects: redirectRows,
  };
};

const createBackupArtifact = async (backup: BackupRecord, include: BackupIncludeOption[]) => {
  const { baseDir, filePath } = resolveBackupArtifactPath(backup.id);
  await mkdir(baseDir, { recursive: true });

  const mediaRows = include.includes("media") ? await db.select().from(media) : null;
  const settingsExport = include.includes("settings")
    ? await exportConfig({ target: "settings" })
    : null;
  const artifact = {
    version: BACKUP_ARTIFACT_VERSION,
    id: backup.id,
    createdAt: new Date().toISOString(),
    include,
    storageDriver: backup.storageDriver,
    database: include.includes("database") ? await buildDatabaseSnapshot() : null,
    settings: settingsExport,
    media: mediaRows
      ? {
          note: "Media file bytes stay in the configured media storage. This backup stores the media library metadata and URLs.",
          items: mediaRows,
        }
      : null,
  };

  const content = `${JSON.stringify(artifact, null, 2)}\n`;
  await writeFile(filePath, content, { encoding: "utf8" });
  return {
    artifactPath: filePath,
    sizeBytes: Buffer.byteLength(content, "utf8"),
  };
};

export async function listBackups(input: BackupListQuery = {}): Promise<BackupListResult> {
  const page = normalizePositiveInteger(input.page, DEFAULT_PAGE, Number.MAX_SAFE_INTEGER);
  const limit = normalizePositiveInteger(input.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const query = input.query?.trim().toLowerCase() ?? "";
  const rows = await db.select().from(backups).orderBy(desc(backups.createdAt));
  const mapped = rows.map((row) => mapBackup(row));
  const filtered = mapped.filter((backup) => matchesQuery(backup, query));
  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);
  return {
    items,
    page,
    limit,
    total,
    hasPrevious: page > 1,
    hasNext: start + limit < total,
    worker: buildWorkerHealth(mapped),
  };
}

export async function createBackup(input: BackupCreateInput = {}): Promise<BackupRecord> {
  const storageSettings = await getStorageSettings();
  const kind = input.kind === "scheduled" ? "scheduled" : "manual";
  const include = normalizeBackupInclude(input.include);
  const [row] = await db
    .insert(backups)
    .values({
      status: "running",
      kind,
      storageDriver: storageSettings.driver,
    })
    .returning();

  if (!row) throw new Error("backup_create_failed");
  const backup = mapBackup(row);

  try {
    const artifact = await createBackupArtifact(backup, include);
    return markBackupComplete(backup.id, artifact.artifactPath, artifact.sizeBytes);
  } catch (error) {
    return markBackupFailed(backup.id, sanitizeBackupError(error));
  }
}

export async function getBackupById(id: string): Promise<BackupRecord | null> {
  const [row] = await db.select().from(backups).where(eq(backups.id, id));
  if (!row) return null;
  return mapBackup(row);
}

async function getBackupByIdInternal(id: string): Promise<BackupRecord | null> {
  const [row] = await db.select().from(backups).where(eq(backups.id, id));
  if (!row) return null;
  return mapBackup(row, { redactArtifactPath: false });
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

export async function markBackupFailed(id: string, error: string): Promise<BackupRecord> {
  const [row] = await db
    .update(backups)
    .set({
      status: "failed",
      artifactPath: null,
      sizeBytes: null,
      finishedAt: new Date(),
      error,
    })
    .where(eq(backups.id, id))
    .returning();

  if (!row) throw new Error("backup_not_found");
  return mapBackup(row);
}

export async function restoreBackup(id: string): Promise<BackupRecord> {
  const backup = await getBackupById(id);
  if (!backup) throw new Error("backup_not_found");
  if (backup.status !== "complete" || !backup.artifactPath) {
    throw new Error("backup_not_ready");
  }
  throw new Error("backup_restore_unsupported");
}

export async function resolveBackupDownload(id: string): Promise<BackupDownload> {
  const backup = await getBackupByIdInternal(id);
  if (!backup) throw new Error("backup_not_found");
  if (backup.status !== "complete" || !backup.artifactPath) {
    throw new Error("backup_not_ready");
  }
  if (isPublicDownloadUrl(backup.artifactPath)) {
    return { url: backup.artifactPath, path: null };
  }
  const baseDir = getBackupStorageDir();
  const artifactPath = path.resolve(backup.artifactPath);
  if (!isPathInside(baseDir, artifactPath)) {
    throw new Error("backup_artifact_invalid");
  }
  const content = await readFile(artifactPath, "utf8");
  return {
    url: null,
    path: null,
    fileName: path.basename(artifactPath),
    contentType: BACKUP_ARTIFACT_CONTENT_TYPE,
    content,
  };
}

export async function deleteBackup(id: string): Promise<BackupDeleteResult> {
  const existing = await getBackupByIdInternal(id);
  const [backup] = await db.delete(backups).where(eq(backups.id, id)).returning({ id: backups.id });
  if (!backup) throw new Error("backup_not_found");
  if (existing?.artifactPath && !isPublicDownloadUrl(existing.artifactPath)) {
    const baseDir = getBackupStorageDir();
    const artifactPath = path.resolve(existing.artifactPath);
    if (isPathInside(baseDir, artifactPath)) {
      await rm(artifactPath, { force: true });
    }
  }
  return { ok: true, id: backup.id };
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
