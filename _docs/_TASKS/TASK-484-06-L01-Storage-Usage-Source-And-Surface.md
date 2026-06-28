# TASK-484-06-L01: `getBackupStorageUsage` + `GET /backups/usage`
# FileName: TASK-484-06-L01-Storage-Usage-Source-And-Surface.md

**Parent Subtask:** TASK-484-06
**Priority:** Medium
**Category:** `backups` / `observability-route`
**Estimated Effort:** Small
**Dependencies:** TASK-484-01 (`backups.size_bytes` already exists; storage driver
label from `getStorageSettings()`). Aggregates rows produced by 02/03/05.
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

- **Goal:** Add a storage-usage source `getBackupStorageUsage()` (total bytes,
  backup count, per-driver and per-status breakdown, plus an optional quota
  signal) and surface it via an internal `GET /backups/usage`. No DB change —
  usage is aggregated from the existing `backups.size_bytes`.
- **Owning module(s) to create-or-extend:**
  `core/services/backups/backupService.ts` (`getBackupStorageUsage`),
  `backupTypes.ts` (`BackupStorageUsage` type),
  `core/server/routes/backupRoutes.ts` (new GET route).
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/DATA_MODEL.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out of scope:** a hard enforcement that blocks new backups at quota (this leaf
  only **signals** `overQuota`; enforcement, if wanted, is a follow-up); docs +
  closure (L02).

---

## Security Contract

Internal read route — full contract:

- **Endpoint visibility:** `internal` — `GET /backups/usage` under `/admin/api/*`.
  No public surface.
- **Auth model:** admin session cookie.
- **RBAC:** `requirePermission("backups:read")` (matches the other backup reads).
- **CSRF:** n/a (safe `GET`).
- **Rate-limit bucket:** `admin_read`.
- **Validation:** no request body/params; if a query is ever added it must stay
  `additionalProperties: false`. The quota threshold is server-owned
  (`BACKUP_MAX_TOTAL_BYTES` env or a settings key), never client-supplied.
- **Anti-abuse:** read-only aggregate; `admin_read` bucket.
- **Secret/PII handling:** the payload is numeric aggregates + the driver label
  only — **no** artifact paths, keys, credentials, or PII. The per-driver
  breakdown uses the enum label (`local`/`s3`/`azure`), not connection details.

---

## Implementation Pseudocode

### Service (`backupService.ts`)

```ts
export type BackupStorageUsage = {
  totalBytes: number;
  backupCount: number;
  byStatus: Record<BackupStatus, { count: number; bytes: number }>;
  byDriver: Record<BackupStorageDriver, { count: number; bytes: number }>;
  activeDriver: BackupStorageDriver;
  quotaBytes: number | null;
  overQuota: boolean;
};

export async function getBackupStorageUsage(): Promise<BackupStorageUsage> {
  const rows = await db.select().from(backups);
  const usage = rows.reduce((acc, r) => {
    const bytes = r.sizeBytes ?? 0;                  // null treated as 0
    acc.totalBytes += bytes; acc.backupCount += 1;
    bump(acc.byStatus, asBackupStatus(r.status), bytes);
    bump(acc.byDriver, asStorageDriver(r.storageDriver), bytes);
    return acc;
  }, emptyUsage());
  const settings = await getStorageSettings();
  const quotaBytes = parsePositiveIntEnv(process.env.BACKUP_MAX_TOTAL_BYTES);
  return {
    ...usage,
    activeDriver: settings.driver,
    quotaBytes,
    overQuota: quotaBytes != null && usage.totalBytes > quotaBytes,
  };
}
```

### Route (`backupRoutes.ts`)

```ts
router.get("/backups/usage", requirePermission("backups:read"), async () =>
  getBackupStorageUsage()
);
```

**Data flow:** request → RBAC → `getBackupStorageUsage()` → aggregate over
`backups` + quota env → JSON. (Optional: also fold a slim `usage` summary into
`buildWorkerHealth`/`listBackups` later — kept separate here for KISS.)

**Error handling:** none domain-specific; DB errors propagate to the generic
handler. No new `mapBackupError` code needed.

**Regression-test shape (Bun):** seed rows with mixed `size_bytes` (incl. null)
and drivers; assert `totalBytes`, `backupCount`, `byStatus`, `byDriver` sums;
`overQuota` true when `BACKUP_MAX_TOTAL_BYTES` < total, false/`quotaBytes: null`
when unset; route requires `backups:read` and returns the shape with no secret
fields.

---

## Testing Requirements

Bun lane (service + route). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — usage aggregation + quota flag.
- `bun test tests/integration/routes/backups.test.ts` — `GET /backups/usage`
  registration, `backups:read` gate, shape, no-secret assertion.
