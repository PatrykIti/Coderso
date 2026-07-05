# TASK-484-02-L01: In-process scheduler job + bootstrap wiring
# FileName: TASK-484-02-L01-In-Process-Backup-Scheduler-Job.md

**Parent Subtask:** TASK-484-02
**Priority:** High
**Category:** `backups` / `runtime-job`
**Estimated Effort:** Medium
**Dependencies:** TASK-484-01 (`next_run_at`/`last_run_at`, `computeNextRunAt`,
`markScheduleRun`). Calls `pruneExpiredBackups` from TASK-484-03 via a **guarded
runtime feature-detect** (dynamic `import()` + `typeof === "function"` check —
see pseudocode): land order is strictly 01 → 02 → 03, so at 02 land time the
export does not exist yet and a static import would fail
`bun --cwd core lint:types`. No stub is added to `backupService.ts` (484-03 is
the single writer of that function).
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Add a time-driven, in-process **backup scheduler** that runs due
  scheduled backups. On each tick it loads the schedule, and if it is enabled and
  `next_run_at <= now`, runs `createBackup({ kind: "scheduled" })`, persists the
  run via `markScheduleRun`, then triggers retention. Started from the server
  bootstrap; single-flight via an in-process flag **and** a Postgres advisory
  lock (so only one app instance runs a given due backup). Exposes a
  deterministic `runDueScheduledBackups(now)` seam for tests and a
  `startBackupScheduler` / `stopBackupScheduler` lifecycle.
- **Owning module(s) to create-or-extend:**
  `core/server/jobs/backupScheduler.ts` (NEW — modelled on
  `core/server/jobs/webhooksDelivery.ts`), `core/server/httpServer.ts` (wire
  `startBackupScheduler()` inside `startHttpServer()` at :494 — the shared
  bootstrap seam both `dev.ts` and `prod.ts` call; `dockerStart.ts` is the
  Docker-only entry, just imports `./prod`, and would leave the scheduler dead
  in local dev),
  `core/services/backups/backupService.ts` (re-use `createBackup`,
  `getBackupSchedule`, `markScheduleRun`; additively export the currently
  module-private `sanitizeBackupError`),
  `core/services/audit/auditService.ts` (re-use `logAudit` — no changes).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out of scope:** retention logic itself (484-03 owns `pruneExpiredBackups`);
  remote upload (484-05); usage (484-06).

---

## Security Contract

This leaf adds a **background job that writes data with no request actor** — a
real contract is required even though it is not a route:

- **Endpoint visibility:** n/a — no HTTP route. The job is internal/server-side
  only and is never reachable from the network.
- **Auth model:** **system actor.** The scheduler runs without a session; it must
  not assume or fabricate a user. Audit logging lives in the **route layer**
  (`backupRoutes.ts` calls `logAudit` after `createBackup` — the service itself
  does NOT audit), so the job must call `logAudit` **explicitly** after each
  scheduled run: `actorId: null`, `action: "backups.create"`,
  `targetType: "backup"`, `targetId: backup.id`,
  `metadata: { kind: "scheduled", source: "scheduler" }` (see pseudocode).
  Without this step scheduled runs would produce no audit trail.
- **RBAC:** n/a — no permission check (there is no caller). The job is the trusted
  system path; it must only ever run the **already-configured** schedule, never
  accept external parameters.
- **CSRF / Rate-limit:** n/a (not request-driven).
- **Validation:** the job reads the persisted schedule only; it passes a fixed
  `include` (the schedule's effective default, i.e. `["database", "media"]`) and
  `kind: "scheduled"` to `createBackup`, which already normalizes via
  `normalizeBackupInclude`. No external input is accepted.
- **Anti-abuse / shared-DB env gate:** the interval is **opt-in outside
  production**: `startBackupScheduler()` starts the timer only when
  `BACKUP_SCHEDULER_ENABLED` is explicitly truthy (`1`/`true`/`on`/`yes`) or
  `NODE_ENV === "production"`. This is the parent Scope requirement ("gated
  behind an env flag so multiple dev instances sharing the remote test DB do
  not all tick") made concrete: the seeded singleton schedule defaults
  `enabled: true` (`getBackupSchedule` seed + `schema.ts` `.default(true)`), so
  a default-on gate would have every shared-DB dev instance firing real
  scheduled backups. Shared-DB dev/test environments leave the flag unset (or
  set `BACKUP_SCHEDULER_ENABLED=0`); production deployments get the scheduler
  without extra configuration. Additionally, single-flight (in-process
  `isRunning` flag) + a Postgres
  advisory lock (`pg_try_advisory_lock`, own namespace/key constants in the
  pattern of `STARTUP_MIGRATIONS_LOCK_NAMESPACE = 20260604` / `..._KEY = 400` in
  `startupMigrations.ts`) so concurrent instances do not double-run a due backup.
  **Session correctness:** advisory locks are session-scoped and the shared
  drizzle client (`core/db/client.ts`) is a postgres-js **pool** (max defaults
  to 10) — lock and unlock could land on different pooled connections, silently
  leaking the lock on the shared remote DB. The lock is therefore acquired and
  released on a **dedicated single-connection client**
  (`postgres(url, { max: 1 })`, closed in `finally`), exactly mirroring
  `runDrizzleStartupMigrations` (`startupMigrations.ts:92-111`). **Check-then-lock
  race:** the due-check is re-run AFTER the lock is acquired (another instance may
  have run and advanced `next_run_at` in between) before calling `createBackup`.
  A missed window runs at most one catch-up (not one-per-missed-interval) because
  `markScheduleRun` advances `next_run_at` from the run time.
- **Secret/PII handling:** the job logs only sanitized errors via
  `sanitizeBackupError` (strips cwd + backup-dir). That helper is currently
  **module-private** (`const` at `backupService.ts:191`); this leaf exports it
  (additive `const` → `export const`) so the tick boundary can log a sanitized
  `console.error` instead of silently swallowing. No credentials, artifact bytes,
  or PII are logged. Storage credentials are touched only indirectly via
  `createBackup` → storage settings.

---

## Implementation Pseudocode

### `core/server/jobs/backupScheduler.ts`

```ts
import { createBackup, getBackupSchedule, markScheduleRun, sanitizeBackupError } from "../../services/backups/backupService";
import { logAudit } from "../../services/audit/auditService";
import postgres from "postgres";

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
  return process.env.NODE_ENV === "production";   // opt-in outside production
};

// 484-03 lands `pruneExpiredBackups` AFTER this leaf (land order 01 -> 02 -> 03).
// Guarded runtime feature-detect (NOT a static import, which would fail lint:types
// until 03 merges; NOT a stub in backupService.ts, which 484-03 solely owns):
async function pruneIfAvailable(retentionDays: number, now: Date): Promise<void> {
  const backupService: Record<string, unknown> = await import("../../services/backups/backupService");
  const prune = backupService["pruneExpiredBackups"];
  if (typeof prune === "function") await prune(retentionDays, now);
}

// Deterministic, test-callable core. Returns the created backup id or null.
export async function runDueScheduledBackups(now: Date): Promise<string | null> {
  if (isRunning) return null;          // in-process single-flight
  isRunning = true;
  try {
    const schedule = await getBackupSchedule();
    if (!schedule.enabled || !schedule.nextRunAt || schedule.nextRunAt.getTime() > now.getTime()) {
      return null;                     // disabled or not due — cheap pre-check before locking
    }
    // Cross-instance single-flight. Advisory locks are SESSION-scoped and the shared
    // drizzle client (core/db/client.ts) is a postgres-js POOL (max 10): lock/unlock
    // could hit different pooled connections and LEAK the lock on the shared remote DB.
    // Use a dedicated single-connection client, mirroring runDrizzleStartupMigrations
    // (core/server/startupMigrations.ts:92-111).
    const lockClient = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
      const [{ locked }] =
        await lockClient`select pg_try_advisory_lock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY}) as locked`;
      if (!locked) return null;
      try {
        // Re-check AFTER acquiring the lock: another instance may have run and
        // advanced next_run_at between our pre-check and lock acquisition
        // (check-then-lock race) — without this, a stale due=true double-runs.
        const fresh = await getBackupSchedule();
        if (!fresh.enabled || !fresh.nextRunAt || fresh.nextRunAt.getTime() > now.getTime()) {
          return null;
        }
        const backup = await createBackup({ kind: "scheduled" }); // never throws (it self-marks failed)
        await markScheduleRun(fresh.id, now);                     // advances next_run_at from `now`
        await logAudit({
          actorId: null,                                          // system actor — no session, no fabricated user
          action: "backups.create",
          targetType: "backup",
          targetId: backup.id,
          metadata: { kind: "scheduled", source: "scheduler" },
        });
        await pruneIfAvailable(fresh.retentionDays, now);         // 484-03 (guarded, no-op until it lands)
        return backup.id;
      } finally {
        await lockClient`select pg_advisory_unlock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY})`;
      }
    } finally {
      await lockClient.end();          // close the dedicated session (session end also drops any held lock)
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
  if (timer) { clearInterval(timer); timer = null; }
}
```

### Bootstrap wiring (`core/server/httpServer.ts` — inside `startHttpServer()`)

```ts
import { startBackupScheduler } from "./jobs/backupScheduler";   // NEW

export function startHttpServer(options: HttpServerOptions = {}) {  // httpServer.ts:494
  // ...existing boot hooks (void ensureThemesLoaded(), void
  // initializeDocsIndexOnBootIfEnabled()) stay untouched...
  startBackupScheduler();   // NEW — shared seam: dev.ts:9 and prod.ts:4 both call
                            // startHttpServer; dockerStart.ts imports ./prod (and has
                            // already awaited runStartupMigrations, so columns exist
                            // in Docker; local dev relies on `bun run db:migrate`
                            // having been applied, same as every other column read)
  // ...existing Bun.serve(serveOptions) return...
}
```

**Data flow:** interval tick → `runDueScheduledBackups(now)` → schedule pre-check →
advisory lock (dedicated `max: 1` session) → post-lock re-check → `createBackup` →
`markScheduleRun` → `logAudit` (actorId `null`, source `"scheduler"`) →
`pruneIfAvailable` (guarded 484-03 hook).

**Error handling:** `createBackup` already converts internal failures into a
`failed` row (it does not throw); any unexpected throw is caught at the tick
boundary and logged as a **sanitized** `console.error` via the newly exported
`sanitizeBackupError` (never silently swallowed, never raw), and the loop
continues. The advisory lock is always released in `finally` **on the same
dedicated session that acquired it**, and that session is closed
(`lockClient.end()`) in an outer `finally` — so even a release failure cannot
leak the lock past the session's lifetime. No domain code needs route mapping
(no route).

**Regression-test shape (Bun):** see L02.

---

## Testing Requirements

Bun lane (runtime + DB). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/integration/runtime/backupScheduler.test.ts` (added in L02).
- Manual: with `BACKUP_SCHEDULER_ENABLED=1` **explicitly set** (the gate is
  opt-in outside production), `BACKUP_SCHEDULER_TICK_MS` small and a due
  schedule, a `kind: "scheduled"` row appears and `next_run_at` advances.
  Unset the flag (and restore the schedule) afterwards — the DB is shared.
