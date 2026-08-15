# TASK-511-03: Media file streaming into/out of the archive

# FileName: TASK-511-03-Media-File-Streaming.md

**Priority:** High
**Category:** Backups / Data / Media / Security
**Estimated Effort:** Medium
**Parent Task:** TASK-511 (`TASK-511_Backup_V2_Scalable_Compressed_Encrypted_Importable.md`)
**Depends on:** TASK-511-01 (streaming export engine + archive/tar writer + manifest), TASK-511-02 (gzip + AES-256-GCM encryption)
**Blocks:** TASK-511-05 (import/restore pipeline consumes the media restore helper)
**Status:** ✅ Done
**Completed:** 2026-08-15
**Land order:** strictly sequential 01 → 02 → **03** → 04 → 05 → 06 → 07

---

## 1. Overview / Goal

TASK-484's artifact stored media as **metadata only**. `createBackupArtifact()`
(`core/services/backups/backupService.ts:354`) writes a `media` section whose
own note admits it: *"Media file bytes stay in the configured media storage. This
backup stores the media library metadata and URLs."* A restore onto a fresh /
wiped storage backend therefore resurrects `media` rows that point at object keys
whose **bytes no longer exist** — broken images everywhere.

This subtask makes the `media` include option mean **file bytes**. It streams
every stored media object out of the configured storage adapter into a `media/`
area of the backup tar during export, and streams those members back into storage
on restore, **preserving the original storage key** so the restored `media` rows
(re-inserted verbatim by 01/05) still resolve. Files whose bytes are unusable —
**absent** (deleted/never-uploaded) OR **size-drifted** (on-disk byte count ≠ the
DB-declared `media.size`, a legitimate real-world condition) — are handled
gracefully: **skipped + recorded in the manifest, never a corrupt archive, and
never a hard failure of the whole export**. A single bad row degrades to a broken
image on restore (identical to an absent file), it does NOT abort the backup.

This subtask owns **only the media-bytes path**. It plugs into the archive
**writer** seam produced by 01 (export) and the tar **reader** seam produced by 05
(restore, since 01's scope excludes restore), plus the encryption envelope produced
by 02; it
does NOT re-implement tar/gzip/crypto and does NOT edit the DB snapshot logic
(the `media` **table rows** remain 01's NDJSON responsibility — this subtask adds
the **file bytes** that those rows reference).

### Non-goals
- No new HTTP route. Export `streamMediaIntoArchive` is injected into 01's
  `packBackupArchive` as `opts.mediaExporter` by 06's create-wiring (01 §4.6a
  land-order-safe injection — 01 lands first and cannot import 03); restore
  `restoreMediaFromArchive` is called by 05's pipeline after the DB commit.
- No change to the DB `media` table snapshot / restore ordering (01 owns that).
- No change to the include allowlist: `media` already exists in
  `backupIncludeOptions` (`backupTypes.ts:8`); only its **meaning** changes
  (metadata → bytes). `users` is added by 04. No new validated key ships here, so
  no new allowlist entry — but see §6 for the media-manifest round-trip test.

---

## 2. Grounded facts (verified against the worktree)

- **Storage adapter contract** — `core/services/media/storage/adapter.ts`:
  ```ts
  export interface MediaStorageAdapter {
    put(file: UploadFile): Promise<StoredMedia>;              // GENERATES a NEW key
    get(key: string): Promise<NodeJS.ReadableStream>;         // streams existing bytes
    delete(key: string): Promise<void>;
    getPublicUrl(key: string): string;
  }
  ```
  `UploadFile = { name; type; size; arrayBuffer(): Promise<ArrayBuffer> }`,
  `StoredMedia = { key; url }`.
- **Resolver** — `getMediaStorageAdapter()` (`core/services/media/storage/index.ts:67`)
  returns the adapter for the **current** `storage.driver` setting; test seam
  `__setMediaStorageAdapterForTests()` / `resetMediaStorageAdapterCache()` in the
  same file (production-guarded).
- **`put()` re-keys.** `buildKey()` in `local.ts:27`, `s3.ts:56`, `azure.ts:63`
  all mint a fresh `YYYY/MM/<randomUUID><ext>` key on every `put`. **This is why
  restore CANNOT use `put()`** — it would write bytes under a new key while the
  restored `media` row (and every page/block that references `media.url`) still
  points at the original key. Restore MUST write bytes **at the original key** →
  this subtask adds a keyed-write method (`putAt`, §4.1).
- **`get()` on a missing object — TWO distinct rejection shapes per cloud driver,
  plus a deferred local ENOENT.** The in-code sentinels are NOT the shape a real
  absent object produces:
  - **S3** (`s3.ts:92-101`): `get()` does `const result = await client.send(new
    GetObjectCommand(...)); if (!result.Body) throw new Error("s3_object_missing")`.
    For a genuinely absent key the **AWS SDK v3 `client.send()` REJECTS FIRST** with
    a `NoSuchKey` error (`err.name === "NoSuchKey"`, `err.Code === "NoSuchKey"`,
    `err.$metadata?.httpStatusCode === 404`) — control **never reaches** the
    `s3_object_missing` sentinel (that guard only fires on the practically-never
    case of a 200 response carrying an empty `Body`).
  - **Azure** (`azure.ts:102-109`): `get()` does `const response = await
    blobClient.download(); if (!response.readableStreamBody) throw
    new Error("azure_object_missing")`. For a genuinely absent blob
    `blobClient.download()` **REJECTS FIRST** with a `RestError`
    (`err.name === "RestError"`, `err.code === "BlobNotFound"`,
    `err.statusCode === 404`) — control **never reaches** the `azure_object_missing`
    sentinel.
  - **Local** (`local.ts:52-55`): `get()` returns a lazy `createReadStream`
    synchronously; the `ENOENT` (`err.code === "ENOENT"`) surfaces only on the
    **first read**, i.e. later, during the pipe inside `appendStream`.

  So the "absent file" signal to catch + skip on export is the UNION of: the real
  SDK rejection (`NoSuchKey` for S3, `BlobNotFound`/404 for Azure), the two in-code
  sentinels (`s3_object_missing` / `azure_object_missing`, retained for the rare
  empty-Body path), and the deferred local `ENOENT`. `isMissing()` (§4.2) matches
  all of these; matching only the sentinels would let a real missing cloud object
  abort the whole export.
- **Media table** — `core/db/tables/media.ts:41` `media` has
  `key` (storage key, `notNull`), `url`, `mimeType` (`notNull`), `size`
  (`integer notNull`), `type`, `originalName`, … `key` is the join between a DB
  row and its stored bytes.
- **Adapter errors may echo credentials.** `uploadBackupArtifact()`
  (`backupService.ts:300-373`) already establishes the required pattern: catch the
  raw adapter error, `console.error` it **server-side only**, and surface a
  machine-readable, credential-free code (`backup_upload_failed`). This subtask
  reuses that pattern (§4.2 / §4.3).
- **Deps available (core/package.json):** `@aws-sdk/client-s3`,
  `@azure/storage-blob`, `fflate`; Node `node:stream` / `node:zlib` under Bun.
  No `tar`/`tar-stream` dep — the tar **writer** is 01's hand-rolled seam and the
  tar **reader** is 05's (`readTarMembers`); this subtask consumes both (see §7).
- **Only one existing adapter fake** exists —
  `tests/unit/backups/backupRemoteStorage.test.ts:40 makeFakeAdapter` (the media
  fakes in `tests/unit/media/*.test.ts` use `getMediaStorageAdapter()` against a
  real local driver, not inline literals). Adding a required interface method
  forces a one-line update there (§8 Coordination).

---

## 3. Owning module(s) — single-writer

**Create (owned outright by 03):**
- `core/services/backups/mediaArchive.ts` — the export + restore media-bytes
  streaming helpers (all new logic lives here).

**Extend (03 becomes the writer for the `putAt` addition; keep every existing
symbol byte-identical):**
- `core/services/media/storage/adapter.ts` — add `putAt` to the interface.
- `core/services/media/storage/local.ts` — implement `putAt` (keyed FS write).
- `core/services/media/storage/s3.ts` — implement `putAt` (keyed `PutObject`).
- `core/services/media/storage/azure.ts` — implement `putAt` (keyed block-blob).
- `tests/unit/backups/backupRemoteStorage.test.ts` — add `putAt` to
  `makeFakeAdapter` so the fake still satisfies `MediaStorageAdapter` (typecheck).

**Consume (do NOT edit — provided by 01/02/05):**
- 01's archive **writer** seam (`BackupArchiveWriter.appendStream`, imported from
  `backupArchive.ts`) + 01's `manifest.json` builder (03 contributes a `media`
  summary block to it).
- 05's tar **reader** seam (async-iterate members). 01 has NO reader (its scope
  excludes restore); the concrete `readTarMembers`/`BackupArchiveReader` is owned by
  05's `backupImport.ts`, which lands AFTER 03. So 03 does NOT import a reader type
  from either subtask — it declares its own minimal local structural interface (§4.3)
  that 05's concrete reader satisfies structurally (05 §7.2).
- 02's encryption envelope (transparent — 03 writes plaintext tar members; 02
  wraps the whole tar in gzip+AES-GCM).
- 05's restore pipeline (calls `restoreMediaFromArchive`).

> The DB `media`-table NDJSON stays 01's. `backupService.ts`'s legacy
> `createBackupArtifact`/`buildDatabaseSnapshot` media handling is **replaced** by
> 01's streaming engine — 03 does not touch `backupService.ts`, avoiding an
> ownership clash with 01.

---

## 4. Implementation pseudocode (execution-ready)

### 4.1 Keyed write on the storage adapters

Restore needs to place bytes at a **caller-chosen** key (the original one), which
`put()` cannot do. Add a keyed, streamed write. Signature (added to
`MediaStorageAdapter`):

```ts
// adapter.ts
putAt(
  key: string,
  body: AsyncIterable<Uint8Array>,   // one uniform chunk type across export/restore;
                                     // = the reader entry body (05's ArchiveMemberEntry)
  size: number,          // declared byte length (from tar member header / media.size)
  contentType: string,
): Promise<void>;
```

Implementations (stream per file — never buffer the whole archive; a single media
file is the only unit ever in flight):

`body` is an `AsyncIterable<Uint8Array>` (§4.1) — the reader entry body 05 threads
in. Each driver adapts it to what its own transport wants; all three consume it as
a stream, none buffers the whole file.

```ts
// local.ts  (pipeline() accepts an AsyncIterable source directly)
async putAt(key, body, _size, _contentType) {
  const baseDir = getLocalMediaDir(options);
  const target = path.join(baseDir, key);
  await ensureDir(path.dirname(target));
  const { pipeline } = await import("node:stream/promises");
  await pipeline(body, createWriteStream(target));   // streamed, no full buffer
}

// s3.ts  (SDK v3's PutObject Body does NOT accept a bare async iterable — wrap it
//         in a Node Readable, same as Azure below; ContentLength avoids buffering)
async putAt(key, body, size, contentType) {
  const { Readable } = await import("node:stream");
  await client.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: Readable.from(body),
    ContentLength: size, ContentType: contentType,
  }));
}

// azure.ts  (already wraps the async iterable in a Readable for uploadStream)
async putAt(key, body, _size, contentType) {
  const blockBlob = containerClient.getBlockBlobClient(key);
  await blockBlob.uploadStream(
    Readable.from(body), undefined, undefined,
    { blobHTTPHeaders: { blobContentType: contentType } },
  );
}
```

`put()`, `get()`, `delete()`, `getPublicUrl()` are unchanged. `putAt` intentionally
does NOT run `buildKey()` — the key is authoritative.

### 4.2 Export — `streamMediaIntoArchive`

Enumerate media keys in bounded batches (keyset over `media.id`, never
`SELECT *` of the whole table), stream each object's bytes into a tar member named
`media/<storageKey>`, and return a summary for the manifest.

```ts
// mediaArchive.ts
const MEDIA_MEMBER_PREFIX = "media/";
const MEDIA_KEY_BATCH = 1000;               // rows per keyset page (keys only)
// In-code sentinels (rare empty-Body/empty-stream path). The COMMON missing-object
// case rejects earlier with a real SDK error shape — see isMissing() below.
const MEDIA_MISSING_ERRORS = new Set([
  "s3_object_missing", "azure_object_missing",
]);

export type MediaArchiveSummary = {
  fileCount: number;                        // members actually written
  totalBytes: number;                       // sum of member sizes
  // reason is pinned to "missing" to stay byte-compatible with 01's PRE-DECLARED,
  // CLOSED `ArchiveMediaManifest.skipped[].reason` (01 §4.1, lines 176-177), which
  // 05's reject-unknown manifest validator enforces. 03 CANNOT edit 01, so a
  // size-drifted row is folded into the SAME "missing" bucket (its usable bytes are
  // effectively absent). A more precise "size_mismatch" reason is deferred to an
  // owner decision + a one-word widening of 01's union — see §7 item 3.
  skipped: Array<{ key: string; reason: "missing" }>;
};

// `writer` is 01's archive writer seam (imported from backupArchive.ts). Shape (§7.1):
//   writer.appendStream(name: string, size: number, body: AsyncIterable<Uint8Array>): Promise<void>
export async function streamMediaIntoArchive(
  writer: BackupArchiveWriter,
  deps = { getAdapter: getMediaStorageAdapter, db },
): Promise<MediaArchiveSummary> {
  const adapter = await deps.getAdapter();
  const summary: MediaArchiveSummary = { fileCount: 0, totalBytes: 0, skipped: [] };

  let cursor: string | null = null;         // last id seen (keyset)
  for (;;) {
    const page = await deps.db
      .select({ id: media.id, key: media.key, size: media.size, mimeType: media.mimeType })
      .from(media)
      .where(cursor ? gt(media.id, cursor) : undefined)
      .orderBy(asc(media.id))
      .limit(MEDIA_KEY_BATCH);
    if (page.length === 0) break;
    cursor = page[page.length - 1].id;

    for (const row of page) {
      let stream: NodeJS.ReadableStream;
      try {
        stream = await adapter.get(row.key);        // S3/Azure REJECT here on missing
      } catch (err) {
        if (isMissing(err)) {                        // absent file -> graceful skip
          summary.skipped.push({ key: row.key, reason: "missing" });
          continue;
        }
        // Auth/transport error may echo credentials -> log server-side ONLY,
        // surface a credential-free code (mirrors uploadBackupArtifact).
        console.error("backup media read failed", err);
        throw new Error("backup_media_read_failed");
      }
      // DEFERRED-OPEN GUARD (local driver). Per §2, the LOCAL driver's get()
      // does NOT throw on a missing file: local.ts:52-55 returns a lazy
      // `createReadStream` synchronously, and the ENOENT is emitted only on the
      // FIRST READ — i.e. later, during the pipe INSIDE appendStream, AFTER the
      // USTAR header has already been written. Unguarded that would both (a)
      // hard-fail the whole export (contradicting §1) and (b) leave a corrupt
      // half-written member in the tar. So we PRIME the stream here — wait for it
      // to prove it can be opened/read (or error) BEFORE handing it to
      // appendStream — and route a deferred ENOENT to the SAME graceful skip.
      const primed = await primeMediaStream(stream);
      if (!primed.ok) {
        if (isMissing(primed.err)) {                 // local deferred ENOENT -> skip
          summary.skipped.push({ key: row.key, reason: "missing" });
          continue;
        }
        console.error("backup media read failed", primed.err);
        throw new Error("backup_media_read_failed");
      }
      // Size reconciliation. 01's `appendStream(name, size, body)` is spool-first
      // and ALREADY asserts the streamed byte count equals the declared `size`,
      // pushing the member (with that declared size) ONLY on a match (01 §4.6a
      // lines 529-533) — so a mismatch can NEVER desync/corrupt the tar (01 simply
      // never emits the member). But 03 has no authoritative upfront size other
      // than the DB `media.size` (media.ts:50), which can legitimately DRIFT
      // from the real on-disk byte count. If 03 passed the drifted DB size, 01's
      // assertion would throw the generic `backup_archive_export_failed` and abort
      // the WHOLE export — contradicting §1's "never a hard failure". So `row.size`
      // is threaded through `countingStream`, which throws a DISTINCT, catchable
      // sentinel (`backup_media_size_mismatch`) on a short/long body. 03 catches
      // exactly that sentinel and converts it into a per-file graceful SKIP
      // (recorded like an absent file), letting every other file still export.
      try {
        await writer.appendStream(`${MEDIA_MEMBER_PREFIX}${row.key}`, row.size, countingStream(primed.stream, row.size));
      } catch (err) {
        if (err instanceof Error && err.message === "backup_media_size_mismatch") {
          // On-disk bytes != declared media.size -> drop this one row (01 did NOT
          // push the member, so the tar stays valid) and record it as skipped.
          summary.skipped.push({ key: row.key, reason: "missing" });
          continue;
        }
        throw err;                                   // genuine writer/spool failure -> fail closed
      }
      summary.fileCount += 1;
      summary.totalBytes += row.size;
    }
  }
  return summary;   // handed to 01's manifest builder as manifest.media
}
```

- **`isMissing`**: matches the FULL union of absent-object signals (§2) — the real
  SDK rejection shape (the common cloud path), the two in-code sentinels (rare
  empty-Body path), and the deferred local `ENOENT`. It must NOT rely on
  `err.message` alone, because the real `NoSuchKey`/`BlobNotFound` errors carry the
  signal on `name`/`code`/`$metadata.httpStatusCode`/`statusCode`, not the message:
  ```ts
  function isMissing(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const e = err as Error & {
      code?: string; Code?: string; statusCode?: number;
      $metadata?: { httpStatusCode?: number };
    };
    // in-code sentinels (rare empty-Body/empty-stream success path)
    if (MEDIA_MISSING_ERRORS.has(e.message)) return true;
    // local deferred ENOENT (first read)
    if (e.code === "ENOENT") return true;
    // S3 real absent key: NoSuchKey / 404
    if (e.name === "NoSuchKey" || e.Code === "NoSuchKey") return true;
    // Azure real absent blob: RestError BlobNotFound / 404
    if (e.name === "RestError" && e.code === "BlobNotFound") return true;
    // shared 404 fallback (either cloud SDK)
    if (e.$metadata?.httpStatusCode === 404 || e.statusCode === 404) return true;
    return false;
  }
  ```
  Covers BOTH the reject-at-`get()` cases (real SDK `NoSuchKey`/`BlobNotFound`/404
  AND the two empty-response sentinels) and the deferred-ENOENT the local driver
  raises on first read.
- **`primeMediaStream(stream)`**: resolves the deferred-open ambiguity for the
  local driver without consuming payload bytes. It attaches one-shot listeners and
  settles on the first event to fire, then removes all listeners:
  ```ts
  async function primeMediaStream(
    stream: NodeJS.ReadableStream,
  ): Promise<{ ok: true; stream: NodeJS.ReadableStream } | { ok: false; err: unknown }> {
    return await new Promise((resolve) => {
      const s = stream as NodeJS.ReadableStream & {
        once(ev: string, cb: (...a: unknown[]) => void): unknown;
        off?(ev: string, cb: (...a: unknown[]) => void): unknown;
      };
      const done = (r: { ok: true; stream: NodeJS.ReadableStream } | { ok: false; err: unknown }) => {
        s.off?.("open", onOpen); s.off?.("readable", onReady);
        s.off?.("end", onReady); s.off?.("error", onError);
        resolve(r);
      };
      const onOpen = () => done({ ok: true, stream });   // fs.ReadStream got the fd (file exists)
      const onReady = () => done({ ok: true, stream });  // readable/end buffered — data NOT consumed
      const onError = (err: unknown) => done({ ok: false, err });
      s.once("open", onOpen);      // fs.ReadStream only; fires BEFORE any data
      s.once("readable", onReady); // non-fs streams (fake/S3/Azure body)
      s.once("end", onReady);      // empty file
      s.once("error", onError);    // ENOENT (local deferred) or transport error
    });
  }
  ```
  `once('open')`/`once('readable')` do not read the payload (the buffered chunk
  stays queued), so the primed stream is handed to `countingStream(...)` intact.
  For S3/Azure the missing case already threw at `get()`; here priming just
  confirms readiness. This is the pre-flight the finding calls for — a deferred
  ENOENT is detected BEFORE `appendStream` writes the header, so the tar is never
  corrupted and the row is skipped, not fatal.
- **`countingStream`**: a passthrough that counts bytes; on `end` (short body) or
  when the running count exceeds `declared` (long body) it emits a **distinct
  sentinel** `Error("backup_media_size_mismatch")`. That error propagates out of
  01's `appendStream` (its spool loop iterates this stream, so the raw sentinel —
  not 01's generic code — surfaces at 03's `await`, and 01 has NOT pushed the
  member), where the loop above catches it and turns it into a graceful per-file
  skip. Its purpose is therefore NOT to prevent tar corruption (01's spool-first
  assertion already guarantees the header can never desync — it never emits a
  mismatched member); it is to produce a **catchable, per-file signal** so a
  single DB-size-drifted row degrades to a skip instead of aborting the whole
  export. Preferred over trusting the raw stream length blindly.
  ```ts
  // node:stream Transform passthrough; forwards chunks untouched, counts bytes.
  function countingStream(src: NodeJS.ReadableStream, declared: number): AsyncIterable<Uint8Array> {
    let count = 0;
    return (async function* () {
      for await (const chunk of src as AsyncIterable<Uint8Array>) {
        count += chunk.byteLength;
        if (count > declared) throw new Error("backup_media_size_mismatch"); // long body
        yield chunk;
      }
      if (count !== declared) throw new Error("backup_media_size_mismatch");  // short body
    })();
  }
  ```
- Media enumeration is gated by the caller (01) on `include.includes("media")`;
  when `media` is not selected, `streamMediaIntoArchive` is simply not called.

### 4.3 Restore — `restoreMediaFromArchive`

Consume the tar reader (owned by **05**, see §7), filter `media/` members, write
each back to storage at its **original key** via `putAt`. Runs OUTSIDE the DB
transaction (bytes-to-object-storage is not transactional), invoked by 05 AFTER the
DB `media` rows are restored so keys line up.

The reader type is a **minimal local structural interface** declared in 03 (NOT
imported from 01 — 01 has no reader — and NOT from 05, which lands after 03). 05's
concrete `readTarMembers`/`ArchiveMemberEntry` satisfies it by structural typing at
integration, with no cross-import and no land-order break (05 §7.2):

```ts
// mediaArchive.ts — local structural type; 05's concrete reader is assignable to it.
type BackupArchiveReader = {
  entries(): AsyncIterable<{ name: string; size: number; body: AsyncIterable<Uint8Array> }>;
};

export type MediaRestoreSummary = { restored: number; totalBytes: number };

// Content-type derived from the storage key's extension (see §4.3 note on the
// fidelity tradeoff vs the DB `media.mimeType`). Small, self-contained map — no
// `mime-types` dep, no core util exists for this (grep confirms zero ext→mime
// helper in core/). Extensions are matched case-insensitively; anything unlisted
// falls back to `application/octet-stream` at the call site. The set mirrors the
// upload-accepted image types (assistantSiteBuilderIntakeReferencePolicy.ts) plus
// the common non-image media the CMS stores.
const EXT_TO_MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", ico: "image/x-icon",
  bmp: "image/bmp", tiff: "image/tiff", pdf: "application/pdf", mp4: "video/mp4",
  webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav",
  ogg: "audio/ogg", txt: "text/plain", json: "application/json",
};
function mimeFromExt(key: string): string | undefined {
  const dot = key.lastIndexOf(".");
  if (dot < 0 || dot === key.length - 1) return undefined;
  return EXT_TO_MIME[key.slice(dot + 1).toLowerCase()];
}

export async function restoreMediaFromArchive(
  reader: BackupArchiveReader,
  deps = { getAdapter: getMediaStorageAdapter },
): Promise<MediaRestoreSummary> {
  const adapter = await deps.getAdapter();
  const out: MediaRestoreSummary = { restored: 0, totalBytes: 0 };

  for await (const entry of reader.entries()) {
    if (!entry.name.startsWith(MEDIA_MEMBER_PREFIX)) {
      // 05's readTarMembers is a FRESH full-archive reader (05 §5.5:
      // `restoreMediaFromArchive(readTarMembers(fileStream(tarPath)))`) that yields
      // manifest.json FIRST, then tables/<key>.ndjson, then settings.json, then the
      // media/* members — so this branch is hit for real, and for the very first
      // member every restore. 05's reader is a rolling-buffer ustar parser whose
      // documented contract is: "The consumer MUST fully drain each member's body
      // before advancing" (05 §5.2; 05's own validateArchive obeys it in §5.4). A bare
      // `continue` here would leave the undrained body's
      // bytes in the stream, so the reader's "consume padding to the next 512
      // boundary" step would read PAYLOAD bytes as the next 512-byte header →
      // checksum/typeflag failure or corrupt media extraction. Since manifest.json
      // always precedes media/*, that would break essentially every media restore.
      // 03 cannot edit 05, so 03 honors the seam here: fully drain the non-media
      // body before advancing (identical to 05's validateArchive drain).
      for await (const _ of entry.body) { /* discard — advance the tar cursor */ }
      continue;                                                   // 01 handles ndjson/manifest
    }
    const key = entry.name.slice(MEDIA_MEMBER_PREFIX.length);
    assertSafeMediaKey(key);                                     // §5 traversal guard
    assertUnderSizeCeiling(entry.size);                          // §5 per-file ceiling
    try {
      await adapter.putAt(key, entry.body, entry.size, mimeFromExt(key) ?? "application/octet-stream");
    } catch (err) {
      console.error("backup media write failed", err);          // server-side only
      throw new Error("backup_media_write_failed");              // credential-free; fails the restore
    }
    out.restored += 1;
    out.totalBytes += entry.size;
  }
  return out;
}
```

- **Ordering / transactionality:** the DB restore is all-or-nothing inside 05's
  single `tx`; media bytes are best-effort-consistent object writes. On a media
  write failure AFTER a committed DB restore, surface `backup_media_write_failed`
  so the operator can re-run; do NOT attempt to roll back object storage. Document
  this in 05/07. (Confirmed acceptable: broken-image degradation, not data loss.)
- Content-type: `putAt` needs one; derive it from the key extension via the
  `mimeFromExt` helper defined in the §4.3 code block above (small `EXT_TO_MIME`
  map; no core util exists for this — grep confirms zero ext→mime helper in
  `core/`, and the reverse `mediaClient.ts` map is admin-side mime→ext). The exact
  `mimeType` also lives on the restored `media` row (`media.ts:49`), but
  decoupling from the DB keeps the media-bytes stream independent of restore
  ordering (bytes are written OUTSIDE the DB `tx`, and the reader may run before or
  regardless of a given row being present). **Fidelity tradeoff (explicit):** on
  S3/Azure the `ContentType` is persisted on the object and governs whether a
  restored image renders inline vs downloads, so an unrecognized extension degrades
  to `application/octet-stream`. `mimeFromExt` therefore covers every extension the
  CMS actually stores (the upload-accepted image set + common video/audio/doc
  types); the `?? "application/octet-stream"` is a last-resort fallback for
  genuinely unknown keys, NOT the common path. If an implementer finds a stored
  extension the map misses, extend `EXT_TO_MIME` rather than accept the fallback.
  (Deferred alternative, if fidelity ever proves insufficient: thread the restored
  row's `media.mimeType` in — but that re-couples bytes to DB ordering and is a
  scope widening, so it is out of scope here.) `getMediaStorageAdapter()` resolves
  the CURRENT driver — restore lands bytes on whatever backend is configured now
  (same behavior as 484's remote delete driver-awareness).

### 4.4 Data flow (end to end)

Export: `01 engine` → (include has `media`) → `streamMediaIntoArchive(writer)` →
per-key `adapter.get` → `primeMediaStream` (skip on missing/deferred-ENOENT) →
`writer.appendStream("media/<key>", size, countingStream(bytes, size))`
(skip on `backup_media_size_mismatch`; the whole export never aborts on one row) →
returns summary → `01 manifest.media = summary` → 02 gzips+encrypts the whole tar.

Restore: 05 → 02 decrypts+gunzips → 05 tar reader (`readTarMembers`, a FRESH
full-archive reader) → 05 restores DB `media` rows (verbatim, original keys) →
`restoreMediaFromArchive(reader)` iterates ALL members (manifest.json first, then
`tables/*.ndjson`, `settings.json`, then `media/*`); non-`media/` members are
**drained** (bodies consumed) before advancing — honoring 05's "fully drain each
member's body before advancing" reader contract (05 §5.2) so the ustar cursor never
desyncs — then per `media/<key>` member → `assertSafeMediaKey` →
`adapter.putAt(key, body, size, ct)`.

---

## 5. Security Contract

This subtask adds **no HTTP route**, but it is on the **restore write path** (it
writes attacker-influenceable bytes to the configured storage backend) and the
**export read path** (it touches storage credentials via the adapter). It is
reached only through 05's route (RBAC `backups:write`, CSRF, confirmation-gated,
reject-unknown validation) — 05 restates the full route contract. 03's own duties:

1. **Path-traversal / key-injection guard (restore).** Before any `putAt`,
   `assertSafeMediaKey(key)` MUST reject a key that is empty, absolute (leading
   `/` or drive-letter), contains `..` segments, backslashes, NUL, or does not
   match the expected media key charset (`^[A-Za-z0-9._\-/]+$` with no `//` or
   `.`/`..` path segments). A crafted archive with `media/../../etc/x` must never
   escape the media root — critical for the local FS driver
   (`path.join(baseDir, key)` in `local.ts`). Fail closed with
   `backup_media_key_unsafe`.
2. **Per-file + count ceilings.** Enforce a max per-file size
   (`BACKUP_MEDIA_MAX_FILE_BYTES`, server-owned env, sane default e.g. 512 MiB via
   `parsePositiveIntEnv`-style parsing) before streaming a member to storage, so a
   malicious archive cannot fill the disk/bucket via one giant member. The overall
   archive-size ceiling is 05's upload guard.
3. **No secret leakage.** Adapter errors (S3/Azure) may echo access keys /
   connection strings. Both helpers catch the raw error, `console.error` it
   **server-side only**, and surface machine-readable, credential-free codes
   (`backup_media_read_failed`, `backup_media_write_failed`) — never persisted
   with credentials, never returned to clients (mirrors
   `uploadBackupArtifact`'s established pattern). No key/salt/IV/passphrase is
   ever touched here (encryption is 02's envelope around the whole tar).
4. **Media bytes only ever leave in an archive that 02 has encrypted when the
   operator supplied a passphrase.** 03 writes plaintext tar members; the
   encryption decision is 02's. 03 adds no unencrypted side-channel (no temp file
   outside the archive stream, no logging of bytes/URLs).
5. **No privilege / no DB writes.** 03 performs zero DB writes; it only reads
   `media` keys (export) and writes object bytes (restore). It cannot alter RBAC.

---

## 6. Testing Requirements

**Lane: Bun** (`tests/unit/backups/`) — streaming, `node:stream`, real fs, storage
adapters, and DB keyset enumeration are all Bun-runtime concerns. No Vitest here
(nothing is genuinely Bun-free pure logic; even the key-guard is trivial and rides
with the Bun suite for cohesion).

New file: `tests/unit/backups/backupMediaArchive.test.ts`.

**Shared-DB safety (pinned in parent §Coordination):** the remote test DB is
shared. Every DB-touching case inserts **uniquely-scoped** `media` rows with a
run-unique key prefix (e.g. `test-t511-03/<uuid>/…`) and deletes ONLY those rows
in `afterEach`. Never truncate `media`. Prefer a **hermetic fake adapter** (via
`__setMediaStorageAdapterForTests`) so no real S3/Azure/FS is required for the
round-trip; reset it + `resetMediaStorageAdapterCache()` in `afterEach` (copy the
hygiene harness from `backupRemoteStorage.test.ts`).

Regression cases (shape):
1. **Bytes round-trip, key preserved.** Fake adapter with an in-memory
   `Map<key,Buffer>` seeded for known keys → run `streamMediaIntoArchive` into an
   in-memory tar writer double → run `restoreMediaFromArchive` from an in-memory
   tar reader double into a FRESH (empty) fake store → assert every original key
   exists in the new store with byte-identical content. **Key equality is the
   core assertion** (guards the `put`-rekeys-restore-would-use-`putAt` trap).
2. **Missing file skipped, not fatal — every signal path.**
   (a) *Real cloud SDK rejection (the COMMON missing-object path).* This is the
   case the round-3 audit caught: a genuinely absent object rejects at `get()` with
   the SDK's own error, NOT the in-code sentinel. Add THREE fakes and assert each is
   skipped (in `summary.skipped`), export completes, other files still written, no
   throw:
   - S3 `NoSuchKey`: `get()` rejects with an error where
     `name === "NoSuchKey"`, `Code === "NoSuchKey"`,
     `$metadata = { httpStatusCode: 404 }` (message NOT a sentinel);
   - Azure `BlobNotFound`: `get()` rejects with an error where
     `name === "RestError"`, `code === "BlobNotFound"`, `statusCode === 404`;
   - the retained in-code sentinel: `get()` throws `Error("s3_object_missing")`
     (and `azure_object_missing`) for the rare empty-response path.
   All four must land in `summary.skipped` and none may abort the export. (A test
   that only faked the sentinel string would give false confidence, since it does
   not reproduce the real rejection shape.)
   (b) *Local deferred-ENOENT (during pipe).* Use the REAL local driver against a
   temp `MEDIA_DIR`: seed two `media` rows, write the on-disk file for only one of
   them, leave the other key with NO bytes on disk. `get()` for the missing key
   resolves a lazy `createReadStream` (no throw at `get()`); the ENOENT surfaces on
   first read. Assert: `streamMediaIntoArchive` completes without throwing, the
   present file IS written, `summary.skipped` contains the byteless key, and NO
   partial/corrupt member exists for it in the tar writer double (proves the prime
   guard caught it BEFORE `appendStream` wrote the header). This is the case that
   `s3_object_missing` (thrown-from-get) and case 7 (local `putAt`) do not cover.
3. **Non-missing (auth) error fails closed, credential-free.** Fake `get()`
   throws `Error("AccessDenied AKIA... secret")` → `streamMediaIntoArchive`
   rejects with `backup_media_read_failed`; assert the thrown message contains
   neither the sentinel secret nor `process.cwd()`.
4. **Size-mismatch → graceful per-file skip, NOT a whole-export failure.** Seed
   two `media` rows; the fake `get()` returns FEWER bytes than the declared `size`
   for one key (also add a long-body variant that returns MORE bytes) → assert
   `streamMediaIntoArchive` completes WITHOUT throwing, the size-drifted key appears
   in `summary.skipped`, NO corrupt/partial member is written for it (spy on the tar
   writer double proves 01 never pushed it), and the correctly-sized file IS still
   written. This codifies §1's "never a hard failure" for DB-size drift and guards
   the regression where a single drifted row aborted the entire backup. (A genuine
   writer/spool failure — a non-`backup_media_size_mismatch` error from
   `appendStream` — still fails closed; assert that path separately with a fake
   writer that throws a different error.)
5. **Traversal guard.** `restoreMediaFromArchive` fed a reader whose member name
   is `media/../../etc/passwd` (and `media//x`, `media/a/../../b`) → rejects with
   `backup_media_key_unsafe`; `putAt` never called (spy asserts 0 writes).
6. **Per-file ceiling.** Member declaring `size > BACKUP_MEDIA_MAX_FILE_BYTES`
   → rejected before `putAt`.
7. **`putAt` writes at the exact key on each real driver** (local at minimum,
   no network): local driver + temp `MEDIA_DIR` → `putAt("2026/07/x.bin", …)` →
   file exists at `<dir>/2026/07/x.bin` (NOT a fresh uuid key), bytes match; then
   `adapter.get(sameKey)` streams them back. (S3/Azure `putAt` verified via the
   fake in case 1 — no live cloud, per parent.)
8. **Manifest round-trip for the media summary.** Assert the `MediaArchiveSummary`
   (`fileCount`/`totalBytes`/`skipped`) 01 embeds in `manifest.json` survives a
   serialize→parse and matches the actual members written — the "new validated
   manifest key ships a round-trip test" requirement for the media block.
9. **Non-media member preceding a media member does NOT desync the reader (drain
   guard).** Build an in-memory reader double whose `entries()` yields, IN ORDER: a
   NON-media member (`manifest.json`, and ideally also a `tables/x.ndjson` and
   `settings.json`) whose `body` is a **consume-once** async iterable that records
   whether it was fully drained, THEN a `media/<key>` member with known bytes. Feed
   it to `restoreMediaFromArchive`. Assert: (a) each preceding non-media body was
   fully drained (the recorder saw all its bytes / hit iterator end) BEFORE the
   media member was processed, and (b) the media member still `putAt`s its key with
   **byte-identical** content. This proves the skipped-member drain (§4.3) advances
   the cursor correctly and that a manifest-first archive still restores media —
   directly guarding the cross-subtask desync the round-3 audit caught. Use the
   05-shaped reader (`{ entries(): AsyncIterable<{ name; size; body }> }`) so the
   double matches the real `readTarMembers` contract, not just the happy path.
10. **Content-type derived from the key extension (`mimeFromExt`).** Feed
    `restoreMediaFromArchive` a fake adapter whose `putAt` records the
    `(key, contentType)` pairs, and a reader yielding `media/*` members with mixed
    extensions: `a.png` → `image/png`, `b.JPG` (uppercase) → `image/jpeg`
    (case-insensitive), `c.bin` (unlisted) → `application/octet-stream` fallback,
    and `d` (no extension) → `application/octet-stream`. Assert each recorded
    `contentType` matches — codifies the §4.3 fidelity contract so a future map edit
    can't silently regress restored-image rendering to octet-stream.

Also confirm the **type gate**: after adding `putAt` to the interface, run root
`tsc -p tsconfig.json --noEmit` (per MEMORY typecheck-scope note) so the updated
`makeFakeAdapter` and all three drivers satisfy `MediaStorageAdapter`.

---

## 7. Open questions / seams required from 01 & 02

These are the exact 01 seams 03 codes against; if 01's final names differ, 03's
two entrypoints adapt (they are the only integration points):

1. **Archive writer** (01) — **RESOLVED**: 01 §4.6a exports
   `BackupArchiveWriter.appendStream(name: string, size: number, body:
   AsyncIterable<Uint8Array>): Promise<void>`. It is **spool-first** (01 §4.6a): the
   body is streamed to a spool file (size + SHA-256 computed incrementally, memory
   O(1)) and the member recorded; the USTAR header is written later by `tarPack` after
   the manifest is finalized (so `manifest.media` counts precede the manifest). 03
   does not depend on where the bytes land — it just hands `(name, size, body)` and
   `appendStream` asserts the streamed byte count equals `size`, pushing the member
   ONLY on a match (01 §4.6a lines 529-533). 03 imports `BackupArchiveWriter` from
   `backupArchive.ts` and codes against exactly this signature. `media.size`
   (media.ts:50) is the declared size passed in. **Size-drift handling (03's
   responsibility, no 01 change):** because a wrong `media.size` would make 01's
   assertion throw `backup_archive_export_failed` and abort the whole export, 03
   wraps the body in `countingStream` (§4.2) which raises a DISTINCT
   `backup_media_size_mismatch` — 03 catches that one code and downgrades the drifted
   row to a graceful skip, so 01's contract is honored unchanged and §1's
   "never a hard failure" holds.
2. **Archive reader** (**05**, NOT 01) — **RESOLVED**: 01 has no reader (its scope
   excludes restore); 05's `backupImport.ts` owns the concrete `readTarMembers`
   returning `BackupArchiveReader = { entries(): AsyncIterable<ArchiveMemberEntry> }`
   with `ArchiveMemberEntry = { name: string; size: number; body: AsyncIterable<Uint8Array> }`
   (post-gunzip, post-decrypt). Because 05 lands AFTER 03, 03 does NOT import this
   type; it declares its own structurally-identical local interface (§4.3) so 05's
   concrete reader is assignable at 05's call site (05 §7.2). The `body` is an
   `AsyncIterable<Uint8Array>` — one uniform chunk type shared with the writer's
   `appendStream` body and passed straight into `putAt` (§4.1). Members are consumed
   as streams (not fully buffered).
3. **Manifest hook** (01) — **RESOLVED**: 01 §4.1 pre-declares the optional
   `manifest.media` block as `ArchiveMediaManifest` (`{ fileCount, totalBytes,
   skipped }`), populated from the `MediaArchiveSummary` 03 returns; it is part of
   01's closed, reject-unknown manifest (05's validator lists `media` in
   `MANIFEST_TOP_KEYS`). The media block's round-trip test stays with 03 (case 8).
   **Skip-reason union — DEFERRED owner decision:** 01 pins
   `ArchiveMediaManifest.skipped[].reason` to the single literal `"missing"` (01 §4.1
   lines 176-177). 03 therefore records size-drifted rows under that SAME `"missing"`
   reason (its usable bytes are effectively absent), keeping 03 byte-compatible with
   01's closed type + 05's reject-unknown validator WITHOUT editing 01. If the owner
   wants the more precise, self-documenting `"size_mismatch"` reason the finding
   suggests, that is a **one-word widening** of 01's union to
   `reason: "missing" | "size_mismatch"` (which 05's manifest validator must also
   allow) — a cross-subtask change 03 cannot make alone. Flagging it here for the
   reconcile/owner pass; until then 03 folds size-drift into `"missing"`.
4. **Restore invocation point** (05): 05 calls `restoreMediaFromArchive` AFTER the
   DB `media` rows are restored and OUTSIDE the DB `tx`. 05 threads a FRESH
   full-archive reader (05 §5.5: `restoreMediaFromArchive(readTarMembers(
   fileStream(tarPath)))`), so 03 receives manifest.json FIRST, then `tables/*`,
   `settings.json`, then `media/*`. Per 05's `readTarMembers` contract ("the
   consumer MUST fully drain each member's body before advancing", 05 §5.2), 03
   §4.3 **drains** every non-media member's body before `continue`
   (same discipline as 05's own `validateArchive`, 05 §5.4) so the ustar
   rolling-buffer cursor never desyncs. This is 03's responsibility on the seam
   (03 cannot edit 05); no 05 change needed, and no media-only-filtered reader is
   required. Test case §6.9 pins it.

---

## 8. Coordination

- **Changelog:** none in this subtask. The single closure subtask **TASK-511-07**
  creates `_docs/_CHANGELOG/1281-*.md` and is the ONLY subtask that edits
  `_docs/_TASKS/*` / `_docs/_CHANGELOG/*` (parent §Coordination). 03 edits only
  the source files in §3.
- **Land order:** strictly sequential — 03 lands AFTER 01 (writer + manifest seams)
  and 02 (encryption envelope) are merged, and BEFORE 05 (which OWNS the tar reader
  seam and consumes `restoreMediaFromArchive`). 03's reader param is a local
  structural interface, so 05 landing after 03 is not a land-time break.
- **Single-writer overlap to flag:** adding a **required** `putAt` to
  `MediaStorageAdapter` forces a one-line update to
  `tests/unit/backups/backupRemoteStorage.test.ts:40 makeFakeAdapter`. That file
  may also be touched by 01's engine rewrite — coordinate so the `putAt` addition
  and any 01 edits do not collide (03 owns the `putAt` line specifically). No
  other adapter fake exists (`tests/unit/media/*` use the real local driver).
- **New env var:** `BACKUP_MEDIA_MAX_FILE_BYTES` (per-file restore ceiling) is
  documented in `.env.example` + `docs/develop/getting-started.md` by the docs
  subtask **07** (03 only reads it via a `parsePositiveIntEnv`-style parser with a
  safe default; it does not edit docs).
- **No DB migration** in this subtask (no schema change — `media` table already
  carries `key`/`size`/`mimeType`).
