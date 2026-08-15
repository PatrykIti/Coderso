import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, test } from "bun:test";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  backups,
  contentEntries,
  contentRevisions,
  contentTypes,
  customScreens,
  detailPageDocuments,
  redirects,
} from "../../../core/db/schema";
import {
  createBackup,
  deleteBackup,
  getBackupById,
  markBackupComplete,
  parseBackupArtifact,
  restoreArtifactTx,
  restoreBackup,
} from "../../../core/services/backups/backupService";
import { exportConfig } from "../../../core/services/tools/importExportService";
import type { BackupArtifact } from "../../../core/services/backups/backupTypes";

// 02's MIN_BACKUP_PASSPHRASE floor: every v2 `.cbk` create must carry a
// passphrase >= 12 chars (mandatory encryption).
const TEST_PASSPHRASE = "test-backup-passphrase-511";

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

const createdIds: string[] = [];

afterEach(async () => {
  if (!hasDb || createdIds.length === 0) return;
  for (const id of [...createdIds]) {
    await deleteBackup(id).catch(async () => {
      await db.delete(backups).where(inArray(backups.id, [id]));
    });
  }
  createdIds.length = 0;
});

// --- Restore implementation (TASK-484-04-L01). ---

const artifactFilePath = (id: string) =>
  path.resolve(
    process.cwd(),
    process.env.BACKUP_DIR ?? "storage/backups",
    `coderso-backup-${id}.json`
  );

// Minimal VALID v1 `.json` artifact shape (the fixture base used by the legacy
// in-place restore tests). v2 createBackup produces encrypted `.cbk` files that
// cannot be restored by id, so v1 restore coverage drives the legacy path
// through hand-written fixtures instead.
const buildV1Artifact = (overrides: Partial<BackupArtifact> = {}): BackupArtifact => ({
  version: 1,
  id: "fixture",
  createdAt: new Date().toISOString(),
  include: ["database"],
  storageDriver: "local",
  database: {
    pages: [],
    contentTypes: [],
    contentEntries: [],
    posts: [],
    media: [],
    menus: [],
    menuItems: [],
    themeProfiles: [],
    themeRoutes: [],
    redirects: [],
    pageRevisions: [],
    detailPageDocuments: [],
    detailPageRevisions: [],
    customScreens: [],
    customScreenEntryPresentationOverrides: [],
    contentRevisions: [],
    contentTaxonomies: [],
    contentTerms: [],
    contentTermAssignments: [],
    postRevisions: [],
    postPreviewTokens: [],
    postTermAssignments: [],
  },
  settings: null,
  media: null,
  ...overrides,
});

// Write a v1 artifact to disk and point a fresh complete row at it (the legacy
// in-place restore seam). Tracked in createdIds for per-id cleanup.
const seedV1ArtifactRow = async (artifact: BackupArtifact): Promise<string> => {
  const [row] = await db
    .insert(backups)
    .values({ status: "running", kind: "manual", storageDriver: "local" })
    .returning();
  if (!row) throw new Error("backup_create_failed");
  createdIds.push(row.id);
  const filePath = artifactFilePath(row.id);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(artifact), "utf8");
  await markBackupComplete(row.id, filePath, null, Buffer.byteLength(JSON.stringify(artifact)));
  return row.id;
};

test("parseBackupArtifact strict-parses and fails closed on malformed input", () => {
  const valid: BackupArtifact = {
    version: 1,
    id: "b",
    createdAt: new Date().toISOString(),
    include: ["database"],
    storageDriver: "local",
    database: {
      pages: [],
      contentTypes: [],
      contentEntries: [],
      posts: [],
      media: [],
      menus: [],
      menuItems: [],
      themeProfiles: [],
      themeRoutes: [],
      redirects: [],
      pageRevisions: [],
      detailPageDocuments: [],
      detailPageRevisions: [],
      customScreens: [],
      customScreenEntryPresentationOverrides: [],
      contentRevisions: [],
      contentTaxonomies: [],
      contentTerms: [],
      contentTermAssignments: [],
      postRevisions: [],
      postPreviewTokens: [],
      postTermAssignments: [],
    },
    settings: null,
    media: null,
  };
  expect(parseBackupArtifact(JSON.stringify(valid)).version).toBe(1);

  // not JSON
  expect(() => parseBackupArtifact("not json")).toThrow("backup_restore_invalid_artifact");
  // wrong version
  expect(() => parseBackupArtifact(JSON.stringify({ ...valid, version: 2 }))).toThrow(
    "backup_restore_invalid_artifact"
  );
  // unknown top-level key
  expect(() => parseBackupArtifact(JSON.stringify({ ...valid, rogue: true }))).toThrow(
    "backup_restore_invalid_artifact"
  );
  // snapshot table is not an array
  expect(() =>
    parseBackupArtifact(
      JSON.stringify({ ...valid, database: { ...valid.database, redirects: {} } })
    )
  ).toThrow("backup_restore_invalid_artifact");
  // non-object root
  expect(() => parseBackupArtifact(JSON.stringify([1, 2, 3]))).toThrow(
    "backup_restore_invalid_artifact"
  );
});

testIfDb("restoreBackup requires an explicit confirm before any read/write", async () => {
  const id = await seedV1ArtifactRow(
    buildV1Artifact({ include: ["media"], database: null, settings: null })
  );

  // Complete v1 backup, but no confirmation → pre-write guard rejects (not "unsupported").
  await expect(restoreBackup(id)).rejects.toThrow("backup_restore_confirmation_required");
  await expect(restoreBackup(id, { confirm: false })).rejects.toThrow(
    "backup_restore_confirmation_required"
  );
});

testIfDb(
  "restoreBackup fails fast with backup_restore_superseded for a v2 .cbk row",
  async () => {
    const created = await createBackup({
      kind: "manual",
      include: ["database"],
      passphrase: TEST_PASSPHRASE,
    });
    createdIds.push(created.id);

    // A stored `.cbk` has no stored passphrase — restore-by-id is superseded by
    // the download → Import flow (parent §decision 3). The guard fires before any
    // byte read/parse, even with confirm: true.
    await expect(restoreBackup(created.id, { confirm: true })).rejects.toThrow(
      "backup_restore_superseded"
    );
    // The v2 row stays complete; nothing was read, parsed, or written.
    const after = await getBackupById(created.id);
    expect(after?.status).toBe("complete");
  },
  30000
);

testIfDb(
  "restoreBackup rejects not-ready backups even with confirm (no destructive path)",
  async () => {
    const [queued] = await db
      .insert(backups)
      .values({ status: "queued", kind: "manual", storageDriver: "local" })
      .returning();
    if (!queued) throw new Error("backup_create_failed");
    createdIds.push(queued.id);

    await expect(restoreBackup(queued.id, { confirm: true })).rejects.toThrow("backup_not_ready");
    // Missing backup maps to not_found.
    await expect(
      restoreBackup("00000000-0000-0000-0000-000000000000", { confirm: true })
    ).rejects.toThrow("backup_not_found");
  }
);

testIfDb(
  "restoreBackup fails closed on a malformed artifact BEFORE opening the transaction",
  async () => {
    const id = await seedV1ArtifactRow(buildV1Artifact());

    // Corrupt the stored artifact to an unsupported version; restore must reject at
    // strict-parse (which runs before any db.transaction), so nothing is written.
    await writeFile(artifactFilePath(id), JSON.stringify({ version: 2 }), "utf8");
    await expect(restoreBackup(id, { confirm: true })).rejects.toThrow(
      "backup_restore_invalid_artifact"
    );
  }
);

testIfDb(
  "restoreBackup no longer throws backup_restore_unsupported (real restore path)",
  async () => {
    // A media-only v1 backup carries no database/settings sections, so restore is a
    // genuine but empty (no-op) transaction — safe to run committed against the
    // shared DB and proof the stub is gone.
    const id = await seedV1ArtifactRow(
      buildV1Artifact({ include: ["media"], database: null, settings: null })
    );

    const restored = await restoreBackup(id, { confirm: true });
    expect(restored.id).toBe(id);
    expect(restored.status).toBe("complete");
  }
);

testIfDb(
  "restoreArtifactTx round-trips snapshot rows + settings inside a ROLLED-BACK transaction",
  async () => {
    // Capture a REAL settings bundle via exportConfig (so importConfigTx validates a
    // genuine export), but drive the snapshot replace with a MINIMAL, fixture-scoped
    // database section: current redirects (so the table's real rows survive the in-tx
    // replace) plus one uniquely-scoped injected redirect. Keeping the other snapshot
    // tables empty avoids re-inserting a large snapshot while still exercising the full
    // delete+insert+date-revive path. Everything runs inside a deliberately rolled-back
    // tx (the shared-DB dry-run seam): assert the injected row is visible IN-tx, then
    // roll back so NOTHING commits.
    const settingsBundle = await exportConfig({ target: "settings" });
    const artifact = buildV1Artifact({ settings: settingsBundle });
    expect(artifact.settings).not.toBeNull();

    const currentRedirects = await db.select().from(redirects);
    const uniquePath = `/rollback-seam-${randomUUID()}`;
    const now = new Date().toISOString();
    const seamArtifact: BackupArtifact = {
      ...artifact,
      settings: artifact.settings
        ? {
            ...artifact.settings,
            settings: { ...artifact.settings.settings, "site.contentRoutes": [] },
          }
        : null,
      database: {
        pages: [],
        contentTypes: [],
        contentEntries: [],
        posts: [],
        media: [],
        menus: [],
        menuItems: [],
        themeProfiles: [],
        themeRoutes: [],
        // Cascade / RESTRICT children are now first-class snapshot tables: the
        // production replace clears detailPageDocuments (RESTRICT child of
        // content_types) in FK-safe order BEFORE content_types, so NO manual
        // pre-clear is needed here (regression proof for the RESTRICT block).
        pageRevisions: [],
        detailPageDocuments: [],
        detailPageRevisions: [],
        customScreens: [],
        customScreenEntryPresentationOverrides: [],
        contentRevisions: [],
        contentTaxonomies: [],
        contentTerms: [],
        contentTermAssignments: [],
        postRevisions: [],
        postPreviewTokens: [],
        postTermAssignments: [],
        // JSON round-trip current rows (Date -> ISO string) to exercise date revival,
        // then append the uniquely-scoped fixture row.
        redirects: [
          ...(JSON.parse(JSON.stringify(currentRedirects)) as Record<string, unknown>[]),
          {
            id: randomUUID(),
            fromPath: uniquePath,
            toPath: "/rollback-seam-target",
            statusCode: 301,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    };

    let seenInTx = false;
    const ROLLBACK = new Error("__rollback_seam__");
    await db
      .transaction(async (tx) => {
        // NOTE: production restoreArtifactTx/replaceSnapshotTables performs the
        // detail_page_documents delete itself (FK-safe order) — this test no longer
        // pre-clears it, so it validates the true production delete path.
        await restoreArtifactTx(tx, seamArtifact);
        const found = await tx
          .select({ id: redirects.id })
          .from(redirects)
          .where(eq(redirects.fromPath, uniquePath));
        seenInTx = found.length === 1;
        throw ROLLBACK; // force rollback — never commit over the shared DB
      })
      .catch((error) => {
        if (error !== ROLLBACK) throw error;
      });

    expect(seenInTx).toBe(true);

    // Rollback left nothing committed: the injected redirect must not exist.
    const after = await db
      .select({ id: redirects.id })
      .from(redirects)
      .where(eq(redirects.fromPath, uniquePath));
    expect(after.length).toBe(0);
  },
  30000
);

testIfDb(
  "restore over a DB with detail_page_documents succeeds and restores cascade-children (rolled-back seam)",
  async () => {
    // Regression for the FK-cascade findings: (1) a RESTRICT child (detail_page_documents)
    // present in the DB must NOT block the content_types delete during restore, and
    // (2) cascade-children (custom_screens, content_revisions) must be captured AND
    // re-inserted rather than silently wiped. Everything is COMMITTED first (so the
    // delete phase truly faces a RESTRICT row), then the restore runs inside a
    // deliberately rolled-back tx over the shared DB.
    const suffix = randomUUID();
    const [ct] = await db
      .insert(contentTypes)
      .values({ name: `qa-484-${suffix}`, slug: `qa-484-${suffix}`, schema: {} })
      .returning();
    if (!ct) throw new Error("fixture_content_type_failed");
    const [dp] = await db
      .insert(detailPageDocuments)
      .values({ name: `qa-484-dp-${suffix}`, contentTypeId: ct.id, currentDocument: {} })
      .returning();
    const [cs] = await db
      .insert(customScreens)
      .values({ name: `qa-484-cs-${suffix}`, contentTypeId: ct.id, definition: {} })
      .returning();
    const [ce] = await db
      .insert(contentEntries)
      .values({ typeId: ct.id, slug: `qa-484-ce-${suffix}`, title: `qa-484-${suffix}`, data: {} })
      .returning();
    if (!dp || !cs || !ce) throw new Error("fixture_children_failed");
    const [cr] = await db
      .insert(contentRevisions)
      .values({ entryId: ce.id, version: 1, data: {} })
      .returning();
    if (!cr) throw new Error("fixture_revision_failed");

    try {
      // Build the v1 artifact DIRECTLY around the committed fixtures (a v2 create
      // produces an encrypted `.cbk` that cannot be parsed in-test; snapshot
      // capture coverage lives in backupArchive.test.ts). Drive restore with a
      // MINIMAL subtree so we don't re-insert the whole shared DB.
      const rt = (rows: unknown) => JSON.parse(JSON.stringify(rows)) as Record<string, unknown>[];
      const emptyDb = {
        pages: [],
        contentTypes: rt([ct]),
        contentEntries: rt([ce]),
        posts: [],
        media: [],
        menus: [],
        menuItems: [],
        themeProfiles: [],
        themeRoutes: [],
        redirects: [],
        pageRevisions: [],
        detailPageDocuments: rt([dp]),
        detailPageRevisions: [],
        customScreens: rt([cs]),
        customScreenEntryPresentationOverrides: [],
        contentRevisions: rt([cr]),
        contentTaxonomies: [],
        contentTerms: [],
        contentTermAssignments: [],
        postRevisions: [],
        postPreviewTokens: [],
        postTermAssignments: [],
      };
      const seamArtifact: BackupArtifact = buildV1Artifact({ database: emptyDb });

      let restoreThrew = false;
      let sawCustomScreen = false;
      let sawContentRevision = false;
      let sawDetailPageDocument = false;
      const ROLLBACK = new Error("__rollback_cascade_seam__");
      await db
        .transaction(async (tx) => {
          // No pre-clear: the delete phase itself must clear the committed
          // detail_page_documents RESTRICT row before deleting content_types.
          await restoreArtifactTx(tx, seamArtifact);
          sawCustomScreen =
            (
              await tx
                .select({ id: customScreens.id })
                .from(customScreens)
                .where(eq(customScreens.id, cs.id))
            ).length === 1;
          sawContentRevision =
            (
              await tx
                .select({ id: contentRevisions.id })
                .from(contentRevisions)
                .where(eq(contentRevisions.id, cr.id))
            ).length === 1;
          sawDetailPageDocument =
            (
              await tx
                .select({ id: detailPageDocuments.id })
                .from(detailPageDocuments)
                .where(eq(detailPageDocuments.id, dp.id))
            ).length === 1;
          throw ROLLBACK;
        })
        .catch((error) => {
          if (error === ROLLBACK) return;
          restoreThrew = true;
          throw error;
        });

      expect(restoreThrew).toBe(false);
      expect(sawDetailPageDocument).toBe(true);
      expect(sawCustomScreen).toBe(true);
      expect(sawContentRevision).toBe(true);
    } finally {
      // FK-safe cleanup: delete the RESTRICT child first, then the content type
      // cascades the remaining children (custom_screens, content_entries -> content_revisions).
      await db.delete(detailPageDocuments).where(eq(detailPageDocuments.id, dp.id));
      await db.delete(contentTypes).where(eq(contentTypes.id, ct.id));
    }
  },
  30000
);
