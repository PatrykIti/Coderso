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
import { restoreMediaFromArchive } from "./mediaArchive"; // 03
import {
  normalizeRoleRow,
  normalizeUserRoleRow,
  normalizeUserRow,
  restoreUsersSectionTx,
  type RoleRow,
  type UserRoleRow,
  type UserRow,
} from "./backupUsersSection"; // 04 — tx helper + normalize*/row types
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

// Fully materialize an NDJSON member into raw string lines (the users section's
// bounded owner-scoped memory exception, parent §decision 4 / §5.5).
async function collectLines(body: AsyncIterable<Uint8Array>): Promise<string[]> {
  return (await collectText(body))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
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
  let sawContentMember = false;
  let sawMediaMember = false;
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
    } else {
      if (entry.name.startsWith("media/")) sawMediaMember = true;
      // Section members (settings.json, users/roles/user_roles.ndjson, media/*)
      // carry COUNTS, not per-member sha256 in the manifest; their byte integrity
      // is fully covered by 02's per-frame GCM auth. Drain to advance the cursor.
      for await (const _ of entry.body) {
        /* drain */
      }
    }
  }
  if (!manifest) throw new Error("backup_manifest_invalid");

  const includeDb = manifest.include.includes("database");
  if (!includeDb && sawContentMember) throw new Error("backup_manifest_invalid");
  if (includeDb && seen.size !== manifest.tables.length) throw new Error("backup_manifest_invalid");
  if (!manifest.include.includes("media") && sawMediaMember) {
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
  opts: { restoreUsers: boolean; confirm: boolean }
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
  //     (ONE extra sequential read, only on the opt-in path) collects the three
  //     members, cross-checks counts, and calls 04's UPSERT-by-pk helper (never
  //     delete-all → safe before content) inside the SAME outer tx.
  if (includeUsers && opts.restoreUsers) {
    const pre = { users: [] as UserRow[], roles: [] as RoleRow[], userRoles: [] as UserRoleRow[] };
    let sawUsersPre = false;
    for await (const entry of readTarMembers(fileStream(tarPath)).entries()) {
      if (isUsersMemberName(entry.name)) {
        sawUsersPre = true;
        const lines = await collectLines(entry.body);
        if (entry.name === USERS_MEMBER_NAME)
          pre.users = lines.map((l) => normalizeUserRow(parseRow(l)));
        else if (entry.name === ROLES_MEMBER_NAME)
          pre.roles = lines.map((l) => normalizeRoleRow(parseRow(l)));
        else pre.userRoles = lines.map((l) => normalizeUserRoleRow(parseRow(l)));
      } else {
        for await (const _ of entry.body) {
          /* drain to advance the tar cursor */
        }
      }
    }
    if (!sawUsersPre) throw new Error("backup_manifest_invalid");
    const mu = manifest.users;
    if (
      mu &&
      (mu.users !== pre.users.length ||
        mu.roles !== pre.roles.length ||
        mu.userRoles !== pre.userRoles.length)
    ) {
      throw new Error("backup_manifest_invalid");
    }
    const r = await restoreUsersSectionTx(tx, pre, { restoreUsers: true, confirm: opts.confirm });
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
    const dbResult = await db.transaction(async (tx) =>
      restoreArchiveStreamTx(tx, tarPath, manifest, {
        restoreUsers: input.restoreUsers === true,
        confirm: true,
      })
    );

    // (e) AFTER commit, OUTSIDE the tx — media bytes via 03 (non-transactional
    //     object storage). One sequential spool read.
    let media = { restored: 0, totalBytes: 0 };
    if (manifest.include.includes("media")) {
      media = await restoreMediaFromArchive(readTarMembers(fileStream(tarPath)), {
        getAdapter: input.mediaAdapter ?? getMediaStorageAdapter,
      });
    }

    return {
      status: "restored",
      artifactVersion: manifest.artifactVersion,
      tablesRestored: dbResult.tables,
      rowsRestored: dbResult.rows,
      usersRestored: dbResult.usersRestored,
      mediaRestored: media.restored,
      skippedMedia: 0,
    };
  } finally {
    await cleanup(); // always — success, throw, or abort
  }
}
