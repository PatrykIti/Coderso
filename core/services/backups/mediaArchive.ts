/**
 * Backup v2 media file streaming (TASK-511-03).
 *
 * Export: `streamMediaIntoArchive` enumerates media keys in bounded keyset pages,
 * streams each stored object's bytes into a `media/<storageKey>` tar member, and
 * returns a summary for the manifest. Missing or size-drifted files are skipped
 * and recorded — a single bad row degrades to a broken image on restore, it
 * NEVER aborts the whole export.
 *
 * Restore: `restoreMediaFromArchive` streams each `media/` member back into the
 * configured storage adapter at its ORIGINAL key via the keyed `putAt` write
 * (never `put`, which mints a fresh key and would orphan every restored row).
 *
 * Plaintext tar members only — the gzip+AES-GCM envelope (02) wraps the whole
 * tar. No secrets are ever logged: adapter errors are `console.error`ed
 * server-side only and surfaced as credential-free coded errors.
 */
import { asc, gt } from "drizzle-orm";

import { db } from "../../db/client";
import { media } from "../../db/schema";
import { getMediaStorageAdapter } from "../media/storage";
import type { MediaStorageAdapter } from "../media/storage/adapter";
import type { BackupArchiveWriter } from "./backupArchive";

export const MEDIA_MEMBER_PREFIX = "media/";

// Rows per keyset page (keys only, never SELECT * of the whole table).
const MEDIA_KEY_BATCH = 1000;

// In-code sentinels (rare empty-Body/empty-stream path). The COMMON
// missing-object case rejects earlier with a real SDK error shape (NoSuchKey /
// BlobNotFound / 404) — see isMissing().
const MEDIA_MISSING_ERRORS = new Set(["s3_object_missing", "azure_object_missing"]);

// Per-file restore ceiling: server-owned env with a sane default (512 MiB), so a
// malicious archive cannot fill disk/bucket with one giant member. Parsed with
// the same positive-int semantics as backupService's parsePositiveIntEnv.
const DEFAULT_MEDIA_MAX_FILE_BYTES = 512 * 1024 * 1024;
export const BACKUP_MEDIA_MAX_FILE_BYTES_ENV = "BACKUP_MEDIA_MAX_FILE_BYTES";

function resolveMediaMaxFileBytes(): number {
  const raw = process.env[BACKUP_MEDIA_MAX_FILE_BYTES_ENV];
  if (raw === undefined || raw.trim() === "") return DEFAULT_MEDIA_MAX_FILE_BYTES;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_MEDIA_MAX_FILE_BYTES;
  return parsed;
}

export type MediaArchiveSummary = {
  fileCount: number; // members actually written
  totalBytes: number; // sum of member sizes
  // reason is pinned to "missing" to stay byte-compatible with 01's PRE-DECLARED,
  // CLOSED `ArchiveMediaManifest.skipped[].reason` — a size-drifted row is folded
  // into the SAME bucket (its usable bytes are effectively absent).
  skipped: Array<{ key: string; reason: "missing" }>;
};

type MediaArchiveDeps = {
  getAdapter: () => Promise<MediaStorageAdapter>;
  db: typeof db;
};

/**
 * Stream every stored media object into the archive writer as `media/<key>`
 * members. Runs the FULL union of absent-object signals through a graceful skip:
 * S3/Azure SDK rejections at `get()`, the in-code sentinels, the deferred local
 * ENOENT (primed BEFORE appendStream), and DB-size drift (countingStream).
 */
export async function streamMediaIntoArchive(
  writer: BackupArchiveWriter,
  deps: MediaArchiveDeps = { getAdapter: getMediaStorageAdapter, db }
): Promise<MediaArchiveSummary> {
  const adapter = await deps.getAdapter();
  const summary: MediaArchiveSummary = { fileCount: 0, totalBytes: 0, skipped: [] };

  let cursor: string | null = null; // last id seen (keyset)
  for (;;) {
    const page = await deps.db
      .select({ id: media.id, key: media.key, size: media.size, mimeType: media.mimeType })
      .from(media)
      .where(cursor ? gt(media.id, cursor) : undefined)
      .orderBy(asc(media.id))
      .limit(MEDIA_KEY_BATCH);
    if (page.length === 0) break;
    cursor = page[page.length - 1].id;

    for (const row of page) {
      let stream: NodeJS.ReadableStream;
      try {
        stream = await adapter.get(row.key); // S3/Azure REJECT here on missing
      } catch (err) {
        if (isMissing(err)) {
          // Absent file → graceful skip.
          summary.skipped.push({ key: row.key, reason: "missing" });
          continue;
        }
        // Auth/transport error may echo credentials → log server-side ONLY,
        // surface a credential-free code (mirrors uploadBackupArtifact).
        console.error("backup media read failed", err);
        throw new Error("backup_media_read_failed");
      }
      // DEFERRED-OPEN GUARD (local driver). get() returns a lazy createReadStream
      // and the ENOENT surfaces only on first read — i.e. later, during the pipe
      // INSIDE appendStream, AFTER the ustar header would be written. Prime the
      // stream here so a deferred ENOENT becomes a graceful skip BEFORE any
      // member header exists (never a corrupt half-written member, never a
      // whole-export hard failure).
      const primed = await primeMediaStream(stream);
      if (!primed.ok) {
        if (isMissing(primed.err)) {
          summary.skipped.push({ key: row.key, reason: "missing" });
          continue;
        }
        console.error("backup media read failed", primed.err);
        throw new Error("backup_media_read_failed");
      }
      // Size reconciliation. 01's appendStream is spool-first and asserts the
      // streamed byte count equals the declared size, pushing the member ONLY on
      // a match — so a mismatch can never desync/corrupt the tar (01 simply never
      // emits the member). But 01's assertion would throw the generic
      // `backup_archive_export_failed` and abort the WHOLE export on a legitimately
      // size-drifted DB row. countingStream raises the DISTINCT catchable sentinel
      // `backup_media_size_mismatch` on a short/long body, which we convert into a
      // per-file graceful skip.
      try {
        await writer.appendStream(
          `${MEDIA_MEMBER_PREFIX}${row.key}`,
          row.size,
          countingStream(primed.stream, row.size)
        );
      } catch (err) {
        if (err instanceof Error && err.message === "backup_media_size_mismatch") {
          // On-disk bytes != declared media.size → drop this one row (01 did NOT
          // push the member, so the tar stays valid) and record it as skipped.
          summary.skipped.push({ key: row.key, reason: "missing" });
          continue;
        }
        throw err; // genuine writer/spool failure → fail closed
      }
      summary.fileCount += 1;
      summary.totalBytes += row.size;
    }
  }
  return summary; // handed to 01's manifest builder as manifest.media
}

/** Matches the FULL union of absent-object signals across all three drivers. */
function isMissing(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as Error & {
    code?: string;
    Code?: string;
    statusCode?: number;
    $metadata?: { httpStatusCode?: number };
  };
  // in-code sentinels (rare empty-Body/empty-stream success path)
  if (MEDIA_MISSING_ERRORS.has(e.message)) return true;
  // local deferred ENOENT (first read)
  if (e.code === "ENOENT") return true;
  // S3 real absent key: NoSuchKey / 404
  if (e.name === "NoSuchKey" || e.Code === "NoSuchKey") return true;
  // Azure real absent blob: RestError BlobNotFound / 404
  if (e.name === "RestError" && e.code === "BlobNotFound") return true;
  // shared 404 fallback (either cloud SDK)
  if (e.$metadata?.httpStatusCode === 404 || e.statusCode === 404) return true;
  return false;
}

/**
 * Resolve the deferred-open ambiguity for the LOCAL driver without consuming
 * payload bytes: attach one-shot listeners, settle on the first event to fire,
 * then remove all listeners. For S3/Azure the missing case already threw at
 * get(); here priming just confirms readiness.
 */
async function primeMediaStream(
  stream: NodeJS.ReadableStream
): Promise<{ ok: true; stream: NodeJS.ReadableStream } | { ok: false; err: unknown }> {
  return await new Promise((resolve) => {
    const s = stream as NodeJS.ReadableStream & {
      once(ev: string, cb: (...a: unknown[]) => void): unknown;
      off?(ev: string, cb: (...a: unknown[]) => void): unknown;
    };
    const done = (r: { ok: true; stream: NodeJS.ReadableStream } | { ok: false; err: unknown }) => {
      s.off?.("open", onOpen);
      s.off?.("readable", onReady);
      s.off?.("end", onReady);
      s.off?.("error", onError);
      resolve(r);
    };
    const onOpen = () => done({ ok: true, stream }); // fs.ReadStream got the fd (file exists)
    const onReady = () => done({ ok: true, stream }); // readable/end buffered — data NOT consumed
    const onError = (err: unknown) => done({ ok: false, err });
    s.once("open", onOpen); // fs.ReadStream only; fires BEFORE any data
    s.once("readable", onReady); // non-fs streams (fake/S3/Azure body)
    s.once("end", onReady); // empty file
    s.once("error", onError); // ENOENT (local deferred) or transport error
  });
}

/**
 * Passthrough that counts bytes; on end (short body) or when the running count
 * exceeds `declared` (long body) it emits the distinct sentinel
 * `backup_media_size_mismatch`. That error propagates out of 01's appendStream
 * (01 has NOT pushed the member), where the export loop converts it into a
 * graceful per-file skip.
 */
function countingStream(src: NodeJS.ReadableStream, declared: number): AsyncIterable<Uint8Array> {
  let count = 0;
  return (async function* () {
    for await (const chunk of src as AsyncIterable<Uint8Array>) {
      count += chunk.byteLength;
      if (count > declared) throw new Error("backup_media_size_mismatch"); // long body
      yield chunk;
    }
    if (count !== declared) throw new Error("backup_media_size_mismatch"); // short body
  })();
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

// Minimal local structural interface; 05's concrete `readTarMembers` /
// `ArchiveMemberEntry` is assignable to it at integration (no cross-import).
type BackupArchiveReader = {
  entries(): AsyncIterable<{ name: string; size: number; body: AsyncIterable<Uint8Array> }>;
};

export type MediaRestoreSummary = { restored: number; totalBytes: number };

// Content-type derived from the storage key's extension (decoupled from the DB
// `media.mimeType` so the media-bytes stream is independent of restore ordering).
// Matched case-insensitively; unlisted extensions fall back to octet-stream.
const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  ico: "image/x-icon",
  bmp: "image/bmp",
  tiff: "image/tiff",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  txt: "text/plain",
  json: "application/json",
};

function mimeFromExt(key: string): string | undefined {
  const dot = key.lastIndexOf(".");
  if (dot < 0 || dot === key.length - 1) return undefined;
  return EXT_TO_MIME[key.slice(dot + 1).toLowerCase()];
}

// Expected media key charset: [A-Za-z0-9._-/]+ with no empty, `.`, or `..`
// path segments, no `//`, no backslashes, no NUL, no absolute/drive-letter root.
const MEDIA_KEY_RE = /^[A-Za-z0-9._\-/]+$/;

/** Reject a crafted archive key that could escape the media root (fail closed). */
function assertSafeMediaKey(key: string): void {
  const unsafe =
    key.length === 0 ||
    key.startsWith("/") ||
    /^[A-Za-z]:/.test(key) ||
    key.includes("\0") ||
    key.includes("\\") ||
    key.includes("//") ||
    !MEDIA_KEY_RE.test(key) ||
    key.split("/").some((s) => s === "" || s === "." || s === "..");
  if (unsafe) throw new Error("backup_media_key_unsafe");
}

type RestoreDeps = {
  getAdapter: () => Promise<MediaStorageAdapter>;
};

/**
 * Stream `media/` members from a tar reader back into storage at their original
 * keys. Runs OUTSIDE the DB transaction (bytes-to-object-storage is not
 * transactional), invoked by 05 AFTER the DB media rows are restored so keys line
 * up. Non-media members (manifest.json, tables/*, settings.json) are fully
 * drained before advancing — honoring 05's "fully drain each member's body
 * before advancing" reader contract so the ustar cursor never desyncs.
 */
export async function restoreMediaFromArchive(
  reader: BackupArchiveReader,
  deps: RestoreDeps = { getAdapter: getMediaStorageAdapter }
): Promise<MediaRestoreSummary> {
  const adapter = await deps.getAdapter();
  const out: MediaRestoreSummary = { restored: 0, totalBytes: 0 };
  const maxFileBytes = resolveMediaMaxFileBytes();

  for await (const entry of reader.entries()) {
    if (!entry.name.startsWith(MEDIA_MEMBER_PREFIX)) {
      // Fully drain the non-media body before advancing (identical to 05's
      // validateArchive drain) so the tar cursor never desyncs.
      for await (const _ of entry.body) {
        /* discard — advance the tar cursor */
      }
      continue; // 01 handles ndjson/manifest
    }
    const key = entry.name.slice(MEDIA_MEMBER_PREFIX.length);
    assertSafeMediaKey(key); // traversal guard
    if (entry.size > maxFileBytes) throw new Error("backup_media_too_large"); // per-file ceiling
    try {
      await adapter.putAt(
        key,
        entry.body,
        entry.size,
        mimeFromExt(key) ?? "application/octet-stream"
      );
    } catch (err) {
      console.error("backup media write failed", err); // server-side only
      throw new Error("backup_media_write_failed"); // credential-free; fails the restore
    }
    out.restored += 1;
    out.totalBytes += entry.size;
  }
  return out;
}
