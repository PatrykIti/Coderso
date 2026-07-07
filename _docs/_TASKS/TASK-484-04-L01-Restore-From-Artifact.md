# TASK-484-04-L01: `restoreBackup` transactional restore + artifact parse
# FileName: TASK-484-04-L01-Restore-From-Artifact.md

**Parent Subtask:** TASK-484-04
**Priority:** High
**Category:** `backups` / `restore-service`
**Estimated Effort:** Large
**Dependencies:** TASK-484-01 (`artifact_key` for remote reads, optional).
Extends `importConfig` (`core/services/tools/importExportService.ts` 395-652,
which today opens its **own** `db.transaction` at :401) by extracting a
transaction-aware `importConfigTx(tx, bundle)` that reuses `setSettingsTx`, so the
restore can share one outer `tx`. Reuses `resolveBackupDownload`
(`backupService.ts` 375-397) as the artifact read seam.
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Replace the `restoreBackup()` stub (`backupService.ts` 366-373, which
  throws `backup_restore_unsupported`) with a real, **transactional,
  confirmation-gated** restore from the `version: 1` JSON artifact. Read the
  artifact (local file or remote URL), strict-parse it, and restore inside a
  single `db.transaction`: settings via a transaction-aware `importConfigTx(tx, …)`
  (extracted from the existing `importConfig`, which today opens its own
  `db.transaction` — see Dependencies), and the database snapshot tables via
  guarded delete+insert. Because the importer shares the **outer** `tx`, the whole
  restore is genuinely one transaction (all-or-nothing). Restore restores
  **metadata + settings only** — not media file bytes (the artifact stores media
  rows + URLs only).
- **Owning module(s) to create-or-extend:**
  `core/services/backups/backupService.ts` (`restoreBackup` rewrite + new
  `parseBackupArtifact` strict parser + `readBackupArtifactContent` read seam),
  `backupTypes.ts` (`BackupArtifact` type + `BackupRestoreInput`),
  `core/services/tools/importExportService.ts` (extract a transaction-aware
  `importConfigTx(tx, bundle)` from `importConfig`; the public `importConfig`
  becomes a thin `db.transaction((tx) => importConfigTx(tx, bundle))` wrapper —
  no behaviour change for existing callers),
  `core/server/routes/backupRoutes.ts` (`mapBackupError` — new codes).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/MEDIA_SPEC.md`.
- **Out of scope:** the route `confirm` body + RBAC/CSRF wiring (L02); changing
  the artifact format/version (stays `1`).

---

## Security Contract

Destructive data operation — full contract (route gating is L02; service-level
guards here):

- **Endpoint visibility:** n/a here — consumed only by the internal
  `POST /admin/api/backups/:id/restore` (L02).
- **Auth model / RBAC:** enforced at the L02 route (`backups:write`); the service
  trusts its caller but still requires the explicit `confirm` flag so a stray
  internal call cannot wipe data by accident.
- **CSRF / Rate-limit:** at the L02 route.
- **Validation:** the artifact is **strict-parsed** by `parseBackupArtifact`
  (reject unknown top-level keys, require `version === 1`, validate each table is
  an array). Restore reuses `importConfigTx`, which itself runs `validateBundle`
  on the settings portion. No raw artifact data is written un-validated.
- **Anti-abuse:** restore requires `confirm === true`; refuses when the backup is
  not `complete` or has no artifact (`backup_not_ready`); the whole restore runs in
  one transaction (the outer `tx`, threaded through `importConfigTx`), so a
  malformed artifact cannot leave partial state (all-or-nothing rollback).
- **Secret/PII handling:** the settings restore goes through `importConfigTx` →
  `setSettingsTx`, which preserves the encrypted-secret seam (secrets stay
  encrypted; nothing is decrypted to logs). The artifact is read into memory and
  not logged; errors use `sanitizeBackupError`. Restoring author emails etc. flows
  through the same persistence as import (no new PII surface).

---

## Implementation Pseudocode

### Artifact read seam (local or remote)

```ts
async function readBackupArtifactContent(backup: BackupRecord): Promise<string> {
  // reuse the existing download resolver: it returns {content} for local files
  // (path-traversal guarded by isPathInside) and {url} for remote artifacts.
  const dl = await resolveBackupDownload(backup.id);
  if (dl.content != null) return dl.content;                 // local file
  if (dl.url) {                                              // remote (s3/azure public URL)
    const res = await fetch(dl.url);
    if (!res.ok) throw new Error("backup_artifact_unreadable");
    return await res.text();
  }
  throw new Error("backup_artifact_invalid");
}
```

### Strict parse

```ts
function parseBackupArtifact(raw: string): BackupArtifact {
  let json: unknown;
  try { json = JSON.parse(raw); } catch { throw new Error("backup_restore_invalid_artifact"); }
  // reject-unknown top-level keys; require version === 1; database tables are arrays|null
  if (!isPlainObject(json) || json.version !== BACKUP_ARTIFACT_VERSION) {
    throw new Error("backup_restore_invalid_artifact");
  }
  // validate include/database/settings/media shapes (each table array or null)
  return json as BackupArtifact;
}
```

### Restore (transactional)

```ts
export async function restoreBackup(id: string, input: BackupRestoreInput = {}): Promise<BackupRecord> {
  const backup = await getBackupByIdInternal(id);
  if (!backup) throw new Error("backup_not_found");
  if (backup.status !== "complete" || !backup.artifactPath) throw new Error("backup_not_ready");
  if (input.confirm !== true) throw new Error("backup_restore_confirmation_required");

  const artifact = parseBackupArtifact(await readBackupArtifactContent(backup));

  await db.transaction(async (tx) => {
    if (artifact.database) {
      // guarded replace per snapshot table, in FK-safe order (children before parents
      // on delete; parents before children on insert). Tables mirror buildDatabaseSnapshot()
      // (pages, contentTypes, contentEntries, posts, media, menus, menuItems,
      //  themeProfiles, themeRoutes, redirects).
      await replaceSnapshotTables(tx, artifact.database);
    }
    if (artifact.settings) {
      // share the OUTER tx: importConfigTx is the transaction-aware body of
      // importConfig (still runs validateBundle + setSettingsTx). Do NOT call the
      // public importConfig() here — it opens its own db.transaction, which would
      // commit/rollback independently of this tx and break all-or-nothing.
      await importConfigTx(tx, artifact.settings);   // artifact.settings is an ExportBundle (target:"settings")
    }
  });
  // restore does not change the backup row's own status; return it unchanged
  return mapBackup(backup as never);
}
```

> `replaceSnapshotTables` deletes then re-inserts each snapshot table inside the
> same `tx`; ordering follows the existing FK graph. Media rows are restored as
> **metadata** only — the artifact does not carry file bytes (note at
> `backupService.ts` 256-260), and this must be stated in the response/docs.
> Keep the tx-scoped body (`replaceSnapshotTables` + `importConfigTx`)
> individually invokable with a caller-supplied `tx` — this is the **dry-run
> seam** the regression tests use to exercise the restore inside a deliberately
> rolled-back transaction (see the shared-DB pin in the test shape below).

**Domain codes (add to `mapBackupError`, `backupRoutes.ts` 76-101):**
`backup_restore_confirmation_required` → 400,
`backup_restore_invalid_artifact` → 422,
`backup_artifact_unreadable` → 502. **Keep** the existing
`backup_restore_unsupported` branch (`backupRoutes.ts` :84-86) mapped for
back-compat, with a comment that the service no longer throws it — do **not**
remove it: the existing suite asserts this mapping
(`tests/integration/routes/backups.test.ts` :148-151, "mapBackupError returns
stable API errors" → 409), and keeping it is what lets L02's test edit stay
strictly additive.

**Data flow:** route (L02) → `restoreBackup(id, { confirm })` → read artifact →
strict-parse → single outer `tx`: transactional replace + `importConfigTx(tx, …)`
→ return.

**Error handling:** all failures throw machine-readable codes mapped at the route
boundary; the transaction rolls back on any error (no partial restore).

**Regression-test shape (Bun):**

> **Shared-DB pin (mandatory):** the Bun suite runs against the ONE shared
> remote Postgres (`DATABASE_URL` in `.env`), used concurrently by TASK-482,
> TASK-483 and the owner. Restore tests must **NEVER** restore over the shared
> DB destructively. Wiping/clearing/truncating shared tables is **forbidden
> outright** — `replaceSnapshotTables` delete+re-inserts EVERY snapshot table
> (mirrors `buildDatabaseSnapshot`, `backupService.ts` 200-237), so a committed
> real round-trip would destroy concurrent streams' data.

- Round-trip via a **rollback-scoped dry-run seam**: expose the tx-scoped
  restore body (e.g. `replaceSnapshotTables(tx, …)` + `importConfigTx(tx, …)`)
  so a test can run it inside a deliberately **rolled-back** transaction —
  assert in-tx state matches the artifact, then throw/rollback so nothing
  commits — and/or restrict assertions to **fixture-scoped targets**: uniquely
  scoped rows the test itself created, cleaned up per-row like the existing
  `createdIds` pattern in `tests/unit/backups/backupService.test.ts`.
- `confirm` omitted → `backup_restore_confirmation_required`; garbage /
  `version: 2` artifact → `backup_restore_invalid_artifact`; non-complete backup
  → `backup_not_ready` (all pre-write guards — safe to test directly, no
  destructive path is reached).
- Mid-transaction failure leaves DB unchanged (rollback) — exercised via the
  same rolled-back-tx seam, never by committing a partial replace.

---

## Testing Requirements

Bun lane (DB transaction). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — round-trip restore **only via the
  rollback-scoped seam / fixture-scoped targets** (shared-DB pin above — never a
  committed wipe/replace of shared tables), confirm gate, invalid
  artifact, not-ready, rollback-on-failure. Assert `restoreBackup` no longer
  **throws** `backup_restore_unsupported` (the `mapBackupError` branch itself
  stays, kept for back-compat — see Domain codes above).
