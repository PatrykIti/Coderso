# TASK-484-05-L01: Driver-aware artifact write + remote delete
# FileName: TASK-484-05-L01-Remote-Artifact-Upload.md

**Parent Subtask:** TASK-484-05
**Priority:** High
**Category:** `backups` / `storage-service`
**Estimated Effort:** Medium
**Dependencies:** TASK-484-01 (`backups.artifact_key`). Reuses
`getMediaStorageAdapter()` (`core/services/media/storage/index.ts`) and the
`MediaStorageAdapter` / `UploadFile` contract (`adapter.ts`).
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

- **Goal:** Make `createBackupArtifact` honour `storageDriver`. Today it
  **always** `writeFile`s locally (`backupService.ts` 239-269). After this leaf:
  `local` keeps the filesystem path (`artifact_path` = absolute path,
  `artifact_key` = null); `s3` / `azure` upload the artifact via the **existing
  media storage adapter** and store the public URL in `artifact_path` + the
  storage object key in `artifact_key`. Extend `deleteBackup` to remove the remote
  object via `adapter.delete(key)` when `artifact_key` is set.
- **Owning module(s) to create-or-extend:**
  `core/services/backups/backupService.ts` (`createBackupArtifact` branch +
  `markBackupComplete` to also persist `artifact_key` + `deleteBackup` remote
  cleanup), and a small `uploadBackupArtifact` helper (same file or
  `core/services/backups/backupStorage.ts`) that wraps the reused adapter.
- **Source-of-truth docs:** `_docs/MEDIA_SPEC.md`, `_docs/DATA_MODEL.md`,
  `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`.
- **Out of scope:** writing a new storage driver (we reuse the media adapters);
  archiving media file bytes (still metadata-only).

---

## Security Contract

Data/service leaf touching storage credentials indirectly — full data contract:

- **Endpoint visibility:** n/a — consumed by `createBackup` / `deleteBackup` on
  the internal routes; no new route.
- **Auth model / RBAC:** unchanged (`backups:write` for create/delete at the
  existing routes).
- **CSRF / Rate-limit:** at the existing routes.
- **Validation:** `storageDriver` is the already-validated enum
  (`local` | `s3` | `azure`) captured at create time from
  `getStorageSettings().driver`; the upload helper accepts only the artifact
  bytes + a derived filename, never client input.
- **Anti-abuse:** n/a (internal only).
- **Secret/PII handling:** storage credentials are accessed **only** through the
  reused adapter (which reads `getStorageSettingsInternal()` and decrypts via the
  secret seam internally) — this leaf never reads, logs, or returns raw keys. The
  stored `artifact_path` for remote is the **public URL** (already treated as
  public by `redactArtifactPath` / `resolveBackupDownload`); `artifact_key` stays
  server-internal (never returned to clients — see 484-01-L01 mapper). Upload
  failures surface via `sanitizeBackupError` (strips cwd/backup-dir; the
  adapter must not echo credentials in its error).

---

## Implementation Pseudocode

### Upload helper (reuse the media adapter)

```ts
// Build an UploadFile from in-memory artifact bytes and reuse the configured driver.
async function uploadBackupArtifact(id: string, content: string, driver: BackupStorageDriver) {
  const bytes = Buffer.from(content, "utf8");
  const fileName = `coderso-backup-${id}.json`;
  const file: UploadFile = {
    name: fileName,
    type: BACKUP_ARTIFACT_CONTENT_TYPE,           // "application/json"
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
  const adapter = await getMediaStorageAdapter(); // resolves the SAME driver as storageSettings.driver
  const stored = await adapter.put(file);         // { key, url }
  return { artifactPath: stored.url, artifactKey: stored.key, sizeBytes: bytes.byteLength };
}
```

### Branch in `createBackupArtifact`

```ts
const content = `${JSON.stringify(artifact, null, 2)}\n`;
if (backup.storageDriver === "local") {
  const { baseDir, filePath } = resolveBackupArtifactPath(backup.id);
  await mkdir(baseDir, { recursive: true });
  await writeFile(filePath, content, { encoding: "utf8" });
  return { artifactPath: filePath, artifactKey: null, sizeBytes: Buffer.byteLength(content, "utf8") };
}
// s3 / azure
return uploadBackupArtifact(backup.id, content, backup.storageDriver);
```

`markBackupComplete` gains an `artifactKey` param and persists it; `createBackup`
passes `artifact.artifactKey` through.

### Remote delete in `deleteBackup`

```ts
if (existing?.artifactKey) {
  try { (await getMediaStorageAdapter()).delete(existing.artifactKey); }
  catch { /* best-effort; row deletion still proceeds */ }
} else if (existing?.artifactPath && !isPublicDownloadUrl(existing.artifactPath)) {
  // existing local-path cleanup (unchanged, isPathInside-guarded)
}
```

**Data flow:** `createBackup` → `createBackupArtifact` → (driver) local write OR
`uploadBackupArtifact` → `markBackupComplete(id, path, key, size)`. Download
already returns `{ url }` for public artifacts (`resolveBackupDownload` 381-383).

**Error handling:** upload failures bubble as a sanitized error so `createBackup`
marks the row `failed` (existing `try/catch` at 308-313); delete failures are
best-effort and never block row removal.

**Regression-test shape (Bun):** with an **injected fake adapter** (no real
network): `local` driver writes FS + null key; `s3`/`azure` call `put` once and
store `{ url, key }`; `mapBackup` keeps `artifactKey` internal-only and redacts/
passes `artifactPath` correctly; `deleteBackup` calls `adapter.delete(key)` for
remote rows and `rm` for local rows; a `put` rejection marks the backup `failed`
with a sanitized (credential-free) error.

---

## Testing Requirements

Bun lane (service + DB; adapter injected/faked). Load env:
`set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups` — the cases above. No real s3/azure call is made;
  the adapter is faked so the lane stays hermetic.
