# TASK-536-01-L02: Apply Canonical Identity to Storage Adapters

# FileName: TASK-536-01-L02-Apply-Canonical-Identity-To-Storage-Adapters.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-01
**Priority:** Critical
**Category:** Media Storage / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-536-01-L01
**Status:** ✅ Done
**Completed:** 2026-07-11
**Changelog:** 1248

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
in the three adapter suites plus `tests/unit/backups/backupRemoteStorage.test.ts`. The
remote-backup suite owns the typed fake adapter and proves that backup upload/download/
lifecycle continues through generic `put` after the required interface extension while
`putMedia` is never called. `tests/unit/backups/backupService.test.ts` is a read-only
broad compatibility rerun. It must not edit mediaService.ts, httpServer.ts, Forms code,
other tests, docs, or task/changelog indexes.

## Grounded anchors

- storage/adapter.ts:1-17 passes only UploadFile to put().
- storage/local.ts:22-50 gets the extension from file.name.
- storage/s3.ts:56-90 derives the key from the name and sets declared ContentType.
- storage/azure.ts:63-100 derives the key/name and declared blob content type.

## Implementation Pseudocode

~~~ts
export type CanonicalStoredUpload = {
  bytes: Pick<UploadFile, "size" | "arrayBuffer">; // no name/type trust surface
  identity: CanonicalMediaIdentity;
  downloadName: string;          // bounded/sanitized display filename only
};

interface MediaStorageAdapter {
  put(file: UploadFile): Promise<StoredMedia>; // existing generic backup contract
  putMedia(upload: CanonicalStoredUpload): Promise<StoredMedia>; // media-only trust path
  get(key: string): Promise<NodeJS.ReadableStream>; // preserve the existing proxy contract
  ...
}

function buildCanonicalKey(identity) {
  assert identity's complete mimeType/extension/delivery tuple equals the own-property
    entry in CANONICAL_MEDIA_PROFILES (never an inherited property), including
    attachment-only .pdf/.txt/.svg/.bin members;
  key = utcYear + "/" + utcMonth + "/" + randomUUID() + identity.extension;
  validate the final local/Azure key through buildMediaDeliveryPath before I/O;
  return key;
}

local.putMedia(upload) {
  key = buildCanonicalKey(upload.identity);
  write upload.bytes to confined key;
}

s3.putMedia(upload) {
  baseKey = buildCanonicalKey(upload.identity);
  key = preserved S3_PREFIX + baseKey;
  validate the assembled prefixed key through buildMediaDeliveryPath before reading
    bytes or calling the provider; traversal, percent, backslash, empty/dot segments,
    controls, or an overlong configured prefix fail media_identity_invalid;
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
  key = buildCanonicalKey(upload.identity);
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

The central adapter assertion validates the complete identity tuple through
`Object.hasOwn(CANONICAL_MEDIA_PROFILES, mimeType)` and the matching profile before
`arrayBuffer`, filesystem setup, SDK calls, or blob-client lookup. `bytes.name` and
`bytes.type` are deliberately ignored by `putMedia`: they are transport compatibility
fields, not a second storage-key or MIME authority. Output key, MIME, and delivery come
only from the validated identity. The existing optional `S3_PREFIX` remains supported,
but the assembled media key must pass the L01 delivery-path validator before upload so a
bad configuration cannot create an object that the provider-independent proxy cannot
address. Generic backup `put` retains its historical prefix behavior unchanged.

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

This leaf updates the named adapter/backup suites before its source gate. They must
assert:

- canonical extension wins over original filename, including mixed/multiple suffixes;
- poisoned `bytes.name`/`bytes.type` cannot affect a canonical key, provider MIME, or
  disposition;
- S3 and Azure requests receive exact canonical Content-Type and Content-Disposition;
- a valid `S3_PREFIX` is preserved, while traversal, percent, backslash, dot/empty,
  control, and overlong prefixes fail before `arrayBuffer` or an SDK call;
- local keys remain confined and contain only the canonical suffix;
- header-control input is sanitized and bounded;
- inherited MIME keys or any mismatched canonical tuple make no byte-read, filesystem,
  blob-client, or remote storage call;
- unchanged adapter get/delete behavior remains green;
- the typed fake in `backupRemoteStorage.test.ts` implements required `putMedia` as a
  fail-if-called sentinel; remote backup upload/download/lifecycle proves generic `put`
  is unchanged and never receives media-only disposition semantics;
- `backupService.test.ts` remains green without re-baselining unrelated DB behavior.

TASK-536-05-L01 may add cross-layer cases after this gate but cannot re-baseline these
adapter compatibility assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/media/localAdapter.test.ts \
  tests/unit/media/s3Adapter.test.ts \
  tests/unit/media/azureAdapter.test.ts \
  tests/unit/backups/backupRemoteStorage.test.ts \
  tests/unit/backups/backupService.test.ts
~~~

Re-run a named failure alone before declaring it real.

## Acceptance criteria

- No storage key extension originates from the original filename.
- No remote object Content-Type originates from the multipart declaration.
- Remote delivery metadata matches the canonical delivery policy.
- Every adapter supplies the stream used by the provider-independent media proxy.
- Adapter behavior is deterministic across local, S3, and Azure.
