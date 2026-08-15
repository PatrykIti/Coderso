# TASK-511-02: Compression + Passphrase Encryption (streaming gzip + AES-256-GCM/scrypt)

# FileName: TASK-511-02-Compression-And-Passphrase-Encryption.md

**Parent Task:** TASK-511 (Backup v2 — Scalable, Compressed, Encrypted, Importable)
**Priority:** High
**Category:** Backups / Data / Security / Streaming / Crypto
**Estimated Effort:** Large
**Depends on:** TASK-511-01 (streaming batched export engine + tar archive stream & manifest)
**Blocks:** TASK-511-03, -04, -05, -06 (all consume the crypto/compression layer)
**Land order:** strictly sequential — lands after 01, before 03 (01→02→03→04→05→06→07)
**Status:** ✅ Done
**Completed:** 2026-08-15

---

## Overview / Goal

TASK-511-01 produces the plaintext archive as a **streamed tar byte stream** (a
`ReadableStream<Uint8Array>` carrying `manifest.json` + per-table `*.ndjson`
members + a `media/` member area), never materializing the whole tar in memory.

This subtask (02) is the **compression + encryption layer** that wraps that
stream and produces the final on-disk / uploaded artifact:

```
.cbk  =  AES-256-GCM( gzip( tar(manifest + ndjson members + media) ) )
```

Both directions must be **streaming / chunked** so a multi-GB archive is never
fully buffered in memory (the whole point of Backup v2 — no container OOM on a
site with a million rows + media). Concretely:

- **Encrypt path:** `tarStream → gzip → framed AES-256-GCM → .cbk byte stream`.
- **Decrypt path:** `.cbk byte stream → framed AES-256-GCM verify → gunzip → tarStream`.

The AES key is derived from the **user passphrase** via **scrypt** with a
**random per-archive salt**. Salt + KDF params + base nonce + framing parameters
live in a small **plaintext archive header** that is cryptographically **bound
as AAD** to the ciphertext so it cannot be silently downgraded/tampered. A wrong
passphrase (or any tamper/truncation/reorder) yields a **GCM auth failure** that
this module maps to a single fail-closed error code **`backup_decrypt_failed`**
— no plaintext is ever handed downstream on failure. The passphrase, the derived
key, and all KDF material are **backend-only**: never logged, never cached, never
returned to a client, never placed in an Error message.

02 **owns a new crypto module** and **consumes** 01's stream. It does **not**
touch routes, `backupService.ts`, `backupTypes.ts`, `backupSchemas.ts`, or the
scheduler/UI — those belong to 01/05/06 (single-writer). 02 exposes composable,
well-typed stream helpers + constants + error codes that the pipeline owner (01
for create, 05 for import/restore) wires in.

## Verified current-state anchors (re-checked against source in this worktree)

- `core/services/backups/backupService.ts` — v1 builds the artifact **in memory**
  (`createBackupArtifact` → `JSON.stringify(artifact, null, 2)`), persists as
  `coderso-backup-<id>.json` via `writeFile` (local) or `uploadBackupArtifact`
  (s3/azure through the media adapter). `resolveBackupArtifactPath(id)` hard-codes
  the `.json` name + `BACKUP_ARTIFACT_CONTENT_TYPE = "application/json"`.
  **These belong to 01/06 to migrate to `.cbk`** — 02 only exports the naming
  constants they will consume.
- `core/services/backups/backupTypes.ts` — `backupIncludeOptions = ["database",
  "media", "settings"]` (no `users` yet; 04 adds it). No crypto types exist. 02
  keeps its types **inside its own module** (does not edit `backupTypes.ts`).
- `core/server/routes/backupRoutes.ts` — `mapBackupError()` is the coded-error →
  `ApiError` allowlist (e.g. `backup_restore_invalid_artifact` → 422). 02's new
  codes (`backup_decrypt_failed`, `backup_passphrase_required`,
  `backup_passphrase_invalid`, `backup_archive_unsupported`) are **added to that
  switch by the route-owning subtask (05/06)**, not by 02.
- `core/server/validation/backupSchemas.ts` — `createBackupSchema` /
  `restoreBackupSchema` do not carry a `passphrase` key yet; 06 (create) and 05
  (import/restore) add + allowlist it. 02 exports the reusable
  `normalizeBackupPassphrase()` / policy those schemas' handlers call.
- No `node:zlib` / `Bun.gzip` / streaming-crypto usage exists in the backup code
  today; `apiKeysService.ts` only uses `randomBytes`. This module is greenfield.
- Runtime primitives **verified present in this Bun runtime**: `CompressionStream`
  / `DecompressionStream`, Web `ReadableStream` / `TransformStream`, and
  `node:crypto` `createCipheriv("aes-256-gcm", …)` / `createDecipheriv` /
  `getAuthTag`/`setAuthTag` / `scrypt`. (Verified via `bun -e` in this worktree.)
- Users/roles tables (`users`, `roles`, `userRoles`) exist in
  `core/db/tables/identity.ts` (`:23`/`:36`/`:44`; re-exported by `core/db/schema.ts`)
  (04's concern; noted only because `users` is encrypted-archive-only and this
  layer is what makes "encrypted-only" enforceable).

## Owning module(s) — single-writer

**Create (owned solely by 02):**
- `core/services/backups/backupCrypto.ts` — the whole compression + encryption +
  KDF + header codec + passphrase-policy module. Exports all its own types from
  here (no edit to `backupTypes.ts`).

**Create (test, owned by 02):**
- `tests/unit/backups/backupCrypto.test.ts` — Bun lane.

**Not touched by 02** (named to make the single-writer boundary explicit):
`backupService.ts`, `backupTypes.ts`, `backupRoutes.ts`, `backupSchemas.ts`,
`backupScheduler.ts`, `backupsClient.ts`, admin UI. Any consumer wiring is a
one-line import in the owning subtask.

## Boundary contract with 01 (the stream interchange)

02 defines its own interchange type so it does not depend on 01's internal names:

```ts
// backupCrypto.ts
// A byte stream of archive/tar bytes. 01 returns one from its export engine;
// 02 consumes it in `encryptBackupArchive` and re-produces one in decrypt.
export type ByteStream = ReadableStream<Uint8Array>;
```

02 exposes **pure stream transforms** — it does not know about `manifest.json`,
NDJSON, or media framing (that is 01/03 inside the tar). It sees only opaque
bytes. `OPEN QUESTION (for 01)`: confirm 01 hands 02 a Web
`ReadableStream<Uint8Array>` (preferred, matches Bun/`Bun.serve`/fetch). If 01
instead exposes a Node `Readable`, the pipeline owner bridges with
`Readable.toWeb(...)` at the call site; 02 stays Web-stream native.

## Archive format — the `.cbk` header + frame layout (owner-approved reconciliation)

The parent says "store salt + IV + KDF params + GCM tag in an archive header."
A **single** GCM tag over the whole archive can only be emitted *after* the last
byte, which forces the decryptor to consume (and buffer) the entire ciphertext
before it may trust a single byte — directly contradicting the parent's
**streaming / never-fully-buffered** mandate and the fail-closed "no partial
restore" posture. So 02 uses the standard **chunked/framed AEAD (STREAM)**
construction (as used by age / libsodium secretstream): the header carries salt +
KDF params + a base nonce (IV) + framing params, and **each frame carries its own
16-byte GCM tag**, verified incrementally. This satisfies the intent (salt/IV/KDF
in header; every byte authenticated by a GCM tag) while remaining truly streaming
and giving per-frame fail-closed + anti-truncation/anti-reorder guarantees. This
reconciliation is called out here so it is not re-litigated downstream.

### Plaintext header (fixed prefix, bound as AAD)

Binary, big-endian. Encoded once at the head of every `.cbk`:

```
field            bytes  notes
magic            4      ASCII "CBK1"
formatVersion    1      = 1 (BACKUP_ARCHIVE_FORMAT_VERSION)
cipherId         1      = 1  (aes-256-gcm)
kdfId            1      = 1  (scrypt)
kdfLogN          1      log2(N); N = 1<<kdfLogN  (default 15 => N=32768)
kdfR             4      scrypt r (default 8)
kdfP             4      scrypt p (default 1)
saltLen          1      = 16
salt             16     random per archive (crypto.randomBytes)
noncePrefixLen   1      = 8
noncePrefix      8      random per archive
chunkSize        4      plaintext bytes per frame (default 262144 = 256 KiB)
```

- The **entire header byte string is bound as AAD** on frame index 0 (any header
  tamper → frame-0 auth failure). Frames 1..n bind `noncePrefix`-derived context
  implicitly via the per-frame nonce; index + final-flag are AAD on every frame.
- Header is **decoded strictly (reject-unknown / reject-malformed)**: wrong
  `magic`, unknown `formatVersion`/`cipherId`/`kdfId`, out-of-range
  `kdfLogN`/`kdfR`/`kdfP`, or bad length fields → `backup_archive_unsupported`
  (never `backup_decrypt_failed`, so callers can distinguish "not our file /
  wrong version" from "wrong passphrase / tampered").

### Frame layout (repeated until the stream ends)

```
field            bytes  notes
ctLen            4      big-endian length of ciphertext in this frame (== plaintext len; GCM is length-preserving)
ciphertext       ctLen  AES-256-GCM output
tag              16     GCM auth tag for this frame
```

- **Per-frame nonce** = `noncePrefix(8) || frameCounterUint32BE(4)` = 12 bytes.
  Counter starts at 0, +1 per frame; wrap is impossible for real archives but is
  guarded (throw on `counter > 0xffffffff`).
- **Per-frame AAD** = `frameCounterUint64BE(8) || finalFlag(1)` (plus the full
  header bytes on frame 0). `finalFlag = 1` only on the last frame.
- **Anti-truncation:** decrypt errors (`backup_decrypt_failed`) if the stream
  ends without ever seeing a `finalFlag = 1` frame, or if bytes remain after it.
- **Anti-reorder / anti-duplication:** the frame counter is in the nonce AND the
  AAD; any reordering/dup breaks the tag.
- Empty archive (0 plaintext bytes) still emits exactly one final frame with
  `ctLen = 0` (a valid GCM tag over empty plaintext) so decrypt has a final frame.

## Implementation Pseudocode (execution-ready, grounded shapes)

All in `core/services/backups/backupCrypto.ts`. Uses `node:crypto` for AEAD/KDF,
Web `CompressionStream`/`DecompressionStream` for gzip, Web
`TransformStream`/`ReadableStream` for framing — all verified available in Bun.

```ts
import { promisify } from "node:util";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";

const scrypt = promisify(scryptCb) as (
  pass: Buffer, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

// ---- constants (exported) ----
export const BACKUP_ARCHIVE_MAGIC = Buffer.from("CBK1", "ascii");   // 4 bytes
export const BACKUP_ARCHIVE_FORMAT_VERSION = 1 as const;
export const BACKUP_ARCHIVE_EXTENSION = ".cbk" as const;
export const BACKUP_ARCHIVE_CONTENT_TYPE = "application/octet-stream" as const;
export const backupArchiveFileName = (id: string) => `coderso-backup-${id}${BACKUP_ARCHIVE_EXTENSION}`;

const CIPHER_ID = 1;      // aes-256-gcm
const KDF_ID = 1;         // scrypt
const KEY_BYTES = 32;     // AES-256
const SALT_BYTES = 16;
const NONCE_PREFIX_BYTES = 8;
const NONCE_BYTES = 12;   // 8 prefix + 4 counter
const TAG_BYTES = 16;
const DEFAULT_CHUNK_SIZE = 256 * 1024;
// Fixed plaintext header size (big-endian layout in §Archive format): magic(4) +
// formatVersion(1) + cipherId(1) + kdfId(1) + kdfLogN(1) + kdfR(4) + kdfP(4) +
// saltLen(1) + salt(16) + noncePrefixLen(1) + noncePrefix(8) + chunkSize(4) = 46.
// `decodeHeader`/the decrypt reader use this as the minimum byte count before
// attempting a header parse.
const HEADER_MIN_LEN = 4 + 1 + 1 + 1 + 1 + 4 + 4 + 1 + SALT_BYTES + 1 + NONCE_PREFIX_BYTES + 4; // 46
// scrypt cost — server-owned defaults (documented in .env.example by 07 if made env-tunable).
const DEFAULT_KDF = { logN: 15, r: 8, p: 1 };            // N = 32768
const scryptMaxmem = (N: number, r: number) => 256 * N * r; // headroom above 128*N*r

// ---- passphrase policy (exported; called by 05/06 route handlers) ----
export const MIN_BACKUP_PASSPHRASE = 12;
export const MAX_BACKUP_PASSPHRASE = 256;
export function normalizeBackupPassphrase(input: unknown): string {
  if (typeof input !== "string") throw new Error("backup_passphrase_required");
  // Do NOT trim — passphrase whitespace is significant. Reject only on policy.
  if (input.length === 0) throw new Error("backup_passphrase_required");
  if (input.length < MIN_BACKUP_PASSPHRASE || input.length > MAX_BACKUP_PASSPHRASE) {
    throw new Error("backup_passphrase_invalid");
  }
  return input; // returned to the SAME backend caller only; never logged/returned to client
}

// ---- header codec (strict reject-unknown) ----
type ArchiveHeader = {
  formatVersion: number; cipherId: number; kdfId: number;
  kdf: { N: number; r: number; p: number };
  salt: Buffer; noncePrefix: Buffer; chunkSize: number;
};
function encodeHeader(h: ArchiveHeader): Buffer { /* pack per layout above */ }
function decodeHeader(buf: Buffer): { header: ArchiveHeader; headerBytes: Buffer } {
  // require buf starts with BACKUP_ARCHIVE_MAGIC (timingSafeEqual on the 4 bytes),
  // formatVersion === 1, cipherId === CIPHER_ID, kdfId === KDF_ID,
  // 10 <= logN <= 20, 1 <= r <= 32, 1 <= p <= 16, saltLen === SALT_BYTES,
  // noncePrefixLen === NONCE_PREFIX_BYTES, 1024 <= chunkSize <= 16 MiB.
  // Any violation => throw new Error("backup_archive_unsupported").
}

async function deriveKey(passphrase: string, header: ArchiveHeader): Promise<Buffer> {
  const key = await scrypt(Buffer.from(passphrase, "utf8"), header.salt, KEY_BYTES, {
    N: header.kdf.N, r: header.kdf.r, p: header.kdf.p, maxmem: scryptMaxmem(header.kdf.N, header.kdf.r),
  });
  return key; // never logged/returned; lives only for the lifetime of the stream
}

function frameNonce(prefix: Buffer, counter: number): Buffer {
  const n = Buffer.allocUnsafe(NONCE_BYTES);
  prefix.copy(n, 0);
  n.writeUInt32BE(counter, NONCE_PREFIX_BYTES);
  return n;
}
function frameAad(counter: number, isFinal: boolean, headerBytes?: Buffer): Buffer {
  const base = Buffer.allocUnsafe(9);
  base.writeBigUInt64BE(BigInt(counter), 0);
  base.writeUInt8(isFinal ? 1 : 0, 8);
  return counter === 0 && headerBytes ? Buffer.concat([headerBytes, base]) : base;
}

// ---- coded-error set + downstream error coercion (fail-closed code contract) ----
// The ONLY error messages this module ever surfaces. Anything else bubbling up
// from a composed Web stream (notably DecompressionStream's raw gzip errors) is a
// leak of an uncoded/undocumented string and is re-mapped before it reaches a
// consumer.
const BACKUP_CRYPTO_CODES = new Set([
  "backup_decrypt_failed", "backup_encrypt_failed",
  "backup_archive_unsupported", "backup_passphrase_required", "backup_passphrase_invalid",
]);
const isCodedBackupError = (e: unknown): e is Error =>
  e instanceof Error && BACKUP_CRYPTO_CODES.has(e.message);

// Wrap a downstream stage so our coded errors pass through unchanged while any
// OTHER error (e.g. gzip "unexpected end of file" on a truncated archive) is
// coerced to `code`. Streaming/back-pressure-preserving (read-through, no buffer).
function coerceBackupStreamError(src: ByteStream, code: string): ByteStream {
  const reader = src.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      try {
        const { done, value } = await reader.read();
        if (done) { ctrl.close(); return; }
        ctrl.enqueue(value);
      } catch (err) {
        ctrl.error(isCodedBackupError(err) ? err : new Error(code)); // never leak zlib text
      }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
}
```

### encrypt: `encryptBackupArchive(source, passphrase, opts?) => ByteStream`

```ts
export function encryptBackupArchive(
  source: ByteStream, passphrase: string, opts?: { chunkSize?: number },
): ByteStream {
  const salt = randomBytes(SALT_BYTES);
  const noncePrefix = randomBytes(NONCE_PREFIX_BYTES);
  const chunkSize = opts?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const header: ArchiveHeader = {
    formatVersion: BACKUP_ARCHIVE_FORMAT_VERSION, cipherId: CIPHER_ID, kdfId: KDF_ID,
    kdf: { N: 1 << DEFAULT_KDF.logN, r: DEFAULT_KDF.r, p: DEFAULT_KDF.p },
    salt, noncePrefix, chunkSize,
  };
  const headerBytes = encodeHeader(header);

  // 1) gzip the tar stream (streaming, Web-native)
  const gz = source.pipeThrough(new CompressionStream("gzip"));

  // 2) re-chunk gz output to fixed plaintext frames + GCM-encrypt each frame
  let key: Buffer | null = null;
  let counter = 0;
  let pending = new Uint8Array(0); // accumulates gz bytes until >= chunkSize
  const enc = new TransformStream<Uint8Array, Uint8Array>({
    async start(ctrl) {
      key = await deriveKey(passphrase, header); // derive ONCE, up front
      ctrl.enqueue(new Uint8Array(headerBytes));  // header first
    },
    transform(chunk, ctrl) {
      pending = concat(pending, chunk);
      while (pending.length >= chunkSize) {
        emitFrame(ctrl, pending.subarray(0, chunkSize), /*isFinal*/ false);
        pending = pending.subarray(chunkSize);
      }
    },
    flush(ctrl) { emitFrame(ctrl, pending, /*isFinal*/ true); }, // always one final frame (even if empty)
  });
  return gz.pipeThrough(enc);

  function emitFrame(ctrl, plaintext: Uint8Array, isFinal: boolean) {
    if (counter > 0xffffffff) throw new Error("backup_encrypt_failed"); // nonce space guard
    const nonce = frameNonce(noncePrefix, counter);
    const aad = frameAad(counter, isFinal, counter === 0 ? headerBytes : undefined);
    const cipher = createCipheriv("aes-256-gcm", key!, nonce);
    cipher.setAAD(aad);
    const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    const len = Buffer.allocUnsafe(4); len.writeUInt32BE(ct.length, 0);
    ctrl.enqueue(new Uint8Array(Buffer.concat([len, ct, tag])));
    counter += 1;
  }
}
```

### decrypt: `decryptBackupArchive(source, passphrase) => ByteStream`

```ts
export function decryptBackupArchive(source: ByteStream, passphrase: string): ByteStream {
  let key: Buffer | null = null;
  let header: ArchiveHeader | null = null;
  let headerBytes: Buffer | null = null;
  let counter = 0;
  let sawFinal = false;
  let buf = new Uint8Array(0);

  const dec = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, ctrl) {
      buf = concat(buf, chunk);
      // (a) header first
      if (!header) {
        if (buf.length < HEADER_MIN_LEN) return;             // wait for more bytes
        const decoded = decodeHeader(Buffer.from(buf));      // throws backup_archive_unsupported
        header = decoded.header; headerBytes = decoded.headerBytes;
        buf = buf.subarray(headerBytes.length);
        key = await deriveKey(passphrase, header);           // scrypt once
      }
      // (b) parse + verify complete frames
      for (;;) {
        if (buf.length < 4) break;
        const ctLen = readU32BE(buf, 0);
        if (ctLen > header.chunkSize) throw new Error("backup_decrypt_failed"); // over-long frame
        const frameLen = 4 + ctLen + TAG_BYTES;
        if (buf.length < frameLen) break;                    // wait for the rest of this frame
        if (sawFinal) throw new Error("backup_decrypt_failed"); // bytes after final frame
        const ct = Buffer.from(buf.subarray(4, 4 + ctLen));
        const tag = Buffer.from(buf.subarray(4 + ctLen, frameLen));
        // Finality is deterministic but NOT length-prefixed: it is encoded via the
        // per-frame AAD (finalFlag bit). A stream cannot look ahead, so `openFrame`
        // trial-decrypts `finalFlag=false` first (authentic for every NON-final frame
        // → succeeds on the FIRST attempt), then `finalFlag=true` (only the LAST frame).
        // Net decrypt cost: exactly ONE extra GCM decrypt for the final frame — not 2×
        // the stream. Both attempts failing ⇒ wrong passphrase/tamper ⇒ auth error.
        const plain = openFrame(ct, tag, counter);           // see below; throws backup_decrypt_failed
        ctrl.enqueue(new Uint8Array(plain.data));
        if (plain.isFinal) sawFinal = true;
        buf = buf.subarray(frameLen);
        counter += 1;
      }
    },
    flush() {
      if (!sawFinal || buf.length !== 0) throw new Error("backup_decrypt_failed"); // truncated/trailing
    },
  });

  // Pipe order matters and the AEAD/anti-truncation verdict MUST win at the
  // consumer. `dec` gunzips its authenticated plaintext via DecompressionStream,
  // but a truncated archive delivers an authentic-but-incomplete gzip PREFIX into
  // that stage; on stream end DecompressionStream would otherwise surface its own
  // raw "unexpected end of file" error. We therefore (1) rely on `dec.flush()`
  // erroring FIRST on truncation — which aborts the downstream DecompressionStream
  // with the coded reason rather than letting it reach its own flush — and (2)
  // defensively wrap the whole gunzip stage in `coerceBackupStreamError`, which
  // passes our coded errors through untouched and re-maps ANY other downstream
  // error (e.g. a raw gzip "unexpected end of file") to `backup_decrypt_failed`.
  // Net effect: the code observed by `collect()` is always a backup_* code, and a
  // truncation is always `backup_decrypt_failed` (never a leaked zlib string) —
  // making test case 7 deterministic instead of ordering-dependent.
  const gunzipped = dec.readable.pipeThrough(new DecompressionStream("gzip"));
  return coerceBackupStreamError(gunzipped, "backup_decrypt_failed");

  function openFrame(ct: Buffer, tag: Buffer, c: number): { data: Buffer; isFinal: boolean } {
    for (const isFinal of [false, true]) {
      try {
        const d = createDecipheriv("aes-256-gcm", key!, frameNonce(header!.noncePrefix, c));
        d.setAAD(frameAad(c, isFinal, c === 0 ? headerBytes! : undefined));
        d.setAuthTag(tag);
        const data = Buffer.concat([d.update(ct), d.final()]); // throws on auth failure
        return { data, isFinal };
      } catch { /* try the other finality */ }
    }
    throw new Error("backup_decrypt_failed"); // wrong passphrase / tamper / truncation
  }
}
```

> Design note on the `isFinal` trial (chosen over a length-prefixed final flag to
> keep the on-disk frame layout minimal and the final-flag authenticated purely via
> AAD): because a stream can't look ahead, each frame is trial-decrypted with
> `finalFlag=false` then `true`; exactly one succeeds for an authentic frame (the AAD
> differs by that one bit). The `false`-first ordering means every non-final frame
> authenticates on its FIRST attempt, so the trial costs **one extra GCM decrypt on
> the final frame only**, not 2× the whole stream. Both failing ⇒ auth failure ⇒
> `backup_decrypt_failed`. This keeps a single deterministic code path and preserves
> the anti-truncation guarantee (the last authentic frame is the one whose
> `finalFlag=true` verifies). `timingSafeEqual` is used inside `decodeHeader` for the
> magic compare; GCM's own tag check is already constant-time.

### Error handling / data flow summary

- **Encrypt failures** (rare — e.g. nonce exhaustion, source stream error) →
  `backup_encrypt_failed`; the partial stream is aborted, no artifact is written
  (the pipeline owner in 01 marks the backup `failed` via existing
  `markBackupFailed` + `sanitizeBackupError`).
- **Wrong passphrase / tamper / truncation / reorder** → `backup_decrypt_failed`.
- **Not-our-file / unsupported version / malformed header** →
  `backup_archive_unsupported` (distinct so import UX can say "not a Coderso
  backup or unsupported version" vs "wrong passphrase").
- **Passphrase policy** → `backup_passphrase_required` / `backup_passphrase_invalid`.
- No error message ever contains the passphrase, key, salt, or any plaintext.

## Security Contract

02 **adds no routes** and is not itself route-touching (the routes live in
`backupRoutes.ts`, owned by 05/06). It is, however, the security-critical core;
this subsection states the invariants the route subtasks rely on:

- **Secrets are backend-only.** `passphrase`, the scrypt-derived `key`, `salt`,
  `noncePrefix`, and every KDF param exist only in module-local variables for the
  lifetime of a single stream. They are **never** logged (no `console.*`),
  **never** cached (no module-level/global store, no memoization by passphrase),
  **never** returned to any caller, and **never** embedded in a thrown `Error`
  message. Only coded strings (`backup_decrypt_failed`, etc.) surface.
- **No key reuse across archives.** Fresh `salt` + `noncePrefix` per
  `encryptBackupArchive` call ⇒ fresh key and fresh nonce space per archive; the
  per-frame counter guarantees nonce uniqueness within an archive.
- **AEAD, fail-closed, no partial output on failure.** Every plaintext byte is
  covered by a GCM tag; decrypt yields bytes only for frames that authenticate.
  The consumer (05) must not begin any DB write until the full decrypt+validate
  pass has completed (preserves TASK-484's transactional all-or-nothing restore).
- **Header is authenticated** (bound as AAD on frame 0): KDF-param downgrade,
  salt swap, or magic/version edits are detected.
- **Every v2 `.cbk` is encrypted — there is NO unencrypted archive variant.** This
  module defines the `.cbk` on-disk format, and that format is intrinsically AEAD:
  it always begins with the `CBK1` crypto header and is always AES-256-GCM/scrypt.
  There is no `cipherId = 0` / plaintext container path, and `decodeHeader` rejects
  anything lacking a valid `CBK1` header with `backup_archive_unsupported`. Therefore
  a passphrase is **mandatory for every v2 backup** (interactive create via 06,
  scheduled via `BACKUP_ENCRYPTION_PASSPHRASE`, and import via 05) — a backup with no
  passphrase cannot produce a readable `.cbk`. This is also what makes the parent's
  "`users`/RBAC only ever in an ENCRYPTED archive" trivially true (all archives are
  encrypted) and what 04's `assertUsersEncryptionAllowed` guard relies on. 02 exposes
  `normalizeBackupPassphrase` (which throws `backup_passphrase_required` on a
  missing/empty passphrase) so 05/06 enforce "passphrase required" before any
  export/import runs; 06 calls it unconditionally on the create path and the
  scheduler fails closed when no server passphrase is configured.
- **Route allowlist follow-through (for 05/06, stated here for coordination):**
  the new coded errors must be added to `mapBackupError()` in `backupRoutes.ts`,
  and a `passphrase` key must be added to `createBackupSchema` /
  `restoreBackupSchema` (import) with `additionalProperties: false` preserved and
  a schema round-trip/reject-unknown test — 02 does not edit those files.

## Testing Requirements

**Lane: Bun** (`bun:test`) — this is streaming + `node:crypto` AEAD + `scrypt` +
Web `CompressionStream`/`TransformStream` runtime code, i.e. explicitly the Bun
lane per AGENTS.md. **Not Vitest** (Vitest is only for genuinely Bun-free pure
logic). **No DB is used** by this module, so there is **no shared-DB concern** —
the tests are fully in-memory and hermetic (no fixtures, no cleanup, safe to run
against the shared remote DB config because they never touch it).

**File:** `tests/unit/backups/backupCrypto.test.ts`.

Helper: `streamFromBytes(u8)` → `ReadableStream<Uint8Array>` (chunked, incl. a
deliberately awkward 1-byte-at-a-time variant to prove frame reassembly across
stream-chunk boundaries); `collect(stream)` → `Uint8Array`.

Required cases (regression shape):

1. **Round-trip identity across sizes** — for payloads of `0` bytes, `1` byte,
   `chunkSize-1`, exactly `chunkSize`, `chunkSize+1`, `3×chunkSize`, and a large
   `~5 MiB` random buffer: `decrypt(encrypt(x, pass), pass)` deep-equals `x`.
   Include one high-entropy (random) and one highly-compressible (repeated)
   payload to exercise gzip both ways.
2. **Minimum valid `chunkSize` (1024 — the decode floor) with a multi-KB,
   high-entropy payload** to force many frames + counter increments; assert
   round-trip and that many frames were produced. Use a random/incompressible
   payload (e.g. `randomBytes(16 * 1024)`) so the gzip output still spans many
   1024-byte frames. Do **not** use a sub-1024 `chunkSize`: `decodeHeader`
   enforces `1024 <= chunkSize <= 16 MiB`, so an archive encrypted with a smaller
   `chunkSize` is rejected as `backup_archive_unsupported` before round-trip.
3. **Cross-boundary reassembly** — feed the ciphertext to `decrypt` as 1-byte
   stream chunks; still round-trips (proves the internal `buf` framing).
4. **Wrong passphrase → `backup_decrypt_failed`** (collecting the stream rejects
   with exactly that code).
5. **Tampered ciphertext byte → `backup_decrypt_failed`** (flip one byte in a
   frame's ciphertext region).
6. **Tampered header (KDF param / salt / magic / version)** →
   `backup_archive_unsupported` for structural edits; a salt swap that still
   decodes → `backup_decrypt_failed`. Assert the distinction is real.
7. **Truncation → `backup_decrypt_failed`** — drop the final frame (or trailing
   bytes) from the ciphertext; `collect(decrypt(...))` rejects with **exactly the
   code `backup_decrypt_failed`** (assert `err.message === "backup_decrypt_failed"`,
   not merely that it rejects). This pins the fail-closed code contract against the
   pipe-ordering hazard: a truncated archive feeds an authentic-but-incomplete gzip
   prefix into the downstream `DecompressionStream`, whose raw "unexpected end of
   file" must be coerced by `coerceBackupStreamError` (never surface as the observed
   error). Run this case with BOTH the natural chunking and the 1-byte-at-a-time
   variant so the coercion holds regardless of when the gunzip stage errors vs when
   `dec.flush()` errors.
8. **Trailing garbage after final frame → `backup_decrypt_failed`.**
9. **Frame reorder / duplication → `backup_decrypt_failed`** (swap two frames'
   bytes given a known `chunkSize` layout — use `chunkSize = 1024`, the minimum
   the header codec accepts, with a multi-KB high-entropy payload so at least two
   full non-final frames exist to swap; a sub-1024 `chunkSize` would be rejected
   as `backup_archive_unsupported` by `decodeHeader` before the reorder is tested).
10. **Header codec round-trip + reject-unknown** — `decodeHeader(encodeHeader(h))`
    equals `h`; out-of-range `logN`/`r`/`p`, wrong `magic`, and unknown
    `formatVersion`/`cipherId`/`kdfId` each throw `backup_archive_unsupported`.
    (This is the binary-header analogue of the "every validated key joins its
    allowlist + round-trip test" rule.)
11. **Passphrase policy** — `normalizeBackupPassphrase` accepts a `>= 12`-char
    string, rejects non-string/empty (`backup_passphrase_required`) and
    too-short/too-long (`backup_passphrase_invalid`); does **not** trim.
12. **No-secret-leakage** — assert thrown error `.message` values are exactly the
    coded strings and contain neither the passphrase nor any 0x-hex of the salt;
    assert the public functions return only `ReadableStream`/`string` (never the
    key). Optionally spy on `console.*` and assert zero calls during encrypt +
    a failed decrypt.

Run locally with: `bun test tests/unit/backups/backupCrypto.test.ts`. Before
land, the whole Bun lane (`bun run test:bun`) plus `bun --cwd core lint` +
`bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit` must be green
(new pure module — no test-side excess-prop risk, but run root tsc per the
typecheck-scope rule since a new exported type surface is added).

## Coordination

- **Land order:** strictly sequential — **after 511-01, before 511-03**
  (01→02→03→04→05→06→07). 02 must not land until 01's export-stream boundary
  (`ByteStream` producer) exists to consume.
- **Single-writer:** 02 creates only `core/services/backups/backupCrypto.ts` +
  `tests/unit/backups/backupCrypto.test.ts`. It edits **no** existing backup
  file. Downstream wiring (`mapBackupError` additions, `passphrase` schema keys,
  `.cbk` naming/content-type swap in `resolveBackupArtifactPath`/create path,
  scheduler/UI passphrase capture) is done by the owning subtasks (05/06),
  consuming the constants/functions 02 exports.
- **Changelog:** **1281 is created only by the closure subtask 511-07** — 02 does
  **not** create or edit any `_docs/_CHANGELOG/*` or other `_docs/_TASKS/*` file,
  and does not flip `Status` anywhere but this file at closure time.
- **New env (if made tunable):** if scrypt cost is exposed via env
  (e.g. `BACKUP_SCRYPT_LOGN`), it is a server-owned default documented by 07 in
  `.env.example` + `docs/develop/getting-started.md`. Baseline ships with the fixed
  `DEFAULT_KDF` constants (no new env required), which keeps the crypto module
  self-contained.
- **Passphrase source policy (reconciled with 06's unattended scheduler + parent
  §Coordination "a default backup-encryption key"):** the passphrase is **never
  user/client-supplied via an env var** and is **never a hard-coded default key in
  code**. The **only** permitted server-side source is a single documented
  backend-only **scheduled-passphrase env var, `BACKUP_ENCRYPTION_PASSPHRASE`**,
  read exclusively by **06's `resolveScheduledPassphrase()`** for **unattended
  scheduled runs** (interactive create/import always take the request-body
  passphrase, never the env). That value, like every other passphrase, is
  normalized through `normalizeBackupPassphrase`, **never logged, never cached,
  never returned to a client**. 06, 02, and 07 all name it identically
  (`BACKUP_ENCRYPTION_PASSPHRASE`); 07 documents it in `.env.example` +
  `docs/develop/getting-started.md`.
- **Shared REMOTE test DB:** N/A for this subtask — the crypto module and its
  tests never touch the DB.
```
