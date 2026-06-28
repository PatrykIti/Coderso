# TASK-484-03-L01: `pruneExpiredBackups` service + worker hook
# FileName: TASK-484-03-L01-Retention-Prune-Service.md

**Parent Subtask:** TASK-484-03
**Priority:** High
**Category:** `backups` / `retention-service`
**Estimated Effort:** Small
**Dependencies:** TASK-484-01 (schedule access). Reuses `deleteBackup`
(`backupService.ts` 399-411). Called by the TASK-484-02 worker.
**Status:** ⏳ To Do
**Started:**
**Completed:**

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
only terminal rows older than the cutoff are deleted; `running`/`queued` survive
regardless of age; in-window rows survive; result counts match; invalid
`retentionDays` rejected without deleting anything.

---

## Testing Requirements

Bun lane (DB). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — the cases above.
