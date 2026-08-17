/**
 * Shared fixtures + hygiene for the Backup v2 import-file test suites
 * (TASK-511-05, extended by TASK-561/562/563).
 *
 * Bun lane: real 02 crypto (AES-256-GCM/scrypt + gzip), real tar spooling,
 * real DB writes, tx rollback seams. Shared-DB safety: fixture-scoped slugs,
 * emails and role names (bkp-511-05-*), delete ONLY created rows in afterEach,
 * and every destructive assertion runs inside a deliberately rolled-back
 * transaction. Settings restore never COMMITS singleton settings keys (484's
 * rolled-back-tx seam, matching backupService.test.ts).
 *
 * Fixtures are built with a TEST-SIDE tar writer (independent of 01's tarPack
 * implementation), then pushed through 02's REAL encryptBackupArchive so the
 * whole .cbk decrypt/validate/restore pipeline is exercised end to end.
 *
 * The bun:test hooks registered here (beforeAll admin seed, afterAll admin
 * cleanup, afterEach fixture cleanup) run once per importing test file because
 * Bun isolates each test file's module graph.
 */
import { createHash, randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { pages, redirects, roles, userRoles, users } from "../../../core/db/schema";
import {
  ARCHIVE_ARTIFACT_VERSION,
  ARCHIVE_ENGINE_VERSION,
  ARCHIVE_SCHEMA_VERSION,
  ARCHIVE_TABLE_DESCRIPTORS,
  MANIFEST_MEMBER_NAME,
  ROLES_MEMBER_NAME,
  TABLE_MEMBER_DIR,
  USER_ROLES_MEMBER_NAME,
  USERS_MEMBER_NAME,
  type ArchiveManifest,
} from "../../../core/services/backups/backupArchive";
import { encryptBackupArchive } from "../../../core/services/backups/backupCrypto";
import type { ImportUploadFile } from "../../../core/services/backups/backupImport";
import type { MediaStorageAdapter } from "../../../core/services/media/storage/adapter";

export const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
export const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Fixture hygiene
// ---------------------------------------------------------------------------

export const PASS = "bkp-511-05-pass"; // >= 02's MIN_BACKUP_PASSPHRASE (12)

const runId = randomUUID();
export const scopedSlug = (label: string) => `bkp-511-05-${runId}-${label}`;
export const scopedPath = (label: string) => `/bkp-511-05-${runId}-${label}`;
export const scopedEmail = (label: string) => `bkp-511-05-${runId}-${label}@example.test`;
export const scopedRole = (label: string) => `bkp-511-05-${runId}-${label}`;
export const scopedMediaKey = (label: string) => `t511-05/${runId}/${label}.txt`;

export const contentRowIds: string[] = [];
export const identityRowIds: string[] = [];
export const mediaStore = new Map<string, Uint8Array>();

// Ambient admin (TASK-511-05): restoreArchiveStreamTx enforces the
// admin-lockout guard against the ACTIVE schema. Public dev schemas have an
// admin from real installs; lane worker schemas are fresh, so seed one scoped
// full-access holder in beforeAll (removed in afterAll, never touched by
// afterEach's fixture cleanup).
const ADMIN_EMAIL = `bkp-511-05-admin-${runId}@example.test`;
const ADMIN_ROLE = `bkp-511-05-admin-${runId}`;
const adminUserIds: string[] = [];
const adminRoleIdsScoped: string[] = [];

beforeAll(async () => {
  const [role] = await db
    .insert(roles)
    .values({ name: ADMIN_ROLE, permissions: ["*"] })
    .returning({ id: roles.id });
  const [user] = await db
    .insert(users)
    .values({ email: ADMIN_EMAIL, passwordHash: "hash-admin", name: "Ambient Admin" })
    .returning({ id: users.id });
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  adminUserIds.push(user.id);
  adminRoleIdsScoped.push(role.id);
});

afterAll(async () => {
  if (adminUserIds.length) {
    await db.delete(userRoles).where(inArray(userRoles.userId, adminUserIds));
    await db.delete(users).where(inArray(users.id, adminUserIds));
  }
  if (adminRoleIdsScoped.length) {
    await db.delete(roles).where(inArray(roles.id, adminRoleIdsScoped));
  }
  adminUserIds.length = 0;
  adminRoleIdsScoped.length = 0;
});

afterEach(async () => {
  if (contentRowIds.length) {
    await db.delete(pages).where(inArray(pages.id, contentRowIds));
    await db.delete(redirects).where(inArray(redirects.id, contentRowIds));
  }
  if (identityRowIds.length) {
    await db.delete(users).where(inArray(users.id, identityRowIds)); // cascades user_roles
  }
  contentRowIds.length = 0;
  identityRowIds.length = 0;
  mediaStore.clear();
});

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Run `fn` inside a transaction that ALWAYS rolls back; observations made in-tx
// are captured via `capture` (never commits on the shared DB).
export async function inRolledBackTx<T>(
  fn: (tx: DbTx) => Promise<void>,
  capture?: (tx: DbTx) => Promise<T>
): Promise<T | undefined> {
  let observed: T | undefined;
  await expect(
    db.transaction(async (tx) => {
      await fn(tx);
      if (capture) observed = await capture(tx);
      throw new Error("rollback_marker");
    })
  ).rejects.toThrow("rollback_marker");
  return observed;
}

// ---------------------------------------------------------------------------
// Archive builders (test-side, independent of 01's tarPack)
// ---------------------------------------------------------------------------

export type TestMember = { name: string; bytes: Buffer };

export const streamFromBytes = (
  u8: Uint8Array,
  chunkSize = 1 << 16
): ReadableStream<Uint8Array> => {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(ctrl) {
      if (offset >= u8.length) {
        ctrl.close();
        return;
      }
      const end = Math.min(offset + chunkSize, u8.length);
      ctrl.enqueue(u8.subarray(offset, end));
      offset = end;
    },
  });
};

export const collectBytes = async (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> => {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const all = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return all;
};

// ustar header mirroring 01's writer layout (name@0, size@124, chksum@148 as
// 8 spaces during the sum, typeflag '0'@156) + 512-padded body.
export const tarHeader = (name: string, size: number): Buffer => {
  const header = Buffer.alloc(512);
  header.write(name.slice(0, 100), 0, "utf8");
  header.write(size.toString(8).padStart(11, "0"), 124, "utf8");
  header[156] = 0x30; // '0'
  let sum = 0;
  for (let i = 0; i < 512; i += 1) sum += i >= 148 && i < 156 ? 0x20 : header[i];
  header.write(sum.toString(8).padStart(6, "0"), 148, "utf8");
  return header;
};

export const buildTar = (members: TestMember[]): Buffer => {
  const chunks: Buffer[] = [];
  for (const member of members) {
    chunks.push(tarHeader(member.name, member.bytes.length));
    chunks.push(member.bytes);
    const pad = (512 - (member.bytes.length % 512)) % 512;
    if (pad > 0) chunks.push(Buffer.alloc(pad));
  }
  chunks.push(Buffer.alloc(1024)); // two zero blocks = EOF
  return Buffer.concat(chunks);
};

export const ndjson = (rows: unknown[]): Buffer =>
  Buffer.from(rows.length ? `${rows.map((r) => JSON.stringify(r)).join("\n")}\n` : "", "utf8");

export const countNewlines = (buf: Buffer): number => {
  let n = 0;
  for (const byte of buf) if (byte === 0x0a) n += 1;
  return n;
};

// Build a manifest covering the FULL descriptor set (PASS 1 completeness guard
// requires exact round-trip when include has "database"). `content` maps a
// table key → NDJSON bytes; tables absent from it become empty members.
export const buildDatabaseManifest = (
  content: Map<string, Buffer>,
  include: string[]
): { manifest: ArchiveManifest; members: TestMember[] } => {
  const members: TestMember[] = [];
  const tables = ARCHIVE_TABLE_DESCRIPTORS.map((desc) => {
    const bytes = content.get(desc.key) ?? Buffer.alloc(0);
    members.push({ name: `${TABLE_MEMBER_DIR}/${desc.key}.ndjson`, bytes });
    return {
      key: desc.key,
      member: `${TABLE_MEMBER_DIR}/${desc.key}.ndjson`,
      rowCount: countNewlines(bytes),
      byteSize: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  });
  const manifest: ArchiveManifest = {
    artifactVersion: ARCHIVE_ARTIFACT_VERSION,
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
    engineVersion: ARCHIVE_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    include: include as ArchiveManifest["include"],
    tables,
  };
  return { manifest, members };
};

// Wrap a .cbk Buffer as a multipart Web File (the streaming shape the route
// guards with isImportUploadFile).
export const asUpload = (bytes: Buffer, label = "backup.cbk"): ImportUploadFile => ({
  name: label,
  type: "application/octet-stream",
  size: bytes.length,
  stream: () => streamFromBytes(bytes),
});

// Encrypt a member set into a REAL .cbk: tar → (02) gzip + AES-256-GCM/scrypt.
export const encryptArchive = async (
  members: TestMember[],
  passphrase: string
): Promise<{ cbk: Buffer; tar: Buffer; manifest: ArchiveManifest }> => {
  const tar = buildTar(members);
  const cipher = await collectBytes(encryptBackupArchive(streamFromBytes(tar), passphrase));
  return {
    cbk: Buffer.from(cipher),
    tar,
    manifest: JSON.parse(members[0].bytes.toString()) as ArchiveManifest,
  };
};

export const manifestFirst = (
  manifest: ArchiveManifest,
  extra: TestMember[] = []
): TestMember[] => [
  { name: MANIFEST_MEMBER_NAME, bytes: Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8") },
  ...extra,
];

export const fakeAdapter = (): {
  adapter: MediaStorageAdapter;
  putAtCalls: Array<{ key: string; size: number; contentType: string }>;
} => {
  const putAtCalls: Array<{ key: string; size: number; contentType: string }> = [];
  const adapter: MediaStorageAdapter = {
    put: async () => {
      throw new Error("unused");
    },
    putMedia: async () => {
      throw new Error("unused");
    },
    get: async (key) => {
      const bytes = mediaStore.get(key);
      if (!bytes) throw Object.assign(new Error(`missing ${key}`), { code: "ENOENT" });
      return Buffer.from(bytes) as unknown as NodeJS.ReadableStream;
    },
    delete: async (key) => {
      mediaStore.delete(key);
    },
    getPublicUrl: (key) => `mem/${key}`,
    putAt: async (key, body, size, contentType) => {
      putAtCalls.push({ key, size, contentType });
      const chunks: Uint8Array[] = [];
      for await (const chunk of body) chunks.push(Buffer.from(chunk));
      mediaStore.set(key, Buffer.concat(chunks));
    },
  };
  return { adapter, putAtCalls };
};
