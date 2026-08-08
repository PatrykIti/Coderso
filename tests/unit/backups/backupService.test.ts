import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { sql, inArray, eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  backups,
  backupSchedules,
  contentEntries,
  contentRevisions,
  contentTypes,
  customScreens,
  detailPageDocuments,
  redirects,
} from "../../../core/db/schema";
import {
  computeNextRunAt,
  createBackup,
  deleteBackup,
  getBackupById,
  getBackupSchedule,
  getBackupStorageUsage,
  markBackupComplete,
  markScheduleRun,
  normalizeBackupInclude,
  parseBackupArtifact,
  pruneExpiredBackups,
  listBackups,
  resolveBackupDownload,
  restoreArtifactTx,
  restoreBackup,
  setBackupSchedule,
} from "../../../core/services/backups/backupService";
import type { BackupArtifact, BackupStatus } from "../../../core/services/backups/backupTypes";

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

testIfDb("createBackup adds backup and listBackups returns it", async () => {
  const created = await createBackup({ kind: "manual", include: ["database", "settings"] });
  createdIds.push(created.id);

  const list = await listBackups({ page: 1, limit: 5 });
  const match = list.items.find((item) => item.id === created.id);

  expect(match).not.toBeNull();
  expect(match?.status).toBe("complete");
  expect(match?.kind).toBe("manual");
  expect(match?.artifactPath).toBe("local");
  expect(list.total).toBeGreaterThanOrEqual(1);
  expect(list.worker.mode).toBe("internal");
});

test("normalizeBackupInclude defaults, dedupes, and rejects invalid selections", () => {
  expect(normalizeBackupInclude(undefined)).toEqual(["database", "media"]);
  expect(normalizeBackupInclude(["media", "media", "database"])).toEqual(["media", "database"]);
  expect(() => normalizeBackupInclude([])).toThrow("backup_include_required");
  expect(() => normalizeBackupInclude(["unknown"])).toThrow("backup_include_invalid");
});

testIfDb("queued backups reject restore and download until a worker completes them", async () => {
  const [created] = await db
    .insert(backups)
    .values({
      status: "queued",
      kind: "manual",
      storageDriver: "local",
    })
    .returning();
  if (!created) throw new Error("backup_create_failed");
  createdIds.push(created.id);

  await expect(restoreBackup(created.id)).rejects.toThrow("backup_not_ready");
  await expect(resolveBackupDownload(created.id)).rejects.toThrow("backup_not_ready");
});

testIfDb("completed backups download CMS-managed artifacts and external URLs", async () => {
  const localArtifact = await createBackup({ kind: "manual", include: ["database"] });
  const invalidArtifact = await createBackup({ kind: "manual", include: ["database"] });
  const urlArtifact = await createBackup({ kind: "manual", include: ["database"] });
  createdIds.push(localArtifact.id, invalidArtifact.id, urlArtifact.id);

  await markBackupComplete(invalidArtifact.id, "/var/backups/local.zip", null, 42);
  await markBackupComplete(urlArtifact.id, "https://backups.example.test/url.zip", null, 42);

  const localDownload = await resolveBackupDownload(localArtifact.id);
  expect(localDownload.url).toBeNull();
  expect(localDownload.path).toBeNull();
  expect(localDownload.fileName).toContain(localArtifact.id);
  expect(localDownload.contentType).toBe("application/json");
  expect(localDownload.content).toContain(localArtifact.id);
  await expect(resolveBackupDownload(invalidArtifact.id)).rejects.toThrow(
    "backup_artifact_invalid"
  );
  await expect(resolveBackupDownload(urlArtifact.id)).resolves.toEqual({
    url: "https://backups.example.test/url.zip",
    path: null,
  });
});

testIfDb("deleteBackup removes only the targeted row", async () => {
  const first = await createBackup({ kind: "manual", include: ["database"] });
  const second = await createBackup({ kind: "manual", include: ["database"] });
  createdIds.push(first.id, second.id);

  await expect(deleteBackup(first.id)).resolves.toEqual({ ok: true, id: first.id });
  createdIds.splice(createdIds.indexOf(first.id), 1);

  const remaining = await listBackups({ page: 1, limit: 50 });
  expect(remaining.items.some((item) => item.id === first.id)).toBe(false);
  expect(remaining.items.some((item) => item.id === second.id)).toBe(true);
});

testIfDb("getBackupSchedule returns defaults and setBackupSchedule updates", async () => {
  const current = await getBackupSchedule();
  expect(current.frequency).toBe("daily");
  expect(current.retentionDays).toBeGreaterThan(0);

  const updated = await setBackupSchedule({
    frequency: "weekly",
    retentionDays: current.retentionDays,
    enabled: current.enabled,
    storageDriver: current.storageDriver,
  });

  expect(updated.frequency).toBe("weekly");

  await setBackupSchedule({
    frequency: current.frequency,
    retentionDays: current.retentionDays,
    enabled: current.enabled,
    storageDriver: current.storageDriver,
  });
});

// --- Schedule run-metadata wiring (TASK-484-01-L02). ---
// Shared remote test DB contract: the singleton `backup_schedules` row is
// visible to every parallel stream, so capture its exact prior values before
// any mutation and restore them verbatim in afterAll.
let priorScheduleRow: typeof backupSchedules.$inferSelect | undefined;

beforeAll(async () => {
  if (!hasDb) return;
  // Ensure the singleton exists (seeds if empty) then snapshot the raw row.
  await getBackupSchedule();
  [priorScheduleRow] = await db.select().from(backupSchedules).limit(1);
});

afterAll(async () => {
  if (!hasDb || !priorScheduleRow) return;
  await db
    .update(backupSchedules)
    .set({
      enabled: priorScheduleRow.enabled,
      frequency: priorScheduleRow.frequency,
      retentionDays: priorScheduleRow.retentionDays,
      storageDriver: priorScheduleRow.storageDriver,
      nextRunAt: priorScheduleRow.nextRunAt,
      lastRunAt: priorScheduleRow.lastRunAt,
      updatedAt: priorScheduleRow.updatedAt,
    })
    .where(eq(backupSchedules.id, priorScheduleRow.id));
});

testIfDb("getBackupSchedule exposes the run-metadata fields", async () => {
  const schedule = await getBackupSchedule();
  expect(schedule).toHaveProperty("nextRunAt");
  expect(schedule).toHaveProperty("lastRunAt");
});

testIfDb(
  "setBackupSchedule nulls nextRunAt when disabled and recomputes when re-enabled",
  async () => {
    const disabled = await setBackupSchedule({ enabled: false });
    expect(disabled.enabled).toBe(false);
    expect(disabled.nextRunAt).toBeNull();

    const before = Date.now();
    const enabled = await setBackupSchedule({ enabled: true, frequency: "daily" });
    expect(enabled.enabled).toBe(true);
    expect(enabled.nextRunAt).not.toBeNull();
    expect(enabled.nextRunAt!.getTime()).toBeGreaterThan(before);
  }
);

testIfDb(
  "setBackupSchedule recomputes nextRunAt on frequency change but preserves it on an unrelated change",
  async () => {
    // Baseline: enabled + daily with a concrete nextRunAt.
    const daily = await setBackupSchedule({ enabled: true, frequency: "daily" });
    expect(daily.nextRunAt).not.toBeNull();
    const dailyNext = daily.nextRunAt!.getTime();

    // Unrelated change (retentionDays) must preserve the existing nextRunAt.
    const preserved = await setBackupSchedule({ retentionDays: daily.retentionDays + 1 });
    expect(preserved.nextRunAt).not.toBeNull();
    expect(preserved.nextRunAt!.getTime()).toBe(dailyNext);

    // Frequency change must recompute (daily->weekly => further in the future).
    const weekly = await setBackupSchedule({ frequency: "weekly" });
    expect(weekly.nextRunAt).not.toBeNull();
    expect(weekly.nextRunAt!.getTime()).toBeGreaterThan(dailyNext);
  }
);

testIfDb("markScheduleRun sets lastRunAt and advances nextRunAt from the run time", async () => {
  const schedule = await setBackupSchedule({ enabled: true, frequency: "daily" });
  const runAt = new Date("2026-03-10T12:00:00.000Z");

  const marked = await markScheduleRun(schedule.id, runAt);
  expect(marked.lastRunAt).not.toBeNull();
  expect(marked.lastRunAt!.getTime()).toBe(runAt.getTime());
  expect(marked.nextRunAt).not.toBeNull();
  expect(marked.nextRunAt!.getTime()).toBe(computeNextRunAt("daily", runAt).getTime());
});

testIfDb("markScheduleRun nulls nextRunAt for a disabled schedule", async () => {
  const schedule = await setBackupSchedule({ enabled: false });
  const marked = await markScheduleRun(schedule.id, new Date("2026-03-10T12:00:00.000Z"));
  expect(marked.enabled).toBe(false);
  expect(marked.nextRunAt).toBeNull();
  expect(marked.lastRunAt).not.toBeNull();
});

testIfDb("markScheduleRun throws backup_schedule_not_found for an unknown id", async () => {
  await expect(markScheduleRun("00000000-0000-0000-0000-000000000000", new Date())).rejects.toThrow(
    "backup_schedule_not_found"
  );
});

// --- Retention pruning (TASK-484-03-L01). ---
// Shared remote test DB contract: `pruneExpiredBackups` is a table-wide sweep, so
// scope the cutoff to only our own fixtures by passing an ANCIENT `now`
// (cutoff = now - retentionDays predates all real data) and seeding fixtures with
// `createdAt` older than that ancient cutoff. Assertions are per seeded id; every
// seeded id is tracked in `createdIds` and cleaned in afterEach.
const seedBackupRow = async (status: BackupStatus, createdAt: Date): Promise<string> => {
  const [row] = await db
    .insert(backups)
    .values({
      status,
      kind: "manual",
      storageDriver: "local",
      createdAt,
    })
    .returning();
  if (!row) throw new Error("backup_create_failed");
  createdIds.push(row.id);
  return row.id;
};

const ANCIENT_NOW = new Date("2000-01-01T00:00:00.000Z");
const BEFORE_ANCIENT_CUTOFF = new Date("1990-01-01T00:00:00.000Z"); // < ANCIENT_NOW - 1 day

testIfDb("pruneExpiredBackups deletes only terminal rows older than the cutoff", async () => {
  const expiredComplete = await seedBackupRow("complete", BEFORE_ANCIENT_CUTOFF);
  const expiredFailed = await seedBackupRow("failed", BEFORE_ANCIENT_CUTOFF);
  const expiredRunning = await seedBackupRow("running", BEFORE_ANCIENT_CUTOFF);
  const expiredQueued = await seedBackupRow("queued", BEFORE_ANCIENT_CUTOFF);
  // In-window control: createdAt == ANCIENT_NOW, which is after the cutoff.
  const inWindowComplete = await seedBackupRow("complete", ANCIENT_NOW);

  const result = await pruneExpiredBackups(1, ANCIENT_NOW);
  expect(Array.isArray(result.prunedIds)).toBe(true);
  expect(result.prunedCount).toBe(result.prunedIds.length);

  // Per-id membership (never table-global counts): both terminal-expired rows pruned.
  expect(result.prunedIds).toContain(expiredComplete);
  expect(result.prunedIds).toContain(expiredFailed);
  // Non-terminal rows survive regardless of age; in-window terminal row survives.
  expect(result.prunedIds).not.toContain(expiredRunning);
  expect(result.prunedIds).not.toContain(expiredQueued);
  expect(result.prunedIds).not.toContain(inWindowComplete);

  const survivors = await db
    .select({ id: backups.id })
    .from(backups)
    .where(inArray(backups.id, [expiredRunning, expiredQueued, inWindowComplete]));
  const survivorIds = survivors.map((row) => row.id);
  expect(survivorIds).toContain(expiredRunning);
  expect(survivorIds).toContain(expiredQueued);
  expect(survivorIds).toContain(inWindowComplete);

  // Pruned rows are gone.
  const pruned = await db
    .select({ id: backups.id })
    .from(backups)
    .where(inArray(backups.id, [expiredComplete, expiredFailed]));
  expect(pruned.length).toBe(0);
});

testIfDb("pruneExpiredBackups is idempotent once its eligible rows are gone", async () => {
  const expired = await seedBackupRow("complete", BEFORE_ANCIENT_CUTOFF);

  const first = await pruneExpiredBackups(1, ANCIENT_NOW);
  expect(first.prunedIds).toContain(expired);

  const second = await pruneExpiredBackups(1, ANCIENT_NOW);
  expect(second.prunedIds).not.toContain(expired); // already gone; no throw, no re-delete
});

testIfDb(
  "pruneExpiredBackups rejects an invalid retentionDays without deleting anything",
  async () => {
    const expired = await seedBackupRow("complete", BEFORE_ANCIENT_CUTOFF);

    await expect(pruneExpiredBackups(0, ANCIENT_NOW)).rejects.toThrow("backup_schedule_invalid");
    await expect(pruneExpiredBackups(3651, ANCIENT_NOW)).rejects.toThrow("backup_schedule_invalid");

    const stillThere = await db
      .select({ id: backups.id })
      .from(backups)
      .where(eq(backups.id, expired));
    expect(stillThere.length).toBe(1); // rejected before any delete
  }
);

testIfDb("mapBackup keeps artifactKey null on the client-facing (redacted) map", async () => {
  const [created] = await db
    .insert(backups)
    .values({
      status: "complete",
      kind: "manual",
      storageDriver: "s3",
      artifactPath: "https://backups.example.test/artifact.json",
      artifactKey: "backups/2026/06/secret-object-key.json",
    })
    .returning();
  if (!created) throw new Error("backup_create_failed");
  createdIds.push(created.id);

  const backup = await getBackupById(created.id);
  expect(backup).not.toBeNull();
  expect(backup!.artifactKey).toBeNull();
});

// --- Restore implementation (TASK-484-04-L01). ---

const artifactFilePath = (id: string) =>
  path.resolve(
    process.cwd(),
    process.env.BACKUP_DIR ?? "storage/backups",
    `coderso-backup-${id}.json`
  );

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
  const created = await createBackup({ kind: "manual", include: ["database"] });
  createdIds.push(created.id);

  // Complete backup, but no confirmation → pre-write guard rejects (not "unsupported").
  await expect(restoreBackup(created.id)).rejects.toThrow("backup_restore_confirmation_required");
  await expect(restoreBackup(created.id, { confirm: false })).rejects.toThrow(
    "backup_restore_confirmation_required"
  );
});

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
    const created = await createBackup({ kind: "manual", include: ["database"] });
    createdIds.push(created.id);

    // Corrupt the stored artifact to an unsupported version; restore must reject at
    // strict-parse (which runs before any db.transaction), so nothing is written.
    await writeFile(artifactFilePath(created.id), JSON.stringify({ version: 2 }), "utf8");
    await expect(restoreBackup(created.id, { confirm: true })).rejects.toThrow(
      "backup_restore_invalid_artifact"
    );
  }
);

testIfDb(
  "restoreBackup no longer throws backup_restore_unsupported (real restore path)",
  async () => {
    // A media-only backup carries no database/settings sections, so restore is a
    // genuine but empty (no-op) transaction — safe to run committed against the
    // shared DB and proof the stub is gone.
    const created = await createBackup({ kind: "manual", include: ["media"] });
    createdIds.push(created.id);

    const restored = await restoreBackup(created.id, { confirm: true });
    expect(restored.id).toBe(created.id);
    expect(restored.status).toBe("complete");
  }
);

testIfDb(
  "restoreArtifactTx round-trips snapshot rows + settings inside a ROLLED-BACK transaction",
  async () => {
    // Capture a real settings bundle via createBackup (so importConfigTx validates a
    // genuine export), but drive the snapshot replace with a MINIMAL, fixture-scoped
    // database section: current redirects (so the table's real rows survive the in-tx
    // replace) plus one uniquely-scoped injected redirect. Keeping the other snapshot
    // tables empty avoids re-inserting a large snapshot while still exercising the full
    // delete+insert+date-revive path. Everything runs inside a deliberately rolled-back
    // tx (the shared-DB dry-run seam): assert the injected row is visible IN-tx, then
    // roll back so NOTHING commits.
    const created = await createBackup({ kind: "manual", include: ["settings"] });
    createdIds.push(created.id);
    const dl = await resolveBackupDownload(created.id);
    expect(dl.content).toBeTruthy();
    const artifact = parseBackupArtifact(dl.content as string);
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
      // Capture a real full-DB artifact (includes the committed fixtures above), then
      // drive restore with a MINIMAL subtree so we don't re-insert the whole shared DB.
      const created = await createBackup({ kind: "manual", include: ["database"] });
      createdIds.push(created.id);
      const dl = await resolveBackupDownload(created.id);
      const artifact = parseBackupArtifact(dl.content as string);
      expect(artifact.database).not.toBeNull();
      // The new snapshot set must have CAPTURED the cascade/RESTRICT children.
      expect(artifact.database?.detailPageDocuments.some((r) => r.id === dp.id)).toBe(true);
      expect(artifact.database?.customScreens.some((r) => r.id === cs.id)).toBe(true);
      expect(artifact.database?.contentRevisions.some((r) => r.id === cr.id)).toBe(true);

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
      const seamArtifact: BackupArtifact = { ...artifact, database: emptyDb };

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

// --- Storage usage aggregate (TASK-484-06-L01). ---
// Shared remote test DB contract: getBackupStorageUsage() aggregates the ENTIRE
// backups table (used concurrently by other streams + the owner), so capture a
// `before` snapshot and assert DELTAS, never absolute sums. Seed uniquely-scoped
// fixtures with mixed size_bytes (incl. null) and drivers, tracked in createdIds
// and cleaned in afterEach; never truncate the shared table.
const seedUsageRow = async (
  status: BackupStatus,
  storageDriver: "local" | "s3" | "azure",
  sizeBytes: number | null
): Promise<string> => {
  const [row] = await db
    .insert(backups)
    .values({ status, kind: "manual", storageDriver, sizeBytes })
    .returning();
  if (!row) throw new Error("backup_create_failed");
  createdIds.push(row.id);
  return row.id;
};

testIfDb(
  "getBackupStorageUsage sums size_bytes (null as 0) with per-status/per-driver deltas",
  async () => {
    const before = await getBackupStorageUsage();

    // Seeded set: two complete/s3 (1000 + null), one failed/local (250),
    // one complete/azure (500). Expected deltas: totalBytes +1750, count +4.
    await seedUsageRow("complete", "s3", 1000);
    await seedUsageRow("complete", "s3", null); // null contributes 0 bytes but +1 count
    await seedUsageRow("failed", "local", 250);
    await seedUsageRow("complete", "azure", 500);

    const after = await getBackupStorageUsage();

    expect(after.totalBytes - before.totalBytes).toBe(1750);
    expect(after.backupCount - before.backupCount).toBe(4);

    // Per-status deltas.
    expect(after.byStatus.complete.count - before.byStatus.complete.count).toBe(3);
    expect(after.byStatus.complete.bytes - before.byStatus.complete.bytes).toBe(1500);
    expect(after.byStatus.failed.count - before.byStatus.failed.count).toBe(1);
    expect(after.byStatus.failed.bytes - before.byStatus.failed.bytes).toBe(250);

    // Per-driver deltas.
    expect(after.byDriver.s3.count - before.byDriver.s3.count).toBe(2);
    expect(after.byDriver.s3.bytes - before.byDriver.s3.bytes).toBe(1000);
    expect(after.byDriver.local.count - before.byDriver.local.count).toBe(1);
    expect(after.byDriver.local.bytes - before.byDriver.local.bytes).toBe(250);
    expect(after.byDriver.azure.count - before.byDriver.azure.count).toBe(1);
    expect(after.byDriver.azure.bytes - before.byDriver.azure.bytes).toBe(500);

    // Stable shape: every enum key present.
    expect(Object.keys(after.byStatus).sort()).toEqual(
      ["complete", "failed", "queued", "running"].sort()
    );
    expect(Object.keys(after.byDriver).sort()).toEqual(["azure", "local", "s3"].sort());
    expect(after.activeDriver).toBeDefined();
  }
);

testIfDb(
  "getBackupStorageUsage derives overQuota/quotaBytes from BACKUP_MAX_TOTAL_BYTES",
  async () => {
    const prior = process.env.BACKUP_MAX_TOTAL_BYTES;
    try {
      // Unset → no quota signal.
      delete process.env.BACKUP_MAX_TOTAL_BYTES;
      const unset = await getBackupStorageUsage();
      expect(unset.quotaBytes).toBeNull();
      expect(unset.overQuota).toBe(false);

      // Derive the threshold from the observed live total so the assertion is
      // independent of other streams' concurrent rows.
      const live = await getBackupStorageUsage();

      // Threshold below the live total → overQuota true.
      process.env.BACKUP_MAX_TOTAL_BYTES = String(live.totalBytes + 1);
      const under = await getBackupStorageUsage();
      expect(under.quotaBytes).toBe(live.totalBytes + 1);
      expect(under.overQuota).toBe(false);

      process.env.BACKUP_MAX_TOTAL_BYTES = String(Math.max(1, live.totalBytes - 1));
      const over = await getBackupStorageUsage();
      expect(over.quotaBytes).toBe(Math.max(1, live.totalBytes - 1));
      // total > quota (unless total is 0/1, which cannot happen with seeded rows on
      // the shared DB, but guard anyway).
      if (over.totalBytes > over.quotaBytes!) {
        expect(over.overQuota).toBe(true);
      }

      // Invalid values → null (no signal).
      process.env.BACKUP_MAX_TOTAL_BYTES = "not-a-number";
      expect((await getBackupStorageUsage()).quotaBytes).toBeNull();
      process.env.BACKUP_MAX_TOTAL_BYTES = "0";
      expect((await getBackupStorageUsage()).quotaBytes).toBeNull();
      process.env.BACKUP_MAX_TOTAL_BYTES = "-5";
      expect((await getBackupStorageUsage()).quotaBytes).toBeNull();
    } finally {
      if (prior === undefined) delete process.env.BACKUP_MAX_TOTAL_BYTES;
      else process.env.BACKUP_MAX_TOTAL_BYTES = prior;
    }
  }
);
