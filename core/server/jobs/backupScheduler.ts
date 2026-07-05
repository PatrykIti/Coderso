import postgres from "postgres";

import { logAudit } from "../../services/audit/auditService";
import {
  createBackup,
  getBackupSchedule,
  markScheduleRun,
  sanitizeBackupError,
} from "../../services/backups/backupService";

const TICK_MS = Number(process.env.BACKUP_SCHEDULER_TICK_MS ?? 60_000);
// Exported so L02 can probe the lock from a separate session.
// Own namespace/key — same PATTERN as STARTUP_MIGRATIONS_LOCK_NAMESPACE (20260604) / KEY (400),
// but distinct values so the scheduler never contends with startup migrations.
export const BACKUP_SCHEDULER_LOCK_NAMESPACE = 20260628;
export const BACKUP_SCHEDULER_LOCK_KEY = 484;

let timer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// OPT-IN outside production (default OFF) — parent rationale: the flag exists
// "so multiple dev instances sharing the remote test DB do not all tick".
// The seeded singleton schedule defaults enabled: true (getBackupSchedule seed
// in backupService.ts + schema.ts backupSchedules.enabled .default(true)), so a
// default-on interval would make EVERY dev server pointed at the shared
// render.com Postgres start firing real daily backups (untracked backups rows,
// artifacts, actorId-null audit_logs) the moment 02 lands, and would let an
// outside instance consume L02's forceDue() windows (flaky tests + orphan rows).
// Production defaults ON; any environment can override explicitly.
const truthy = (value: string) => ["1", "true", "on", "yes"].includes(value.toLowerCase());
const schedulerEnabled = () => {
  const flag = process.env.BACKUP_SCHEDULER_ENABLED;
  if (flag !== undefined && flag !== "") return truthy(flag);
  return process.env.NODE_ENV === "production"; // opt-in outside production
};

// 484-03 lands `pruneExpiredBackups` AFTER this leaf (land order 01 -> 02 -> 03).
// Guarded runtime feature-detect (NOT a static import, which would fail lint:types
// until 03 merges; NOT a stub in backupService.ts, which 484-03 solely owns):
async function pruneIfAvailable(retentionDays: number, now: Date): Promise<void> {
  const backupService: Record<string, unknown> =
    await import("../../services/backups/backupService");
  const prune = backupService["pruneExpiredBackups"];
  if (typeof prune === "function") {
    await (prune as (retentionDays: number, now: Date) => Promise<unknown>)(retentionDays, now);
  }
}

// Deterministic, test-callable core. Returns the created backup id or null.
export async function runDueScheduledBackups(now: Date): Promise<string | null> {
  if (isRunning) return null; // in-process single-flight
  isRunning = true;
  try {
    const schedule = await getBackupSchedule();
    if (!schedule.enabled || !schedule.nextRunAt || schedule.nextRunAt.getTime() > now.getTime()) {
      return null; // disabled or not due — cheap pre-check before locking
    }
    // Cross-instance single-flight. Advisory locks are SESSION-scoped and the shared
    // drizzle client (core/db/client.ts) is a postgres-js POOL (max 10): lock/unlock
    // could hit different pooled connections and LEAK the lock on the shared remote DB.
    // Use a dedicated single-connection client, mirroring runDrizzleStartupMigrations
    // (core/server/startupMigrations.ts:92-111).
    const lockClient = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
      const [lockRow] = await lockClient<{ locked: boolean }[]>`
        select pg_try_advisory_lock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY}) as locked
      `;
      if (!lockRow?.locked) return null;
      try {
        // Re-check AFTER acquiring the lock: another instance may have run and
        // advanced next_run_at between our pre-check and lock acquisition
        // (check-then-lock race) — without this, a stale due=true double-runs.
        const fresh = await getBackupSchedule();
        if (!fresh.enabled || !fresh.nextRunAt || fresh.nextRunAt.getTime() > now.getTime()) {
          return null;
        }
        const backup = await createBackup({ kind: "scheduled" }); // never throws (it self-marks failed)
        await markScheduleRun(fresh.id, now); // advances next_run_at from `now`
        await logAudit({
          actorId: null, // system actor — no session, no fabricated user
          action: "backups.create",
          targetType: "backup",
          targetId: backup.id,
          metadata: { kind: "scheduled", source: "scheduler" },
        });
        await pruneIfAvailable(fresh.retentionDays, now); // 484-03 (guarded, no-op until it lands)
        return backup.id;
      } finally {
        await lockClient`select pg_advisory_unlock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY})`;
      }
    } finally {
      await lockClient.end(); // close the dedicated session (session end also drops any held lock)
    }
  } finally {
    isRunning = false;
  }
}

export function startBackupScheduler() {
  if (timer || !schedulerEnabled()) return;
  timer = setInterval(() => {
    void runDueScheduledBackups(new Date()).catch((error) => {
      // Sanitized only — sanitizeBackupError strips cwd/backup-dir; never log raw errors.
      console.error("[backupScheduler] tick failed:", sanitizeBackupError(error));
    });
  }, TICK_MS);
  if (typeof timer.unref === "function") timer.unref(); // do not hold the process open
}

export function stopBackupScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
