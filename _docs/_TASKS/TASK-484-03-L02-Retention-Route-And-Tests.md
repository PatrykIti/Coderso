# TASK-484-03-L02: `POST /backups/prune` route + tests
# FileName: TASK-484-03-L02-Retention-Route-And-Tests.md

**Parent Subtask:** TASK-484-03
**Priority:** Medium
**Category:** `backups` / `route`
**Estimated Effort:** Small
**Dependencies:** TASK-484-03-L01 (`pruneExpiredBackups`), TASK-484-01 (schedule
read for the effective `retentionDays`).
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Add an internal `POST /backups/prune` that runs retention on demand
  using the current schedule's `retentionDays`, returns the prune summary, and is
  audit-logged. Add the Bun route + security tests for both the route and the
  worker-driven retention path.
- **Owning module(s) to create-or-extend:**
  `core/server/routes/backupRoutes.ts` (new route in `registerBackupRoutes`),
  `core/server/validation/backupSchemas.ts` (empty-but-strict `pruneBackupsSchema`),
  `core/services/backups/backupService.ts` (reuse `pruneExpiredBackups` +
  `getBackupSchedule`), `tests/integration/routes/backups.test.ts`.
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/DATA_MODEL.md`.
- **Out of scope:** the prune algorithm (L01); the scheduler hook (484-02).

---

## Security Contract

Internal route + write — full contract:

- **Endpoint visibility:** `internal` — `POST /backups/prune` under
  `/admin/api/*` (mounted via `registerBackupRoutes`). No public surface.
- **Auth model:** admin session cookie.
- **RBAC:** `requirePermission("backups:write")` (retention deletes data — a
  write op; mirrors `DELETE /backups/:id`).
- **CSRF:** required (non-safe method + session) — enforced centrally by
  `enforceCsrf` (`core/server/middleware/csrf.ts`); the route must not bypass it.
- **Rate-limit bucket:** `admin_write` (`core/server/middleware/rateLimit.ts`).
- **Validation:** body validated by `pruneBackupsSchema`
  (`{ type: "object", additionalProperties: false, properties: {} }`) — the route
  takes **no** client-supplied retention value; it reads `retentionDays` from the
  persisted schedule, so a caller cannot force an arbitrarily small window to mass
  -delete. Unknown body keys rejected.
- **Anti-abuse:** retention value is server-owned (schedule), terminal-only
  deletes (L01); `admin_write` bucket throttles repeated calls.
- **Secret/PII handling:** response is the prune summary (`prunedCount` +
  `prunedIds`, which are opaque UUIDs); no artifact paths, credentials, or PII.
  Audit metadata records `{ prunedCount, retentionDays }` only.

---

## Implementation Pseudocode

### Route (`backupRoutes.ts`, inside `registerBackupRoutes`)

```ts
router.post("/backups/prune", requirePermission("backups:write"), async (ctx) => {
  return withBackupErrors(async () => {
    validate(pruneBackupsSchema, ctx.body ?? {});
    const schedule = await getBackupSchedule();
    const result = await pruneExpiredBackups(schedule.retentionDays);   // server-owned window
    await logAudit({
      actorId: ctx.user?.id ?? null,
      action: "backups.prune",
      targetType: "backup",
      targetId: "retention",   // sentinel: target-less admin write (AuditEvent.targetId is a required string, auditService.ts:26; pattern per settingsRoutes.ts "storage"/"security"/"bulk")
      metadata: { prunedCount: result.prunedCount, retentionDays: schedule.retentionDays },
      ip: ctx.ip, userAgent: ctx.userAgent,
    });
    return result;
  });
});
```

### Schema (`backupSchemas.ts`)

```ts
export const pruneBackupsSchema = { type: "object", additionalProperties: false, properties: {} };
```

**Data flow:** request → RBAC → CSRF → strict-empty body validate → schedule read
→ `pruneExpiredBackups` → audit → summary.

**Error handling:** `pruneExpiredBackups` may throw `backup_schedule_invalid`
(already mapped); the route uses the existing `withBackupErrors` wrapper so domain
codes map to `ApiError` at the boundary via `mapBackupError`.

**Regression-test shape (Bun):** route registered at `POST /backups/prune`;
rejects without `backups:write`; rejects unknown body keys (`additionalProperties`
400); returns the prune summary; audit entry written; integration with seeded
expired rows deletes the expected set **under the shared-DB isolation pattern
below**.

**Shared-DB isolation (MANDATORY):** the route prunes with real `now` and the
persisted shared `backup_schedules` singleton's `retentionDays`
(`getBackupSchedule`, `backupService.ts:413-433`), against the ONE shared remote
Postgres (render.com, `.env` `DATABASE_URL`) used by the owner and parallel
streams. The integration test MUST therefore:
- read the current schedule first, then temporarily set `retentionDays` to the
  maximum `3650` via `setBackupSchedule` (`backupService.ts:435`; cutoff ≈ 10
  years back), so no real data is eligible;
- seed its fixture rows with `createdAt` **older** than that ~10-year cutoff
  (plus in-window controls), tracking every seeded id;
- assert **only on seeded ids** (seeded-expired ids pruned, seeded in-window ids
  survive); never assert table-global counts and never delete or assert on rows
  the test did not create;
- restore the prior `retentionDays` (and any other mutated schedule fields) in
  `afterEach`/`finally`, and delete any leftover fixture rows per id (follow the
  `createdIds`/`afterEach` pattern in
  `tests/unit/backups/backupService.test.ts:30-39`) — no enabled-schedule or
  fixture residue may be left behind on the shared DB.

---

## Testing Requirements

Bun lane (route + security + DB). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/integration/routes/backups.test.ts` — route registration, RBAC,
  reject-unknown, summary shape, audit, and the isolated seeded-prune integration
  case. RBAC / CSRF / reject-unknown / bucket behavior for `/backups/prune` is
  asserted HERE — do **not** touch `tests/security/codersoSecurityGate.test.ts`:
  that file (141 lines) only unit-gates forms/booking submission access, captcha
  and nonce tampering, has no route/permission/bucket enumeration to extend, and
  is a shared surface across the parallel 482/483/484 streams (additive-only; no
  restructuring).
