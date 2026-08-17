/**
 * Backup v2 import-file pipeline tests (TASK-511-05, extended by TASK-561/562).
 *
 * Fixture hygiene + archive builders live in `./backupImportFixtures` (shared
 * with the TASK-563 media-failure suite); this file owns the import-pipeline
 * behavior tests: fail-closed gates, PASS 1/2 validation, TASK-562 exact-set
 * negatives, the TASK-561 native-CMS-writer-fence race, and the maintenance
 * gate.
 */
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import postgres from "postgres";

import { db } from "../../../core/db/client";
import {
  NATIVE_CMS_WRITER_FENCE_KEY,
  resolveFenceNamespace,
} from "../../../core/db/nativeCmsWriterFence";
import { pages, redirects, roles, settings, userRoles, users } from "../../../core/db/schema";
import {
  ARCHIVE_ARTIFACT_VERSION,
  ARCHIVE_ENGINE_VERSION,
  ARCHIVE_SCHEMA_VERSION,
  ARCHIVE_TABLE_DESCRIPTORS,
  ROLES_MEMBER_NAME,
  SETTINGS_MEMBER_NAME,
  USER_ROLES_MEMBER_NAME,
  USERS_MEMBER_NAME,
  type ArchiveManifest,
} from "../../../core/services/backups/backupArchive";
import {
  importBackupFromUpload,
  readTarMembers,
  restoreArchiveStreamTx,
  spoolWithCeiling,
  validateManifest,
} from "../../../core/services/backups/backupImport";
import { exportConfig } from "../../../core/services/tools/importExportService";
import { getSetting, setSetting } from "../../../core/services/settings/settingsService";
import { handlePublicRequest } from "../../../core/server/publicSite";
import {
  asUpload,
  buildDatabaseManifest,
  buildTar,
  encryptArchive,
  fakeAdapter,
  identityRowIds,
  inRolledBackTx,
  manifestFirst,
  mediaStore,
  ndjson,
  PASS,
  scopedEmail,
  scopedMediaKey,
  scopedPath,
  scopedRole,
  scopedSlug,
  testIfDb,
  type TestMember,
} from "./backupImportFixtures";

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
    manifestFirst(manifest, [
      { name: USERS_MEMBER_NAME, bytes: userBytes },
      // TASK-562 exact-set: a declared users section must carry ALL THREE NDJSON
      // members (also for empty sections) — the opt-out archive is only valid
      // with empty roles.ndjson + user_roles.ndjson present.
      { name: ROLES_MEMBER_NAME, bytes: ndjson([]) },
      { name: USER_ROLES_MEMBER_NAME, bytes: ndjson([]) },
    ]),
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

// --- TASK-562 exact-set validation (H-511-01 / NEW-511-01a / NEW-511-01b) ---

test("validateManifest rejects malformed users/media blocks (exact shape + reject-unknown)", () => {
  const manifest = (patch: Record<string, unknown>): string => {
    const json: Record<string, unknown> = {
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: ["users", "media"],
      tables: [],
      users: { users: 1, roles: 1, userRoles: 1 },
      media: { fileCount: 1, totalBytes: 1, skipped: [] },
    };
    return JSON.stringify({ ...json, ...patch });
  };
  // Wrong-type / non-object blocks.
  expect(() => validateManifest(manifest({ users: "nope" }))).toThrow("backup_manifest_invalid");
  expect(() => validateManifest(manifest({ users: [] }))).toThrow("backup_manifest_invalid");
  expect(() => validateManifest(manifest({ media: [] }))).toThrow("backup_manifest_invalid");
  // Reject-unknown inside the blocks.
  expect(() =>
    validateManifest(manifest({ users: { users: 1, roles: 1, userRoles: 1, extra: 1 } }))
  ).toThrow("backup_manifest_invalid");
  expect(() =>
    validateManifest(manifest({ media: { fileCount: 1, totalBytes: 1, skipped: [], extra: 1 } }))
  ).toThrow("backup_manifest_invalid");
  // Counts must be non-negative integers.
  expect(() =>
    validateManifest(manifest({ users: { users: "1", roles: 1, userRoles: 1 } }))
  ).toThrow("backup_manifest_invalid");
  expect(() =>
    validateManifest(manifest({ users: { users: -1, roles: 1, userRoles: 1 } }))
  ).toThrow("backup_manifest_invalid");
  expect(() =>
    validateManifest(manifest({ users: { users: 1.5, roles: 1, userRoles: 1 } }))
  ).toThrow("backup_manifest_invalid");
  expect(() =>
    validateManifest(manifest({ media: { fileCount: 1, totalBytes: "1", skipped: [] } }))
  ).toThrow("backup_manifest_invalid");
  // skipped entries must be {key: string, reason: "missing"}.
  expect(() =>
    validateManifest(manifest({ media: { fileCount: 1, totalBytes: 1, skipped: "x" } }))
  ).toThrow("backup_manifest_invalid");
  expect(() =>
    validateManifest(
      manifest({ media: { fileCount: 1, totalBytes: 1, skipped: [{ key: "a", reason: "other" }] } })
    )
  ).toThrow("backup_manifest_invalid");
  expect(() =>
    validateManifest(
      manifest({ media: { fileCount: 1, totalBytes: 1, skipped: [{ key: 1, reason: "missing" }] } })
    )
  ).toThrow("backup_manifest_invalid");
  // Exact-set symmetry: a block must be present when declared, absent otherwise.
  expect(() =>
    validateManifest(JSON.stringify({ ...JSON.parse(manifest({})), users: undefined }))
  ).toThrow("backup_manifest_invalid");
  expect(() =>
    validateManifest(JSON.stringify({ ...JSON.parse(manifest({})), media: undefined }))
  ).toThrow("backup_manifest_invalid");
  expect(() =>
    validateManifest(
      JSON.stringify({
        ...JSON.parse(manifest({})),
        include: ["media"],
        users: { users: 1, roles: 1, userRoles: 1 },
      })
    )
  ).toThrow("backup_manifest_invalid");
  expect(() =>
    validateManifest(
      JSON.stringify({
        ...JSON.parse(manifest({})),
        include: ["users"],
        media: { fileCount: 1, totalBytes: 1, skipped: [] },
      })
    )
  ).toThrow("backup_manifest_invalid");
});

testIfDb(
  "TASK-562 exact-set: missing users members, count drift, undeclared/duplicate/unknown members fail closed",
  async () => {
    const now = new Date().toISOString();
    const usersMember = ndjson([
      {
        id: randomUUID(),
        email: scopedEmail("exact"),
        emailHash: null,
        emailEncrypted: null,
        passwordHash: "hash",
        name: "Exact Set",
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      },
    ]);
    const emptyRoles = ndjson([]);
    const emptyUserRoles = ndjson([]);
    const usersManifest = (counts: {
      users: number;
      roles: number;
      userRoles: number;
    }): ArchiveManifest => ({
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: ["users"],
      tables: [],
      users: counts,
    });
    const importRejects = async (members: TestMember[], manifest: ArchiveManifest) => {
      const { cbk } = await encryptArchive(manifestFirst(manifest, members), PASS);
      await expect(
        importBackupFromUpload({ file: asUpload(cbk), passphrase: PASS, confirm: true })
      ).rejects.toThrow("backup_manifest_invalid");
    };

    // Missing each of the three users members (also for an empty section).
    await importRejects(
      [{ name: USERS_MEMBER_NAME, bytes: usersMember }],
      usersManifest({ users: 1, roles: 0, userRoles: 0 })
    );
    await importRejects(
      [
        { name: USERS_MEMBER_NAME, bytes: usersMember },
        { name: ROLES_MEMBER_NAME, bytes: emptyRoles },
      ],
      usersManifest({ users: 1, roles: 0, userRoles: 0 })
    );
    await importRejects(
      [
        { name: USERS_MEMBER_NAME, bytes: usersMember },
        { name: USER_ROLES_MEMBER_NAME, bytes: emptyUserRoles },
      ],
      usersManifest({ users: 1, roles: 0, userRoles: 0 })
    );
    // Count drift: manifest says 2 users, archive carries 1.
    await importRejects(
      [
        { name: USERS_MEMBER_NAME, bytes: usersMember },
        { name: ROLES_MEMBER_NAME, bytes: emptyRoles },
        { name: USER_ROLES_MEMBER_NAME, bytes: emptyUserRoles },
      ],
      usersManifest({ users: 2, roles: 0, userRoles: 0 })
    );
    // Undeclared section members: users members without include.users.
    await importRejects(
      [
        { name: USERS_MEMBER_NAME, bytes: usersMember },
        { name: ROLES_MEMBER_NAME, bytes: emptyRoles },
        { name: USER_ROLES_MEMBER_NAME, bytes: emptyUserRoles },
      ],
      { ...usersManifest({ users: 1, roles: 0, userRoles: 0 }), include: ["settings"] }
    );
    // Unknown member is never silently drained.
    await importRejects([{ name: "random.txt", bytes: Buffer.from("x") }], {
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: ["settings"],
      tables: [],
    });
    // Duplicate section member (settings.json twice → PASS 2 would apply twice).
    await importRejects(
      [
        { name: SETTINGS_MEMBER_NAME, bytes: Buffer.from("{}") },
        { name: SETTINGS_MEMBER_NAME, bytes: Buffer.from("{}") },
      ],
      {
        artifactVersion: ARCHIVE_ARTIFACT_VERSION,
        schemaVersion: ARCHIVE_SCHEMA_VERSION,
        engineVersion: ARCHIVE_ENGINE_VERSION,
        createdAt: new Date().toISOString(),
        include: ["settings"],
        tables: [],
      }
    );
    // Duplicate users member.
    await importRejects(
      [
        { name: USERS_MEMBER_NAME, bytes: usersMember },
        { name: USERS_MEMBER_NAME, bytes: usersMember },
        { name: ROLES_MEMBER_NAME, bytes: emptyRoles },
        { name: USER_ROLES_MEMBER_NAME, bytes: emptyUserRoles },
      ],
      usersManifest({ users: 2, roles: 0, userRoles: 0 })
    );
  }
);

testIfDb(
  "TASK-562 exact-set: media count/bytes must match the tar, empty media with members is invalid",
  async () => {
    const mediaKey = scopedMediaKey("exact");
    const mediaBytes = Buffer.from("exact-set-media", "utf8");
    const mediaManifest = (fileCount: number, totalBytes: number): ArchiveManifest => ({
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: ["media"],
      tables: [],
      media: { fileCount, totalBytes, skipped: [] },
    });
    const importRejects = async (members: TestMember[], manifest: ArchiveManifest) => {
      const { cbk } = await encryptArchive(manifestFirst(manifest, members), PASS);
      await expect(
        importBackupFromUpload({ file: asUpload(cbk), passphrase: PASS, confirm: true })
      ).rejects.toThrow("backup_manifest_invalid");
    };

    // include.media with zero members (fileCount claims 1).
    await importRejects([], mediaManifest(1, mediaBytes.length));
    // Count mismatch: two members claimed, one present.
    await importRejects(
      [{ name: `media/${mediaKey}`, bytes: mediaBytes }],
      mediaManifest(2, mediaBytes.length)
    );
    // Byte mismatch: declared totalBytes differs from the real member size.
    await importRejects(
      [{ name: `media/${mediaKey}`, bytes: mediaBytes }],
      mediaManifest(1, mediaBytes.length + 1)
    );
    // Media members without include.media.
    await importRejects([{ name: `media/${mediaKey}`, bytes: mediaBytes }], {
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: ["settings"],
      tables: [],
    });
    // A member declared skipped cannot also be present.
    await importRejects([{ name: `media/${mediaKey}`, bytes: mediaBytes }], {
      ...mediaManifest(1, mediaBytes.length),
      media: {
        fileCount: 1,
        totalBytes: mediaBytes.length,
        skipped: [{ key: mediaKey, reason: "missing" }],
      },
    });
    // Empty media section with include.media and a zero-count manifest is VALID.
    const { cbk } = await encryptArchive(manifestFirst(mediaManifest(0, 0), []), PASS);
    const result = await importBackupFromUpload({
      file: asUpload(cbk),
      passphrase: PASS,
      confirm: true,
    });
    expect(result.mediaRestored).toBe(0);
  }
);

testIfDb(
  "native CMS writer fence: an active exclusive holder makes the import return busy with zero protected writes",
  async () => {
    // TASK-561 regression (H-547-01 / H-511-02): a destructive backup restore
    // must never interleave with an active full-site holder (TASK-547). The
    // holder takes the EXCLUSIVE advisory xact lock on a SEPARATE direct postgres
    // session (mirrors legacyInstallRunLocks); the import then attempts the
    // try-shared fence FIRST in its tx and must fail `busy` with ZERO writes.
    // A users+media archive is used so that an unblocked import WOULD upsert a
    // user and put media objects — both asserted absent afterwards. The holder
    // rolls back (release marker) to free the lock.
    const userId = randomUUID();
    const roleId = randomUUID();
    const email = scopedEmail("fence-busy");
    const roleName = scopedRole("fence-busy");
    const mediaKey = scopedMediaKey("fence-busy");
    const now = new Date().toISOString();
    const usersMember = ndjson([
      {
        id: userId,
        email,
        emailHash: null,
        emailEncrypted: null,
        passwordHash: "hash",
        name: "Fence Busy",
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      },
    ]);
    const rolesMember = ndjson([
      { id: roleId, name: roleName, description: null, permissions: [], createdAt: now },
    ]);
    const userRolesMember = ndjson([{ userId, roleId }]);
    const mediaBytes = Buffer.from("fence-busy-media", "utf8");
    const manifest: ArchiveManifest = {
      artifactVersion: ARCHIVE_ARTIFACT_VERSION,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      engineVersion: ARCHIVE_ENGINE_VERSION,
      createdAt: new Date().toISOString(),
      include: ["users", "media"],
      tables: [],
      media: { fileCount: 1, totalBytes: mediaBytes.length, skipped: [] },
      users: { users: 1, roles: 1, userRoles: 1 },
    };
    const { cbk } = await encryptArchive(
      manifestFirst(manifest, [
        { name: USERS_MEMBER_NAME, bytes: usersMember },
        { name: ROLES_MEMBER_NAME, bytes: rolesMember },
        { name: USER_ROLES_MEMBER_NAME, bytes: userRolesMember },
        { name: `media/${mediaKey}`, bytes: mediaBytes },
      ]),
      PASS
    );

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("db_test_unavailable");
    const holder = postgres(databaseUrl, { max: 1 }); // separate DIRECT session
    const { adapter, putAtCalls } = fakeAdapter();
    try {
      await expect(
        holder.begin(async (tx) => {
          await tx`select pg_advisory_xact_lock(${resolveFenceNamespace()}, ${NATIVE_CMS_WRITER_FENCE_KEY})`;
          await expect(
            importBackupFromUpload({
              file: asUpload(cbk),
              passphrase: PASS,
              confirm: true,
              restoreUsers: true,
              mediaAdapter: async () => adapter,
            })
          ).rejects.toThrow("native_cms_writer_fence_busy");
          throw new Error("rollback_marker"); // release the transaction advisory lock
        })
      ).rejects.toThrow("rollback_marker");
    } finally {
      await holder.end();
    }

    // Zero protected writes from the import path: no user/role upsert, no puts.
    const [user] = await db.select().from(users).where(eq(users.email, email));
    expect(user).toBeUndefined();
    const [role] = await db.select().from(roles).where(eq(roles.name, roleName));
    expect(role).toBeUndefined();
    expect(putAtCalls).toHaveLength(0);
    expect(mediaStore.has(mediaKey)).toBe(false);
  },
  60_000
);

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
