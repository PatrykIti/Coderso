/**
 * Backup v2 streaming export engine + archive container format (TASK-511-01).
 *
 * Replaces the v1 in-memory `JSON.stringify(artifact, null, 2)` snapshot with a
 * streaming, batched NDJSON-per-table export packaged in a tar container whose
 * FIRST member is `manifest.json` (schema/artifact version, engine version,
 * per-table row counts + SHA-256 checksums, include flags), followed by
 * per-table `tables/<key>.ndjson` members and optional sibling section members
 * (`settings.json`, `media/*`, users/roles/user_roles NDJSON).
 *
 * This module is the single-writer property of TASK-511-01. Later subtasks
 * COMPOSE against it and MUST NOT edit it: 02 wraps the produced plaintext tar
 * byte stream with gzip + AES-256-GCM/scrypt (owning the `.cbk` crypto header +
 * frame layout in `backupCrypto.ts`); 03 appends `media/*` members through the
 * `BackupArchiveWriter.appendStream` seam; 04 appends users/roles/user_roles
 * NDJSON members through the `ExportEngine.appendNdjson` sink; 05 implements
 * the reverse reader; 06 wires `packBackupArchive` into the create path,
 * injecting the 03/04 section exporters.
 *
 * LIFECYCLE CONTRACT (02/06/tests): `packDatabaseArchive`/`packBackupArchive`
 * return `{ stream, manifest, cleanup }`. The temp spool underlies `stream`, so
 * the caller MUST fully consume/pipe `stream` and only then `await cleanup()`,
 * always in a `finally`.
 *
 * SPOOL-FIRST MODEL: every member (DB tables + sections) is spooled to the
 * per-run temp dir first (computing byte size + SHA-256 incrementally, memory
 * O(batch)), and only tar-packed AFTER `manifest.json` is finalized — so
 * section counts are known before the manifest (the first member) is emitted
 * and the tar pull-generator never faces a live push stream.
 */

import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { asc, getTableColumns, gt, sql } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "../../db/client";
import {
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
import type { BackupIncludeOption } from "./backupTypes";
import { getStorageSettings } from "../settings/storageSettings";
import { exportConfig } from "../tools/importExportService";

// v1 JSON artifact = version 1 (backupService BACKUP_ARTIFACT_VERSION). The tar
// archive is a NEW artifact format — start at 2 so a reader can tell them apart.
export const ARCHIVE_ARTIFACT_VERSION = 2 as const;
// Bumped whenever the snapshot table SET/shape changes (lock-step with 484's
// snapshotTableOrder). Distinct from artifact version.
export const ARCHIVE_SCHEMA_VERSION = 1 as const;
export const ARCHIVE_ENGINE_VERSION = "2026.07-backup-v2" as const;
export const MANIFEST_MEMBER_NAME = "manifest.json" as const;
export const TABLE_MEMBER_DIR = "tables" as const; // tables/<key>.ndjson
// Section member names (siblings of manifest.json, NOT under tables/). PINNED so
// the section WRITERS (01 settings, 04 users/roles/user_roles) and the section
// READER (05) agree on the EXACT byte string. 04 and 05 import these constants.
export const SETTINGS_MEMBER_NAME = "settings.json" as const;
export const USERS_MEMBER_NAME = "users.ndjson" as const;
export const ROLES_MEMBER_NAME = "roles.ndjson" as const;
export const USER_ROLES_MEMBER_NAME = "user_roles.ndjson" as const;
export const EXPORT_BATCH_SIZE = 5_000; // rows/batch (5–10k window)

export type ArchiveTableManifest = {
  key: string; // logical table key (matches BackupArtifactDatabase)
  member: string; // e.g. "tables/pages.ndjson"
  rowCount: number;
  byteSize: number; // raw member bytes
  sha256: string; // hex digest of raw member bytes
};

export type ArchiveMediaManifest = {
  fileCount: number;
  totalBytes: number;
  skipped: Array<{ key: string; reason: "missing" }>;
};

export type ArchiveUsersManifest = { users: number; roles: number; userRoles: number };

export type ArchiveManifest = {
  artifactVersion: typeof ARCHIVE_ARTIFACT_VERSION;
  schemaVersion: typeof ARCHIVE_SCHEMA_VERSION;
  engineVersion: string;
  createdAt: string; // ISO
  include: BackupIncludeOption[];
  tables: ArchiveTableManifest[];
  media?: ArchiveMediaManifest; // 03 fills when include has "media"
  users?: ArchiveUsersManifest; // 04 fills when include has "users"
};

// A tar member is a name + exact byte size + a chunk source. tar requires size in
// the 512-byte header BEFORE the body, so members stream from a spooled file
// whose size is known. This keeps memory O(batch), not O(table).
export type TarMember = {
  name: string;
  size: number;
  body: AsyncIterable<Uint8Array>;
};

/**
 * Spool-base resolver (3-tier, first match wins): (1) BACKUP_TMP_DIR env override;
 * (2) a LOCAL/filesystem persistent base from getStorageSettings() →
 * `${base}/backups-tmp` (ONLY for a local driver — remote s3/azure yields no
 * local spool path and falls through); (3) os.tmpdir().
 */
async function resolveSpoolBase(): Promise<string> {
  if (process.env.BACKUP_TMP_DIR) return process.env.BACKUP_TMP_DIR;
  const storage = await getStorageSettings();
  if (storage.driver === "local" && storage.local.dir) {
    return path.join(storage.local.dir, "backups-tmp");
  }
  return os.tmpdir();
}

// Cursor columns per table: single PK for most, COMPOSITE for the two junctions.
type TableDescriptor = {
  key: keyof import("./backupTypes").BackupArtifactDatabase;
  table: PgTable;
  cursor: string[]; // ordered PK column property names on the drizzle table
};

// Order MIRRORS snapshotTableOrder (backupService.ts:553-583). Export order does
// not need FK-safety (no writes), but keeping the same order makes the drift test 1:1.
export const ARCHIVE_TABLE_DESCRIPTORS: TableDescriptor[] = [
  { key: "pages", table: pages, cursor: ["id"] },
  { key: "contentTypes", table: contentTypes, cursor: ["id"] },
  { key: "media", table: media, cursor: ["id"] },
  { key: "menus", table: menus, cursor: ["id"] },
  { key: "themeProfiles", table: themeProfiles, cursor: ["id"] },
  { key: "redirects", table: redirects, cursor: ["id"] },
  { key: "contentEntries", table: contentEntries, cursor: ["id"] },
  { key: "posts", table: posts, cursor: ["id"] },
  { key: "menuItems", table: menuItems, cursor: ["id"] },
  { key: "themeRoutes", table: themeRoutes, cursor: ["id"] },
  { key: "pageRevisions", table: pageRevisions, cursor: ["id"] },
  { key: "detailPageDocuments", table: detailPageDocuments, cursor: ["id"] },
  { key: "customScreens", table: customScreens, cursor: ["id"] },
  { key: "contentTaxonomies", table: contentTaxonomies, cursor: ["id"] },
  { key: "detailPageRevisions", table: detailPageRevisions, cursor: ["id"] },
  { key: "contentTerms", table: contentTerms, cursor: ["id"] },
  { key: "contentRevisions", table: contentRevisions, cursor: ["id"] },
  {
    key: "customScreenEntryPresentationOverrides",
    table: customScreenEntryPresentationOverrides,
    // Composite PK (screen_id, entry_id, block_id, prop_path) — no id column.
    cursor: ["screenId", "entryId", "blockId", "propPath"],
  },
  { key: "postRevisions", table: postRevisions, cursor: ["id"] },
  { key: "postPreviewTokens", table: postPreviewTokens, cursor: ["id"] },
  { key: "contentTermAssignments", table: contentTermAssignments, cursor: ["entryId", "termId"] },
  { key: "postTermAssignments", table: postTermAssignments, cursor: ["postId", "termId"] },
];

/**
 * Keyset-paged batch runner. IMPORTANT (drizzle-orm ^0.45.2): the default select
 * builder is a STAGED, phantom-typed chain — `.where()` must precede
 * `.orderBy()/.limit()`, and a query variable CANNOT be reassigned across
 * conditional method calls without `.$dynamic()`. So compute the WHERE
 * expression FIRST, then build ONE unbroken chain. `where(undefined)` is a valid
 * no-op in drizzle (drops the clause), so the first page needs no branch.
 */
async function defaultRunBatch(
  desc: TableDescriptor,
  cols: Record<string, AnyColumn>,
  cursor: unknown[] | null,
  batchSize: number
) {
  const orderCols = desc.cursor.map((c) => asc(cols[c]));
  let where: SQL | undefined;
  if (cursor !== null) {
    if (desc.cursor.length === 1) {
      where = gt(cols[desc.cursor[0]], cursor[0]); // WHERE id > $cursor
    } else {
      // Row-value comparison for composite PK: WHERE (a, b) > ($ca, $cb).
      const lhs = sql.join(
        desc.cursor.map((c) => sql`${cols[c]}`),
        sql`, `
      );
      const rhs = sql.join(
        cursor.map((v) => sql`${v}`),
        sql`, `
      );
      where = sql`(${lhs}) > (${rhs})`;
    }
  }
  return db
    .select()
    .from(desc.table)
    .where(where)
    .orderBy(...orderCols)
    .limit(batchSize);
}

type RunBatch = typeof defaultRunBatch;

/**
 * Async generator: yields rows in stable cursor order, batch by batch. Never
 * holds more than one batch in memory. `runBatch` is injectable so tests can
 * count calls (streaming assertion) and unit-test keyset math without the DB.
 * Exported so the pure keyset-math suite can drive it with a fake runBatch.
 */
export async function* streamTableRows(
  desc: TableDescriptor,
  batchSize = EXPORT_BATCH_SIZE,
  runBatch: RunBatch = defaultRunBatch
): AsyncGenerator<Record<string, unknown>> {
  // `getTableColumns` returns a mapped type with NO string index signature, so an
  // arbitrary `cols[c]` string index needs a cast. Widen to `Record<string, AnyColumn>`
  // (NOT `unknown`): `asc`/`gt`/`sql` require `AnyColumn | SQLWrapper`.
  const cols = getTableColumns(desc.table) as Record<string, AnyColumn>;
  let cursor: unknown[] | null = null;
  for (;;) {
    const batch = await runBatch(desc, cols, cursor, batchSize);
    if (batch.length === 0) break;
    for (const row of batch) yield row;
    if (batch.length < batchSize) break; // last page
    const last = batch[batch.length - 1];
    cursor = desc.cursor.map((c) => last[c]);
  }
}

// Serialize one DB row to a single NDJSON line. JSON.stringify renders Date
// columns as ISO strings (drizzle timestamps) and jsonb as objects — exactly what
// 484's reviveRowsForInsert expects to revive on restore, so the round-trip is
// lossless. numeric columns round-trip as strings (postgres-js).
const toNdjsonLine = (row: unknown) => `${JSON.stringify(row)}\n`;

type SpooledTable = { manifest: ArchiveTableManifest; filePath: string };

async function spoolTable(
  desc: TableDescriptor,
  tmpDir: string,
  batchSize: number,
  runBatch: RunBatch
): Promise<SpooledTable> {
  const member = `${TABLE_MEMBER_DIR}/${desc.key}.ndjson`;
  const filePath = path.join(tmpDir, `${desc.key}.ndjson`);
  const fh = await open(filePath, "w", 0o600);
  const hash = createHash("sha256");
  let rowCount = 0;
  let byteSize = 0;
  try {
    for await (const row of streamTableRows(desc, batchSize, runBatch)) {
      const buf = Buffer.from(toNdjsonLine(row), "utf8");
      await fh.write(buf); // stream to disk; memory stays O(1) per row
      hash.update(buf);
      byteSize += buf.byteLength;
      rowCount += 1;
    }
  } finally {
    await fh.close();
  }
  return {
    filePath,
    manifest: { key: desc.key, member, rowCount, byteSize, sha256: hash.digest("hex") },
  };
}

// Minimal ustar writer (no new dependency): 512-byte header + NUL-padded body to a
// 512 boundary + two zero blocks EOF. Only `file` type records are needed; names
// stay < 100 bytes, so no GNU/pax long-name path is required.
function tarHeader(name: string, size: number): Buffer {
  const h = Buffer.alloc(512);
  h.write(name, 0, "utf8"); // name (<100 bytes)
  h.write("000644 \0", 100); // mode
  h.write("0000000 \0", 108); // uid
  h.write("0000000 \0", 116); // gid
  h.write(size.toString(8).padStart(11, "0") + " ", 124); // size (octal)
  h.write("00000000000 ", 136); // mtime (deterministic 0)
  h.write("        ", 148); // checksum placeholder (spaces)
  h.write("0", 156); // typeflag '0' = regular file
  h.write("ustar\0", 257);
  h.write("00", 263); // magic + version
  let sum = 0;
  for (const b of h) sum += b; // header checksum
  h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
  return h;
}

// Returns a ReadableStream<Uint8Array> of the whole tar (manifest first). Bodies
// are pulled lazily from their spool files, so the tar is produced streaming —
// 02 pipes this straight through gzip + GCM without buffering the archive.
function tarPack(members: AsyncIterable<TarMember>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const m of members) {
          controller.enqueue(tarHeader(m.name, m.size));
          for await (const chunk of m.body) controller.enqueue(chunk);
          const pad = (512 - (m.size % 512)) % 512;
          if (pad) controller.enqueue(new Uint8Array(pad));
        }
        controller.enqueue(new Uint8Array(1024)); // two zero blocks = EOF
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

// fileChunks: read a spool file in 64KiB chunks as an AsyncIterable<Uint8Array>.
async function* fileChunks(filePath: string): AsyncGenerator<Uint8Array> {
  const fh = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(64 * 1024);
    for (;;) {
      const { bytesRead } = await fh.read(buf, 0, buf.length, null);
      if (bytesRead === 0) break;
      yield Uint8Array.prototype.slice.call(buf, 0, bytesRead);
    }
  } finally {
    await fh.close();
  }
}

export type PackDatabaseArchiveOptions = {
  include: BackupIncludeOption[]; // must contain "database" for the DB-only entry
  batchSize?: number; // default EXPORT_BATCH_SIZE
  tmpDir?: string; // default: resolveSpoolBase()/coderso-backup-<uuid>
  runBatch?: RunBatch; // test seam
};

export type PackedArchive = {
  stream: ReadableStream<Uint8Array>; // the raw .tar bytes (02 wraps this)
  manifest: ArchiveManifest; // fully populated (counts + checksums)
  cleanup: () => Promise<void>; // remove temp spool dir (idempotent)
};

export async function packDatabaseArchive(
  opts: PackDatabaseArchiveOptions
): Promise<PackedArchive> {
  if (!opts.include.includes("database")) throw new Error("backup_archive_export_failed");
  const baseTmp = await resolveSpoolBase();
  const tmpDir = opts.tmpDir ?? path.join(baseTmp, `coderso-backup-${randomUUID()}`);
  const batchSize = opts.batchSize ?? EXPORT_BATCH_SIZE;
  const runBatch = opts.runBatch ?? defaultRunBatch;
  try {
    await mkdir(tmpDir, { recursive: true, mode: 0o700 });
  } catch {
    throw new Error("backup_archive_tempdir_failed");
  }

  const cleanup = async () => {
    await rm(tmpDir, { recursive: true, force: true });
  };

  try {
    // 1) Spool every table (bounded memory) → per-table manifests + checksums.
    const spooled: SpooledTable[] = [];
    for (const desc of ARCHIVE_TABLE_DESCRIPTORS) {
      spooled.push(await spoolTable(desc, tmpDir, batchSize, runBatch));
    }
    // 2) Build manifest AFTER checksums are known (so it can be the FIRST member).
    const manifest: ArchiveManifest = {
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: opts.include,
      tables: spooled.map((s) => s.manifest),
    };
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8");
    // 3) Assemble members: manifest.json FIRST, then each table spool file.
    async function* members(): AsyncGenerator<TarMember> {
      yield {
        name: MANIFEST_MEMBER_NAME,
        size: manifestBytes.byteLength,
        body: (async function* () {
          yield manifestBytes;
        })(),
      };
      for (const s of spooled) {
        yield { name: s.manifest.member, size: s.manifest.byteSize, body: fileChunks(s.filePath) };
      }
    }
    // cleanup() is called by the consumer (02/tests) AFTER the stream drains —
    // the spool files must outlive this return because bodies read them lazily.
    return { stream: tarPack(members()), manifest, cleanup };
  } catch (err) {
    await cleanup(); // spool failed before streaming — clean now
    throw err instanceof Error ? err : new Error("backup_archive_export_failed");
  }
}

// The archive WRITER seam 03 uses directly and 04 uses via its NDJSON sink.
// SPOOL-FIRST (not write-through): `appendStream` streams `body` to a spool file in
// the run tmpDir (computing byte size + SHA-256 incrementally, memory O(1)) and
// records the member. `appendStream` asserts the streamed byte count equals the
// declared `size` (never a header/body desync).
export interface BackupArchiveWriter {
  appendStream(name: string, size: number, body: AsyncIterable<Uint8Array>): Promise<void>;
}

// The section-export hook 04 receives: the writer plus a per-table NDJSON sink
// built on `appendStream`.
export interface ExportEngine {
  writer: BackupArchiveWriter;
  appendNdjson(
    memberName: string,
    rows: AsyncIterable<Record<string, unknown>>
  ): Promise<ArchiveTableManifest>;
}

type SpooledMember = { name: string; size: number; filePath: string; sha256: string };

class SpoolWriter implements BackupArchiveWriter {
  readonly members: SpooledMember[] = [];
  constructor(private readonly tmpDir: string) {}

  // Stream `body` (known exact `size`) to a spool file; assert the streamed byte
  // count matches `size` so a header/body size mismatch can NEVER be emitted.
  async appendStream(name: string, size: number, body: AsyncIterable<Uint8Array>): Promise<void> {
    const { filePath, sha256, byteSize } = await this.spool(body);
    if (byteSize !== size) throw new Error("backup_archive_export_failed");
    this.members.push({ name, size, filePath, sha256 });
  }

  // Serialize NDJSON rows (users/roles/user_roles): the byte size is DISCOVERED
  // while spooling, so this cannot go through the size-first appendStream — it
  // spools then records the member directly and returns the per-member manifest.
  async appendNdjson(
    name: string,
    rows: AsyncIterable<Record<string, unknown>>
  ): Promise<ArchiveTableManifest> {
    let rowCount = 0;
    const lines = (async function* () {
      for await (const row of rows) {
        rowCount += 1;
        yield Buffer.from(toNdjsonLine(row), "utf8");
      }
    })();
    const { filePath, sha256, byteSize } = await this.spool(lines);
    this.members.push({ name, size: byteSize, filePath, sha256 });
    return { key: name, member: name, rowCount, byteSize, sha256 };
  }

  // Shared spool primitive (mirrors spoolTable's write loop): O(1) memory.
  private async spool(body: AsyncIterable<Uint8Array>) {
    const filePath = path.join(this.tmpDir, `section-${randomUUID()}.bin`);
    const fh = await open(filePath, "w", 0o600);
    const hash = createHash("sha256");
    let byteSize = 0;
    try {
      for await (const chunk of body) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        await fh.write(buf);
        hash.update(buf);
        byteSize += buf.byteLength;
      }
    } finally {
      await fh.close();
    }
    return { filePath, sha256: hash.digest("hex"), byteSize };
  }
}

export type PackBackupArchiveOptions = PackDatabaseArchiveOptions & {
  // Injected by 06 (which lands last and CAN import 03/04); absent ⇒ section skipped.
  mediaExporter?: (writer: BackupArchiveWriter) => Promise<ArchiveMediaManifest>;
  usersExporter?: (engine: ExportEngine) => Promise<ArchiveUsersManifest>;
};

export async function packBackupArchive(opts: PackBackupArchiveOptions): Promise<PackedArchive> {
  // Every section is INDEPENDENTLY opt-in (parent decision 5): database, settings,
  // media and users can each be selected alone. Require only a NON-EMPTY include.
  if (opts.include.length < 1) throw new Error("backup_archive_export_failed");
  const baseTmp = await resolveSpoolBase();
  const tmpDir = opts.tmpDir ?? path.join(baseTmp, `coderso-backup-${randomUUID()}`);
  const batchSize = opts.batchSize ?? EXPORT_BATCH_SIZE;
  const runBatch = opts.runBatch ?? defaultRunBatch;
  try {
    await mkdir(tmpDir, { recursive: true, mode: 0o700 });
  } catch {
    throw new Error("backup_archive_tempdir_failed");
  }
  const cleanup = async () => {
    await rm(tmpDir, { recursive: true, force: true });
  };

  try {
    // 1) Spool every DB table first — GATED on the opt-in "database" include
    //    (parent decision 5): a settings-/media-/users-only archive spools no
    //    tables, so manifest.tables = [] and import restores no DB content.
    const spooledTables: SpooledTable[] = [];
    if (opts.include.includes("database")) {
      for (const desc of ARCHIVE_TABLE_DESCRIPTORS) {
        spooledTables.push(await spoolTable(desc, tmpDir, batchSize, runBatch));
      }
    }

    // 2) Section writer/engine: collects settings/media/users members into the SAME
    //    tmpDir (spool-first ⇒ counts + checksums known before manifest is built).
    const writer = new SpoolWriter(tmpDir);
    const engine: ExportEngine = {
      writer,
      appendNdjson: (n, r) => writer.appendNdjson(n, r),
    };

    // 3) settings.json member — OWNED BY 01. Known size.
    if (opts.include.includes("settings")) {
      const bundle = await exportConfig({ target: "settings" });
      const bytes = Buffer.from(`${JSON.stringify(bundle)}\n`, "utf8");
      await writer.appendStream(
        SETTINGS_MEMBER_NAME,
        bytes.byteLength,
        (async function* () {
          yield bytes;
        })()
      );
    }
    // 4) media/* via injected 03 exporter (push through appendStream → spooled).
    let mediaBlock: ArchiveMediaManifest | undefined;
    if (opts.include.includes("media") && opts.mediaExporter) {
      mediaBlock = await opts.mediaExporter(writer);
    }
    // 5) users/roles/user_roles via injected 04 exporter (encrypted-only path).
    //    LAND-ORDER TYPING: at 01 land time BackupIncludeOption is
    //    ("database"|"media"|"settings") — "users" is added by 04 (lands AFTER 01).
    //    Compare through a WIDENED view so the module typechecks standalone.
    let usersBlock: ArchiveUsersManifest | undefined;
    if ((opts.include as readonly string[]).includes("users") && opts.usersExporter) {
      usersBlock = await opts.usersExporter(engine);
    }

    // 6) Build manifest.json AFTER all sections spooled — counts now known.
    const manifest: ArchiveManifest = {
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: opts.include,
      tables: spooledTables.map((s) => s.manifest),
      ...(mediaBlock ? { media: mediaBlock } : {}),
      ...(usersBlock ? { users: usersBlock } : {}),
    };
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8");

    // 7) Pull-based tarPack over the fixed, already-spooled member set: manifest
    //    FIRST, then table members, then spooled section members.
    async function* members(): AsyncGenerator<TarMember> {
      yield {
        name: MANIFEST_MEMBER_NAME,
        size: manifestBytes.byteLength,
        body: (async function* () {
          yield manifestBytes;
        })(),
      };
      for (const s of spooledTables) {
        yield { name: s.manifest.member, size: s.manifest.byteSize, body: fileChunks(s.filePath) };
      }
      for (const m of writer.members) {
        yield { name: m.name, size: m.size, body: fileChunks(m.filePath) };
      }
    }
    // Same lifecycle contract as packDatabaseArchive: caller drains `stream`,
    // THEN awaits `cleanup()`.
    return { stream: tarPack(members()), manifest, cleanup };
  } catch (err) {
    await cleanup();
    throw err instanceof Error ? err : new Error("backup_archive_export_failed");
  }
}
