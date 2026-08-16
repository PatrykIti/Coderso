import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, inArray, lt } from "drizzle-orm";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { clearSiteCache } from "../../site/cache/siteCache";
import { backups, backupSchedules } from "../../db/schema";
import { getStorageSettings } from "../settings/storageSettings";
import { getMediaStorageAdapter } from "../media/storage";
import type { StoredMedia, UploadFile } from "../media/storage/adapter";
import { packBackupArchive } from "./backupArchive"; // 01 — full orchestrator (06 injects exporters)
import {
  BACKUP_ARCHIVE_CONTENT_TYPE,
  BACKUP_ARCHIVE_EXTENSION,
  backupArchiveFileName,
  encryptBackupArchive,
  normalizeBackupPassphrase,
} from "./backupCrypto"; // 02 — .cbk naming + mandatory encryption
import { streamMediaIntoArchive } from "./mediaArchive"; // 03 — mediaExporter
import { assertUsersEncryptionAllowed, exportUsersSection } from "./backupUsersSection"; // 04 — usersExporter + encrypted-only guard
import type {
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

// Legacy v1 `.json` restore helpers now live in ./backupRestore (06 split to
// keep this module under the 1,000-line gate). Imported for the in-place v1
// restore body below and re-exported so routes/tests keep their import surface.
import { parseBackupArtifact, restoreArtifactTx } from "./backupRestore";
export { parseBackupArtifact, replaceSnapshotTables, restoreArtifactTx } from "./backupRestore";

const DEFAULT_FREQUENCY: BackupFrequency = "daily";
const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_INCLUDE: BackupIncludeOption[] = ["database", "media"];
// Full-backup default for SCHEDULES: everything EXCEPT the sensitive users matrix.
const DEFAULT_SCHEDULE_INCLUDE: BackupIncludeOption[] = ["database", "settings", "media"];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const QUEUE_WARNING_MINUTES = 15;
// v1 legacy artifact constants (kept for pre-existing `.json` rows: download,
// parse, restore-by-id all still work for v1 — v2 `.cbk` rows fail fast via
// `backup_restore_superseded`). The CREATE path now emits only v2 `.cbk`.
const BACKUP_ARTIFACT_CONTENT_TYPE = "application/json";

const getBackupStorageDir = () =>
  path.resolve(process.cwd(), process.env.BACKUP_DIR ?? "storage/backups");

const isPathInside = (baseDir: string, targetPath: string) =>
  targetPath === baseDir || targetPath.startsWith(`${baseDir}${path.sep}`);

const resolveBackupArtifactPath = (id: string) => {
  const baseDir = getBackupStorageDir();
  const fileName = backupArchiveFileName(id); // `coderso-backup-<id>.cbk` (02)
  return { baseDir, filePath: path.join(baseDir, fileName), fileName };
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
  // Computed from the REAL artifactPath BEFORE redaction: v2 `.cbk` rows must be
  // restore-unavailable in the admin UI (no stored passphrase), even though the
  // client-facing artifactPath is redacted to "local" for local storage.
  artifactFormat:
    row.artifactPath === null
      ? null
      : row.artifactPath.endsWith(BACKUP_ARCHIVE_EXTENSION)
        ? "v2"
        : "v1",
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

// Defensive read of the stored schedule `include` jsonb (legacy/NULL rows fall
// back to the full-minus-users default). Strict validation happens on INPUT via
// normalizeBackupInclude inside setBackupSchedule.
const normalizeScheduleInclude = (raw: unknown): BackupIncludeOption[] => {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_SCHEDULE_INCLUDE];
  const selected: BackupIncludeOption[] = [];
  for (const value of raw) {
    if (!isBackupIncludeOption(value)) return [...DEFAULT_SCHEDULE_INCLUDE];
    if (!selected.includes(value)) selected.push(value);
  }
  return selected;
};

const mapSchedule = (row: typeof backupSchedules.$inferSelect): BackupSchedule => ({
  id: row.id,
  enabled: row.enabled,
  frequency: asFrequency(row.frequency),
  retentionDays: row.retentionDays,
  storageDriver: asStorageDriver(row.storageDriver),
  include: normalizeScheduleInclude(row.include),
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

/**
 * Cap for a sanitized message PERSISTED on `backups.error` and rendered in the
 * admin backups list, where a short single-line summary is what the column is
 * for. Unchanged from the original behaviour.
 */
const STORED_BACKUP_ERROR_MAX_LENGTH = 240;

/**
 * Cap for a sanitized message written to a server LOG, which has no column or
 * layout to respect.
 *
 * This exists because the stored cap was silently mangling the one failure that
 * most needs to be actionable. When `DATABASE_URL` points at the transaction
 * pooler and `DATABASE_DIRECT_URL` is unset, the backup scheduler's session-lock
 * acquisition fails closed with a 508-character `session_database_url_pooled`
 * message from `resolveSessionDatabaseTarget`, whose final sentence is the whole
 * remedy: "Set DATABASE_DIRECT_URL to the direct (non-pooled) connection string
 * for the same database ...". At 240 characters the log stopped mid-diagnosis
 * ("... Session-level advisory locks taken ") and the remedy never reached the
 * operator.
 */
const LOGGED_BACKUP_ERROR_MAX_LENGTH = 2_000;

export const sanitizeBackupError = (error: unknown, options?: { maxLength?: number }): string => {
  const raw = error instanceof Error ? error.message : String(error);
  if (!raw || raw === "[object Object]") return "Backup worker failed.";
  const maxLength = options?.maxLength ?? STORED_BACKUP_ERROR_MAX_LENGTH;
  // Redaction runs BEFORE truncation, so a longer cap can never expose anything a
  // shorter one hid — it only keeps more of the already-redacted text. The cap is
  // a length bound, not the security control; the redaction is.
  const redacted = raw
    .replaceAll(process.cwd(), "[cwd]")
    .replaceAll(getBackupStorageDir(), "[backup-dir]");
  // Mark truncation instead of cutting silently: an invisible cut is exactly how
  // the missing DATABASE_DIRECT_URL remedy went unnoticed.
  return redacted.length <= maxLength ? redacted : `${redacted.slice(0, maxLength - 1)}…`;
};

/**
 * Sanitize for a log line rather than for storage, so a long remedy survives
 * intact. Use this at every `console.*` call site; keep `sanitizeBackupError` for
 * anything written to `backups.error`.
 */
export const sanitizeBackupErrorForLog = (error: unknown): string =>
  sanitizeBackupError(error, { maxLength: LOGGED_BACKUP_ERROR_MAX_LENGTH });

// 06-owned BINARY sink: pump the encrypted `.cbk` ReadableStream through
// Bun's FileWriter (chunk-by-chunk, never buffering the whole archive) and
// return the byte count for markBackupComplete. This is the local-driver
// no-OOM guarantee's persistence half (01 produces the stream, 02 wraps it,
// 06 sinks it). A manual pump is used because Bun's `write(path, Response)`
// overload does not consume a plain ReadableStream body (it hangs), and the
// installed bun-types expose no ReadableStream overload for Bun.write.
const writeStreamToFile = async (
  archiveStream: ReadableStream<Uint8Array>,
  filePath: string
): Promise<number> => {
  const writer = Bun.file(filePath).writer();
  const reader = archiveStream.getReader();
  let sizeBytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      writer.write(value);
      sizeBytes += value.byteLength;
    }
    await writer.end();
  } catch (error) {
    // Best-effort release on a partial write; the caller's finally cleanup
    // deletes the incomplete artifact. end() may already be closed after a
    // failed write — swallow so the ORIGINAL error propagates.
    try {
      await writer.end();
    } catch {
      // ignore best-effort flush failure
    }
    throw error;
  }
  return sizeBytes;
};

// Build an UploadFile from the encrypted archive STREAM and persist it through
// the CONFIGURED media storage adapter (same driver as `storageSettings.driver`).
// Storage credentials are only ever touched inside the adapter — this helper
// never reads/logs/returns raw keys. On adapter failure the raw error (which may
// echo credentials/connection strings) is logged server-side ONLY and swallowed;
// the machine-readable `backup_upload_failed` is the sole thing that surfaces to
// `sanitizeBackupError` -> `row.error`.
// ⚠ SCOPED CONSTRAINT (06 Open Question #4 — RESOLVED): the remote (s3/azure)
// branch buffers the archive into one ArrayBuffer because `adapter.put(UploadFile)`
// is arrayBuffer()-only and the final `.cbk` byte size isn't known until the
// stream finishes (03's streaming `putAt` needs a pre-declared ContentLength).
// The no-OOM guarantee is therefore LOCAL-DRIVER-ONLY; streaming remote upload is
// a recorded 03/06 follow-up (see TASK-511-06 §A0-persist).
const uploadBackupArtifact = async (
  id: string,
  archiveStream: ReadableStream<Uint8Array>,
  fileName: string
) => {
  const bytes = new Uint8Array(await new Response(archiveStream).arrayBuffer());
  const file: UploadFile = {
    name: fileName,
    type: BACKUP_ARCHIVE_CONTENT_TYPE,
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

// v2 CREATE PATH (06): full-orchestrator packBackupArchive (01) → always
// encryptBackupArchive (02) → binary sink (local writeStreamToFile / remote
// uploadBackupArtifact). Produces `coderso-backup-<id>.cbk` — never `.json`.
// 01's `PackedArchive.cleanup` removes the per-run temp spool dir; 06 owns
// running it (02 only sees the byte stream), ALWAYS in `finally` — success AND
// throw paths (no spool leak across manual/scheduled runs).
const createBackupArtifact = async (
  backup: BackupRecord,
  include: BackupIncludeOption[],
  passphrase: string
) => {
  const { stream, cleanup } = await packBackupArchive({
    include,
    mediaExporter: streamMediaIntoArchive, // 03 — invoked only when include.includes("media")
    usersExporter: exportUsersSection, // 04 — invoked only when include.includes("users")
  });

  try {
    // 02: gzip + AES-256-GCM in ONE call over the plaintext tar stream. Every
    // v2 archive is encrypted — there is NO unencrypted `.cbk` variant.
    const archiveStream = encryptBackupArchive(stream, passphrase);
    const fileName = backupArchiveFileName(backup.id); // `coderso-backup-<id>.cbk`

    if (backup.storageDriver === "local") {
      const { baseDir, filePath } = resolveBackupArtifactPath(backup.id);
      await mkdir(baseDir, { recursive: true });
      const sizeBytes = await writeStreamToFile(archiveStream, filePath);
      return { artifactPath: filePath, artifactKey: null as string | null, sizeBytes };
    }
    // `return await` (not a bare return) so the `finally` cleanup() runs AFTER
    // the remote upload has drained the archive stream.
    return await uploadBackupArtifact(backup.id, archiveStream, fileName);
  } finally {
    await cleanup();
  }
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
    // FAIL-CLOSED, PRE-READ (04 §4.2, its SOLE call-site): users export is
    // encrypted-only. Runs FIRST so a users-including request with no passphrase
    // yields the SPECIFIC `backup_users_requires_encryption` (mapped 400 by 04),
    // not the generic passphrase code. A throw is CAUGHT below →
    // markBackupFailed (persisted `failed` row), never propagated.
    assertUsersEncryptionAllowed(include, {
      enabled: input.passphrase != null && String(input.passphrase).length > 0,
    });
    // Every v2 `.cbk` is ALWAYS encrypted (02 format has no unencrypted variant;
    // 05's import always decrypts) — a passphrase is MANDATORY for every backup.
    // Throws `backup_passphrase_required` / `backup_passphrase_invalid`; the
    // catch turns any throw into markBackupFailed(sanitizeBackupError). Never logged.
    const passphrase = normalizeBackupPassphrase(input.passphrase);

    const artifact = await createBackupArtifact(backup, include, passphrase);
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
  // FAIL-FAST v2 supersession (06): a stored `.cbk` cannot be restored by id (no
  // stored passphrase — parent §decision 3); the v2 restore flow is download →
  // Import dialog (05) with the operator-supplied passphrase. Guard BEFORE any
  // byte read/parse so a v2 row never reaches the v1 parseBackupArtifact path
  // and fails cryptically. Legacy v1 `.json` rows keep the in-place restore body.
  if (row.artifactPath.endsWith(BACKUP_ARCHIVE_EXTENSION)) {
    throw new Error("backup_restore_superseded");
  }
  if (input.confirm !== true) {
    throw new Error("backup_restore_confirmation_required");
  }

  // Strict-parse BEFORE any write (fail-closed): a malformed artifact never opens
  // the transaction.
  const artifact = parseBackupArtifact(await readBackupArtifactContent(id));

  // Single outer transaction: replace snapshot tables + settings share one `tx`,
  // so any failure rolls the whole restore back (no partial state).
  await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      await restoreArtifactTx(tx, artifact);
    },
    { isolationLevel: "read committed" }
  );
  if (artifact.settings) clearSiteCache();

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
  const fileName = path.basename(artifactPath);
  if (fileName.endsWith(BACKUP_ARCHIVE_EXTENSION)) {
    // v2 `.cbk`: byte-exact base64 transport. The /backups/:id/download handler
    // returns this object straight to the JSON serializer, and JSON cannot carry
    // raw bytes (a Uint8Array serializes to a `{"0":..}` object and corrupts the
    // archive) — base64 is JSON-safe and round-trips byte-exact, so the download
    // → Import restore path stays re-importable.
    const bytes = await readFile(artifactPath); // no 'utf8' → Buffer
    return {
      url: null,
      path: null,
      fileName,
      contentType: BACKUP_ARCHIVE_CONTENT_TYPE,
      content: bytes.toString("base64"),
      encoding: "base64",
    };
  }
  const content = await readFile(artifactPath, "utf8");
  return {
    url: null,
    path: null,
    fileName,
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
      include: DEFAULT_SCHEDULE_INCLUDE,
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
  // Strict normalize on INPUT: `include: []` → backup_include_required, an
  // out-of-enum item → backup_include_invalid (rejected at the boundary, never
  // persisted). Absent → keep the current stored scope.
  const include =
    update.include === undefined ? current.include : normalizeBackupInclude(update.include);
  const next = {
    enabled: update.enabled ?? current.enabled,
    frequency: update.frequency ?? current.frequency,
    retentionDays: retention,
    storageDriver: update.storageDriver ?? current.storageDriver,
    include,
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
      include: next.include,
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
