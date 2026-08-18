/**
 * Backup v2 import-file pipeline (TASK-511-05).
 *
 * Reverse of the 511 export chain: upload (.cbk multipart) → maintenance-mode
 * gate (route) → size guards → decrypt (02, AES-256-GCM/scrypt) → gunzip (inside
 * 02) → tar byte stream → spooled to a bounded temp file (O(1) memory) → PASS 1
 * validate (manifest + every tables/* checksum, NO writes) → PASS 2 ONE
 * all-or-nothing tx (FK-safe reverse-delete + batched re-insert via 01's
 * ARCHIVE_TABLE_DESCRIPTORS, settings via 484's importConfigTx, opt-in users via
 * 04's restoreUsersSectionTx) → AFTER commit, media bytes via 03
 * (restoreMediaFromArchive) → temp cleanup in `finally`.
 *
 * Security posture (parent + §3): fail-closed decrypt/validate before any DB
 * write; confirmation-gated; the passphrase/derived key/salt are never logged,
 * persisted, returned, or placed in a thrown message; the spool path never
 * contains an archive-controlled name; every error is a coded, credential-free
 * message mapped by the route's mapBackupError allowlist.
 */
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getTableColumns } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { clearSiteCache } from "../../site/cache/siteCache"; // TASK-563 post-commit invalidation
import { logAudit, type AuditEvent } from "../audit/auditService"; // TASK-563 failure receipt
import { sanitizeAuditMetadata } from "../audit/auditRedaction"; // TASK-563 redaction
import {
  ARCHIVE_ARTIFACT_VERSION,
  ARCHIVE_SCHEMA_VERSION,
  ARCHIVE_TABLE_DESCRIPTORS,
  MANIFEST_MEMBER_NAME,
  ROLES_MEMBER_NAME,
  SETTINGS_MEMBER_NAME,
  TABLE_MEMBER_DIR,
  USER_ROLES_MEMBER_NAME,
  USERS_MEMBER_NAME,
  type ArchiveManifest,
} from "./backupArchive"; // 01 — pinned names + descriptors
import { decryptBackupArchive, normalizeBackupPassphrase } from "./backupCrypto"; // 02
import { getMediaStorageAdapter } from "../media/storage"; // default media adapter (03 path)
import type { MediaStorageAdapter } from "../media/storage/adapter";
import {
  isMediaRestoreFailure,
  MEDIA_MEMBER_PREFIX,
  restoreMediaFromArchive,
} from "./mediaArchive"; // 03
import { restoreUsersSectionTx, type UsersSectionBatch } from "./backupUsersSection"; // 04 — staged users-section restore helper
import { importConfigTx } from "../tools/importExportService"; // 484 — tx-aware settings import

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const IMPORT_BATCH_SIZE = 5_000; // parent §decision 4 (5–10k window); insert batch on restore
const TAR_BLOCK = 512;
const TAR_NAME_LEN = 100;

// 05's OWN 2-arg env parser. `parsePositiveIntEnv` in backupService.ts is a
// private 1-arg const (number | null, no default); 05 cannot import it (484
// single-writer) and must not edit backupService.ts.
const parsePositiveIntEnv = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

// COMPRESSED upload ceiling: content-length header + file.size (§3).
const BACKUP_IMPORT_MAX_BYTES = parsePositiveIntEnv(
  process.env.BACKUP_IMPORT_MAX_BYTES,
  2 * 1024 ** 3
);

// DECRYPTED+gunzipped tar spool ceiling (compression-bomb guard) — SEPARATE and
// higher than the upload ceiling (§7 Q5): a legitimately large system-produced
// backup that compresses under the upload cap must not be rejected on gunzip.
const BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES = parsePositiveIntEnv(
  process.env.BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES,
  BACKUP_IMPORT_MAX_BYTES * 4
);

// ---------------------------------------------------------------------------
// Public types (05 §5.1)
// ---------------------------------------------------------------------------

export type ImportUploadFile = {
  name: string;
  type: string;
  size: number;
  stream(): ReadableStream<Uint8Array>; // Web File shape from req.formData()
};

export type ImportBackupInput = {
  file: ImportUploadFile;
  passphrase: unknown; // normalized by 02
  confirm: boolean;
  restoreUsers?: boolean; // opt-in (default false)
  declaredContentLength?: number; // from the content-length header
  /** Test seam: override the media storage adapter (default: real driver). */
  mediaAdapter?: () => Promise<MediaStorageAdapter>;
  /** Test seam: override the post-commit site-cache clear (default: clearSiteCache). */
  clearCache?: () => void | Promise<void>;
  /** Test seam: override the post-commit media-failure receipt writer (default: logAudit). */
  logFailure?: (event: AuditEvent) => Promise<unknown>;
};

export type ImportResult = {
  status: "restored";
  artifactVersion: number;
  tablesRestored: number;
  rowsRestored: number;
  usersRestored: number;
  mediaRestored: number;
  skippedMedia: number;
};

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Read a member body (AsyncIterable<Uint8Array>) fully into a UTF-8 string.
async function collectText(body: AsyncIterable<Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = [];
  let len = 0;
  for await (const chunk of body) {
    chunks.push(chunk);
    len += chunk.byteLength;
  }
  const all = new Uint8Array(len);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(all);
}

const countNewlines = (chunk: Uint8Array): number => {
  let n = 0;
  for (const byte of chunk) if (byte === 0x0a) n += 1;
  return n;
};

// Stream the member body, split on "\n", yield arrays of ≤ batchSize RAW lines
// (JSON.parse stays inside normalizeContentRow — the single reject-unknown seam).
async function* ndjsonLineBatches(
  body: AsyncIterable<Uint8Array>,
  batchSize: number
): AsyncGenerator<string[]> {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let pending = "";
  let batch: string[] = [];
  for await (const chunk of body) {
    pending += decoder.decode(chunk, { stream: true });
    let idx: number;
    while ((idx = pending.indexOf("\n")) >= 0) {
      const line = pending.slice(0, idx).trim();
      pending = pending.slice(idx + 1);
      if (line.length === 0) continue;
      batch.push(line);
      if (batch.length >= batchSize) {
        yield batch;
        batch = [];
      }
    }
  }
  pending += decoder.decode();
  if (pending.trim().length > 0) batch.push(pending.trim());
  if (batch.length > 0) yield batch;
}

// Parse an NDJSON line into a plain object with a coded failure (never a raw
// SyntaxError that would leak as an unowned 500).
const parseRow = (line: string): unknown => {
  try {
    return JSON.parse(line);
  } catch {
    throw new Error("backup_restore_invalid_artifact");
  }
};

// ---------------------------------------------------------------------------
// Spool (O(1) memory) with a hard decompressed-byte ceiling (§5.1)
// ---------------------------------------------------------------------------

export async function spoolWithCeiling(
  stream: ReadableStream<Uint8Array>,
  filePath: string,
  maxBytes: number
): Promise<void> {
  const fh = await open(filePath, "w", 0o600);
  const reader = stream.getReader();
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel(); // stop pulling (abort upstream decrypt)
        throw new Error("backup_import_too_large");
      }
      await fh.write(Buffer.from(value));
    }
  } finally {
    await fh.close();
  }
}

const fileStream = (tarPath: string): AsyncIterable<Uint8Array> =>
  createReadStream(tarPath) as unknown as AsyncIterable<Uint8Array>;

// ---------------------------------------------------------------------------
// ustar reader seam (reverse of 01 §4.4 — §5.2)
// ---------------------------------------------------------------------------

export type ArchiveMemberEntry = { name: string; size: number; body: AsyncIterable<Uint8Array> };
export type BackupArchiveReader = { entries(): AsyncIterable<ArchiveMemberEntry> };

const isZeroBlock = (block: Uint8Array): boolean => {
  for (const byte of block) if (byte !== 0) return false;
  return true;
};

const readOctal = (field: Uint8Array): number => {
  let end = field.length;
  while (end > 0 && (field[end - 1] === 0 || field[end - 1] === 0x20)) end -= 1;
  const text = new TextDecoder().decode(field.subarray(0, end));
  if (text === "") return 0;
  const value = Number.parseInt(text, 8);
  return Number.isNaN(value) ? 0 : value;
};

// Recompute the header checksum the way 01's writer computed it: every byte
// summed with the checksum field (148..156) treated as 8 spaces.
const headerChecksum = (header: Uint8Array): number => {
  let sum = 0;
  for (let i = 0; i < header.length; i += 1) {
    sum += i >= 148 && i < 156 ? 0x20 : header[i];
  }
  return sum;
};

const parseTarName = (header: Uint8Array): string => {
  const raw = header.subarray(0, TAR_NAME_LEN);
  let end = raw.length;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === 0) {
      end = i;
      break;
    }
  }
  return new TextDecoder().decode(raw.subarray(0, end));
};

/**
 * Parse the tar byte stream member-by-member using 01's fixed ustar layout
 * (512-byte header, name @0 <100B NUL-terminated, octal size @124, typeflag '0'
 * @156, body NUL-padded to 512, EOF = two zero blocks). Bodies STREAM — each
 * `body` yields exactly `size` bytes, never buffered whole. The consumer MUST
 * fully drain each member's body before advancing (validateArchive/restore do).
 * A bad header checksum/typeflag on an otherwise decryptable tar → fail closed.
 */
export function readTarMembers(stream: AsyncIterable<Uint8Array>): BackupArchiveReader {
  return {
    async *entries() {
      const iterator = stream[Symbol.asyncIterator]();
      let buffer = new Uint8Array(0);
      let eof = false;

      const pull = async (): Promise<void> => {
        if (eof) return;
        const { done, value } = await iterator.next();
        if (done) {
          eof = true;
          return;
        }
        const chunk = value as Uint8Array;
        const next = new Uint8Array(buffer.length + chunk.length);
        next.set(buffer, 0);
        next.set(chunk, buffer.length);
        buffer = next;
      };

      const fill = async (n: number): Promise<boolean> => {
        while (buffer.length < n && !eof) await pull();
        return buffer.length >= n;
      };

      const take = async (n: number): Promise<Uint8Array | null> => {
        if (!(await fill(n))) return null;
        const out = buffer.subarray(0, n);
        buffer = buffer.subarray(n);
        return out;
      };

      for (;;) {
        // EOF marker = two consecutive zero blocks.
        if (!(await fill(TAR_BLOCK))) break;
        if (isZeroBlock(buffer.subarray(0, TAR_BLOCK))) {
          buffer = buffer.subarray(TAR_BLOCK);
          if (!(await fill(TAR_BLOCK))) break;
          if (!isZeroBlock(buffer.subarray(0, TAR_BLOCK))) {
            throw new Error("backup_manifest_invalid");
          }
          buffer = buffer.subarray(TAR_BLOCK);
          break;
        }
        const header = await take(TAR_BLOCK);
        if (!header) throw new Error("backup_manifest_invalid"); // truncated header
        if (headerChecksum(header) !== readOctal(header.subarray(148, 156))) {
          throw new Error("backup_manifest_invalid");
        }
        const name = parseTarName(header);
        const size = readOctal(header.subarray(124, 136));
        const typeflag = String.fromCharCode(header[156] ?? 0);
        if (typeflag !== "0" && typeflag !== "\0") {
          throw new Error("backup_manifest_invalid");
        }
        const body = (async function* (): AsyncGenerator<Uint8Array> {
          let remaining = size;
          while (remaining > 0) {
            const chunk = await take(Math.min(remaining, 1 << 16));
            if (chunk === null) throw new Error("backup_manifest_invalid"); // truncated body
            remaining -= chunk.length;
            yield chunk;
          }
        })();
        yield { name, size, body };
        const padding = (TAR_BLOCK - (size % TAR_BLOCK)) % TAR_BLOCK;
        if (padding > 0) await take(padding);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Manifest validator (strict reject-unknown + version handshake — §5.3)
// ---------------------------------------------------------------------------

const MANIFEST_TOP_KEYS = new Set([
  "artifactVersion",
  "schemaVersion",
  "engineVersion",
  "createdAt",
  "include",
  "tables",
  "media",
  "users",
]);
const MANIFEST_TABLE_KEYS = new Set(["key", "member", "rowCount", "byteSize", "sha256"]);
const INCLUDE_ALLOWLIST = new Set(["database", "media", "settings", "users"]); // matches 04's enum
// TASK-562 strict per-section schema: a declared section's manifest block has an
// EXACT key set (reject-unknown inside media/users) so a restore can never
// silently drop or invent a section.
const MANIFEST_USERS_KEYS = new Set(["users", "roles", "userRoles"]);
const MANIFEST_MEDIA_KEYS = new Set(["fileCount", "totalBytes", "skipped"]);
const MANIFEST_MEDIA_SKIPPED_KEYS = new Set(["key", "reason"]);

export function validateManifest(raw: string): ArchiveManifest {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("backup_manifest_invalid");
  }
  if (!isPlainObject(json)) throw new Error("backup_manifest_invalid");
  for (const key of Object.keys(json)) {
    if (!MANIFEST_TOP_KEYS.has(key)) throw new Error("backup_manifest_invalid");
  }
  // Version handshake: a v1 .json artifact or a future v3 → unsupported (distinct
  // from "corrupt" so import UX can say "unsupported version" vs "corrupt file").
  if (json.artifactVersion !== ARCHIVE_ARTIFACT_VERSION)
    throw new Error("backup_archive_unsupported");
  if (json.schemaVersion !== ARCHIVE_SCHEMA_VERSION) throw new Error("backup_archive_unsupported");
  if (!Array.isArray(json.tables)) throw new Error("backup_manifest_invalid");
  for (const table of json.tables) {
    if (!isPlainObject(table)) throw new Error("backup_manifest_invalid");
    for (const key of Object.keys(table)) {
      if (!MANIFEST_TABLE_KEYS.has(key)) throw new Error("backup_manifest_invalid");
    }
    if (typeof table.key !== "string") throw new Error("backup_manifest_invalid");
  }
  if (!Array.isArray(json.include) || json.include.some((x) => !INCLUDE_ALLOWLIST.has(x))) {
    throw new Error("backup_manifest_invalid");
  }

  // TASK-562 SECTION EXACT-SET (fail-closed BEFORE any restore work): `include`
  // declares the sections; a declared section MUST carry its manifest block
  // (also for empty sections), an undeclared section MUST NOT, and unknown keys
  // inside the blocks are rejected. A restore that would silently drop or
  // fabricate users/media is an invalid artifact.
  const includeMedia = json.include.includes("media");
  const includeUsers = json.include.includes("users");
  if (includeUsers) {
    if (!isPlainObject(json.users)) throw new Error("backup_manifest_invalid");
    for (const key of Object.keys(json.users)) {
      if (!MANIFEST_USERS_KEYS.has(key)) throw new Error("backup_manifest_invalid");
    }
    for (const key of MANIFEST_USERS_KEYS) {
      const count = json.users[key];
      if (!Number.isInteger(count) || (count as number) < 0) {
        throw new Error("backup_manifest_invalid");
      }
    }
  } else if (json.users !== undefined) {
    throw new Error("backup_manifest_invalid");
  }
  if (includeMedia) {
    if (!isPlainObject(json.media)) throw new Error("backup_manifest_invalid");
    for (const key of Object.keys(json.media)) {
      if (!MANIFEST_MEDIA_KEYS.has(key)) throw new Error("backup_manifest_invalid");
    }
    if (!Number.isInteger(json.media.fileCount) || (json.media.fileCount as number) < 0) {
      throw new Error("backup_manifest_invalid");
    }
    if (!Number.isInteger(json.media.totalBytes) || (json.media.totalBytes as number) < 0) {
      throw new Error("backup_manifest_invalid");
    }
    if (!Array.isArray(json.media.skipped)) throw new Error("backup_manifest_invalid");
    for (const skipped of json.media.skipped) {
      if (!isPlainObject(skipped)) throw new Error("backup_manifest_invalid");
      for (const key of Object.keys(skipped)) {
        if (!MANIFEST_MEDIA_SKIPPED_KEYS.has(key)) throw new Error("backup_manifest_invalid");
      }
      if (typeof skipped.key !== "string" || skipped.reason !== "missing") {
        throw new Error("backup_manifest_invalid");
      }
    }
  } else if (json.media !== undefined) {
    throw new Error("backup_manifest_invalid");
  }

  // DATABASE-SECTION COMPLETENESS (HIGH data-loss guard, §3 test 15b): §5.5 step 0
  // deletes ALL content tables when include has "database", so an empty/partial
  // manifest.tables would commit a wipe-and-reinsert-nothing tx. Assert exact
  // round-trip completeness (key set == descriptor key set) when "database" is
  // declared; when it is not, tables MUST be empty (a content table listed
  // without the flag is a mismatch). Never silently partial.
  const includeDb = json.include.includes("database");
  const manifestTableKeys = new Set(json.tables.map((t) => t.key as string));
  const descriptorKeys = new Set(ARCHIVE_TABLE_DESCRIPTORS.map((d) => d.key));
  if (includeDb) {
    if (manifestTableKeys.size !== json.tables.length) throw new Error("backup_manifest_invalid");
    if (
      manifestTableKeys.size !== descriptorKeys.size ||
      [...descriptorKeys].some((key) => !manifestTableKeys.has(key))
    ) {
      throw new Error("backup_manifest_invalid");
    }
  } else if (json.tables.length > 0) {
    throw new Error("backup_manifest_invalid");
  }
  return json as ArchiveManifest;
}

// ---------------------------------------------------------------------------
// PASS 1 — validate every content member against the manifest (no writes, §5.4)
// ---------------------------------------------------------------------------

async function validateArchive(tarPath: string): Promise<ArchiveManifest> {
  const reader = readTarMembers(fileStream(tarPath));
  let manifest: ArchiveManifest | null = null;
  const seen = new Map<string, { sha256: string; rowCount: number }>();
  // TASK-562 exact-set bookkeeping: section member names seen (dedup), per-member
  // users line counts, and media member count/bytes — all compared against the
  // manifest below BEFORE any restore work opens.
  const sectionMembers = new Set<string>();
  const usersLines = { users: 0, roles: 0, userRoles: 0 };
  let sawContentMember = false;
  let mediaCount = 0;
  let mediaBytes = 0;
  for await (const entry of reader.entries()) {
    if (entry.name === MANIFEST_MEMBER_NAME) {
      if (manifest || seen.size > 0) throw new Error("backup_manifest_invalid"); // dup / not first
      manifest = validateManifest(await collectText(entry.body));
      continue;
    }
    if (!manifest) throw new Error("backup_manifest_invalid"); // member before manifest
    if (entry.name.startsWith(`${TABLE_MEMBER_DIR}/`)) {
      sawContentMember = true;
      const hash = createHash("sha256");
      let rows = 0;
      for await (const chunk of entry.body) {
        hash.update(chunk);
        rows += countNewlines(chunk);
      }
      seen.set(entry.name, { sha256: hash.digest("hex"), rowCount: rows });
      continue;
    }
    // Section members: settings.json, the three users NDJSON members, media/*.
    // Reject duplicates and unknown members (a restore that would apply a member
    // twice, or silently drain a member it cannot interpret, is fail-closed).
    const isSectionMember =
      entry.name === SETTINGS_MEMBER_NAME ||
      isUsersMemberName(entry.name) ||
      entry.name.startsWith(MEDIA_MEMBER_PREFIX);
    if (!isSectionMember) throw new Error("backup_manifest_invalid"); // unknown member
    if (sectionMembers.has(entry.name)) throw new Error("backup_manifest_invalid"); // duplicate
    sectionMembers.add(entry.name);
    if (isUsersMemberName(entry.name)) {
      // TASK-564: count the member's NDJSON lines WITHOUT materializing them
      // (the users section is the no-OOM exception's last full-array holdout).
      let lineCount = 0;
      for await (const batch of ndjsonLineBatches(entry.body, IMPORT_BATCH_SIZE)) {
        lineCount += batch.length;
      }
      if (entry.name === USERS_MEMBER_NAME) usersLines.users = lineCount;
      else if (entry.name === ROLES_MEMBER_NAME) usersLines.roles = lineCount;
      else usersLines.userRoles = lineCount;
    } else if (entry.name.startsWith(MEDIA_MEMBER_PREFIX)) {
      mediaCount += 1;
      mediaBytes += entry.size;
      for await (const _ of entry.body) {
        /* drain to advance the tar cursor */
      }
    } else {
      for await (const _ of entry.body) {
        /* drain to advance the tar cursor */
      }
    }
  }
  if (!manifest) throw new Error("backup_manifest_invalid");

  const includeDb = manifest.include.includes("database");
  const includeMedia = manifest.include.includes("media");
  const includeUsers = manifest.include.includes("users");
  if (!includeDb && sawContentMember) throw new Error("backup_manifest_invalid");
  if (includeDb && seen.size !== manifest.tables.length) throw new Error("backup_manifest_invalid");

  // TASK-562 EXACT-SET MEMBERS (fail-closed, before the tx opens): a declared
  // section carries EXACTLY its expected members (also when empty — an absent
  // member is a mismatch, never silently zero), an undeclared section carries
  // none, and the manifest counts/bytes must match the real tar members.
  if (includeUsers) {
    for (const name of [USERS_MEMBER_NAME, ROLES_MEMBER_NAME, USER_ROLES_MEMBER_NAME]) {
      if (!sectionMembers.has(name)) throw new Error("backup_manifest_invalid");
    }
    const mu = manifest.users;
    if (
      !mu ||
      mu.users !== usersLines.users ||
      mu.roles !== usersLines.roles ||
      mu.userRoles !== usersLines.userRoles
    ) {
      throw new Error("backup_manifest_invalid");
    }
  } else if ([...sectionMembers].some((name) => isUsersMemberName(name))) {
    throw new Error("backup_manifest_invalid");
  }
  if (includeMedia) {
    if (!manifest.media) throw new Error("backup_manifest_invalid");
    if (mediaCount !== manifest.media.fileCount || mediaBytes !== manifest.media.totalBytes) {
      throw new Error("backup_manifest_invalid");
    }
    // The skipped policy is verified against the tar: an export NEVER both skips
    // a key and writes its member, so a member whose key is declared skipped is
    // a lying archive.
    const skippedKeys = new Set(manifest.media.skipped.map((s) => s.key));
    for (const member of sectionMembers) {
      if (
        member.startsWith(MEDIA_MEMBER_PREFIX) &&
        skippedKeys.has(member.slice(MEDIA_MEMBER_PREFIX.length))
      ) {
        throw new Error("backup_manifest_invalid");
      }
    }
  } else if (sawMediaMember(sectionMembers)) {
    throw new Error("backup_manifest_invalid");
  }

  for (const table of manifest.tables) {
    const got = seen.get(table.member);
    if (!got || got.sha256 !== table.sha256 || got.rowCount !== table.rowCount) {
      throw new Error("backup_checksum_mismatch");
    }
  }
  return manifest;
}

// TASK-562: does the archive contain any media section member?
const sawMediaMember = (sectionMembers: Set<string>): boolean =>
  [...sectionMembers].some((name) => name.startsWith(MEDIA_MEMBER_PREFIX));

// ---------------------------------------------------------------------------
// Content-row normalize + revive (lock-step with 484's reviveRowsForInsert)
// ---------------------------------------------------------------------------

// descriptor keys are typed `keyof BackupArtifactDatabase` by 01; widen to string
// so manifest-derived member names (ArchiveTableManifest.key: string) resolve.
const DESC_BY_KEY = new Map<string, (typeof ARCHIVE_TABLE_DESCRIPTORS)[number]>(
  ARCHIVE_TABLE_DESCRIPTORS.map((d) => [d.key, d])
);

// Reject-unknown per-table NDJSON parse: JSON.parse, assert plain object, every
// key must be a real column on the table (never select-all drift).
export function normalizeContentRow(key: string, rawLine: string): Record<string, unknown> {
  const desc = DESC_BY_KEY.get(key);
  if (!desc) throw new Error("backup_restore_invalid_artifact");
  const parsed = parseRow(rawLine);
  if (!isPlainObject(parsed)) throw new Error("backup_restore_invalid_artifact");
  const allowed = new Set(Object.keys(getTableColumns(desc.table)));
  for (const col of Object.keys(parsed)) {
    if (!allowed.has(col)) throw new Error("backup_restore_invalid_artifact");
  }
  return parsed;
}

// Identical to backupService's reviveRowsForInsert (:588): a `date`-dataType
// column holding an ISO string becomes a Date (drizzle timestamps + dates are
// both dataType "date"); jsonb/uuid/text/numeric round-trip verbatim.
function reviveForInsert(
  table: PgTable,
  rows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const cols = getTableColumns(table) as Record<string, AnyColumn>;
  return rows.map((row) => {
    const out: Record<string, unknown> = { ...row };
    for (const [colKey, value] of Object.entries(row)) {
      const column = cols[colKey];
      if (column && column.dataType === "date" && typeof value === "string") {
        out[colKey] = new Date(value);
      }
    }
    return out;
  });
}

// Narrow a thrown DB error to a Postgres foreign-key violation (SQLSTATE 23503)
// so it maps to the coded backup_restore_fk_violation (422) instead of leaking a
// raw 500. postgres-js surfaces the SQLSTATE on error.code; drizzle may re-wrap it
// on error.cause. Never surfaces the underlying message (credential-free).
const isFkViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (("code" in error && (error as { code?: unknown }).code === "23503") ||
    ("cause" in error && (error as { cause?: { code?: unknown } }).cause?.code === "23503"));

const isUsersMemberName = (name: string): boolean =>
  name === USERS_MEMBER_NAME || name === ROLES_MEMBER_NAME || name === USER_ROLES_MEMBER_NAME;

// ---------------------------------------------------------------------------
// PASS 2 — batched, FK-safe, transactional restore (§5.5)
// ---------------------------------------------------------------------------

export async function restoreArchiveStreamTx(
  tx: DbTransaction,
  tarPath: string,
  manifest: ArchiveManifest,
  opts: { restoreUsers: boolean; confirm: boolean; runId: string }
): Promise<{ tables: number; rows: number; usersRestored: number }> {
  const includeDb = manifest.include.includes("database");
  const includeUsers = manifest.include.includes("users");
  const memberByKey = new Map(manifest.tables.map((t) => [t.member, t.key]));
  let usersRestored = 0;

  // 0) 484 DATABASE-GUARD (HIGH data-loss guard, §3 test 15): the reverse-delete
  //    of the content tables runs ONLY when this archive carries a database
  //    section — mirrors `if (artifact.database)` (backupService.ts:631). A
  //    settings-/media-/users-only .cbk must NEVER wipe content.
  if (includeDb) {
    for (const desc of [...ARCHIVE_TABLE_DESCRIPTORS].reverse()) await tx.delete(desc.table);
  }

  // 0.5) FK-SAFE USERS PRE-RESTORE (HIGH FK-ordering fix, §7 Q6 / test 16): the
  //     content tables FK `users.id` at INSERT (pages.author_id, posts.author_id,
  //     media.created_by, ...) and NO constraint is DEFERRABLE, so a cross-env /
  //     DR restore whose users are absent from the target must upsert users
  //     BEFORE content. 01 emits users members LAST, so a dedicated spool scan
  //     (ONE extra sequential read, only on the opt-in path) streams the three
  //     members into 04's run-scoped staging table (TASK-564: bounded batches,
  //     no full-array materialization), then runs the set-based guards + upsert
  //     (never delete-all → safe before content) inside the SAME outer tx.
  if (includeUsers && opts.restoreUsers) {
    let sawUsersPre = false;
    const counts = { users: 0, roles: 0, userRoles: 0 };
    async function* stagedUsersSection(): AsyncGenerator<UsersSectionBatch> {
      for await (const entry of readTarMembers(fileStream(tarPath)).entries()) {
        if (isUsersMemberName(entry.name)) {
          sawUsersPre = true;
          const kind: UsersSectionBatch["kind"] =
            entry.name === USERS_MEMBER_NAME
              ? "user"
              : entry.name === ROLES_MEMBER_NAME
                ? "role"
                : "user_role";
          for await (const batch of ndjsonLineBatches(entry.body, IMPORT_BATCH_SIZE)) {
            if (kind === "user") counts.users += batch.length;
            else if (kind === "role") counts.roles += batch.length;
            else counts.userRoles += batch.length;
            yield { kind, lines: batch };
          }
        } else {
          for await (const _ of entry.body) {
            /* drain to advance the tar cursor */
          }
        }
      }
    }
    const r = await restoreUsersSectionTx(
      tx,
      { restoreUsers: true, confirm: opts.confirm, runId: opts.runId },
      stagedUsersSection()
    );
    if (!sawUsersPre) throw new Error("backup_manifest_invalid");
    const mu = manifest.users;
    if (
      mu &&
      (mu.users !== counts.users || mu.roles !== counts.roles || mu.userRoles !== counts.userRoles)
    ) {
      throw new Error("backup_manifest_invalid");
    }
    usersRestored = r.usersRestored;
  }

  // SINGLE sequential pass (scalability directive): dispatch each member in 01's
  // emit order (manifest → tables → settings → media → users), which equals the
  // FK-safe INSERT order. One pass = O(size), memory O(IMPORT_BATCH_SIZE).
  let rows = 0;
  let tables = 0;
  let sawUsersMember = false;
  let sawSettingsMember = false;

  for await (const entry of readTarMembers(fileStream(tarPath)).entries()) {
    if (entry.name === MANIFEST_MEMBER_NAME) {
      for await (const _ of entry.body) {
        /* drain */
      }
      continue;
    }

    if (includeDb && entry.name.startsWith(`${TABLE_MEMBER_DIR}/`)) {
      const key = memberByKey.get(entry.name);
      const desc = key ? DESC_BY_KEY.get(key) : undefined;
      if (!desc) {
        for await (const _ of entry.body) {
          /* drain */
        }
        continue;
      }
      tables += 1;
      for await (const batch of ndjsonLineBatches(entry.body, IMPORT_BATCH_SIZE)) {
        const revived = reviveForInsert(
          desc.table,
          batch.map((line) => normalizeContentRow(desc.key, line))
        );
        if (revived.length > 0) {
          try {
            await tx.insert(desc.table).values(revived as never);
          } catch (error) {
            // Residual FK violation: a content row references a parent absent from
            // BOTH the target DB and the archive (cross-env database import without
            // restoreUsers). Map to the coded error — the tx still rolls back.
            if (isFkViolation(error)) throw new Error("backup_restore_fk_violation");
            throw error;
          }
        }
        rows += revived.length;
      }
      continue;
    }

    if (entry.name === SETTINGS_MEMBER_NAME) {
      sawSettingsMember = true;
      if (manifest.include.includes("settings")) {
        const bundle = JSON.parse(await collectText(entry.body)) as Parameters<
          typeof importConfigTx
        >[1];
        await importConfigTx(tx, bundle); // validateBundle + setSettingsTx inside the SAME tx
      } else {
        for await (const _ of entry.body) {
          /* drain */
        }
      }
      continue;
    }

    if (isUsersMemberName(entry.name)) {
      // The upsert already ran in the FK-safe pre-restore (0.5); drain + record
      // presence so the include↔member check below catches drift even when
      // restoreUsers=false (member drained, no upsert).
      sawUsersMember = true;
      for await (const _ of entry.body) {
        /* drain */
      }
      continue;
    }

    // media/* is restored post-commit by the orchestrator (step e); drain here.
    for await (const _ of entry.body) {
      /* drain */
    }
  }

  // Include ↔ member consistency (fail-closed, §7 Q1): no section may be
  // silently wiped, dropped, or drained. Content/media reconcile ran in PASS 1
  // (before the tx opened); settings + users reconcile here (before any
  // upsert/commit on their sections).
  const includeSettings = manifest.include.includes("settings");
  if (includeSettings !== sawSettingsMember) throw new Error("backup_manifest_invalid");
  if (includeUsers !== sawUsersMember) throw new Error("backup_manifest_invalid");

  return { tables, rows, usersRestored };
}

// ---------------------------------------------------------------------------
// Orchestrator (§5.1)
// ---------------------------------------------------------------------------

export async function importBackupFromUpload(input: ImportBackupInput): Promise<ImportResult> {
  // (a) Fail-closed gates BEFORE the expensive path.
  if (input.confirm !== true) throw new Error("backup_restore_confirmation_required");
  const passphrase = normalizeBackupPassphrase(input.passphrase); // 02: required/invalid codes
  if (!input.file || typeof input.file.stream !== "function")
    throw new Error("backup_import_invalid_file");
  if ((input.declaredContentLength ?? 0) > BACKUP_IMPORT_MAX_BYTES)
    throw new Error("backup_import_too_large");
  if (input.file.size > BACKUP_IMPORT_MAX_BYTES) throw new Error("backup_import_too_large");

  // Path/spool safety: randomUUID dir + fixed archive.tar leaf — no
  // archive-controlled name ever enters the FS path.
  const tmpDir = path.join(
    process.env.BACKUP_TMP_DIR ?? os.tmpdir(),
    `coderso-import-${randomUUID()}`
  );
  await mkdir(tmpDir, { recursive: true, mode: 0o700 });
  const tarPath = path.join(tmpDir, "archive.tar");
  // Spool-dir identity `coderso-import-<uuid>`: the run-scoped staging key for
  // TASK-564's users restore AND TASK-563's media-failure receipt (one source).
  const runId = path.basename(tmpDir);
  const cleanup = async () => {
    await rm(tmpDir, { recursive: true, force: true });
  };

  try {
    // (b) DECRYPT (02): verifies every GCM frame + gunzips → plaintext tar stream,
    //     spooled to disk O(1) memory with the decompressed byte ceiling.
    const plainTar = decryptBackupArchive(input.file.stream(), passphrase); // backup_decrypt_failed / backup_archive_unsupported
    await spoolWithCeiling(plainTar, tarPath, BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES);

    // (c) PASS 1 — VALIDATE (no writes): manifest + version handshake + every
    //     tables/* checksum + rowCount. One sequential spool read.
    const manifest = await validateArchive(tarPath);

    // (d) PASS 2 — RESTORE in ONE tx (all-or-nothing). One sequential spool read.
    // Native CMS writer fence FIRST (TASK-561): a destructive restore must never
    // interleave with an active full-site holder (TASK-547) or concurrent admin
    // writers. Contention throws the fence's EXISTING `native_cms_writer_fence_busy`
    // code (mapped → 409 by the route) BEFORE any delete/insert/restore work, so
    // this path performs zero protected writes on contention.
    const dbResult = await db.transaction(async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      return restoreArchiveStreamTx(tx, tarPath, manifest, {
        restoreUsers: input.restoreUsers === true,
        confirm: true,
        runId,
      });
    });

    // (e) AFTER commit, OUTSIDE the tx — TASK-563: invalidate the process-local
    //     site cache for archives that changed authoritative DB state (database
    //     or settings; a media-/users-only archive touches neither, mirroring
    //     the legacy restoreBackup condition), THEN restore media bytes via 03
    //     (non-transactional object storage). One sequential spool read.
    const clearCache = input.clearCache ?? clearSiteCache;
    if (manifest.include.includes("database") || manifest.include.includes("settings")) {
      await clearCache();
    }

    let media = { restored: 0, totalBytes: 0 };
    let skippedMedia = 0;
    if (manifest.include.includes("media")) {
      const fileCount = manifest.media?.fileCount ?? 0;
      try {
        media = await restoreMediaFromArchive(readTarMembers(fileStream(tarPath)), {
          getAdapter: input.mediaAdapter ?? getMediaStorageAdapter,
        });
      } catch (error) {
        // Best-effort degradation (TASK-511-03): the authoritative DB commit
        // already returned success, so a partial object-storage write is NOT
        // rolled back. Swallow ONLY the genuine partial-write failure, record a
        // REDACTED receipt (fixed code, counts only — no raw storage
        // error/credentials), and report the true partial state via
        // mediaRestored/skippedMedia (TASK-563). Fail-closed guards
        // (`backup_media_key_unsafe`, `backup_media_too_large`) are NOT
        // swallowable: rethrow so the route still surfaces their distinct 422
        // mappings instead of a generic 200 receipt.
        if (!isMediaRestoreFailure(error)) {
          throw error;
        }
        media = { restored: error.partialRestored, totalBytes: error.partialTotalBytes };
        skippedMedia = Math.max(0, fileCount - media.restored);
        const logFailure = input.logFailure ?? logAudit;
        await logFailure({
          action: "backup.mediaRestoreFailure",
          targetType: "backup",
          targetId: runId,
          metadata: sanitizeAuditMetadata({
            code: "media_restore_partial",
            severity: "error",
            restored: media.restored,
            skipped: skippedMedia,
          }),
        });
      }
    }

    return {
      status: "restored",
      artifactVersion: manifest.artifactVersion,
      tablesRestored: dbResult.tables,
      rowsRestored: dbResult.rows,
      usersRestored: dbResult.usersRestored,
      mediaRestored: media.restored,
      skippedMedia,
    };
  } finally {
    await cleanup(); // always — success, throw, or abort
  }
}
