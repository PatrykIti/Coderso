# TASK-536-01-L02: Apply Canonical Identity to Storage Adapters

# FileName: TASK-536-01-L02-Apply-Canonical-Identity-To-Storage-Adapters.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-01
**Priority:** Critical
**Category:** Media Storage / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-536-01-L01
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Make the adapter boundary accept an already-canonical storage object and prevent local,
S3, or Azure implementations from consulting the display filename. Persist canonical
Content-Type and attachment/inline metadata on remote objects as defense in depth. The
media domain never exposes or persists a provider URL; all public media delivery uses
the existing `/media/<key>` proxy contract owned by TASK-536-02.

## Source ownership

This leaf is the only TASK-536 writer of:

- core/services/media/storage/adapter.ts;
- core/services/media/storage/local.ts;
- core/services/media/storage/s3.ts;
- core/services/media/storage/azure.ts.

It consumes mediaFileTrust.ts read-only and owns compatibility/changed-behavior updates
in the five adapter/media/backup test files named by its gate. It must not edit
mediaService.ts, httpServer.ts, Forms code, other tests, docs, or task/changelog indexes.

## Grounded anchors

- storage/adapter.ts:1-17 passes only UploadFile to put().
- storage/local.ts:22-50 gets the extension from file.name.
- storage/s3.ts:56-90 derives the key from the name and sets declared ContentType.
- storage/azure.ts:63-100 derives the key/name and declared blob content type.

## Implementation Pseudocode

~~~ts
export type CanonicalStoredUpload = {
  bytes: UploadFile;             // synthetic canonical name/type from L01
  identity: CanonicalMediaIdentity;
  downloadName: string;          // bounded/sanitized display filename only
};

interface MediaStorageAdapter {
  put(file: UploadFile): Promise<StoredMedia>; // existing generic backup contract
  putMedia(upload: CanonicalStoredUpload): Promise<StoredMedia>; // media-only trust path
  get(key: string): Promise<NodeJS.ReadableStream>; // preserve the existing proxy contract
  ...
}

function buildCanonicalKey(extension) {
  assert extension belongs to the closed canonical extension set, including the
    attachment-only .pdf/.txt/.svg/.bin members;
  return utcYear + "/" + utcMonth + "/" + randomUUID() + extension;
}

local.putMedia(upload) {
  key = buildCanonicalKey(upload.identity.extension);
  write upload.bytes to confined key;
}

s3.putMedia(upload) {
  key = buildCanonicalKey(upload.identity.extension);
  PutObject {
    Key: key,
    Body: bytes,
    ContentType: upload.identity.mimeType,
    ContentDisposition: safeMediaDisposition(
      upload.identity.delivery,
      upload.downloadName,
      upload.identity.extension,
    ),
  };
}

azure.putMedia(upload) {
  key = buildCanonicalKey(upload.identity.extension);
  uploadData(bytes, {
    blobHTTPHeaders: {
      blobContentType: upload.identity.mimeType,
      blobContentDisposition: safeMediaDisposition(
        upload.identity.delivery,
        upload.downloadName,
        upload.identity.extension,
      ),
    },
  });
}
~~~

The exact `safeMediaDisposition` owner is `mediaFileTrust.ts`. It strips control
characters, quotes safely, provides a bounded ASCII fallback, and replaces any display
suffix with the canonical extension so the filename cannot inject a header or contradict
the byte identity. Adapters import it read-only and define no mirror.

## Error and compatibility contract

Adapter errors remain mapped by mediaService.ts to media_storage_unavailable. Invalid
canonical extensions are programmer/domain errors and must fail before remote calls.
The existing generic `put(UploadFile)` contract remains byte-for-byte compatible for
encrypted backup artifacts; mediaService alone uses `putMedia` and can never fall back
to generic `put`. Share private adapter internals without weakening either public type.
The key shape stays year/month/UUID.ext. `StoredMedia.url`/`getPublicUrl` may remain an
adapter-private compatibility detail for the backup subsystem, but mediaService ignores
it and must never return it. Existing rows and objects are untouched; new remote objects
carry canonical metadata. Text, SVG, PDF, and octet-stream objects
always receive attachment disposition even though their MIME/extension is canonical.
No adapter silently reconstructs MIME from the suffix or accepts a second caller-supplied
MIME.

## Regression-test shape

This leaf updates the named adapter/media/backup suites before its source gate. They
must assert:

- canonical extension wins over original filename, including mixed/multiple suffixes;
- S3 and Azure requests receive exact canonical Content-Type and Content-Disposition;
- local keys remain confined and contain only the canonical suffix;
- header-control input is sanitized and bounded;
- invalid canonical metadata makes no storage call;
- unchanged get/delete behavior remains green; a regression proves public media code
  does not call `getPublicUrl` or expose `StoredMedia.url`.
- backup upload/download/lifecycle tests prove the generic `put` contract is unchanged
  and cannot accidentally receive media-only disposition semantics.

TASK-536-05-L01 may add cross-layer cases after this gate but cannot re-baseline these
adapter compatibility assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/media/localAdapter.test.ts \
  tests/unit/media/s3Adapter.test.ts \
  tests/unit/media/azureAdapter.test.ts \
  tests/unit/media/mediaService.test.ts \
  tests/unit/backups/backupService.test.ts
~~~

Re-run a named failure alone before declaring it real.

## Acceptance criteria

- No storage key extension originates from the original filename.
- No remote object Content-Type originates from the multipart declaration.
- Remote delivery metadata matches the canonical delivery policy.
- Every adapter supplies the stream used by the provider-independent media proxy.
- Adapter behavior is deterministic across local, S3, and Azure.
