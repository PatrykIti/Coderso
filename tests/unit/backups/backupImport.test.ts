/**
 * Backup v2 import-file pipeline tests (TASK-511-05).
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
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "bun:test";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { pages, redirects, roles, settings, userRoles, users } from "../../../core/db/schema";
import {
  ARCHIVE_ARTIFACT_VERSION,
  ARCHIVE_ENGINE_VERSION,
  ARCHIVE_SCHEMA_VERSION,
  ARCHIVE_TABLE_DESCRIPTORS,
  MANIFEST_MEMBER_NAME,
  ROLES_MEMBER_NAME,
  SETTINGS_MEMBER_NAME,
  TABLE_MEMBER_DIR,
  USER_ROLES_MEMBER_NAME,
  USERS_MEMBER_NAME,
  type ArchiveManifest,
} from "../../../core/services/backups/backupArchive";
import {
  decryptBackupArchive,
  encryptBackupArchive,
} from "../../../core/services/backups/backupCrypto";
import {
  importBackupFromUpload,
  readTarMembers,
  restoreArchiveStreamTx,
  spoolWithCeiling,
  validateManifest,
  type ImportUploadFile,
} from "../../../core/services/backups/backupImport";
import type { MediaStorageAdapter } from "../../../core/services/media/storage/adapter";
import { exportConfig } from "../../../core/services/tools/importExportService";
import { getSetting, setSetting } from "../../../core/services/settings/settingsService";
import { handlePublicRequest } from "../../../core/server/publicSite";

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

// ---------------------------------------------------------------------------
// Fixture hygiene
// ---------------------------------------------------------------------------

const PASS = "bkp-511-05-pass"; // >= 02's MIN_BACKUP_PASSPHRASE (12)

const runId = randomUUID();
const scopedSlug = (label: string) => `bkp-511-05-${runId}-${label}`;
const scopedPath = (label: string) => `/bkp-511-05-${runId}-${label}`;
const scopedEmail = (label: string) => `bkp-511-05-${runId}-${label}@example.test`;
const scopedRole = (label: string) => `bkp-511-05-${runId}-${label}`;
const scopedMediaKey = (label: string) => `t511-05/${runId}/${label}.txt`;

const contentRowIds: string[] = [];
const identityRowIds: string[] = [];
const mediaStore = new Map<string, Uint8Array>();

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

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Run `fn` inside a transaction that ALWAYS rolls back; observations made in-tx
// are captured via `capture` (never commits on the shared DB).
async function inRolledBackTx<T>(
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

type TestMember = { name: string; bytes: Buffer };

const streamFromBytes = (u8: Uint8Array, chunkSize = 1 << 16): ReadableStream<Uint8Array> => {
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

const collectBytes = async (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> => {
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
const tarHeader = (name: string, size: number): Buffer => {
  const header = Buffer.alloc(512);
  header.write(name.slice(0, 100), 0, "utf8");
  header.write(size.toString(8).padStart(11, "0"), 124, "utf8");
  header[156] = 0x30; // '0'
  let sum = 0;
  for (let i = 0; i < 512; i += 1) sum += i >= 148 && i < 156 ? 0x20 : header[i];
  header.write(sum.toString(8).padStart(6, "0"), 148, "utf8");
  return header;
};

const buildTar = (members: TestMember[]): Buffer => {
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

const ndjson = (rows: unknown[]): Buffer =>
  Buffer.from(rows.length ? `${rows.map((r) => JSON.stringify(r)).join("\n")}\n` : "", "utf8");

const countNewlines = (buf: Buffer): number => {
  let n = 0;
  for (const byte of buf) if (byte === 0x0a) n += 1;
  return n;
};

// Build a manifest covering the FULL descriptor set (PASS 1 completeness guard
// requires exact round-trip when include has "database"). `content` maps a
// table key → NDJSON bytes; tables absent from it become empty members.
const buildDatabaseManifest = (
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
const asUpload = (bytes: Buffer, label = "backup.cbk"): ImportUploadFile => ({
  name: label,
  type: "application/octet-stream",
  size: bytes.length,
  stream: () => streamFromBytes(bytes),
});

// Encrypt a member set into a REAL .cbk: tar → (02) gzip + AES-256-GCM/scrypt.
const encryptArchive = async (
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

const manifestFirst = (manifest: ArchiveManifest, extra: TestMember[] = []): TestMember[] => [
  { name: MANIFEST_MEMBER_NAME, bytes: Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8") },
  ...extra,
];

const fakeAdapter = (): {
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("validateManifest rejects unknown top-level/manifest keys and non-archives", () => {
  expect(() => validateManifest("not json")).toThrow("backup_manifest_invalid");
  expect(() => validateManifest(JSON.stringify({ nope: 1 }))).toThrow("backup_manifest_invalid");
  expect(() =>
    validateManifest(
      JSON.stringify({
        artifactVersion: ARCHIVE_ARTIFACT_VERSION,
        schemaVersion: ARCHIVE_SCHEMA_VERSION,
        engineVersion: "x",
        createdAt: new Date().toISOString(),
        include: ["database"],
        tables: [],
      })
    )
  ).toThrow("backup_manifest_invalid"); // include "database" with an empty/partial table set
});

test("import requires confirm=true and a valid passphrase before any work (fail-closed)", async () => {
  const upload = asUpload(Buffer.from("garbage"));
  await expect(
    importBackupFromUpload({ file: upload, passphrase: PASS, confirm: false })
  ).rejects.toThrow("backup_restore_confirmation_required");
  await expect(
    importBackupFromUpload({ file: upload, passphrase: "", confirm: true })
  ).rejects.toThrow("backup_passphrase_required");
  // 02's normalizeBackupPassphrase: non-string → required; too short/long → invalid.
  await expect(
    importBackupFromUpload({ file: upload, passphrase: 42, confirm: true })
  ).rejects.toThrow("backup_passphrase_required");
  await expect(
    importBackupFromUpload({ file: upload, passphrase: "short", confirm: true })
  ).rejects.toThrow("backup_passphrase_invalid");
});

test("upload size guards (header + file.size) reject before reading the stream", async () => {
  const bigUpload = asUpload(Buffer.from("x"), "big.cbk");
  Object.defineProperty(bigUpload, "size", { value: 3 * 1024 ** 3, configurable: true });
  await expect(
    importBackupFromUpload({ file: bigUpload, passphrase: PASS, confirm: true })
  ).rejects.toThrow("backup_import_too_large");
  await expect(
    importBackupFromUpload({
      file: asUpload(Buffer.from("x")),
      passphrase: PASS,
      confirm: true,
      declaredContentLength: 3 * 1024 ** 3,
    })
  ).rejects.toThrow("backup_import_too_large");
});

testIfDb(
  "media-only .cbk: full committing pipeline (decrypt→validate→tx→media) writes no DB rows",
  async () => {
    // Contract §6: the COMMITTING importBackupFromUpload may only run on archives
    // that cannot wipe/overwrite shared rows. A media-only archive touches only
    // object storage (fake adapter here) — the entire orchestration (decrypt,
    // spool, PASS 1 validate, empty tx, post-commit media) is exercised with
    // zero shared-DB writes.
    const mediaKey = scopedMediaKey("hello");
    const mediaBytes = Buffer.from("hello backup!", "utf8");
    const manifest: ArchiveManifest = {
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: ["media"],
      tables: [],
      media: { fileCount: 1, totalBytes: mediaBytes.length, skipped: [] },
    };
    const { cbk } = await encryptArchive(
      manifestFirst(manifest, [{ name: `media/${mediaKey}`, bytes: mediaBytes }]),
      PASS
    );

    const { adapter, putAtCalls } = fakeAdapter();
    const result = await importBackupFromUpload({
      file: asUpload(cbk),
      passphrase: PASS,
      confirm: true,
      mediaAdapter: async () => adapter,
    });

    expect(result.status).toBe("restored");
    expect(result.artifactVersion).toBe(ARCHIVE_ARTIFACT_VERSION);
    expect(result.tablesRestored).toBe(0);
    expect(result.rowsRestored).toBe(0);
    expect(result.usersRestored).toBe(0);
    expect(result.mediaRestored).toBe(1);
    expect(putAtCalls).toHaveLength(1);
    expect(putAtCalls[0].key).toBe(mediaKey);
    expect(mediaStore.get(mediaKey)?.toString()).toBe("hello backup!");
  }
);

testIfDb(
  "database section: delete-all + batched re-insert restores content inside the outer tx",
  async () => {
    // Contract §6: a `database`-including round-trip is driven EXCLUSIVELY through
    // the exported restoreArchiveStreamTx seam inside a deliberately rolled-back
    // transaction (never the committing importBackupFromUpload, whose step 0
    // delete-all would wipe the shared tables). Seeded author is fixture-scoped
    // and deleted in afterEach.
    const userId = randomUUID();
    const pageId = randomUUID();
    const redirectId = randomUUID();
    const slug = scopedSlug("page");
    const fromPath = scopedPath("redirect");
    const now = new Date().toISOString();

    const [seedUser] = await db
      .insert(users)
      .values({ id: userId, email: scopedEmail("author"), passwordHash: "hash", name: "Author" })
      .returning({ id: users.id });
    identityRowIds.push(seedUser.id);

    const content = new Map<string, Buffer>([
      [
        "pages",
        ndjson([
          {
            id: pageId,
            slug,
            title: "Import page",
            status: "draft",
            authorId: userId,
            currentData: { blocks: [] },
            createdAt: now,
            updatedAt: now,
          },
        ]),
      ],
      [
        "redirects",
        ndjson([
          {
            id: redirectId,
            fromPath,
            toPath: "/target",
            statusCode: 301,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          },
        ]),
      ],
    ]);
    const { manifest, members } = buildDatabaseManifest(content, ["database"]);
    const tar = buildTar(manifestFirst(manifest, members));
    const tmp = await mkdtemp(path.join(os.tmpdir(), "t511-05-db-"));
    const tarPath = path.join(tmp, "archive.tar");
    await writeFile(tarPath, tar);

    try {
      const observed = await inRolledBackTx(
        async (tx) => {
          const r = await restoreArchiveStreamTx(tx, tarPath, manifest, {
            restoreUsers: false,
            confirm: true,
          });
          expect(r.tables).toBe(ARCHIVE_TABLE_DESCRIPTORS.length); // all 22 tables replaced
          expect(r.rows).toBe(2);
        },
        async (tx) => {
          const [page] = await tx.select().from(pages).where(eq(pages.slug, slug));
          const [redir] = await tx.select().from(redirects).where(eq(redirects.fromPath, fromPath));
          return { title: page?.title ?? null, toPath: redir?.toPath ?? null };
        }
      );
      expect(observed).toEqual({ title: "Import page", toPath: "/target" });
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
);

testIfDb("wrong passphrase fails closed with backup_decrypt_failed (no DB writes)", async () => {
  const { manifest, members } = buildDatabaseManifest(new Map(), ["database"]);
  const { cbk } = await encryptArchive(manifestFirst(manifest, members), "right-pass-511-05");
  await expect(
    importBackupFromUpload({ file: asUpload(cbk), passphrase: "wrong-pass-511-05", confirm: true })
  ).rejects.toThrow("backup_decrypt_failed");
});

testIfDb("non-Coderso / unsupported-version payloads fail closed", async () => {
  // Garbage bytes → 02 magic/version failure.
  // Short non-.cbk garbage: 02 can't even decode a header → truncated/decrypt failure.
  await expect(
    importBackupFromUpload({
      file: asUpload(Buffer.from("definitely not a coderso backup")),
      passphrase: PASS,
      confirm: true,
    })
  ).rejects.toThrow("backup_decrypt_failed");

  // A validly-encrypted tar whose manifest claims a future artifact version.
  const { manifest, members } = buildDatabaseManifest(new Map(), ["database"]);
  const bumpedManifest = {
    ...manifest,
    artifactVersion: ARCHIVE_ARTIFACT_VERSION + 1,
  } as ArchiveManifest;
  const { cbk } = await encryptArchive(manifestFirst(bumpedManifest, members), PASS);
  await expect(
    importBackupFromUpload({ file: asUpload(cbk), passphrase: PASS, confirm: true })
  ).rejects.toThrow("backup_archive_unsupported");
});

testIfDb(
  "manifest/table drift is rejected before any write (backup_manifest_invalid)",
  async () => {
    // include "database" but a table member missing from the tar → PASS 1 rejects.
    const { manifest, members: tableMembers } = buildDatabaseManifest(new Map(), ["database"]);
    const { cbk } = await encryptArchive(
      manifestFirst(
        manifest,
        tableMembers.filter((m) => !m.name.endsWith("pages.ndjson"))
      ),
      PASS
    );
    await expect(
      importBackupFromUpload({ file: asUpload(cbk), passphrase: PASS, confirm: true })
    ).rejects.toThrow("backup_manifest_invalid");

    // A content member whose bytes don't match the manifest sha256 → checksum guard.
    const lyingContent = new Map<string, Buffer>([
      ["redirects", ndjson([{ id: randomUUID(), fromPath: scopedPath("cs"), toPath: "/x" }])],
    ]);
    const lying = buildDatabaseManifest(lyingContent, ["database"]);
    const { manifest: lyingManifest, members: lyingMembers } = lying;
    // Rewrite the member bytes AFTER the manifest was computed from them.
    const rewritten = lyingMembers.map((m) =>
      m.name.endsWith("redirects.ndjson") ? { name: m.name, bytes: Buffer.from("[]") } : m
    );
    const { cbk: lyingCbk } = await encryptArchive(manifestFirst(lyingManifest, rewritten), PASS);
    await expect(
      importBackupFromUpload({ file: asUpload(lyingCbk), passphrase: PASS, confirm: true })
    ).rejects.toThrow("backup_checksum_mismatch");
  }
);

testIfDb("FK violation during content restore rolls back the whole tx", async () => {
  // A pages row referencing a user that exists in NEITHER the archive NOR the
  // target DB, with restoreUsers off → coded backup_restore_fk_violation, and
  // the tx must leave the shared DB untouched (all-or-nothing).
  const pageId = randomUUID();
  const slug = scopedSlug("orphan");
  const ghostUserId = randomUUID();
  const now = new Date().toISOString();
  const content = new Map<string, Buffer>([
    [
      "pages",
      ndjson([
        {
          id: pageId,
          slug,
          title: "Orphan",
          status: "draft",
          authorId: ghostUserId,
          currentData: {},
          createdAt: now,
          updatedAt: now,
        },
      ]),
    ],
  ]);
  const { manifest, members } = buildDatabaseManifest(content, ["database"]);
  const { cbk } = await encryptArchive(manifestFirst(manifest, members), PASS);

  await expect(
    importBackupFromUpload({ file: asUpload(cbk), passphrase: PASS, confirm: true })
  ).rejects.toThrow("backup_restore_fk_violation");
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
  expect(page).toBeUndefined(); // nothing committed
});

testIfDb(
  "users pre-restore (FK-safe ordering): archived users satisfy content FKs in one tx",
  async () => {
    // Rolled-back seam: restoreArchiveStreamTx is driven with the TEST's own tx
    // handle, so the upsert + content insert + counts are observable IN-tx and
    // nothing commits to the shared identity/content tables.
    const userId = randomUUID();
    const roleId = randomUUID();
    const pageId = randomUUID();
    const slug = scopedSlug("fk-safe");
    const email = scopedEmail("fk-safe");
    const roleName = scopedRole("fk-safe");
    const now = new Date().toISOString();

    const usersMember = ndjson([
      {
        id: userId,
        email,
        emailHash: null,
        emailEncrypted: null,
        passwordHash: "hash",
        name: "FK Safe",
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      },
    ]);
    const rolesMember = ndjson([
      {
        id: roleId,
        name: roleName,
        description: null,
        permissions: ["content:read", "content:write"],
        createdAt: now,
      },
    ]);
    const userRolesMember = ndjson([{ userId, roleId }]);
    const content = new Map<string, Buffer>([
      [
        "pages",
        ndjson([
          {
            id: pageId,
            slug,
            title: "FK safe",
            status: "draft",
            authorId: userId,
            currentData: {},
            createdAt: now,
            updatedAt: now,
          },
        ]),
      ],
    ]);
    const { manifest, members } = buildDatabaseManifest(content, ["database", "users"]);
    manifest.users = { users: 1, roles: 1, userRoles: 1 };
    const tar = buildTar(
      manifestFirst(manifest, [
        ...members,
        { name: USERS_MEMBER_NAME, bytes: usersMember },
        { name: ROLES_MEMBER_NAME, bytes: rolesMember },
        { name: USER_ROLES_MEMBER_NAME, bytes: userRolesMember },
      ])
    );
    const tmp = await mkdtemp(path.join(os.tmpdir(), "t511-05-tx-"));
    const tarPath = path.join(tmp, "archive.tar");
    await writeFile(tarPath, tar);

    try {
      const observed = await inRolledBackTx(
        async (tx) => {
          await restoreArchiveStreamTx(tx, tarPath, manifest, {
            restoreUsers: true,
            confirm: true,
          });
        },
        async (tx) => {
          const [page] = await tx.select().from(pages).where(eq(pages.slug, slug));
          const [user] = await tx.select().from(users).where(eq(users.email, email));
          const [role] = await tx.select().from(roles).where(eq(roles.name, roleName));
          const [ur] = await tx.select().from(userRoles).where(eq(userRoles.userId, userId));
          return {
            page: page?.title ?? null,
            email: user?.email ?? null,
            role: role?.name ?? null,
            ur,
          };
        }
      );
      expect(observed).toEqual({ page: "FK safe", email, role: roleName, ur: expect.anything() });
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
);

testIfDb(
  "settings section restores inside the outer tx (rolled-back seam, no commit)",
  async () => {
    const bundle = await exportConfig({ target: "settings" });
    const manifest: ArchiveManifest = {
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: ["settings"],
      tables: [],
    };
    const tar = buildTar(
      manifestFirst(manifest, [
        { name: SETTINGS_MEMBER_NAME, bytes: Buffer.from(`${JSON.stringify(bundle)}\n`, "utf8") },
      ])
    );
    const tmp = await mkdtemp(path.join(os.tmpdir(), "t511-05-s-"));
    const tarPath = path.join(tmp, "archive.tar");
    await writeFile(tarPath, tar);
    try {
      const observed = await inRolledBackTx(
        async (tx) => {
          const r = await restoreArchiveStreamTx(tx, tarPath, manifest, {
            restoreUsers: false,
            confirm: true,
          });
          expect(r.tables).toBe(0);
          expect(r.rows).toBe(0);
        },
        async (tx) => {
          // importConfigTx → setSettingsTx ran in-tx: a key from the bundle is
          // readable (and restoreable) inside the tx, then rolled back.
          const [row] = await tx.select().from(settings).where(eq(settings.key, "site.name"));
          return row?.value;
        }
      );
      expect(observed).not.toBeUndefined();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
);

testIfDb("users present but opt-out: members drained, no upsert, count 0", async () => {
  const manifest: ArchiveManifest = {
    artifactVersion: ARCHIVE_ARTIFACT_VERSION,
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
    engineVersion: ARCHIVE_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    include: ["users"],
    tables: [],
    users: { users: 1, roles: 0, userRoles: 0 },
  };
  const userBytes = ndjson([
    {
      id: randomUUID(),
      email: scopedEmail("opt-out"),
      emailHash: null,
      emailEncrypted: null,
      passwordHash: "hash",
      name: "Opt Out",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
    },
  ]);
  const { cbk } = await encryptArchive(
    manifestFirst(manifest, [{ name: USERS_MEMBER_NAME, bytes: userBytes }]),
    PASS
  );
  const result = await importBackupFromUpload({
    file: asUpload(cbk),
    passphrase: PASS,
    confirm: true,
    restoreUsers: false,
  });
  expect(result.usersRestored).toBe(0);
  expect(result.tablesRestored).toBe(0);
  expect(result.rowsRestored).toBe(0);
});

test("spoolWithCeiling aborts past the decompressed-byte ceiling (compression bomb)", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "t511-05-bomb-"));
  const target = path.join(tmp, "bomb.bin");
  try {
    const payload = new Uint8Array(2048).fill(0x61);
    const stream = new ReadableStream<Uint8Array>({
      pull(ctrl) {
        ctrl.enqueue(payload);
        ctrl.close();
      },
    });
    await expect(spoolWithCeiling(stream, target, 1024)).rejects.toThrow("backup_import_too_large");
    // The ceiling check fires BEFORE the overflowing chunk is flushed, so the
    // spool never grows past the bound (caller removes the dir in `finally`).
    const stat = await import("node:fs/promises").then((m) => m.stat(target).catch(() => null));
    expect(stat?.size).toBe(0);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("readTarMembers rejects a bad header checksum and truncated bodies", async () => {
  const tar = buildTar([{ name: "ok.bin", bytes: Buffer.from("hi") }]);
  // Corrupt the checksum field of the first header.
  const corrupt = Buffer.from(tar);
  corrupt[150] ^= 0xff;
  const reader = readTarMembers(
    (async function* () {
      yield corrupt;
    })()
  );
  const drain = async () => {
    for await (const _ of reader.entries()) {
      /* drain */
    }
  };
  await expect(drain()).rejects.toThrow("backup_manifest_invalid");
});

// ---------------------------------------------------------------------------
// Maintenance-mode gate (05 §2, route-gate + public 503 middleware)
// ---------------------------------------------------------------------------

const ORIGINAL_MAINTENANCE = await getSetting("site.maintenanceMode");

afterEach(async () => {
  // Always restore the shared singleton flag afterEach, whatever a test set.
  if ((await getSetting("site.maintenanceMode")) !== ORIGINAL_MAINTENANCE) {
    await setSetting("site.maintenanceMode", ORIGINAL_MAINTENANCE);
  }
});

testIfDb(
  "site.maintenanceMode round-trips through settings and gates the public surface (503)",
  async () => {
    await setSetting("site.maintenanceMode", true);
    expect(await getSetting("site.maintenanceMode")).toBe(true);

    const res = await handlePublicRequest(new Request("http://localhost/"));
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("temporarily unavailable");

    // The public API dispatcher hosted by handlePublicRequest is behind the SAME
    // guard: an unknown route still yields 503, not 404, while maintenance is on.
    const api = await handlePublicRequest(new Request("http://localhost/api/whatever"));
    expect(api.status).toBe(503);
  }
);

testIfDb("site.maintenanceMode defaults OFF and restores after the 503 test", async () => {
  // The default (no row / no stored override) is false — the import gate and the
  // public surface must never start out blocked. The route-level 409 gate itself
  // is covered in tests/integration/routes/backups.test.ts.
  expect(ORIGINAL_MAINTENANCE).toBe(false);
  expect(await getSetting("site.maintenanceMode")).toBe(false);
  const res = await handlePublicRequest(new Request("http://localhost/"));
  expect(res.status).not.toBe(503);
});
