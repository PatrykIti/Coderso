# TASK-484-05-L02: Remote-storage routing + redaction tests
# FileName: TASK-484-05-L02-Remote-Storage-Tests.md

**Parent Subtask:** TASK-484-05
**Priority:** Medium
**Category:** `backups` / `storage-tests`
**Estimated Effort:** Small
**Dependencies:** TASK-484-05-L01 (driver-aware write + remote delete).
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Lock in the driver-routing + redaction behaviour from L01 with
  hermetic Bun tests that inject a fake `MediaStorageAdapter` (no real s3/azure
  network), and assert credential safety (no secret/path leaks in errors or
  client-facing fields).
- **Owning module(s) to create-or-extend:** `tests/unit/backups/backupService.test.ts`
  (extend) or a new `tests/unit/backups/backupRemoteStorage.test.ts`
  (`bun:test`), plus a test seam to inject the adapter (e.g. an exported
  `__setMediaStorageAdapterForTests` on the storage index, or dependency
  parameter on `uploadBackupArtifact`).
- **Source-of-truth docs:** `_docs/MEDIA_SPEC.md`, `_docs/TESTING_STRATEGY.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out of scope:** real cloud integration tests (not run in CI); the upload
  implementation (L01).

> **Lane rationale:** DB + storage-adapter + runtime ⇒ **Bun lane**. Kept hermetic
> via a faked adapter so the suite needs no S3/Azure account.

---

## Security Contract

Test-only leaf:

- **Endpoint visibility / Auth / RBAC / CSRF / Rate-limit:** n/a.
- **Validation / Anti-abuse:** asserts driver enum routing and that `artifact_key`
  is never returned to clients.
- **Secret/PII handling:** a dedicated assertion confirms a forced `put`
  rejection produces a **credential-free** error. The mechanism under test is
  L01's mandatory wrap: `uploadBackupArtifact` catches the adapter rejection
  and re-throws the machine-readable `Error("backup_upload_failed")` — NOT
  `sanitizeBackupError`, which (`backupService.ts` 191-198) only strips
  `process.cwd()` + the backup dir and performs **no credential redaction**.
  The fake adapter throws an error containing a sentinel "secret" string plus
  the real `process.cwd()`; the test asserts
  `row.error === "backup_upload_failed"` (so the sentinel is provably absent
  from the client-visible field).

---

## Shared-DB Test Hygiene (mandatory)

These tests run against the ONE shared remote Postgres (render.com,
`DATABASE_URL` in `.env`) used by the owner and the parallel TASK-482/483
streams. `createBackup` reads the driver from the live settings singleton
(`backupService.ts` 293-301), so the s3/azure-path tests mutate the shared
`storage.driver` settings row — leaving it set to `s3` with no credentials
breaks media uploads for everyone. Non-negotiable rules:

- **Settings snapshot/restore:** before mutating the `storage.driver` row (or
  any other `storage.*` key), snapshot the existing row and restore it in a
  `finally` / `afterEach` that runs even on failure or interruption — mirror
  `withStorageDriverUnset` in `tests/unit/media/storageResolver.test.ts`
  (lines 28-46: select the row, mutate, `finally` restore the original).
- **Cache resets:** call `resetStorageSettingsCache()`
  (`core/services/settings/storageSettings.ts:255`) and
  `resetMediaStorageAdapterCache()` (`core/services/media/storage/index.ts:126`)
  after EVERY settings mutation and after the restore, so neither this suite
  nor subsequent suites read a stale driver.
- **Row-scoped cleanup:** track every backup id this suite creates and delete
  only those rows in `afterEach`, mirroring the `createdIds` pattern in
  `tests/unit/backups/backupService.test.ts` (lines 30-40). NEVER truncate or
  bulk-delete `backups`, `settings`, or any other shared table.
- **Preferred seam:** where the L01 test seam allows injecting the driver as
  well as the adapter (e.g. a dependency parameter on `uploadBackupArtifact`),
  prefer it so the shared settings row is never mutated at all; the
  snapshot/restore contract above applies whenever the row IS mutated.

---

## Implementation Pseudocode

```ts
import { afterEach, expect, test } from "bun:test";

const fakeAdapter = (calls) => ({
  put: async (file) => { calls.put.push(file.name); return { key: `backups/2026/06/${file.name}`, url: `https://cdn.example.com/backups/2026/06/${file.name}` }; },
  delete: async (key) => { calls.delete.push(key); },
  get: async () => { throw new Error("unused"); },
  getPublicUrl: (key) => `https://cdn.example.com/${key}`,
});

test("local driver writes FS, no artifact_key", async () => { /* driver=local -> artifactKey null, file on disk */ });

test("s3 driver uploads via adapter and stores url + key", async () => {
  // inject fakeAdapter; set storage driver s3 ONLY inside the snapshot/restore
  // wrapper (see Shared-DB Test Hygiene) with cache resets on mutate + restore;
  // createBackup (push id to createdIds)
  // expect calls.put length 1; row.artifactPath is the https URL; row.artifactKey is the key
});

test("artifact_key never leaks to client-facing record", async () => {
  // listBackups / getBackupById map -> artifactKey null (redacted map); internal map exposes it
});

test("deleteBackup removes remote object for remote rows", async () => {
  // after remote create, deleteBackup -> calls.delete includes the stored key
});

test("upload failure marks backup failed with a machine-readable, credential-free error", async () => {
  // fakeAdapter.put throws Error(`boom S3_SECRET_KEY=topsecret ${process.cwd()}`)
  // expect resulting row.status === "failed" and row.error === "backup_upload_failed"
  //   — the exact code L01's uploadBackupArtifact wrap re-throws; this proves the
  //   sentinel "topsecret" and the cwd never reach the client-visible field.
  //   Do NOT assert on sanitizeBackupError doing the redaction: it only strips
  //   process.cwd()/backup-dir and would pass the sentinel through.
});

test("deleteBackup skips remote delete on driver drift (no wrong-backend call)", async () => {
  // create a remote row with driver s3 (fake adapter), then restore the driver
  // (e.g. back to local) + reset caches; deleteBackup
  // expect calls.delete stays empty (skip logged per L01 driver-drift contract)
  //   and the row is still removed
});
```

Every test that inserts a `backups` row pushes its id to `createdIds`; the
suite-level `afterEach` deletes only those ids and restores any mutated
`storage.*` settings rows (see Shared-DB Test Hygiene above).

**Regression-test shape:** the six cases above (local write, s3 upload+store,
key redaction, remote delete, wrapped credential-free failure, driver-drift
skip).

---

## Testing Requirements

Bun lane (hermetic). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups`
