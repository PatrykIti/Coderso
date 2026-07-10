# TASK-536-01-L03: Integrate Canonical Media Service and URLs

# FileName: TASK-536-01-L03-Integrate-Canonical-Media-Service-And-Urls.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-01
**Priority:** Critical
**Category:** Media Service / Security / Compatibility
**Estimated Effort:** Medium
**Dependencies:** TASK-536-01-L01, TASK-536-01-L02
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope and exclusive ownership

This leaf is the only TASK-536 writer of `core/services/media/mediaService.ts`.
It integrates the pure byte identity and `putMedia` adapter path into both upload and
replace, removes caller-controlled sniffing, and exposes provider-independent media URLs
on every service result. It owns compatibility/changed-behavior updates in
`tests/unit/media/mediaService.test.ts` and
`tests/unit/backups/backupService.test.ts` before its gate. It must not edit the trust
owner, adapters, HTTP delivery, Forms routes, other tests, docs, task indexes, or
changelog files.

Grounded seams: `mediaService.ts:41-77` allowlists/types; `:211-317` conditional
sniff/declaration logic; `:328-388` upload; `:391-395` list/get; `:456-508` replace.

## Implementation Pseudocode

```ts
async function prepareCanonicalUpload(file, constraints, globalConfig) {
  const buffer = await readBoundedBuffer(file, min(global max, field max));
  const identity = canonicalizeMediaBytes(buffer); // L01
  if (identity === null) throw media_mime_not_allowed;
  if (!isMimeAllowed(identity.mimeType, globalConfig.allowedMime))
    throw media_mime_not_allowed;
  if (!mimeMatchesAccept(identity.mimeType, constraints.allowedMime))
    throw media_mime_not_allowed;
  if identity is octet-stream:
    if no exact application/octet-stream rule: throw media_mime_not_allowed;
    // Wildcard/name/declaration cannot admit this identity.
  return {
    buffer,
    identity,
    storageFile: synthetic UploadFile(
      name=`media${identity.extension}`,
      type=identity.mimeType,
      bytes=buffer
    ),
  };
}

function toMediaDomainRow(row) {
  return { ...row, url: buildMediaDeliveryPath(row.key) };
}

export type MediaDeliveryRecord = {
  key: string;
  mimeType: string;
  originalName: string | null;
  size: number;
};

export async function getMediaDeliveryRecordByKey(
  key: string
): Promise<MediaDeliveryRecord | null> {
  const [row] = await db.select({
    key: media.key,
    mimeType: media.mimeType,
    originalName: media.originalName,
    size: media.size,
  }).from(media).where(eq(media.key, key)).limit(1);
  return row ?? null; // no provider URL or unrelated media projection
}

uploadMedia(...) {
  prepared = await prepareCanonicalUpload(...);
  dimensions = read only for canonical passive image profiles;
  stored = await adapter.putMedia({
    bytes: prepared.storageFile,
    identity: prepared.identity,
    downloadName: bounded original filename,
  });
  insert key=stored.key, url=buildMediaDeliveryPath(stored.key), originalName display-only,
    canonical mime/type/size/dimensions;
  return toMediaDomainRow(row);
}

replaceMedia(...) {
  require existing row;
  prepared = await prepareCanonicalUpload(...);
  store through putMedia and atomically update the same canonical fields/url;
  delete old object only after replacement row succeeds;
  return toMediaDomainRow(row);
}

list/get/update/recover results:
  map every returned row through toMediaDomainRow;
```

Delete `sniffContent` and declaration-based duplicate sniff helpers. Captcha/auth callers
cannot influence preparation. Provider `StoredMedia.url` is ignored by this domain; the
backup subsystem retains its generic adapter path and artifact URL behavior.
This leaf is the sole policy/error owner: L01 only returns a canonical identity or
`null`; this service applies both effective allowlist layers and is the only seam that
maps byte or allowlist rejection to `media_mime_not_allowed`.

## Error and compatibility flow

- Oversize fails `media_file_too_large` before storage; bad/forbidden bytes or policy
  mismatch fail `media_mime_not_allowed`; adapter failures map to
  `media_storage_unavailable` with no row.
- Replacement failure retains the prior row/object; post-success old-object cleanup keeps
  existing bounded maintenance semantics.
- Existing DB rows are not rewritten. List/get/update adapt their URL in memory to
  `/media/<encoded key>`; new/replacement writes persist that route. No provider URL leaves
  the media service.
- No endpoint, migration, schema version, permission, or backup contract changes.
- The HTTP seam receives only the minimal delivery projection; provider URL and unrelated
  metadata never cross that boundary.

## Regression-test shape

This leaf updates its two named suites before the source gate for upload/replace parity,
unconditional canonicalization for every service call with no caller-controlled bypass
flag, exact octet-stream allowlisting,
global/field effective canonical-MIME allowlists, rejected input/no adapter or DB write,
storage failure/no row, replacement failure/no old deletion, new persisted route URL,
legacy list/get/update URL adaptation, and proof that mediaService calls `putMedia` while
backupService continues to call generic `put`. TASK-536-05-L01 owns later additive
cross-layer cases and final reruns only.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/media/mediaService.test.ts \
  tests/unit/backups/backupService.test.ts
```

Re-run a named failure alone before classification.
