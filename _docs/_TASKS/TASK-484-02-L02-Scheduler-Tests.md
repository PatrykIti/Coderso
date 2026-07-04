# TASK-484-02-L02: Scheduler runtime + advisory-lock tests
# FileName: TASK-484-02-L02-Scheduler-Tests.md

**Parent Subtask:** TASK-484-02
**Priority:** High
**Category:** `backups` / `runtime-tests`
**Estimated Effort:** Small
**Dependencies:** TASK-484-02-L01 (`runDueScheduledBackups`, `startBackupScheduler`,
`stopBackupScheduler`).
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

- **Goal:** Prove the scheduler runs due backups, skips non-due/disabled
  schedules, advances `next_run_at`, is single-flight, and survives errors —
  using the deterministic `runDueScheduledBackups(now)` seam so tests do not wait
  on wall-clock intervals.
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
- **Validation / Anti-abuse:** the test asserts the **single-flight** and
  **system-actor** properties of L01 (no fabricated user; `actorId: null`).
- **Secret/PII handling:** the test must assert no credentials/paths leak into
  any logged error it captures (sanitized error only).

---

## Implementation Pseudocode

```ts
import { afterEach, expect, test } from "bun:test";
import { runDueScheduledBackups } from "../../../core/server/jobs/backupScheduler";
import { db } from "../../../core/db/client";
import { backups, backupSchedules } from "../../../core/db/schema";
import { getBackupSchedule, setBackupSchedule } from "../../../core/services/backups/backupService";

afterEach(async () => {
  await db.delete(backups);
  await db.delete(backupSchedules);
});

test("runs a due scheduled backup and advances next_run_at", async () => {
  const s = await getBackupSchedule();                  // seeds future next_run_at
  // force due:
  await db.update(backupSchedules).set({ nextRunAt: new Date(Date.now() - 1000) }).where(/* id = s.id */);
  const id = await runDueScheduledBackups(new Date());
  expect(id).not.toBeNull();
  const after = await getBackupSchedule();
  expect(after.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
  expect(after.lastRunAt).not.toBeNull();
  // a kind:"scheduled" row exists
});

test("skips when not due", async () => {
  await getBackupSchedule();                              // next_run_at in the future
  expect(await runDueScheduledBackups(new Date())).toBeNull();
});

test("skips when schedule disabled", async () => {
  const s = await getBackupSchedule();
  await setBackupSchedule({ enabled: false });           // next_run_at -> null
  expect(await runDueScheduledBackups(new Date())).toBeNull();
});

test("single-flight: overlapping calls run at most one backup", async () => {
  // force due, then fire two concurrent runs; assert exactly one scheduled row created
  const [a, b] = await Promise.all([runDueScheduledBackups(new Date()), runDueScheduledBackups(new Date())]);
  expect([a, b].filter(Boolean).length).toBe(1);
});

test("a failing createBackup still advances schedule and does not throw", async () => {
  // simulate failure (e.g. via createBackup self-marking failed); run must resolve, next_run_at advances
});
```

**Regression-test shape:** the five cases above (due, not-due, disabled,
single-flight, error-resilient) plus an assertion that the created row has
`kind === "scheduled"`.

---

## Testing Requirements

Bun lane. Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/integration/runtime/backupScheduler.test.ts`
- State in the closeout if the DB lane was skipped (no DB) and why.
