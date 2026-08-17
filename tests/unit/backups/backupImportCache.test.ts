/**
 * TASK-563: post-commit site-cache invalidation + redacted media-failure
 * receipts for the Backup v2 import pipeline.
 *
 * Bun lane, DB-backed (testIfDb): `importBackupFromUpload` commits real
 * transactions and imports `db` directly, so every test shares the ambient
 * admin + fixture hygiene from `./backupImportFixtures`.
 *
 * Coverage:
 * - settings import clears a pre-filled site cache after commit (regression),
 * - media-only import does NOT clear the site cache (condition negative),
 * - Nth-object storage failure: swallowed, redacted `backup.mediaRestoreFailure`
 *   audit row, fixed-code-only console output, true partial counts,
 * - the `logFailure` seam delivers the same receipt without an audit row.
 */
import { afterEach, expect, test } from "bun:test";
import { desc, eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { auditLogs, settings } from "../../../core/db/schema";
import {
  ARCHIVE_ARTIFACT_VERSION,
  ARCHIVE_ENGINE_VERSION,
  ARCHIVE_SCHEMA_VERSION,
  SETTINGS_MEMBER_NAME,
  type ArchiveManifest,
} from "../../../core/services/backups/backupArchive";
import { importBackupFromUpload } from "../../../core/services/backups/backupImport";
import {
  buildSiteCacheKey,
  clearSiteCache,
  getSiteCacheEntry,
  setSiteCacheEntry,
} from "../../../core/site/cache/siteCache";
import type { MediaStorageAdapter } from "../../../core/services/media/storage/adapter";
import {
  deleteSetting,
  getSetting,
  setSetting,
} from "../../../core/services/settings/settingsService";
import type { ExportBundle } from "../../../core/services/tools/importExportTypes";
import {
  asUpload,
  encryptArchive,
  manifestFirst,
  PASS,
  scopedMediaKey,
  testIfDb,
} from "./backupImportFixtures";

const auditRowIds: string[] = [];

afterEach(async () => {
  if (auditRowIds.length) {
    await db.delete(auditLogs).where(eq(auditLogs.id, auditRowIds[0]));
    auditRowIds.length = 0;
  }
});

const mediaOnlyManifest = (bytes: Uint8Array[]): ArchiveManifest => ({
  artifactVersion: ARCHIVE_ARTIFACT_VERSION,
  schemaVersion: ARCHIVE_SCHEMA_VERSION,
  engineVersion: ARCHIVE_ENGINE_VERSION,
  createdAt: new Date().toISOString(),
  include: ["media"],
  tables: [],
  media: {
    fileCount: bytes.length,
    totalBytes: bytes.reduce((n, b) => n + b.length, 0),
    skipped: [],
  },
});

const settingsManifest = (): ArchiveManifest => ({
  artifactVersion: ARCHIVE_ARTIFACT_VERSION,
  schemaVersion: ARCHIVE_SCHEMA_VERSION,
  engineVersion: ARCHIVE_ENGINE_VERSION,
  createdAt: new Date().toISOString(),
  include: ["settings"],
  tables: [],
});

// Memory-backed adapter that throws on the Nth `putAt` (Nth-object failure).
const failingAdapter = (
  throwOnCall: number
): { adapter: MediaStorageAdapter; putAtCalls: string[] } => {
  const putAtCalls: string[] = [];
  const adapter: MediaStorageAdapter = {
    put: async () => {
      throw new Error("unused");
    },
    putMedia: async () => {
      throw new Error("unused");
    },
    get: async () => {
      throw new Error("unused");
    },
    delete: async () => undefined,
    getPublicUrl: (key) => `mem/${key}`,
    putAt: async (key, body) => {
      putAtCalls.push(key);
      if (putAtCalls.length === throwOnCall) throw new Error("s3-write-boom");
      for await (const _ of body) {
        /* drain — fake stores nothing */
      }
    },
  };
  return { adapter, putAtCalls };
};

const memoryAdapter = (): MediaStorageAdapter => {
  const store = new Map<string, Uint8Array>();
  return {
    put: async () => {
      throw new Error("unused");
    },
    putMedia: async () => {
      throw new Error("unused");
    },
    get: async () => {
      throw new Error("unused");
    },
    delete: async () => undefined,
    getPublicUrl: (key) => `mem/${key}`,
    putAt: async (key, body) => {
      const chunks: Uint8Array[] = [];
      for await (const chunk of body) chunks.push(chunk);
      store.set(key, Buffer.concat(chunks));
    },
  };
};

testIfDb(
  "TASK-563 cache regression: a settings import clears a pre-filled site cache after commit",
  async () => {
    clearSiteCache();
    const key = buildSiteCacheKey("profile-1", "/cached-page");
    setSiteCacheEntry(key, "<html />", 100, 0);
    expect(getSiteCacheEntry(key, 1)).toBe("<html />");

    const scopedName = `bkp-563-${Date.now()}-site`;
    const bundle: ExportBundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      scope: { target: "settings", include: ["settings"] },
      settings: { "site.name": scopedName },
      menus: [],
      themeProfiles: [],
      adminThemes: { templates: [], profiles: [] },
      redirects: [],
    };
    const { cbk } = await encryptArchive(
      manifestFirst(settingsManifest(), [
        { name: SETTINGS_MEMBER_NAME, bytes: Buffer.from(`${JSON.stringify(bundle)}\n`, "utf8") },
      ]),
      PASS
    );

    const [existing] = await db.select().from(settings).where(eq(settings.key, "site.name"));
    const hadSiteName = Boolean(existing);
    const priorSiteName = hadSiteName ? await getSetting("site.name") : undefined;

    try {
      const result = await importBackupFromUpload({
        file: asUpload(cbk),
        passphrase: PASS,
        confirm: true,
      });
      expect(result.status).toBe("restored");
      // The import COMMITTED the settings write; the post-commit clear must
      // have removed the pre-filled entry (nothing else clears it — the
      // settings write path inside importConfigTx never touches siteCache).
      expect(getSiteCacheEntry(key, 1)).toBe(null);
    } finally {
      if (hadSiteName) await setSetting("site.name", priorSiteName);
      else await deleteSetting("site.name");
    }
  }
);

testIfDb("TASK-563 cache seam: a media-only import does NOT clear the site cache", async () => {
  clearSiteCache();
  const key = buildSiteCacheKey("profile-1", "/cached-page");
  setSiteCacheEntry(key, "<html />", 100, 0);

  const mediaBytes = Buffer.from("media bytes", "utf8");
  const manifest = mediaOnlyManifest([mediaBytes]);
  const { cbk } = await encryptArchive(
    manifestFirst(manifest, [{ name: `media/${scopedMediaKey("no-clear")}`, bytes: mediaBytes }]),
    PASS
  );

  const clearCalls: string[] = [];
  const result = await importBackupFromUpload({
    file: asUpload(cbk),
    passphrase: PASS,
    confirm: true,
    mediaAdapter: async () => memoryAdapter(),
    clearCache: () => {
      clearCalls.push("called");
    },
  });

  expect(clearCalls).toEqual([]); // no DB content/settings change → no invalidation
  expect(result.mediaRestored).toBe(1);
  expect(result.skippedMedia).toBe(0);
  expect(getSiteCacheEntry(key, 1)).toBe("<html />");
});

testIfDb(
  "TASK-563 media failure: Nth-object storage failure swallows, audits a redacted receipt, reports partial counts",
  async () => {
    const mediaBytes = [Buffer.from("one"), Buffer.from("two"), Buffer.from("three")];
    const manifest = mediaOnlyManifest(mediaBytes);
    const { cbk } = await encryptArchive(
      manifestFirst(
        manifest,
        mediaBytes.map((bytes, i) => ({
          name: `media/${scopedMediaKey(`nth-${i}`)}`,
          bytes,
        }))
      ),
      PASS
    );

    const { adapter, putAtCalls } = failingAdapter(2); // 1st ok, 2nd throws

    // The storage driver's console note must be fixed-code only — never the
    // raw error object (redaction requirement).
    const originalError = console.error;
    const logCalls: unknown[][] = [];
    console.error = (...args) => {
      logCalls.push(args);
    };

    let result: Awaited<ReturnType<typeof importBackupFromUpload>>;
    try {
      result = await importBackupFromUpload({
        file: asUpload(cbk),
        passphrase: PASS,
        confirm: true,
        mediaAdapter: async () => adapter,
      });
    } finally {
      console.error = originalError;
    }

    expect(putAtCalls).toHaveLength(2);
    expect(result.status).toBe("restored"); // swallowed — no 500
    expect(result.mediaRestored).toBe(1);
    expect(result.skippedMedia).toBe(2);
    expect(logCalls.length).toBeGreaterThan(0);
    expect(logCalls.every((args) => args.length === 1 && typeof args[0] === "string")).toBe(true);

    const [row] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "backup.mediaRestoreFailure"))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);
    expect(row).toBeDefined();
    expect(row?.targetType).toBe("backup");
    expect(row?.targetId.startsWith("coderso-import-")).toBe(true);
    expect(row?.metadata).toMatchObject({
      code: "media_restore_partial",
      severity: "error",
      restored: 1,
      skipped: 2,
    });
    if (row) auditRowIds.push(row.id);
  }
);

testIfDb(
  "TASK-563 logFailure seam: injected writer receives the receipt instead of an audit row",
  async () => {
    const mediaBytes = [Buffer.from("a"), Buffer.from("b")];
    const manifest = mediaOnlyManifest(mediaBytes);
    const { cbk } = await encryptArchive(
      manifestFirst(
        manifest,
        mediaBytes.map((bytes, i) => ({
          name: `media/${scopedMediaKey(`seam-${i}`)}`,
          bytes,
        }))
      ),
      PASS
    );

    const { adapter } = failingAdapter(1); // throws on the first object
    const before = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(eq(auditLogs.action, "backup.mediaRestoreFailure"));
    const received: Array<Record<string, unknown>> = [];

    const result = await importBackupFromUpload({
      file: asUpload(cbk),
      passphrase: PASS,
      confirm: true,
      mediaAdapter: async () => adapter,
      logFailure: async (event) => {
        received.push(event as unknown as Record<string, unknown>);
      },
    });

    expect(result.status).toBe("restored");
    expect(result.mediaRestored).toBe(0);
    expect(result.skippedMedia).toBe(2);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      action: "backup.mediaRestoreFailure",
      targetType: "backup",
    });
    const targetId = received[0].targetId as string;
    expect(targetId.startsWith("coderso-import-")).toBe(true);
    expect(received[0].metadata).toMatchObject({
      code: "media_restore_partial",
      severity: "error",
      restored: 0,
      skipped: 2,
    });
    const after = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(eq(auditLogs.action, "backup.mediaRestoreFailure"));
    expect(after.length).toBe(before.length); // seam replaced the real writer → no row
  }
);
