import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
import { exportConfig } from "../../../core/services/tools/importExportService";
import {
  BACKUP_ARCHIVE_CONTENT_TYPE,
  BACKUP_ARCHIVE_EXTENSION,
} from "../../../core/services/backups/backupCrypto";
import type {
  BackupArtifact,
  BackupIncludeOption,
  BackupStatus,
} from "../../../core/services/backups/backupTypes";

// 02's MIN_BACKUP_PASSPHRASE floor: every v2 `.cbk` create must carry a
// passphrase ≥ 12 chars (mandatory encryption).
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

testIfDb(
  "createBackup adds a completed encrypted backup and listBackups returns it",
  async () => {
    const created = await createBackup({
      kind: "manual",
      include: ["database", "settings"],
      passphrase: TEST_PASSPHRASE,
    });
    createdIds.push(created.id);

    const list = await listBackups({ page: 1, limit: 5 });
    const match = list.items.find((item) => item.id === created.id);

    expect(match).not.toBeNull();
    expect(match?.status).toBe("complete");
    expect(match?.kind).toBe("manual");
    // Client-facing records REDACT local artifact paths to "local" (no server
    // path leak); a positive byte count proves the encrypted `.cbk` was written.
    expect(match?.artifactPath).toBe("local");
    expect(match?.sizeBytes).toBeGreaterThan(0);
    expect(list.total).toBeGreaterThanOrEqual(1);
    expect(list.worker.mode).toBe("internal");
  },
  30000
);

testIfDb("createBackup without a passphrase self-marks failed (mandatory encryption)", async () => {
  const created = await createBackup({ kind: "manual", include: ["database"] });
  createdIds.push(created.id);
  // Fail-closed BEFORE any archive work: the row is persisted as failed with
  // the generic passphrase code (04's users guard only fires for users include).
  expect(created.status).toBe("failed");
  expect(created.error).toBe("backup_passphrase_required");
  expect(created.artifactPath).toBeNull(); // no `.cbk` bytes were written
});

testIfDb(
  "createBackup with users include but no passphrase self-marks failed with the users code",
  async () => {
    const created = await createBackup({ kind: "manual", include: ["database", "users"] });
    createdIds.push(created.id);
    // 04's guard runs FIRST inside createBackup: the users-specific code wins over
    // the generic passphrase one, and no users export can run unencrypted.
    expect(created.status).toBe("failed");
    expect(created.error).toBe("backup_users_requires_encryption");
    expect(created.artifactPath).toBeNull();
  }
);

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

testIfDb(
  "completed backups download CMS-managed artifacts and external URLs",
  async () => {
    const localArtifact = await createBackup({
      kind: "manual",
      include: ["database"],
      passphrase: TEST_PASSPHRASE,
    });
    const invalidArtifact = await createBackup({
      kind: "manual",
      include: ["database"],
      passphrase: TEST_PASSPHRASE,
    });
    const urlArtifact = await createBackup({
      kind: "manual",
      include: ["database"],
      passphrase: TEST_PASSPHRASE,
    });
    createdIds.push(localArtifact.id, invalidArtifact.id, urlArtifact.id);

    await markBackupComplete(invalidArtifact.id, "/var/backups/local.zip", null, 42);
    await markBackupComplete(urlArtifact.id, "https://backups.example.test/url.zip", null, 42);

    const localDownload = await resolveBackupDownload(localArtifact.id);
    expect(localDownload.url).toBeNull();
    expect(localDownload.path).toBeNull();
    expect(localDownload.fileName).toBe(
      `coderso-backup-${localArtifact.id}${BACKUP_ARCHIVE_EXTENSION}`
    );
    expect(localDownload.contentType).toBe(BACKUP_ARCHIVE_CONTENT_TYPE);
    // v2 `.cbk` transport (06 HIGH fix): base64-encoded binary that decodes
    // byte-for-byte to the stored archive — proving the download is re-importable.
    expect(localDownload.encoding).toBe("base64");
    expect(localDownload.content).toBeTruthy();
    // The stored `.cbk` lives at the deterministic local path (client-facing
    // records redact it to "local"); decode the base64 payload and compare
    // byte-for-byte — proving the download is re-importable.
    const storedPath = path.join(
      process.cwd(),
      process.env.BACKUP_DIR ?? "storage/backups",
      `coderso-backup-${localArtifact.id}${BACKUP_ARCHIVE_EXTENSION}`
    );
    const storedBytes = await readFile(storedPath);
    expect(Buffer.from(localDownload.content!, "base64")).toEqual(storedBytes);

    await expect(resolveBackupDownload(invalidArtifact.id)).rejects.toThrow(
      "backup_artifact_invalid"
    );
    await expect(resolveBackupDownload(urlArtifact.id)).resolves.toEqual({
      url: "https://backups.example.test/url.zip",
      path: null,
    });
  },
  60000
);

testIfDb(
  "deleteBackup removes only the targeted row",
  async () => {
    const first = await createBackup({
      kind: "manual",
      include: ["database"],
      passphrase: TEST_PASSPHRASE,
    });
    const second = await createBackup({
      kind: "manual",
      include: ["database"],
      passphrase: TEST_PASSPHRASE,
    });
    createdIds.push(first.id, second.id);

    await expect(deleteBackup(first.id)).resolves.toEqual({ ok: true, id: first.id });
    createdIds.splice(createdIds.indexOf(first.id), 1);

    const remaining = await listBackups({ page: 1, limit: 50 });
    expect(remaining.items.some((item) => item.id === first.id)).toBe(false);
    expect(remaining.items.some((item) => item.id === second.id)).toBe(true);
  },
  60000
);

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

testIfDb("getBackupSchedule seed exposes the full default include set", async () => {
  const schedule = await getBackupSchedule();
  // The shared singleton was seeded by 06 (or migrated with the 0072 default)
  // with everything EXCEPT the sensitive users matrix.
  expect(schedule.include).toEqual(expect.arrayContaining(["database", "settings", "media"]));
  expect(schedule.include).not.toContain("users");
});

testIfDb("setBackupSchedule round-trips include through mapSchedule", async () => {
  const current = await getBackupSchedule();
  const updated = await setBackupSchedule({ include: ["database", "media"] });
  expect(updated.include).toEqual(["database", "media"]);

  const reread = await getBackupSchedule();
  expect(reread.include).toEqual(["database", "media"]);

  // Restore the stored scope so the singleton stays as it was.
  await setBackupSchedule({ include: current.include });
});

testIfDb("setBackupSchedule rejects an empty or out-of-enum include", async () => {
  await expect(setBackupSchedule({ include: [] })).rejects.toThrow("backup_include_required");
  await expect(setBackupSchedule({ include: ["unknown" as BackupIncludeOption] })).rejects.toThrow(
    "backup_include_invalid"
  );
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
      include: priorScheduleRow.include,
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
  // The lineage is computed from the REAL path BEFORE redaction and survives on
  // the client-facing map (v1 `.json` here, even though the path stays a URL).
  expect(backup!.artifactFormat).toBe("v1");
});

testIfDb("mapBackup exposes v2 artifactFormat for redacted .cbk rows", async () => {
  const [created] = await db
    .insert(backups)
    .values({
      status: "complete",
      kind: "manual",
      storageDriver: "local",
      artifactPath: "storage/backups/coderso-backup-fixture.cbk",
      artifactKey: null,
    })
    .returning();
  if (!created) throw new Error("backup_create_failed");
  createdIds.push(created.id);

  const backup = await getBackupById(created.id);
  expect(backup).not.toBeNull();
  expect(backup!.artifactFormat).toBe("v2");
  // Local paths stay redacted on the client-facing map ("local"), so the UI
  // cannot rely on the path suffix; artifactFormat is the restore gate signal.
  expect(backup!.artifactPath).toBe("local");
});

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
