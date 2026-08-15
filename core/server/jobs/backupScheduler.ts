import { withSessionDatabaseClient } from "../../db/sessionClient";
import { logAudit } from "../../services/audit/auditService";
import {
  createBackup,
  getBackupSchedule,
  markScheduleRun,
  sanitizeBackupErrorForLog,
} from "../../services/backups/backupService";

const TICK_MS = Number(process.env.BACKUP_SCHEDULER_TICK_MS ?? 60_000);
// Exported so L02 can probe the lock from a separate session.
// Own namespace/key — same PATTERN as STARTUP_MIGRATIONS_LOCK_NAMESPACE (20260604) / KEY (400),
// but distinct values so the scheduler never contends with startup migrations.
export const BACKUP_SCHEDULER_LOCK_NAMESPACE = 20260628;
export const BACKUP_SCHEDULER_LOCK_KEY = 484;

/**
 * Session-lock purpose id (see `core/db/connectionTargets.ts`).
 *
 * This lock CANNOT become `pg_try_advisory_xact_lock`: the guarded region writes
 * a backup artifact to storage, inserts the backup row, advances the schedule,
 * writes an audit row and prunes — deliberately across several transactions,
 * because `createBackup` has to commit its own failure marker. There is no
 * single transaction to scope the lock to.
 */
export const BACKUP_SCHEDULER_SESSION_PURPOSE = "scheduled backup single-flight lock";

let timer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// In-memory noise guard for the missing-passphrase state (06): the FIRST due
// tick without BACKUP_ENCRYPTION_PASSPHRASE persists a `failed` backup row +
// audit entry (fail-closed, correct), but a misconfigured server must not
// accumulate one failed row + audit per tick. Keyed by schedule id + the
// users-vs-standard include configuration, so each distinct config state records
// its failure once. Reset on any successful passphrase run so a later
// misconfiguration re-records once. Single-process state only — the guard bounds
// per-tick write amplification; it is not a correctness lock.
let lastNoPassphraseFailureKey: string | null = null;

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

// Backend-only, 02 env contract: the unattended scheduler passphrase. Never read
// from a request, never returned by any route, never logged.
function resolveScheduledPassphrase(): string | null {
  const raw = process.env.BACKUP_ENCRYPTION_PASSPHRASE;
  return raw && raw.trim() !== "" ? raw : null;
}

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
    // Cross-instance single-flight. Advisory locks are SESSION-scoped, and the shared
    // drizzle client (core/db/client.ts) is a postgres-js POOL pointed at Render's
    // TRANSACTION pooler: lock/unlock would hit different backends and LEAK the lock.
    // withSessionDatabaseClient opens one dedicated connection to the DIRECT port and
    // refuses outright if only a pooled URL is configured.
    return await withSessionDatabaseClient(BACKUP_SCHEDULER_SESSION_PURPOSE, async (lockClient) => {
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
        // 06: resolve the unattended passphrase BEFORE any archive work. Every v2
        // `.cbk` is encrypted (02 has no unencrypted variant; 05 always decrypts),
        // so a missing env var must NEVER emit an archive.
        const passphrase = resolveScheduledPassphrase();
        if (passphrase === null) {
          // FAIL-CLOSED + noise-guarded: createBackup without a passphrase
          // self-marks `failed` (backup_passphrase_required, or the 04 users
          // guard's backup_users_requires_encryption when include has users).
          // Still advance nextRunAt, but persist the failed row + audit only ONCE
          // per schedule+include configuration while the misconfiguration persists.
          const failureKey = `${fresh.id}:${fresh.include.includes("users") ? "users" : "standard"}`;
          await markScheduleRun(fresh.id, now);
          if (lastNoPassphraseFailureKey !== failureKey) {
            lastNoPassphraseFailureKey = failureKey;
            const backup = await createBackup({ kind: "scheduled", include: fresh.include });
            await logAudit({
              actorId: null,
              action: "backups.create",
              targetType: "backup",
              targetId: backup.id,
              metadata: { kind: "scheduled", source: "scheduler", result: "failed" },
            });
          }
          return null;
        }
        // A successful run proves the passphrase IS configured — reset the guard
        // so a later misconfiguration re-records its failure once.
        lastNoPassphraseFailureKey = null;
        const backup = await createBackup({
          kind: "scheduled",
          include: fresh.include,
          passphrase, // never logged, never stored on the row
        }); // never throws (it self-marks failed)
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
    });
    // withSessionDatabaseClient closes the dedicated session on the way out;
    // ending a session also drops any advisory lock it still holds.
  } finally {
    isRunning = false;
  }
}

export function startBackupScheduler() {
  if (timer || !schedulerEnabled()) return;
  timer = setInterval(() => {
    void runDueScheduledBackups(new Date()).catch((error) => {
      // Sanitized only — sanitizeBackupErrorForLog strips cwd/backup-dir; never log
      // raw errors. It uses the LOG length cap, not the `backups.error` column cap:
      // the fail-closed session-target error is 508 characters and its last sentence
      // is the whole remedy (set DATABASE_DIRECT_URL), which the 240-character
      // storage cap used to cut off entirely.
      console.error("[backupScheduler] tick failed:", sanitizeBackupErrorForLog(error));
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
