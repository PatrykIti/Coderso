/**
 * TASK-571: dispatch + retention scheduler for form-submissions export jobs.
 *
 * Mirrors `backupScheduler.ts` (the repo's concrete scheduler pattern — there
 * is no outbox implementation): an env-gated `setInterval` ticker, a session
 * advisory lock with its OWN namespace/key, and a start-seam registration in
 * `core/server/httpServer.ts`. The SAME tick dispatches queued export jobs
 * (bounded per tick) and runs the bounded, resumable retention prune of
 * expired `submission_export_jobs` rows + artifact files — no new competing
 * loop is introduced.
 *
 * The lock MUST be a session (not transaction) advisory lock: the guarded
 * region runs each job (multiple transactions + artifact file IO) across
 * separate transactions, so a transaction-scoped lock would release between
 * them. `withSessionDatabaseClient` opens one dedicated DIRECT-port connection
 * and refuses outright if only a pooled URL is configured.
 */

import { withSessionDatabaseClient } from "../../db/sessionClient";
import {
  pruneExpiredSubmissionExportJobs,
  runSubmissionExportJob,
  submissionExportErrorForLog,
} from "../../services/forms/submissionExportJob";

const TICK_MS = Number(process.env.FORM_SUBMISSIONS_EXPORT_SCHEDULER_TICK_MS ?? 30_000);

// Own namespace/key — same PATTERN as BACKUP_SCHEDULER_LOCK_NAMESPACE (20260628)
// / KEY (484) and STARTUP_MIGRATIONS_LOCK_NAMESPACE (20260604) / KEY (400), but
// distinct values so the export scheduler never contends with either.
export const SUBMISSION_EXPORT_SCHEDULER_LOCK_NAMESPACE = 20260818;
export const SUBMISSION_EXPORT_SCHEDULER_LOCK_KEY = 571;

/**
 * Session-lock purpose id (see `core/db/connectionTargets.ts`).
 *
 * This lock CANNOT become `pg_try_advisory_xact_lock`: the guarded region runs
 * export jobs (each spanning several transactions and artifact file IO) and the
 * retention prune — deliberately across multiple transactions, mirroring the
 * backup scheduler. There is no single transaction to scope the lock to.
 */
export const SUBMISSION_EXPORT_SCHEDULER_SESSION_PURPOSE = "submission export single-flight lock";

const DEFAULT_JOBS_PER_TICK = 5;
const parsePositiveInt = (raw: string | undefined, fallback: number, max: number): number => {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
};
const resolveJobsPerTick = (): number =>
  parsePositiveInt(process.env.FORM_SUBMISSIONS_EXPORT_JOBS_PER_TICK, DEFAULT_JOBS_PER_TICK, 100);

let timer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// OPT-IN outside production (default OFF) — same rationale as the backup
// scheduler: multiple dev instances sharing the remote test DB must not all
// tick and dispatch export jobs / prune rows the owning suite created.
const truthy = (value: string) => ["1", "true", "on", "yes"].includes(value.toLowerCase());
const schedulerEnabled = () => {
  const flag = process.env.FORM_SUBMISSIONS_EXPORT_SCHEDULER_ENABLED;
  if (flag !== undefined && flag !== "") return truthy(flag);
  return process.env.NODE_ENV === "production"; // opt-in outside production
};

export type SubmissionExportSchedulerRun = {
  jobsRun: number;
  pruned: number;
  deletedArtifacts: number;
};

/**
 * Deterministic, test-callable core: dispatch up to N queued jobs, then prune
 * expired jobs + artifacts, all under the advisory session lock.
 */
export async function runDueSubmissionExports(
  now: Date = new Date()
): Promise<SubmissionExportSchedulerRun> {
  if (isRunning) return { jobsRun: 0, pruned: 0, deletedArtifacts: 0 }; // in-process single-flight
  isRunning = true;
  try {
    // Cross-instance single-flight. Advisory locks are SESSION-scoped and the
    // shared drizzle client is a postgres.js POOL (possibly behind a
    // transaction pooler): lock/unlock would hit different backends and LEAK
    // the lock. withSessionDatabaseClient opens one dedicated connection to the
    // DIRECT port and refuses outright if only a pooled URL is configured.
    return await withSessionDatabaseClient(
      SUBMISSION_EXPORT_SCHEDULER_SESSION_PURPOSE,
      async (lockClient) => {
        const [lockRow] = await lockClient<{ locked: boolean }[]>`
          select pg_try_advisory_lock(${SUBMISSION_EXPORT_SCHEDULER_LOCK_NAMESPACE}, ${SUBMISSION_EXPORT_SCHEDULER_LOCK_KEY}) as locked
        `;
        if (!lockRow?.locked) return { jobsRun: 0, pruned: 0, deletedArtifacts: 0 };
        try {
          const queued = await lockClient<{ id: string }[]>`
            select id from submission_export_jobs
            where status = 'queued'
            order by created_at asc, id asc
            limit ${resolveJobsPerTick()}
          `;
          let jobsRun = 0;
          for (const job of queued) {
            try {
              await runSubmissionExportJob(job.id);
              jobsRun += 1;
            } catch (error) {
              // The job service self-marks `failed` with a machine-readable
              // error_code; the tick logs only a sanitized code (never payloads,
              // tokens, artifact paths or driver messages) and moves on.
              console.error(
                "[submissionExportScheduler] job failed:",
                submissionExportErrorForLog(error)
              );
            }
          }
          const prune = await pruneExpiredSubmissionExportJobs(now);
          return { jobsRun, pruned: prune.pruned, deletedArtifacts: prune.deletedArtifacts };
        } finally {
          await lockClient`select pg_advisory_unlock(${SUBMISSION_EXPORT_SCHEDULER_LOCK_NAMESPACE}, ${SUBMISSION_EXPORT_SCHEDULER_LOCK_KEY})`;
        }
      }
    );
    // withSessionDatabaseClient closes the dedicated session on the way out;
    // ending a session also drops any advisory lock it still holds.
  } finally {
    isRunning = false;
  }
}

export function startSubmissionExportScheduler() {
  if (timer || !schedulerEnabled()) return;
  timer = setInterval(() => {
    void runDueSubmissionExports(new Date()).catch((error) => {
      console.error("[submissionExportScheduler] tick failed:", submissionExportErrorForLog(error));
    });
  }, TICK_MS);
  if (typeof timer.unref === "function") timer.unref(); // do not hold the process open
}

export function stopSubmissionExportScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
