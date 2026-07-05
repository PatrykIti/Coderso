import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, getTableColumns, inArray, lt } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "../../db/client";
import {
  backups,
  backupSchedules,
  contentEntries,
  contentRevisions,
  contentTaxonomies,
  contentTermAssignments,
  contentTerms,
  contentTypes,
  customScreenEntryPresentationOverrides,
  customScreens,
  detailPageDocuments,
  detailPageRevisions,
  media,
  menuItems,
  menus,
  pageRevisions,
  pages,
  postPreviewTokens,
  postRevisions,
  postTermAssignments,
  posts,
  redirects,
  themeProfiles,
  themeRoutes,
} from "../../db/schema";
import { getStorageSettings } from "../settings/storageSettings";
import { getMediaStorageAdapter } from "../media/storage";
import type { StoredMedia, UploadFile } from "../media/storage/adapter";
import { exportConfig, importConfigTx } from "../tools/importExportService";
import type {
  BackupArtifact,
  BackupArtifactDatabase,
  BackupCreateInput,
  BackupDeleteResult,
  BackupDownload,
  BackupFrequency,
  BackupIncludeOption,
  BackupKind,
  BackupListQuery,
  BackupListResult,
  BackupPruneResult,
  BackupRecord,
  BackupRestoreInput,
  BackupSchedule,
  BackupScheduleUpdate,
  BackupStatus,
  BackupStorageDriver,
  BackupStorageUsage,
  BackupWorkerHealth,
} from "./backupTypes";
import { backupIncludeOptions } from "./backupTypes";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

const RUN_HOUR_UTC = 3; // off-peak anchor; keep deterministic

export function computeNextRunAt(frequency: BackupFrequency, from: Date): Date {
  const next = new Date(from);
  switch (frequency) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "monthly": {
      // CAUTION: JS Date OVERFLOWS on month rollover (Jan 31 + setUTCMonth(+1)
      // yields Mar 2/3) — it does NOT clamp. Clamp explicitly to the last day
      // of the target month so Jan 31 -> Feb 28/29.
      const day = next.getUTCDate();
      next.setUTCDate(1); // avoid overflow while switching month
      next.setUTCMonth(next.getUTCMonth() + 1);
      const daysInTarget = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
      ).getUTCDate(); // day 0 of month+1 = last day of target month
      next.setUTCDate(Math.min(day, daysInTarget));
      break;
    }
  }
  next.setUTCHours(RUN_HOUR_UTC, 0, 0, 0);
  // ensure strictly in the future relative to `from` (handles same-day anchor)
  if (next.getTime() <= from.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

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
  artifactKey: options.redactArtifactPath === false ? (row.artifactKey ?? null) : null,
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
  nextRunAt: row.nextRunAt ?? null,
  lastRunAt: row.lastRunAt ?? null,
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

export const sanitizeBackupError = (error: unknown) => {
  const raw = error instanceof Error ? error.message : String(error);
  if (!raw || raw === "[object Object]") return "Backup worker failed.";
  return raw
    .replaceAll(process.cwd(), "[cwd]")
    .replaceAll(getBackupStorageDir(), "[backup-dir]")
    .slice(0, 240);
};

// Capture EVERY snapshot table (the 10 top-level parents + every cascade/RESTRICT
// child transitively reachable from them). Missing a cascade child here means the
// backup never captured it, so a later restore would DELETE it (via parent cascade)
// with nothing to re-insert. Keep in lock-step with `snapshotTableOrder` +
// `BACKUP_SNAPSHOT_TABLE_KEYS`.
const buildDatabaseSnapshot = async (): Promise<BackupArtifactDatabase> => {
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
    pageRevisionRows,
    detailPageDocumentRows,
    detailPageRevisionRows,
    customScreenRows,
    customScreenOverrideRows,
    contentRevisionRows,
    contentTaxonomyRows,
    contentTermRows,
    contentTermAssignmentRows,
    postRevisionRows,
    postPreviewTokenRows,
    postTermAssignmentRows,
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
    db.select().from(pageRevisions),
    db.select().from(detailPageDocuments),
    db.select().from(detailPageRevisions),
    db.select().from(customScreens),
    db.select().from(customScreenEntryPresentationOverrides),
    db.select().from(contentRevisions),
    db.select().from(contentTaxonomies),
    db.select().from(contentTerms),
    db.select().from(contentTermAssignments),
    db.select().from(postRevisions),
    db.select().from(postPreviewTokens),
    db.select().from(postTermAssignments),
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
    pageRevisions: pageRevisionRows,
    detailPageDocuments: detailPageDocumentRows,
    detailPageRevisions: detailPageRevisionRows,
    customScreens: customScreenRows,
    customScreenEntryPresentationOverrides: customScreenOverrideRows,
    contentRevisions: contentRevisionRows,
    contentTaxonomies: contentTaxonomyRows,
    contentTerms: contentTermRows,
    contentTermAssignments: contentTermAssignmentRows,
    postRevisions: postRevisionRows,
    postPreviewTokens: postPreviewTokenRows,
    postTermAssignments: postTermAssignmentRows,
  };
};

// Build an UploadFile from the in-memory artifact bytes and persist it through
// the CONFIGURED media storage adapter (same driver as `storageSettings.driver`).
// Storage credentials are only ever touched inside the adapter — this helper
// never reads/logs/returns raw keys. On adapter failure the raw error (which may
// echo credentials/connection strings) is logged server-side ONLY and swallowed;
// the machine-readable `backup_upload_failed` is the sole thing that surfaces to
// `sanitizeBackupError` -> `row.error` (which performs no credential redaction).
const uploadBackupArtifact = async (id: string, content: string) => {
  const bytes = Buffer.from(content, "utf8");
  const fileName = `coderso-backup-${id}.json`;
  const file: UploadFile = {
    name: fileName,
    type: BACKUP_ARTIFACT_CONTENT_TYPE,
    size: bytes.byteLength,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
  const adapter = await getMediaStorageAdapter();
  let stored: StoredMedia;
  try {
    stored = await adapter.put(file);
  } catch (error) {
    // Server-side only: the raw adapter message may echo access keys/connection
    // strings. It is NEVER persisted or returned to the client.
    console.error("backup artifact upload failed", error);
    throw new Error("backup_upload_failed");
  }
  return { artifactPath: stored.url, artifactKey: stored.key, sizeBytes: bytes.byteLength };
};

const createBackupArtifact = async (backup: BackupRecord, include: BackupIncludeOption[]) => {
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
  // Driver-aware persistence: `local` keeps the filesystem path (null key);
  // `s3`/`azure` upload via the reused media adapter and store the public URL
  // (artifactPath) + object key (artifactKey).
  if (backup.storageDriver === "local") {
    const { baseDir, filePath } = resolveBackupArtifactPath(backup.id);
    await mkdir(baseDir, { recursive: true });
    await writeFile(filePath, content, { encoding: "utf8" });
    return {
      artifactPath: filePath,
      artifactKey: null as string | null,
      sizeBytes: Buffer.byteLength(content, "utf8"),
    };
  }
  return uploadBackupArtifact(backup.id, content);
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
    return markBackupComplete(
      backup.id,
      artifact.artifactPath,
      artifact.artifactKey,
      artifact.sizeBytes
    );
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
  artifactKey: string | null,
  sizeBytes: number | null
): Promise<BackupRecord> {
  const [row] = await db
    .update(backups)
    .set({
      status: "complete",
      artifactPath,
      artifactKey,
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
      artifactKey: null,
      sizeBytes: null,
      finishedAt: new Date(),
      error,
    })
    .where(eq(backups.id, id))
    .returning();

  if (!row) throw new Error("backup_not_found");
  return mapBackup(row);
}

// Snapshot tables in FK-safe INSERT order (parents before children). This mirrors
// `buildDatabaseSnapshot()` one-to-one. Delete runs in the reverse order (children
// before parents). Keep this list and `buildDatabaseSnapshot` in lock-step.
//
// The reverse-delete ordering is also what resolves detail_page_documents' RESTRICT
// FK to content_types: detailPageDocuments (below) is deleted BEFORE contentTypes,
// so the parent delete never trips the RESTRICT.
const snapshotTableOrder: Array<{ key: keyof BackupArtifactDatabase; table: PgTable }> = [
  // Roots / top-level parents.
  { key: "pages", table: pages },
  { key: "contentTypes", table: contentTypes },
  { key: "media", table: media },
  { key: "menus", table: menus },
  { key: "themeProfiles", table: themeProfiles },
  { key: "redirects", table: redirects },
  // First-level children.
  { key: "contentEntries", table: contentEntries },
  { key: "posts", table: posts },
  { key: "menuItems", table: menuItems },
  { key: "themeRoutes", table: themeRoutes },
  { key: "pageRevisions", table: pageRevisions },
  { key: "detailPageDocuments", table: detailPageDocuments },
  { key: "customScreens", table: customScreens },
  { key: "contentTaxonomies", table: contentTaxonomies },
  // Deeper children (depend on the first-level children above).
  { key: "detailPageRevisions", table: detailPageRevisions },
  { key: "contentTerms", table: contentTerms },
  { key: "contentRevisions", table: contentRevisions },
  {
    key: "customScreenEntryPresentationOverrides",
    table: customScreenEntryPresentationOverrides,
  },
  { key: "postRevisions", table: postRevisions },
  { key: "postPreviewTokens", table: postPreviewTokens },
  // Junctions that depend on contentTerms (must come after it).
  { key: "contentTermAssignments", table: contentTermAssignments },
  { key: "postTermAssignments", table: postTermAssignments },
];

// JSON round-trips Date columns to ISO strings; drizzle's timestamp writer calls
// `.toISOString()` on insert, so revive `date`-typed columns back to `Date` before
// writing. Other column types (jsonb, uuid, text, numeric) round-trip verbatim.
const reviveRowsForInsert = (
  table: PgTable,
  rows: Record<string, unknown>[]
): Record<string, unknown>[] => {
  const columns = getTableColumns(table);
  return rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const [key, column] of Object.entries(columns)) {
      const value = next[key];
      if (typeof value === "string" && column.dataType === "date") {
        next[key] = new Date(value);
      }
    }
    return next;
  });
};

// Transactional guarded delete+insert of every snapshot table inside the caller's
// `tx`. Exposed so tests can exercise the restore body inside a deliberately
// rolled-back transaction (the shared-DB dry-run seam) without committing.
export async function replaceSnapshotTables(
  tx: DbTransaction,
  database: BackupArtifactDatabase
): Promise<void> {
  // Delete children -> parents (reverse of the FK-safe insert order).
  for (const { table } of [...snapshotTableOrder].reverse()) {
    await tx.delete(table);
  }
  // Insert parents -> children so FK references always resolve.
  for (const { key, table } of snapshotTableOrder) {
    const rows = database[key];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    await tx.insert(table).values(reviveRowsForInsert(table, rows) as never);
  }
}

// The tx-scoped restore body: snapshot tables + settings, sharing ONE outer `tx`
// so the whole restore is genuinely all-or-nothing. Exposed for the rollback-scoped
// regression seam.
export async function restoreArtifactTx(
  tx: DbTransaction,
  artifact: BackupArtifact
): Promise<void> {
  if (artifact.database) {
    await replaceSnapshotTables(tx, artifact.database);
  }
  if (artifact.settings) {
    // Share the OUTER tx: importConfigTx is the transaction-aware body of
    // importConfig (still runs validateBundle + setSettingsTx). Do NOT call the
    // public importConfig() here — it opens its own db.transaction, which would
    // commit/rollback independently and break all-or-nothing.
    await importConfigTx(tx, artifact.settings);
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const BACKUP_ARTIFACT_TOP_LEVEL_KEYS = new Set([
  "version",
  "id",
  "createdAt",
  "include",
  "storageDriver",
  "database",
  "settings",
  "media",
]);

const BACKUP_SNAPSHOT_TABLE_KEYS: Array<keyof BackupArtifactDatabase> = [
  "pages",
  "contentTypes",
  "contentEntries",
  "posts",
  "media",
  "menus",
  "menuItems",
  "themeProfiles",
  "themeRoutes",
  "redirects",
  "pageRevisions",
  "detailPageDocuments",
  "detailPageRevisions",
  "customScreens",
  "customScreenEntryPresentationOverrides",
  "contentRevisions",
  "contentTaxonomies",
  "contentTerms",
  "contentTermAssignments",
  "postRevisions",
  "postPreviewTokens",
  "postTermAssignments",
];

// Strict, fail-closed parse of the stored artifact. Rejects unknown top-level
// keys, requires version === BACKUP_ARTIFACT_VERSION, and validates each snapshot
// table is an array (settings is deep-validated later by validateBundle via
// importConfigTx). No raw artifact data is written un-validated.
export function parseBackupArtifact(raw: string): BackupArtifact {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("backup_restore_invalid_artifact");
  }
  if (!isPlainObject(json)) throw new Error("backup_restore_invalid_artifact");
  for (const key of Object.keys(json)) {
    if (!BACKUP_ARTIFACT_TOP_LEVEL_KEYS.has(key)) {
      throw new Error("backup_restore_invalid_artifact");
    }
  }
  if (json.version !== BACKUP_ARTIFACT_VERSION) {
    throw new Error("backup_restore_invalid_artifact");
  }

  const { database, settings, media: mediaSection } = json;
  if (database !== null && database !== undefined) {
    if (!isPlainObject(database)) throw new Error("backup_restore_invalid_artifact");
    for (const key of BACKUP_SNAPSHOT_TABLE_KEYS) {
      const value = (database as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && !Array.isArray(value)) {
        throw new Error("backup_restore_invalid_artifact");
      }
    }
  }
  if (settings !== null && settings !== undefined && !isPlainObject(settings)) {
    throw new Error("backup_restore_invalid_artifact");
  }
  if (mediaSection !== null && mediaSection !== undefined && !isPlainObject(mediaSection)) {
    throw new Error("backup_restore_invalid_artifact");
  }

  return json as BackupArtifact;
}

// Read the artifact bytes from wherever it lives, reusing the download resolver:
// local files are path-traversal guarded + returned as `content`; remote artifacts
// return a public URL that is fetched here.
async function readBackupArtifactContent(id: string): Promise<string> {
  const dl = await resolveBackupDownload(id);
  if (dl.content != null) return dl.content;
  if (dl.url) {
    const res = await fetch(dl.url);
    if (!res.ok) throw new Error("backup_artifact_unreadable");
    return await res.text();
  }
  throw new Error("backup_artifact_invalid");
}

export async function restoreBackup(
  id: string,
  input: BackupRestoreInput = {}
): Promise<BackupRecord> {
  const [row] = await db.select().from(backups).where(eq(backups.id, id));
  if (!row) throw new Error("backup_not_found");
  if (row.status !== "complete" || !row.artifactPath) {
    throw new Error("backup_not_ready");
  }
  if (input.confirm !== true) {
    throw new Error("backup_restore_confirmation_required");
  }

  // Strict-parse BEFORE any write (fail-closed): a malformed artifact never opens
  // the transaction.
  const artifact = parseBackupArtifact(await readBackupArtifactContent(id));

  // Single outer transaction: replace snapshot tables + settings share one `tx`,
  // so any failure rolls the whole restore back (no partial state).
  await db.transaction(async (tx) => {
    await restoreArtifactTx(tx, artifact);
  });

  // Restore does not change the backup row's own status; return the redacted record.
  return mapBackup(row);
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
  if (existing?.artifactKey) {
    // Driver-drift guard: getMediaStorageAdapter() resolves the CURRENT settings
    // driver, while existing.storageDriver was frozen at create time. If the
    // operator switched drivers since create (s3->azure, or remote->local),
    // deleting via the current adapter would hit the WRONG backend — skip the
    // remote delete and log the orphaned artifact instead.
    const currentDriver = (await getStorageSettings()).driver;
    if (currentDriver !== existing.storageDriver) {
      console.warn(
        `backup remote delete skipped (driver drift ${existing.storageDriver} -> ${currentDriver}); ` +
          `remote artifact orphaned: ${existing.artifactKey}`
      );
    } else {
      try {
        const adapter = await getMediaStorageAdapter();
        await adapter.delete(existing.artifactKey); // MUST await: delete() returns Promise<void>
      } catch {
        /* best-effort; row deletion still proceeds */
      }
    }
  } else if (existing?.artifactPath && !isPublicDownloadUrl(existing.artifactPath)) {
    const baseDir = getBackupStorageDir();
    const artifactPath = path.resolve(existing.artifactPath);
    if (isPathInside(baseDir, artifactPath)) {
      await rm(artifactPath, { force: true });
    }
  }
  return { ok: true, id: backup.id };
}

export async function pruneExpiredBackups(
  retentionDays: number,
  now: Date = new Date()
): Promise<BackupPruneResult> {
  assertRetentionDays(retentionDays); // reuse existing guard; throws backup_schedule_invalid
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  const expired = await db
    .select({ id: backups.id })
    .from(backups)
    .where(
      and(
        lt(backups.createdAt, cutoff),
        inArray(backups.status, ["complete", "failed"]) // terminal rows only
      )
    );

  const prunedIds: string[] = [];
  for (const { id } of expired) {
    try {
      await deleteBackup(id); // removes row + local/remote artifact
      prunedIds.push(id);
    } catch {
      // a single failed delete must not abort the sweep; skip and continue
    }
  }
  return { prunedCount: prunedIds.length, prunedIds };
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
      nextRunAt: computeNextRunAt(DEFAULT_FREQUENCY, now),
      lastRunAt: null,
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

  const frequencyChanged = update.frequency !== undefined && update.frequency !== current.frequency;
  const reEnabled = next.enabled && !current.enabled;
  const nextRunAt = !next.enabled
    ? null
    : frequencyChanged || reEnabled || current.nextRunAt === null
      ? computeNextRunAt(next.frequency, new Date())
      : current.nextRunAt;

  const [row] = await db
    .update(backupSchedules)
    .set({
      enabled: next.enabled,
      frequency: next.frequency,
      retentionDays: next.retentionDays,
      storageDriver: next.storageDriver,
      nextRunAt,
      updatedAt: new Date(),
    })
    .where(eq(backupSchedules.id, current.id))
    .returning();

  if (!row) throw new Error("backup_schedule_update_failed");
  return mapSchedule(row);
}

export async function markScheduleRun(scheduleId: string, runAt: Date): Promise<BackupSchedule> {
  const [current] = await db
    .select()
    .from(backupSchedules)
    .where(eq(backupSchedules.id, scheduleId));
  if (!current) throw new Error("backup_schedule_not_found");
  const [row] = await db
    .update(backupSchedules)
    .set({
      lastRunAt: runAt,
      nextRunAt: current.enabled ? computeNextRunAt(asFrequency(current.frequency), runAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(backupSchedules.id, scheduleId))
    .returning();
  if (!row) throw new Error("backup_schedule_not_found");
  return mapSchedule(row);
}

// --- Storage usage aggregate (TASK-484-06-L01). ---

const BACKUP_STATUSES: readonly BackupStatus[] = ["queued", "running", "complete", "failed"];
const BACKUP_STORAGE_DRIVERS: readonly BackupStorageDriver[] = ["local", "s3", "azure"];

// Fully-populated zero maps so every enum key is present in the payload (stable
// shape) even when no rows exist for a given status/driver.
const emptyUsageMaps = () => ({
  byStatus: Object.fromEntries(
    BACKUP_STATUSES.map((status) => [status, { count: 0, bytes: 0 }])
  ) as Record<BackupStatus, { count: number; bytes: number }>,
  byDriver: Object.fromEntries(
    BACKUP_STORAGE_DRIVERS.map((driver) => [driver, { count: 0, bytes: 0 }])
  ) as Record<BackupStorageDriver, { count: number; bytes: number }>,
});

const bumpUsage = <K extends string>(
  map: Record<K, { count: number; bytes: number }>,
  key: K,
  bytes: number
) => {
  const bucket = map[key];
  bucket.count += 1;
  bucket.bytes += bytes;
};

// Parse a server-owned positive-integer env value. Returns null for absent,
// empty, non-numeric, non-integer, or non-positive values (no quota signal).
const parsePositiveIntEnv = (value: string | undefined): number | null => {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

// Aggregate storage usage over the ENTIRE `backups` table: total bytes + count,
// per-status and per-driver breakdowns, the active storage driver label, and an
// optional server-owned quota signal (BACKUP_MAX_TOTAL_BYTES). Numeric aggregates
// + enum labels only — never artifact paths, keys, or credentials.
export async function getBackupStorageUsage(): Promise<BackupStorageUsage> {
  const rows = await db.select().from(backups);
  const maps = emptyUsageMaps();
  let totalBytes = 0;
  let backupCount = 0;
  for (const row of rows) {
    const bytes = row.sizeBytes ?? 0; // null treated as 0
    totalBytes += bytes;
    backupCount += 1;
    bumpUsage(maps.byStatus, asBackupStatus(row.status), bytes);
    bumpUsage(maps.byDriver, asStorageDriver(row.storageDriver), bytes);
  }
  const settings = await getStorageSettings();
  const quotaBytes = parsePositiveIntEnv(process.env.BACKUP_MAX_TOTAL_BYTES);
  return {
    totalBytes,
    backupCount,
    byStatus: maps.byStatus,
    byDriver: maps.byDriver,
    activeDriver: settings.driver,
    quotaBytes,
    overQuota: quotaBytes != null && totalBytes > quotaBytes,
  };
}
