# TASK-484-05-L02: Remote-storage routing + redaction tests
# FileName: TASK-484-05-L02-Remote-Storage-Tests.md

**Parent Subtask:** TASK-484-05
**Priority:** Medium
**Category:** `backups` / `storage-tests`
**Estimated Effort:** Small
**Dependencies:** TASK-484-05-L01 (driver-aware write + remote delete).
**Status:** ⏳ To Do
**Started:**
**Completed:**

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
- **Secret/PII handling:** a dedicated assertion confirms a forced `put`/`delete`
  rejection produces a **sanitized** error (no access keys, connection strings, or
  absolute paths) — the test's fake adapter throws an error containing a
  sentinel "secret" string and asserts it is NOT present in the surfaced message.

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
  // inject fakeAdapter, set storage driver s3, createBackup
  // expect calls.put length 1; row.artifactPath is the https URL; row.artifactKey is the key
});

test("artifact_key never leaks to client-facing record", async () => {
  // listBackups / getBackupById map -> artifactKey null (redacted map); internal map exposes it
});

test("deleteBackup removes remote object for remote rows", async () => {
  // after remote create, deleteBackup -> calls.delete includes the stored key
});

test("upload failure marks backup failed with a sanitized error", async () => {
  // fakeAdapter.put throws Error("boom S3_SECRET_KEY=topsecret /home/app/cwd")
  // expect resulting row.status === "failed" and row.error excludes "topsecret" and the cwd
});
```

**Regression-test shape:** the five cases above (local write, s3 upload+store,
key redaction, remote delete, sanitized-failure).

---

## Testing Requirements

Bun lane (hermetic). Load env: `set -a && source .env && set +a`.

- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun test tests/unit/backups`
