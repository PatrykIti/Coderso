# TASK-484-03-L01: `pruneExpiredBackups` service + worker hook
# FileName: TASK-484-03-L01-Retention-Prune-Service.md

**Parent Subtask:** TASK-484-03
**Priority:** High
**Category:** `backups` / `retention-service`
**Estimated Effort:** Small
**Dependencies:** TASK-484-01 (schedule access). Reuses `deleteBackup`
(`backupService.ts` 399-411). Called by the TASK-484-02 worker.
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Implement `pruneExpiredBackups(retentionDays, now?)` that deletes
  **terminal** backups (`status` `complete` | `failed`) whose `createdAt` is older
  than `now - retentionDays` days, reusing `deleteBackup` for per-row artifact
  cleanup (local FS today; remote object once 484-05 lands). Returns
  `{ prunedCount, prunedIds }`. Never touches `running` / `queued` rows.
- **Owning module(s) to create-or-extend:**
  `core/services/backups/backupService.ts` (new `pruneExpiredBackups`, reuse
  `assertRetentionDays` 144-148 + `deleteBackup`); `backupTypes.ts`
  (`BackupPruneResult` type).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out of scope:** the manual trigger route (L02); the worker call site (484-02
  wires the call; this leaf only provides the function).

---

## Security Contract

Data/service leaf (route is L02):

- **Endpoint visibility:** n/a here — invoked by the worker (system actor) and by
  the L02 internal route.
- **Auth model / RBAC:** the function itself trusts its caller; the L02 route
  gates on `backups:write`, and the worker is the system actor.
- **CSRF / Rate-limit:** enforced at the L02 route, not in the service.
- **Validation:** `retentionDays` is validated with `assertRetentionDays`
  (1..3650) before any delete; an out-of-range value throws
  `backup_schedule_invalid` rather than deleting with a bad cutoff.
- **Anti-abuse:** only **terminal** rows are eligible, so an in-flight backup can
  never be deleted mid-run; the delete set is bounded by the retention window.
- **Secret/PII handling:** reuses `deleteBackup`, which already guards artifact
  paths with `isPathInside` (path-traversal safe) and skips public-URL artifacts
  from local `rm`; no secret/PII handled.

---

## Implementation Pseudocode

```ts
export type BackupPruneResult = { prunedCount: number; prunedIds: string[] };

export async function pruneExpiredBackups(
  retentionDays: number,
  now: Date = new Date()
): Promise<BackupPruneResult> {
  assertRetentionDays(retentionDays);                         // reuse existing guard
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  const expired = await db.select({ id: backups.id })
    .from(backups)
    .where(and(
      lt(backups.createdAt, cutoff),
      inArray(backups.status, ["complete", "failed"]),       // terminal only
    ));

  const prunedIds: string[] = [];
  for (const { id } of expired) {
    try {
      await deleteBackup(id);                                  // removes row + local/remote artifact
      prunedIds.push(id);
    } catch {
      // a single failed delete must not abort the sweep; skip and continue
    }
  }
  return { prunedCount: prunedIds.length, prunedIds };
}
```

**Data flow:** caller (worker / L02 route) → `pruneExpiredBackups(retentionDays,
now)` → select expired terminal rows → `deleteBackup` per row → result summary.

**Error handling:** invalid `retentionDays` throws `backup_schedule_invalid`
(already mapped in `mapBackupError`); per-row delete failures are swallowed so one
bad row never blocks retention (worker resilience).

**Regression-test shape (Bun):** seed rows at varying `createdAt`/`status`; assert
per seeded id that only terminal rows older than the cutoff are deleted;
`running`/`queued` survive regardless of age; in-window rows survive; all
seeded-expired ids appear in `prunedIds` (per-id membership, never table-global
counts — see Shared-DB isolation below); invalid
`retentionDays` rejected without deleting anything.

**Shared-DB isolation (MANDATORY):** the test runs against the ONE shared remote
Postgres (render.com, `.env` `DATABASE_URL`) used by the owner and parallel
streams, and `pruneExpiredBackups` is a table-wide sweep — so the test MUST scope
the cutoff so only its own fixture rows are eligible. Concretely: pass an ancient
`now` (e.g. `new Date("2000-01-01")`) so `cutoff = now - retentionDays` predates
all real data, and seed fixture rows with `createdAt` older than that ancient
cutoff (and in-window controls just after it). Assertions must be **per seeded
id** (membership of seeded ids in `prunedIds` / survival of specific seeded rows)
— never table-global counts (`prunedCount` may only be compared against the
seeded-eligible set, e.g. asserting all seeded-expired ids are included, not that
it equals the seeded count). Track every seeded id in a `createdIds` list and
delete any fixture rows the prune did not remove in `afterEach` (follow the
established per-id cleanup pattern in
`tests/unit/backups/backupService.test.ts:30-39`). The test must never delete or
assert on rows it did not create.

---

## Testing Requirements

Bun lane (DB). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — the cases above, under the mandatory shared-DB
  isolation pattern (ancient `now`, per-id assertions, per-id `afterEach` cleanup
  of leftover fixture rows).
