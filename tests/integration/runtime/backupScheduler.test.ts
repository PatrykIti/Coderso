import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import postgres from "postgres";

import {
  BACKUP_SCHEDULER_LOCK_KEY,
  BACKUP_SCHEDULER_LOCK_NAMESPACE,
  BACKUP_SCHEDULER_SESSION_PURPOSE,
  runDueScheduledBackups,
} from "../../../core/server/jobs/backupScheduler";
import { resolveSessionDatabaseTarget } from "../../../core/db/connectionTargets";
import { db } from "../../../core/db/client";
import { auditLogs, backups, backupSchedules } from "../../../core/db/schema";
import { deleteBackup, getBackupSchedule } from "../../../core/services/backups/backupService";

// Every v2 `.cbk` is encrypted; the unattended scheduler passphrase comes ONLY
// from BACKUP_ENCRYPTION_PASSPHRASE (never a request, never stored). Tests that
// run a REAL archive must set it; tests that exercise the fail-closed branch
// must NOT have it set.
const TEST_PASSPHRASE = "scheduler-test-passphrase-511";

const withScheduledPassphrase = async <T>(passphrase: string, fn: () => Promise<T>): Promise<T> => {
  const prev = process.env.BACKUP_ENCRYPTION_PASSPHRASE;
  process.env.BACKUP_ENCRYPTION_PASSPHRASE = passphrase;
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.BACKUP_ENCRYPTION_PASSPHRASE;
    else process.env.BACKUP_ENCRYPTION_PASSPHRASE = prev;
  }
};

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

// The holder/probe sessions below take SESSION-level advisory locks, so they must
// use the same DIRECT target the scheduler uses. Opening them on a pooled
// DATABASE_URL would route lock and unlock to different backends and leak a lock
// on the shared remote DB — the exact hazard these tests exist to police.
const sessionLockUrl = () => resolveSessionDatabaseTarget(BACKUP_SCHEDULER_SESSION_PURPOSE).url;

// --- shared-DB-safe fixtures -------------------------------------------------
// Track ONLY ids this suite created; per-id cleanup (deleteBackup, fallback
// inArray delete) — mirrors tests/unit/backups/backupService.test.ts.
// NEVER `db.delete(backups)` / `db.delete(backupSchedules)` without a where.
const createdIds: string[] = [];
let originalSchedule: typeof backupSchedules.$inferSelect | null = null;

beforeAll(async () => {
  if (!hasDb) return;
  await getBackupSchedule(); // seeds the singleton if absent
  const [row] = await db.select().from(backupSchedules).limit(1);
  originalSchedule = row ?? null; // exact snapshot, incl. enabled/nextRunAt
});

const restoreSchedule = async () => {
  if (!originalSchedule) return;
  await db
    .update(backupSchedules)
    .set({
      enabled: originalSchedule.enabled,
      frequency: originalSchedule.frequency,
      retentionDays: originalSchedule.retentionDays,
      storageDriver: originalSchedule.storageDriver,
      include: originalSchedule.include, // column from 0072 (06)
      nextRunAt: originalSchedule.nextRunAt, // column from 484-01
      lastRunAt: originalSchedule.lastRunAt, // column from 484-01
    })
    .where(eq(backupSchedules.id, originalSchedule.id)); // never delete the row
};

afterEach(async () => {
  if (!hasDb) return;
  for (const id of [...createdIds]) {
    await deleteBackup(id).catch(async () => {
      await db.delete(backups).where(inArray(backups.id, [id]));
    });
    await db.delete(auditLogs).where(eq(auditLogs.targetId, id));
  }
  createdIds.length = 0;
  await restoreSchedule(); // immediately close any due-forcing window
});

afterAll(async () => {
  if (!hasDb) return;
  await restoreSchedule(); // belt-and-braces: no enabled/due schedule left behind
});

// Minimal due-forcing window: set due right before the run; afterEach restores.
// Also widen retentionDays to the max (3650 ≈ 10yr cutoff): TASK-484-03 landed a
// LIVE `pruneExpiredBackups` that the worker now runs after every scheduled backup
// (backupScheduler.ts pruneIfAvailable). With the persisted default (30d) a forced
// run would sweep any real terminal backup older than 30d off the SHARED remote DB
// — a cross-stream data-loss hazard. Widening the window here makes that prune a
// safe no-op; restoreSchedule() in afterEach restores retention_days verbatim.
const forceDue = async () => {
  const s = await getBackupSchedule();
  await db
    .update(backupSchedules)
    .set({ enabled: true, retentionDays: 3650, nextRunAt: new Date(Date.now() - 1000) })
    .where(eq(backupSchedules.id, s.id));
  return s.id;
};

// --- cases -------------------------------------------------------------------

testIfDb("runs a due scheduled backup and advances next_run_at", async () => {
  await withScheduledPassphrase(TEST_PASSPHRASE, async () => {
    await forceDue();
    const id = await runDueScheduledBackups(new Date());
    expect(id).not.toBeNull();
    if (id) createdIds.push(id);
    const after = await getBackupSchedule();
    expect(after.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
    expect(after.lastRunAt).not.toBeNull();

    const [row] = await db.select().from(backups).where(eq(backups.id, id!));
    expect(row!.kind).toBe("scheduled");
    expect(row!.status).toBe("complete"); // passphrase reached createBackup

    const [audit] = await db.select().from(auditLogs).where(eq(auditLogs.targetId, id!));
    expect(audit).toBeTruthy();
    expect(audit!.actorId).toBeNull();
    expect(audit!.action).toBe("backups.create");
    const metadata = audit!.metadata as Record<string, unknown>;
    expect(metadata.source).toBe("scheduler");
    expect(metadata.kind).toBe("scheduled");
    // Success audit must NOT carry a `result` marker — and the passphrase never
    // reaches audit metadata or any column.
    expect(metadata.result).toBeUndefined();
    expect(JSON.stringify(audit)).not.toContain(TEST_PASSPHRASE);
  });
});

testIfDb("skips when not due", async () => {
  const s = await getBackupSchedule();
  await db
    .update(backupSchedules)
    .set({ enabled: true, nextRunAt: new Date(Date.now() + 86_400_000) })
    .where(eq(backupSchedules.id, s.id));
  expect(await runDueScheduledBackups(new Date())).toBeNull();
});

testIfDb("skips when schedule disabled", async () => {
  const s = await getBackupSchedule();
  await db
    .update(backupSchedules)
    .set({ enabled: false, nextRunAt: new Date(Date.now() - 1000) })
    .where(eq(backupSchedules.id, s.id)); // surgical update; afterEach restores
  expect(await runDueScheduledBackups(new Date())).toBeNull();
});

testIfDb("single-flight (in-process): overlapping calls run at most one backup", async () => {
  await withScheduledPassphrase(TEST_PASSPHRASE, async () => {
    await forceDue();
    const [a, b] = await Promise.all([
      runDueScheduledBackups(new Date()),
      runDueScheduledBackups(new Date()),
    ]);
    const ids = [a, b].filter((x): x is string => Boolean(x));
    createdIds.push(...ids);
    expect(ids.length).toBe(1);
  });
});

testIfDb("advisory lock (cross-session): held elsewhere => due run is skipped", async () => {
  await forceDue();
  const holder = postgres(sessionLockUrl(), { max: 1 }); // separate DIRECT session
  try {
    await holder`select pg_advisory_lock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY})`;
    expect(await runDueScheduledBackups(new Date())).toBeNull(); // due, but lock contended
  } finally {
    await holder`select pg_advisory_unlock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY})`;
    await holder.end(); // never leave the lock held
  }
});

testIfDb(
  "advisory lock: released after a normal run (nothing left on the shared DB)",
  async () => {
    await withScheduledPassphrase(TEST_PASSPHRASE, async () => {
      await forceDue();
      const id = await runDueScheduledBackups(new Date());
      if (id) createdIds.push(id);
      const probe = postgres(sessionLockUrl(), { max: 1 }); // fresh DIRECT session
      try {
        const [row] = await probe<{ locked: boolean }[]>`
        select pg_try_advisory_lock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY}) as locked
      `;
        expect(row!.locked).toBe(true); // acquirable => job released it
      } finally {
        await probe`select pg_advisory_unlock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY})`;
        await probe.end();
      }
      // Full DB-snapshot backup + a fresh TLS probe connection against the shared
      // REMOTE Postgres sits right at the 5s default; give it headroom (env latency,
      // not logic) so it does not flake.
    });
  },
  15000
);

testIfDb("a failing createBackup still advances schedule and does not throw", async () => {
  // FAILURE SEAM (process-local, NO shared-DB mutation): point BACKUP_DIR at an
  // unwritable path for this single test. createBackup self-marks `failed` only
  // when createBackupArtifact throws, and the artifact dir is re-resolved on EVERY
  // call via getBackupStorageDir(), so an env swap here is picked up immediately.
  // Use a path whose PARENT is a regular file so mkdir(baseDir, { recursive: true })
  // throws ENOTDIR deterministically for any user.
  // The passphrase is SET so the run goes through the real create path (then
  // fails on the write) instead of the missing-passphrase fail-closed branch —
  // that keeps this test about archive I/O failure, and resets the noise guard.
  await withScheduledPassphrase(TEST_PASSPHRASE, async () => {
    const sentinelFile = path.join(os.tmpdir(), `backup-scheduler-test-${crypto.randomUUID()}`);
    await writeFile(sentinelFile, "not a directory");
    const prevBackupDir = process.env.BACKUP_DIR;
    process.env.BACKUP_DIR = path.join(sentinelFile, "nested"); // mkdir => ENOTDIR
    try {
      await forceDue();
      const id = await runDueScheduledBackups(new Date()); // must RESOLVE, not throw
      expect(id).not.toBeNull(); // failed row still created + returned
      if (id) createdIds.push(id); // per-id cleanup of the failed row
      const [row] = await db.select().from(backups).where(eq(backups.id, id!));
      expect(row!.status).toBe("failed");
      // error is sanitized (sanitizeBackupError maps the backup dir/cwd) — no raw path leaks
      expect(row!.error ?? "").not.toContain(os.tmpdir());
      const after = await getBackupSchedule();
      expect(after.nextRunAt!.getTime()).toBeGreaterThan(Date.now()); // schedule advanced anyway
      expect(after.lastRunAt).not.toBeNull();
    } finally {
      if (prevBackupDir === undefined) delete process.env.BACKUP_DIR;
      else process.env.BACKUP_DIR = prevBackupDir; // always restore the env
      await rm(sentinelFile, { force: true });
    }
  });
});

testIfDb(
  "missing BACKUP_ENCRYPTION_PASSPHRASE is fail-closed, advances, and is noise-guarded per config",
  async () => {
    // This whole test runs WITHOUT the env passphrase: createBackup self-marks
    // `failed` and the scheduler never returns a backup id. The in-memory noise
    // guard bounds this to ONE row + audit per schedule+include configuration,
    // so a misconfigured server cannot accumulate a failed row per tick.
    const priorInclude = (await getBackupSchedule()).include;
    try {
      // --- standard include: record ONCE ---
      await forceDue();
      const first = await runDueScheduledBackups(new Date());
      expect(first).toBeNull(); // fail-closed branch returns null, never an id
      const [failed] = await db
        .select({ id: backups.id, error: backups.error })
        .from(backups)
        .where(eq(backups.kind, "scheduled"))
        .orderBy(sql`created_at desc`)
        .limit(1);
      expect(failed?.error).toBe("backup_passphrase_required");
      const failedId = failed!.id;
      createdIds.push(failedId); // per-id cleanup of the failed row + audits
      const after = await getBackupSchedule();
      expect(after.nextRunAt!.getTime()).toBeGreaterThan(Date.now()); // advanced anyway

      const [audit] = await db.select().from(auditLogs).where(eq(auditLogs.targetId, failedId));
      expect(audit).toBeTruthy();
      const metadata = audit!.metadata as Record<string, unknown>;
      expect(metadata.source).toBe("scheduler");
      expect(metadata.kind).toBe("scheduled");
      expect(metadata.result).toBe("failed"); // explicit fail marker on the failure audit

      // --- same config again: NO new row (noise guard) ---
      const beforeNoise = new Date();
      await forceDue();
      expect(await runDueScheduledBackups(new Date())).toBeNull();
      const newRows = await db
        .select({ id: backups.id })
        .from(backups)
        .where(and(eq(backups.kind, "scheduled"), gte(backups.createdAt, beforeNoise)));
      expect(newRows.length).toBe(0);

      // --- users include is a DISTINCT config: records its own failure once ---
      const s = await getBackupSchedule();
      await db
        .update(backupSchedules)
        .set({ include: ["database", "users"] })
        .where(eq(backupSchedules.id, s.id));
      const beforeUsers = new Date();
      await forceDue();
      expect(await runDueScheduledBackups(new Date())).toBeNull();
      const [usersFailed] = await db
        .select({ id: backups.id, error: backups.error })
        .from(backups)
        .where(eq(backups.kind, "scheduled"))
        .orderBy(sql`created_at desc`)
        .limit(1);
      expect(usersFailed?.error).toBe("backup_users_requires_encryption");
      createdIds.push(usersFailed!.id);
      // The audit row also carries the fail marker for the users config.
      const [usersAudit] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.targetId, usersFailed!.id));
      expect((usersAudit!.metadata as Record<string, unknown>).result).toBe("failed");

      // --- users config again: NO new row ---
      const beforeUsersNoise = new Date();
      await forceDue();
      expect(await runDueScheduledBackups(new Date())).toBeNull();
      const usersNewRows = await db
        .select({ id: backups.id })
        .from(backups)
        .where(and(eq(backups.kind, "scheduled"), gte(backups.createdAt, beforeUsersNoise)));
      expect(usersNewRows.length).toBe(0);
    } finally {
      await db
        .update(backupSchedules)
        .set({ include: priorInclude })
        .where(eq(backupSchedules.id, (await getBackupSchedule()).id));
    }
  },
  60000
);
