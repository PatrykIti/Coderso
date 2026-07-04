# TASK-484-02-L01: In-process scheduler job + bootstrap wiring
# FileName: TASK-484-02-L01-In-Process-Backup-Scheduler-Job.md

**Parent Subtask:** TASK-484-02
**Priority:** High
**Category:** `backups` / `runtime-job`
**Estimated Effort:** Medium
**Dependencies:** TASK-484-01 (`next_run_at`/`last_run_at`, `computeNextRunAt`,
`markScheduleRun`). Calls `pruneExpiredBackups` from TASK-484-03 (guarded if not
yet present).
**Status:** ⏳ To Do
**Started:**
**Completed:**

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
  `core/server/jobs/webhooksDelivery.ts`), `core/server/dockerStart.ts` (wire
  `startBackupScheduler()` after `runStartupMigrations()`),
  `core/services/backups/backupService.ts` (re-use `createBackup`,
  `getBackupSchedule`, `markScheduleRun`).
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
  not assume or fabricate a user. Its `createBackup` audit entry is written with
  `actorId: null` and a `metadata.source: "scheduler"` marker (mirroring how
  `backupRoutes.ts` logs `backups.create`, but actor-less).
- **RBAC:** n/a — no permission check (there is no caller). The job is the trusted
  system path; it must only ever run the **already-configured** schedule, never
  accept external parameters.
- **CSRF / Rate-limit:** n/a (not request-driven).
- **Validation:** the job reads the persisted schedule only; it passes a fixed
  `include` (the schedule's effective default, i.e. `["database", "media"]`) and
  `kind: "scheduled"` to `createBackup`, which already normalizes via
  `normalizeBackupInclude`. No external input is accepted.
- **Anti-abuse:** single-flight (in-process `isRunning` flag) + a Postgres
  advisory lock (`pg_try_advisory_lock`, namespace/key constants like
  `STARTUP_MIGRATIONS_LOCK_NAMESPACE/KEY` in `startupMigrations.ts`) so concurrent
  instances do not double-run a due backup; a missed window runs at most one
  catch-up (not one-per-missed-interval) because `markScheduleRun` advances
  `next_run_at` from the run time.
- **Secret/PII handling:** the job logs only sanitized errors
  (`sanitizeBackupError`, which strips cwd + backup-dir); no credentials, artifact
  bytes, or PII are logged. Storage credentials are touched only indirectly via
  `createBackup` → storage settings.

---

## Implementation Pseudocode

### `core/server/jobs/backupScheduler.ts`

```ts
import { createBackup, getBackupSchedule, markScheduleRun } from "../../services/backups/backupService";
import { pruneExpiredBackups } from "../../services/backups/backupService"; // 484-03
import { db } from "../../db/client";
import { sql } from "drizzle-orm";

const TICK_MS = Number(process.env.BACKUP_SCHEDULER_TICK_MS ?? 60_000);
const LOCK_NS = 20260628; // advisory-lock namespace (mirrors startupMigrations)
const LOCK_KEY = 484;

let timer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

const schedulerEnabled = () =>
  !["0", "false", "off", "no"].includes((process.env.BACKUP_SCHEDULER_ENABLED ?? "1").toLowerCase());

// Deterministic, test-callable core. Returns the created backup id or null.
export async function runDueScheduledBackups(now: Date): Promise<string | null> {
  if (isRunning) return null;          // in-process single-flight
  isRunning = true;
  try {
    const schedule = await getBackupSchedule();
    if (!schedule.enabled || !schedule.nextRunAt || schedule.nextRunAt.getTime() > now.getTime()) {
      return null;                     // disabled or not due
    }
    // cross-instance single-flight
    const [{ locked }] = await db.execute(
      sql`select pg_try_advisory_lock(${LOCK_NS}, ${LOCK_KEY}) as locked`
    );
    if (!locked) return null;
    try {
      const backup = await createBackup({ kind: "scheduled" });   // never throws (it self-marks failed)
      await markScheduleRun(schedule.id, now);                    // advances next_run_at from `now`
      await pruneExpiredBackups(schedule.retentionDays, now);     // 484-03
      return backup.id;
    } finally {
      await db.execute(sql`select pg_advisory_unlock(${LOCK_NS}, ${LOCK_KEY})`);
    }
  } finally {
    isRunning = false;
  }
}

export function startBackupScheduler() {
  if (timer || !schedulerEnabled()) return;
  timer = setInterval(() => {
    void runDueScheduledBackups(new Date()).catch(() => { /* errors are self-contained + audited */ });
  }, TICK_MS);
  if (typeof timer.unref === "function") timer.unref(); // do not hold the process open
}

export function stopBackupScheduler() {
  if (timer) { clearInterval(timer); timer = null; }
}
```

### Bootstrap wiring (`core/server/dockerStart.ts`)

```ts
import { runStartupMigrations } from "./startupMigrations";
import { startBackupScheduler } from "./jobs/backupScheduler";   // NEW
await runStartupMigrations();
await runStartupAssistantDocsReindex();
startBackupScheduler();                                          // NEW — after migrations so columns exist
```

**Data flow:** interval tick → `runDueScheduledBackups(now)` → schedule read →
(due + lock) → `createBackup` → `markScheduleRun` → `pruneExpiredBackups`.

**Error handling:** `createBackup` already converts internal failures into a
`failed` row (it does not throw); any unexpected throw is swallowed at the tick
boundary and the loop continues. Advisory lock is always released in `finally`.
No domain code needs route mapping (no route).

**Regression-test shape (Bun):** see L02.

---

## Testing Requirements

Bun lane (runtime + DB). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/integration/runtime/backupScheduler.test.ts` (added in L02).
- Manual: with `BACKUP_SCHEDULER_TICK_MS` small and a due schedule, a
  `kind: "scheduled"` row appears and `next_run_at` advances.
