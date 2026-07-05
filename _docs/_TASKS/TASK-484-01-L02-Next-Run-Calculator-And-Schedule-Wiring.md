# TASK-484-01-L02: `computeNextRunAt` + schedule service wiring
# FileName: TASK-484-01-L02-Next-Run-Calculator-And-Schedule-Wiring.md

**Parent Subtask:** TASK-484-01
**Priority:** High
**Category:** `backups` / `domain-service`
**Estimated Effort:** Small
**Dependencies:** TASK-484-01-L01 (columns + type fields must exist).
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Add the pure `computeNextRunAt(frequency, from)` calculator and wire
  it into the schedule service so `next_run_at` is **seeded** on schedule
  creation and **recomputed** when the schedule is enabled or its frequency
  changes; add a `markScheduleRun(scheduleId, runAt)` helper the scheduler
  (484-02) calls after a run.
- **Owning module(s) to create-or-extend:**
  `core/services/backups/backupService.ts` — `computeNextRunAt` (pure, exported),
  `getBackupSchedule` (413-433, seed `next_run_at`), `setBackupSchedule`
  (435-460, recompute on enable/frequency change), and new `markScheduleRun`.
  The frequency enum stays owned by `backupTypes.ts` (`BackupFrequency`).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out of scope:** the scheduler tick/job (484-02); retention (484-03). This
  leaf only computes + persists the schedule run metadata.

---

## Security Contract

Data/service leaf (no new route):

- **Endpoint visibility:** n/a — consumed by the existing internal
  `GET/PATCH /admin/api/backups/schedule` routes (`backupRoutes.ts` 186-206).
- **Auth model / RBAC:** unchanged (`backups:read` read, `backups:write` write).
- **CSRF / Rate-limit:** unchanged at the existing route; n/a in the service.
- **Validation:** `next_run_at` / `last_run_at` remain **server-computed** —
  `scheduleUpdateSchema` (`backupSchemas.ts`) is NOT widened to accept them;
  client input still rejects unknown keys. `computeNextRunAt` only accepts a
  validated `BackupFrequency`.
- **Anti-abuse:** n/a (internal only).
- **Secret/PII handling:** none — only timestamps + an enum.

---

## Implementation Pseudocode

### 1) Pure calculator (`backupService.ts`, exported)

```ts
const RUN_HOUR_UTC = 3; // off-peak anchor; keep deterministic

export function computeNextRunAt(frequency: BackupFrequency, from: Date): Date {
  const next = new Date(from);
  switch (frequency) {
    case "daily":   next.setUTCDate(next.getUTCDate() + 1); break;
    case "weekly":  next.setUTCDate(next.getUTCDate() + 7); break;
    case "monthly": {
      // CAUTION: JS Date OVERFLOWS on month rollover (Jan 31 + setUTCMonth(+1)
      // yields Mar 2/3) — it does NOT clamp. Clamp explicitly to the last day
      // of the target month so Jan 31 -> Feb 28/29.
      const day = next.getUTCDate();
      next.setUTCDate(1);                                   // avoid overflow while switching month
      next.setUTCMonth(next.getUTCMonth() + 1);
      const daysInTarget = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
      ).getUTCDate();                                       // day 0 of month+1 = last day of target month
      next.setUTCDate(Math.min(day, daysInTarget));
      break;
    }
  }
  next.setUTCHours(RUN_HOUR_UTC, 0, 0, 0);
  // ensure strictly in the future relative to `from` (handles same-day anchor)
  if (next.getTime() <= from.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
```

Pure + deterministic (no RNG, no `Date.now()` inside) — callers pass `from`.

### 2) Seed on creation (`getBackupSchedule`)

```ts
// in the "no row yet" branch, when inserting the default schedule:
const now = new Date();
.values({
  enabled: true, frequency: DEFAULT_FREQUENCY, retentionDays: DEFAULT_RETENTION_DAYS,
  storageDriver: storageSettings.driver,
  nextRunAt: computeNextRunAt(DEFAULT_FREQUENCY, now),   // NEW
  lastRunAt: null,
  createdAt: now, updatedAt: now,
})
```

### 3) Recompute on update (`setBackupSchedule`)

```ts
const next = { enabled, frequency, retentionDays, storageDriver };
const frequencyChanged = update.frequency !== undefined && update.frequency !== current.frequency;
const reEnabled = next.enabled && !current.enabled;
const nextRunAt =
  !next.enabled ? null                                   // disabled -> no due time
  : (frequencyChanged || reEnabled || current.nextRunAt === null)
      ? computeNextRunAt(next.frequency, new Date())      // recompute anchor
      : current.nextRunAt;                                // preserve existing schedule
// persist nextRunAt alongside the existing .set({...})
```

### 4) `markScheduleRun` (called by 484-02 after a successful run)

```ts
export async function markScheduleRun(scheduleId: string, runAt: Date): Promise<BackupSchedule> {
  const [current] = await db.select().from(backupSchedules).where(eq(backupSchedules.id, scheduleId));
  if (!current) throw new Error("backup_schedule_not_found");
  const [row] = await db.update(backupSchedules).set({
    lastRunAt: runAt,
    nextRunAt: current.enabled ? computeNextRunAt(asFrequency(current.frequency), runAt) : null,
    updatedAt: new Date(),
  }).where(eq(backupSchedules.id, scheduleId)).returning();
  return mapSchedule(row);
}
```

**Error handling:** `backup_schedule_not_found` → add to `mapBackupError`
(`backupRoutes.ts` 76-101) as a 404 for completeness; existing codes unchanged.

**Regression-test shape (two lanes):** **Vitest**
(`tests/vitest/backups/computeNextRunAt.test.ts` — pure, no `Bun.*`, no DB):
`computeNextRunAt` daily/weekly/monthly deltas +
Jan-31→Feb clamp (incl. leap year) + same-day anchor pushes to tomorrow.
**Bun** (`tests/unit/backups`, DB-backed):
`getBackupSchedule` seeds a future `nextRunAt`; `setBackupSchedule` nulls
`nextRunAt` when disabling and recomputes when re-enabling or changing
frequency, but preserves it on an unrelated change (e.g. `retentionDays`);
`markScheduleRun` sets `lastRunAt` and advances `nextRunAt`.

**Shared remote test DB contract (mandatory):** the test DB is ONE remote
Postgres (`DATABASE_URL` in `.env`) shared by parallel streams 482/483/484 and
the owner. `getBackupSchedule`/`setBackupSchedule` operate on a **singleton**
`backup_schedules` row (`backupService.ts` 413-433 selects `limit(1)` and
seeds if empty; 435-460 updates that one row), so the wiring tests above mutate
state visible to everyone. Therefore:

- Before any mutation, read and capture the current schedule row's exact values
  (`enabled`, `frequency`, `retentionDays`, `storageDriver`, `nextRunAt`,
  `lastRunAt`).
- Restore those exact prior values in `afterEach`/`afterAll` — including
  `nextRunAt`/`lastRunAt` after `markScheduleRun` tests — never leaving the
  schedule disabled or re-frequencied.
- Never truncate or delete `backup_schedules` or `backups` rows the test did
  not create (the existing `backupService.test.ts` cleanup pattern —
  `afterEach` + `inArray` on self-created ids — is the model for any `backups`
  rows).

---

## Testing Requirements

Two lanes, per `_docs/TESTING_STRATEGY.md` and the parent TASK-484 Testing
Requirements: the pure `computeNextRunAt` cases (no `Bun.*`, no DB) live in the
**Vitest** lane (`tests/vitest/backups/computeNextRunAt.test.ts`, run via
`bun run test:vitest`); the DB-backed wiring cases
(seed/recompute/`markScheduleRun`) are **Bun** by strategy. Load env:
`set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun run test:vitest` — `tests/vitest/backups/computeNextRunAt.test.ts`
  (all calculator cases above).
- `bun test tests/unit/backups` — all wiring cases above; existing
  schedule tests stay green.
- Wiring tests MUST honour the shared remote test DB contract above: capture
  the singleton `backup_schedules` row's prior values before mutation and
  restore them exactly in `afterEach`/`afterAll`; no truncation/bulk deletion;
  only self-created `backups` rows are cleaned up.
