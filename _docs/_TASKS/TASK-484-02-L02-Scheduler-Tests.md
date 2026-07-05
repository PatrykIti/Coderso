# TASK-484-02-L02: Scheduler runtime + advisory-lock tests
# FileName: TASK-484-02-L02-Scheduler-Tests.md

**Parent Subtask:** TASK-484-02
**Priority:** High
**Category:** `backups` / `runtime-tests`
**Estimated Effort:** Small
**Dependencies:** TASK-484-02-L01 (`runDueScheduledBackups`, `startBackupScheduler`,
`stopBackupScheduler`, exported `BACKUP_SCHEDULER_LOCK_NAMESPACE` /
`BACKUP_SCHEDULER_LOCK_KEY` for cross-session lock probes).
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Prove the scheduler runs due backups, skips non-due/disabled
  schedules, advances `next_run_at`, is single-flight (both in-process AND
  cross-session via the advisory lock), releases the advisory lock after every
  run, and survives errors — using the deterministic `runDueScheduledBackups(now)`
  seam so tests do not wait on wall-clock intervals.

> **SHARED REMOTE TEST DB:** all three parallel task streams (482/483/484) plus
> the owner share ONE Postgres (render.com, `DATABASE_URL` in `.env`). This suite
> must use uniquely scoped fixtures and clean up ONLY rows it created —
> truncating/deleting whole shared tables is forbidden. It must not leave an
> enabled schedule or a held advisory lock behind, and it must never delete the
> singleton `backup_schedules` row (a `getBackupSchedule()` read would re-seed it
> with `enabled: true`, destroying the owner's real config — see
> `backupService.ts:413-433`). Instead the suite snapshots the row in `beforeAll`
> and restores its exact field values after every test.
>
> **Interval scheduler stays OFF during the suite:** the tests never call
> `startBackupScheduler()` and only drive the deterministic
> `runDueScheduledBackups(now)` seam. L01's env gate is opt-in outside
> production (`BACKUP_SCHEDULER_ENABLED` explicitly truthy or
> `NODE_ENV === "production"`), so no local interval ticks; the test env must
> NOT set `BACKUP_SCHEDULER_ENABLED` truthy. This also protects the
> `forceDue()` windows — with the gate default-on, any other dev instance on
> the shared DB could consume a due window mid-test (orphan untracked backup
> row + a null return from the suite's own run).
- **Owning module(s) to create-or-extend:**
  `tests/integration/runtime/backupScheduler.test.ts` (NEW, `bun:test`),
  exercising `core/server/jobs/backupScheduler.ts` + `backupService`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/SECURITY_SPEC.md`.
- **Out of scope:** route tests (those live with the backup route suite); retention
  internals (484-03 tests).

> **Lane rationale:** runtime job + DB + advisory lock ⇒ **Bun lane**
> (`tests/integration/runtime/*`), matching the existing backup Bun tests. This is
> not a pure function, so it is not a Vitest candidate.

---

## Security Contract

Test-only leaf — no route, no auth, no data contract beyond what it asserts.

- **Endpoint visibility / Auth / RBAC / CSRF / Rate-limit:** n/a.
- **Validation / Anti-abuse:** the test asserts the **single-flight** properties
  of L01 both in-process (`isRunning` flag) and cross-session (advisory-lock
  contention + post-run release from a separate dedicated `postgres` connection),
  and the **system-actor** property (`audit_logs` row with `actorId: null` and
  `metadata.source: "scheduler"` — no fabricated user).
- **Secret/PII handling:** the test must assert no credentials/paths leak into
  any logged error it captures (sanitized error only).
- **Shared-DB safety:** fixture-scoped cleanup only (per-id backup deletion +
  schedule snapshot/restore); no whole-table deletes, no enabled schedule or
  held advisory lock left behind (see Overview pin).

---

## Implementation Pseudocode

```ts
import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import {
  BACKUP_SCHEDULER_LOCK_KEY,
  BACKUP_SCHEDULER_LOCK_NAMESPACE,
  runDueScheduledBackups,
} from "../../../core/server/jobs/backupScheduler";
import { db } from "../../../core/db/client";
import { backups, backupSchedules } from "../../../core/db/schema";
import { deleteBackup, getBackupSchedule } from "../../../core/services/backups/backupService";

// hasDb / testIfDb guard exactly as in tests/unit/backups/backupService.test.ts
// (canConnect() probe; skip DB-backed cases when no DATABASE_URL / unreachable).

// --- shared-DB-safe fixtures -------------------------------------------------
// Track ONLY ids this suite created; per-id cleanup (deleteBackup, fallback
// inArray delete) — mirrors tests/unit/backups/backupService.test.ts:30-40.
// NEVER `db.delete(backups)` / `db.delete(backupSchedules)` without a where.
const createdIds: string[] = [];
let originalSchedule: typeof backupSchedules.$inferSelect | null = null;

beforeAll(async () => {
  await getBackupSchedule();                             // seeds the singleton if absent
  const [row] = await db.select().from(backupSchedules).limit(1);
  originalSchedule = row ?? null;                        // exact snapshot, incl. enabled/nextRunAt
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
      nextRunAt: originalSchedule.nextRunAt,             // column from 484-01
      lastRunAt: originalSchedule.lastRunAt,             // column from 484-01
    })
    .where(eq(backupSchedules.id, originalSchedule.id)); // never delete the row
};

afterEach(async () => {
  for (const id of [...createdIds]) {
    await deleteBackup(id).catch(async () => {
      await db.delete(backups).where(inArray(backups.id, [id]));
    });
  }
  createdIds.length = 0;
  await restoreSchedule();   // immediately close any due-forcing window
});

afterAll(async () => {
  await restoreSchedule();   // belt-and-braces: no enabled/due schedule left behind
});

// Minimal due-forcing window: set due right before the run; afterEach restores.
const forceDue = async () => {
  const s = await getBackupSchedule();
  await db
    .update(backupSchedules)
    .set({ enabled: true, nextRunAt: new Date(Date.now() - 1000) })
    .where(eq(backupSchedules.id, s.id));
  return s.id;
};

// --- cases -------------------------------------------------------------------

test("runs a due scheduled backup and advances next_run_at", async () => {
  await forceDue();
  const id = await runDueScheduledBackups(new Date());
  expect(id).not.toBeNull();
  if (id) createdIds.push(id);
  const after = await getBackupSchedule();
  expect(after.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
  expect(after.lastRunAt).not.toBeNull();
  // assert the created row has kind === "scheduled"; assert an audit_logs row
  // exists with actorId null, action "backups.create", metadata.source "scheduler"
});

test("skips when not due", async () => {
  const s = await getBackupSchedule();
  await db
    .update(backupSchedules)
    .set({ enabled: true, nextRunAt: new Date(Date.now() + 86_400_000) })
    .where(eq(backupSchedules.id, s.id));
  expect(await runDueScheduledBackups(new Date())).toBeNull();
});

test("skips when schedule disabled", async () => {
  const s = await getBackupSchedule();
  await db
    .update(backupSchedules)
    .set({ enabled: false, nextRunAt: new Date(Date.now() - 1000) })
    .where(eq(backupSchedules.id, s.id));                // surgical update; afterEach restores
  expect(await runDueScheduledBackups(new Date())).toBeNull();
});

test("single-flight (in-process): overlapping calls run at most one backup", async () => {
  await forceDue();
  const [a, b] = await Promise.all([runDueScheduledBackups(new Date()), runDueScheduledBackups(new Date())]);
  const ids = [a, b].filter((x): x is string => Boolean(x));
  createdIds.push(...ids);
  expect(ids.length).toBe(1);
});

test("advisory lock (cross-session): held elsewhere => due run is skipped", async () => {
  await forceDue();
  const holder = postgres(process.env.DATABASE_URL!, { max: 1 });   // separate session
  try {
    await holder`select pg_advisory_lock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY})`;
    expect(await runDueScheduledBackups(new Date())).toBeNull();    // due, but lock contended
  } finally {
    await holder`select pg_advisory_unlock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY})`;
    await holder.end();                                             // never leave the lock held
  }
});

test("advisory lock: released after a normal run (nothing left on the shared DB)", async () => {
  await forceDue();
  const id = await runDueScheduledBackups(new Date());
  if (id) createdIds.push(id);
  const probe = postgres(process.env.DATABASE_URL!, { max: 1 });    // fresh session
  try {
    const [{ locked }] =
      await probe`select pg_try_advisory_lock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY}) as locked`;
    expect(locked).toBe(true);                                      // acquirable => job released it
  } finally {
    await probe`select pg_advisory_unlock(${BACKUP_SCHEDULER_LOCK_NAMESPACE}, ${BACKUP_SCHEDULER_LOCK_KEY})`;
    await probe.end();
  }
});

test("a failing createBackup still advances schedule and does not throw", async () => {
  // FAILURE SEAM (process-local, NO shared-DB mutation): point BACKUP_DIR at an
  // unwritable path for this single test. createBackup self-marks `failed` only
  // when createBackupArtifact throws (backupService.ts: try { createBackupArtifact }
  // catch { markBackupFailed }), and the artifact dir is re-resolved on EVERY call
  // via getBackupStorageDir() = path.resolve(cwd, process.env.BACKUP_DIR ?? "storage/backups"),
  // so an env swap here is picked up immediately. Use a path whose PARENT is a
  // regular file so `mkdir(baseDir, { recursive: true })` throws ENOTDIR
  // deterministically for any user (more robust than a permissions-based path).
  // Alternative seam: bun:test `mock.module` on node:fs/promises to make
  // mkdir/writeFile throw — acceptable, but the env seam is simpler.
  // FORBIDDEN: inducing the failure by mutating shared singleton state on the
  // shared render.com DB — do NOT corrupt the storage-settings row and do NOT
  // break the backup_schedules row; both are owner-visible shared config.
  const sentinelFile = path.join(os.tmpdir(), `backup-scheduler-test-${crypto.randomUUID()}`);
  await writeFile(sentinelFile, "not a directory");
  const prevBackupDir = process.env.BACKUP_DIR;
  process.env.BACKUP_DIR = path.join(sentinelFile, "nested"); // mkdir => ENOTDIR
  try {
    await forceDue();
    const id = await runDueScheduledBackups(new Date());   // must RESOLVE, not throw
    expect(id).not.toBeNull();                             // failed row still created + returned
    if (id) createdIds.push(id);                           // per-id cleanup of the failed row
    // row is self-marked failed; error is sanitized (sanitizeBackupError maps the
    // backup dir to "[backup-dir]" and cwd to "[cwd]" — assert no raw path leaks)
    const [row] = await db.select().from(backups).where(eq(backups.id, id!));
    expect(row!.status).toBe("failed");
    expect(row!.error ?? "").not.toContain(os.tmpdir());
    const after = await getBackupSchedule();
    expect(after.nextRunAt!.getTime()).toBeGreaterThan(Date.now()); // schedule advanced anyway
    expect(after.lastRunAt).not.toBeNull();
  } finally {
    if (prevBackupDir === undefined) delete process.env.BACKUP_DIR;
    else process.env.BACKUP_DIR = prevBackupDir;           // always restore the env
    await rm(sentinelFile, { force: true });
  }
});
```

**Regression-test shape:** the seven cases above (due, not-due, disabled,
in-process single-flight, cross-session advisory-lock contention, advisory-lock
release, error-resilient via the process-local unwritable-`BACKUP_DIR` seam —
never via shared-DB state corruption) plus assertions that the created row has
`kind === "scheduled"` and that the scheduled run wrote an `audit_logs` row with
`actorId: null` and `metadata.source === "scheduler"`. The suite must exit with
the schedule row byte-identical to its `beforeAll` snapshot and no advisory lock
held.

---

## Testing Requirements

Bun lane. Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/integration/runtime/backupScheduler.test.ts`
- State in the closeout if the DB lane was skipped (no DB) and why.
