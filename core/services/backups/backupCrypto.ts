/**
 * Backup v2 crypto + compression layer (TASK-511-02).
 *
 * Produces and consumes the `.cbk` artifact format:
 *
 *   .cbk = AES-256-GCM( gzip( tar(manifest + ndjson members + media) ) )
 *
 * Both directions are fully streaming / chunked so a multi-GB archive is never
 * buffered in memory. The AES key is derived from the user passphrase via scrypt
 * with a random per-archive salt. Salt + KDF params + base nonce + framing
 * parameters live in a small plaintext archive header that is cryptographically
 * bound as AAD to the ciphertext so it cannot be silently downgraded/tampered.
 *
 * Fail-closed code contract (the ONLY error messages this module surfaces):
 *   - backup_decrypt_failed       wrong passphrase / tamper / truncation / reorder
 *   - backup_encrypt_failed       encrypt-side failure (e.g. nonce exhaustion)
 *   - backup_archive_unsupported  not-our-file / unsupported version / bad header
 *   - backup_passphrase_required  missing / empty passphrase
 *   - backup_passphrase_invalid   policy violation (length bounds)
 *
 * The passphrase, derived key, salt, and nonce prefix are backend-only: never
 * logged, never cached, never returned to a caller, never embedded in an error.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

// ---------------------------------------------------------------------------
// Constants (exported where downstream subtasks consume them)
// ---------------------------------------------------------------------------

export const BACKUP_ARCHIVE_MAGIC = Buffer.from("CBK1", "ascii"); // 4 bytes
export const BACKUP_ARCHIVE_FORMAT_VERSION = 1 as const;
export const BACKUP_ARCHIVE_EXTENSION = ".cbk" as const;
export const BACKUP_ARCHIVE_CONTENT_TYPE = "application/octet-stream" as const;
export const backupArchiveFileName = (id: string) =>
  `coderso-backup-${id}${BACKUP_ARCHIVE_EXTENSION}`;

const CIPHER_ID = 1; // aes-256-gcm
const KDF_ID = 1; // scrypt
const KEY_BYTES = 32; // AES-256
const SALT_BYTES = 16;
const NONCE_PREFIX_BYTES = 8;
const NONCE_BYTES = 12; // 8 prefix + 4 counter
const TAG_BYTES = 16;
const DEFAULT_CHUNK_SIZE = 256 * 1024;
const MIN_CHUNK_SIZE = 1024;
const MAX_CHUNK_SIZE = 16 * 1024 * 1024;

// Fixed plaintext header size (big-endian layout in the module doc):
// magic(4) + formatVersion(1) + cipherId(1) + kdfId(1) + kdfLogN(1) + kdfR(4) +
// kdfP(4) + saltLen(1) + salt(16) + noncePrefixLen(1) + noncePrefix(8) +
// chunkSize(4) = 46. `decodeHeader` uses this as the minimum byte count before
// attempting a header parse.
const HEADER_MIN_LEN = 4 + 1 + 1 + 1 + 1 + 4 + 4 + 1 + SALT_BYTES + 1 + NONCE_PREFIX_BYTES + 4; // 46

// scrypt cost — server-owned defaults (no new env required for the baseline).
const DEFAULT_KDF = { logN: 15, r: 8, p: 1 }; // N = 32768
const scryptMaxmem = (N: number, r: number) => 256 * N * r; // headroom above 128*N*r

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// A byte stream of archive/tar bytes. 01 returns one from its export engine;
// 02 consumes it in `encryptBackupArchive` and re-produces one in decrypt.
export type ByteStream = ReadableStream<Uint8Array>;

type ArchiveHeader = {
  formatVersion: number;
  cipherId: number;
  kdfId: number;
  kdf: { N: number; r: number; p: number };
  salt: Buffer;
  noncePrefix: Buffer;
  chunkSize: number;
};

// ---------------------------------------------------------------------------
// Passphrase policy (exported; called by 05/06 route handlers)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Header codec (strict reject-unknown)
// ---------------------------------------------------------------------------

/** Pack an ArchiveHeader into the fixed-size plaintext header byte string. */
export function encodeHeader(h: ArchiveHeader): Buffer {
  const b = Buffer.allocUnsafe(HEADER_MIN_LEN);
  let o = 0;
  BACKUP_ARCHIVE_MAGIC.copy(b, o);
  o += BACKUP_ARCHIVE_MAGIC.length;
  b.writeUInt8(h.formatVersion, o);
  o += 1;
  b.writeUInt8(h.cipherId, o);
  o += 1;
  b.writeUInt8(h.kdfId, o);
  o += 1;
  b.writeUInt8(Math.log2(h.kdf.N), o);
  o += 1;
  b.writeUInt32BE(h.kdf.r, o);
  o += 4;
  b.writeUInt32BE(h.kdf.p, o);
  o += 4;
  b.writeUInt8(h.salt.length, o);
  o += 1;
  h.salt.copy(b, o);
  o += h.salt.length;
  b.writeUInt8(h.noncePrefix.length, o);
  o += 1;
  h.noncePrefix.copy(b, o);
  o += h.noncePrefix.length;
  b.writeUInt32BE(h.chunkSize, o);
  o += 4;
  return b;
}

/**
 * Strictly decode a header prefix. Any violation (wrong magic, unknown
 * version/cipher/kdf, out-of-range KDF params or lengths) throws
 * `backup_archive_unsupported` — never `backup_decrypt_failed` — so callers can
 * distinguish "not our file / wrong version" from "wrong passphrase / tampered".
 */
export function decodeHeader(buf: Buffer): { header: ArchiveHeader; headerBytes: Buffer } {
  if (buf.length < HEADER_MIN_LEN) throw new Error("backup_archive_unsupported");
  let o = 0;
  const magic = buf.subarray(0, BACKUP_ARCHIVE_MAGIC.length);
  if (
    magic.length !== BACKUP_ARCHIVE_MAGIC.length ||
    !timingSafeEqual(magic, BACKUP_ARCHIVE_MAGIC)
  ) {
    throw new Error("backup_archive_unsupported");
  }
  o += BACKUP_ARCHIVE_MAGIC.length;
  const formatVersion = buf.readUInt8(o);
  o += 1;
  const cipherId = buf.readUInt8(o);
  o += 1;
  const kdfId = buf.readUInt8(o);
  o += 1;
  if (
    formatVersion !== BACKUP_ARCHIVE_FORMAT_VERSION ||
    cipherId !== CIPHER_ID ||
    kdfId !== KDF_ID
  ) {
    throw new Error("backup_archive_unsupported");
  }
  const kdfLogN = buf.readUInt8(o);
  o += 1;
  const kdfR = buf.readUInt32BE(o);
  o += 4;
  const kdfP = buf.readUInt32BE(o);
  o += 4;
  if (kdfLogN < 10 || kdfLogN > 20 || kdfR < 1 || kdfR > 32 || kdfP < 1 || kdfP > 16) {
    throw new Error("backup_archive_unsupported");
  }
  const saltLen = buf.readUInt8(o);
  o += 1;
  if (saltLen !== SALT_BYTES) throw new Error("backup_archive_unsupported");
  const salt = Buffer.from(buf.subarray(o, o + saltLen));
  o += saltLen;
  const noncePrefixLen = buf.readUInt8(o);
  o += 1;
  if (noncePrefixLen !== NONCE_PREFIX_BYTES) throw new Error("backup_archive_unsupported");
  const noncePrefix = Buffer.from(buf.subarray(o, o + noncePrefixLen));
  o += noncePrefixLen;
  const chunkSize = buf.readUInt32BE(o);
  o += 4;
  if (chunkSize < MIN_CHUNK_SIZE || chunkSize > MAX_CHUNK_SIZE) {
    throw new Error("backup_archive_unsupported");
  }
  const headerBytes = Buffer.from(buf.subarray(0, o));
  return {
    header: {
      formatVersion,
      cipherId,
      kdfId,
      kdf: { N: 1 << kdfLogN, r: kdfR, p: kdfP },
      salt,
      noncePrefix,
      chunkSize,
    },
    headerBytes,
  };
}

// ---------------------------------------------------------------------------
// KDF + frame helpers
// ---------------------------------------------------------------------------

async function deriveKey(passphrase: string, header: ArchiveHeader): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      Buffer.from(passphrase, "utf8"),
      header.salt,
      KEY_BYTES,
      {
        N: header.kdf.N,
        r: header.kdf.r,
        p: header.kdf.p,
        maxmem: scryptMaxmem(header.kdf.N, header.kdf.r),
      },
      (err, key) => (err ? reject(err) : resolve(key))
    );
  });
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

// ---------------------------------------------------------------------------
// Coded-error set + downstream error coercion (fail-closed code contract)
// ---------------------------------------------------------------------------

const BACKUP_CRYPTO_CODES = new Set([
  "backup_decrypt_failed",
  "backup_encrypt_failed",
  "backup_archive_unsupported",
  "backup_passphrase_required",
  "backup_passphrase_invalid",
]);

const isCodedBackupError = (e: unknown): e is Error =>
  e instanceof Error && BACKUP_CRYPTO_CODES.has(e.message);

/**
 * Wrap a downstream stage so our coded errors pass through unchanged while any
 * OTHER error (e.g. gzip "unexpected end of file" on a truncated archive) is
 * coerced to `code`. Streaming/back-pressure-preserving (read-through, no buffer).
 */
function coerceBackupStreamError(src: ByteStream, code: string): ByteStream {
  const reader = src.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          ctrl.close();
          return;
        }
        ctrl.enqueue(value);
      } catch (err) {
        ctrl.error(isCodedBackupError(err) ? err : new Error(code)); // never leak zlib text
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

// ---------------------------------------------------------------------------
// Encrypt
// ---------------------------------------------------------------------------

// `new Uint8Array(n)` is typed Uint8Array<ArrayBuffer> in TS 6 (the bare
// `Uint8Array` name defaults to ArrayBufferLike), so the return type is pinned
// to the ArrayBuffer-backed variant to stay assignable to accumulation buffers
// initialized with `new Uint8Array(0)`.
const concatU8 = (a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
};

/**
 * Encrypt a plaintext archive byte stream into a `.cbk` byte stream:
 * tarStream → gzip → framed AES-256-GCM → .cbk.
 */
export function encryptBackupArchive(
  source: ByteStream,
  passphrase: string,
  opts?: { chunkSize?: number }
): ByteStream {
  const salt = randomBytes(SALT_BYTES);
  const noncePrefix = randomBytes(NONCE_PREFIX_BYTES);
  const chunkSize = opts?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const header: ArchiveHeader = {
    formatVersion: BACKUP_ARCHIVE_FORMAT_VERSION,
    cipherId: CIPHER_ID,
    kdfId: KDF_ID,
    kdf: { N: 1 << DEFAULT_KDF.logN, r: DEFAULT_KDF.r, p: DEFAULT_KDF.p },
    salt,
    noncePrefix,
    chunkSize,
  };
  const headerBytes = encodeHeader(header);

  // 1) gzip the tar stream (streaming, Web-native). The TS 6 DOM lib types
  // CompressionStream as ReadableStream<Uint8Array<ArrayBuffer>> +
  // WritableStream<BufferSource>, which is not assignable to a
  // TransformStream<Uint8Array, Uint8Array> under strict function types even
  // though the platform chunks are runtime-identical Uint8Arrays. Bridge the
  // lib typing once at the boundary.
  const gz = source.pipeThrough(
    new CompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>
  );

  // 2) re-chunk gz output to fixed plaintext frames + GCM-encrypt each frame
  let key: Buffer | null = null;
  let counter = 0;
  let pending = new Uint8Array(0); // accumulates gz bytes until >= chunkSize
  const enc = new TransformStream<Uint8Array, Uint8Array>({
    async start(ctrl) {
      key = await deriveKey(passphrase, header); // derive ONCE, up front
      ctrl.enqueue(Uint8Array.from(headerBytes)); // header first
    },
    transform(chunk, ctrl) {
      pending = concatU8(pending, chunk);
      while (pending.length >= chunkSize) {
        emitFrame(ctrl, pending.subarray(0, chunkSize), false);
        pending = pending.subarray(chunkSize);
      }
    },
    flush(ctrl) {
      emitFrame(ctrl, pending, true); // always one final frame (even if empty)
    },
  });
  return gz.pipeThrough(enc);

  function emitFrame(
    ctrl: TransformStreamDefaultController<Uint8Array>,
    plaintext: Uint8Array,
    isFinal: boolean
  ) {
    if (counter > 0xffffffff) throw new Error("backup_encrypt_failed"); // nonce space guard
    const nonce = frameNonce(noncePrefix, counter);
    const aad = frameAad(counter, isFinal, counter === 0 ? headerBytes : undefined);
    const cipher = createCipheriv("aes-256-gcm", key as Buffer, nonce);
    cipher.setAAD(aad);
    const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    const len = Buffer.allocUnsafe(4);
    len.writeUInt32BE(ct.length, 0);
    ctrl.enqueue(Uint8Array.from(Buffer.concat([len, ct, tag])));
    counter += 1;
  }
}

// ---------------------------------------------------------------------------
// Decrypt
// ---------------------------------------------------------------------------

const readU32BE = (b: Uint8Array, o: number): number =>
  (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];

/**
 * Decrypt a `.cbk` byte stream back into a plaintext archive byte stream:
 * .cbk → framed AES-256-GCM verify → gunzip → tarStream.
 *
 * Fail-closed: plaintext bytes are only produced for frames that authenticate;
 * wrong passphrase / tamper / truncation / reorder surface as
 * `backup_decrypt_failed` (never a raw zlib or crypto string).
 */
export function decryptBackupArchive(source: ByteStream, passphrase: string): ByteStream {
  let key: Buffer | null = null;
  let header: ArchiveHeader | null = null;
  let headerBytes: Buffer | null = null;
  let counter = 0;
  let sawFinal = false;
  let buf = new Uint8Array(0);

  const dec = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, ctrl) {
      buf = concatU8(buf, chunk);
      // (a) header first
      if (!header) {
        if (buf.length < HEADER_MIN_LEN) return; // wait for more bytes
        const decoded = decodeHeader(Buffer.from(buf)); // throws backup_archive_unsupported
        header = decoded.header;
        headerBytes = decoded.headerBytes;
        buf = buf.subarray(headerBytes.length);
        key = await deriveKey(passphrase, header); // scrypt once
      }
      // (b) parse + verify complete frames
      for (;;) {
        if (buf.length < 4) break;
        const ctLen = readU32BE(buf, 0);
        if (ctLen > header.chunkSize) throw new Error("backup_decrypt_failed"); // over-long frame
        const frameLen = 4 + ctLen + TAG_BYTES;
        if (buf.length < frameLen) break; // wait for the rest of this frame
        if (sawFinal) throw new Error("backup_decrypt_failed"); // bytes after final frame
        const ct = Buffer.from(buf.subarray(4, 4 + ctLen));
        const tag = Buffer.from(buf.subarray(4 + ctLen, frameLen));
        // Finality is NOT length-prefixed: it is encoded via the per-frame AAD
        // (finalFlag bit). Trial-decrypt finalFlag=false first (authentic for
        // every non-final frame → succeeds on the FIRST attempt), then
        // finalFlag=true (only the LAST frame). Net decrypt cost: exactly ONE
        // extra GCM decrypt for the final frame — not 2x the stream. Both
        // attempts failing ⇒ wrong passphrase/tamper ⇒ auth error.
        const plain = openFrame(ct, tag, counter);
        ctrl.enqueue(Uint8Array.from(plain.data));
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
  // consumer. Source → dec (frame verify) → DecompressionStream (gunzip) →
  // coerce. `dec` gunzips its authenticated plaintext via DecompressionStream,
  // but a truncated archive delivers an authentic-but-incomplete gzip PREFIX into
  // that stage; on stream end DecompressionStream would otherwise surface its own
  // raw "unexpected end of file" error. We therefore (1) rely on `dec.flush()`
  // erroring FIRST on truncation — which aborts the downstream DecompressionStream
  // with the coded reason rather than letting it reach its own flush — and (2)
  // defensively wrap the whole gunzip stage in `coerceBackupStreamError`, which
  // passes our coded errors through untouched and re-maps ANY other downstream
  // error (e.g. a raw gzip "unexpected end of file") to `backup_decrypt_failed`.
  // Net effect: the code observed by the consumer is always a backup_* code, and
  // a truncation is always `backup_decrypt_failed`.
  const decReadable = source.pipeThrough(dec);
  // Same lib-typing bridge as the encrypt path (TS 6 DOM lib: DecompressionStream
  // readable is ReadableStream<Uint8Array<ArrayBuffer>>, writable is
  // WritableStream<BufferSource>; runtime chunks are plain Uint8Arrays).
  const gunzipped = decReadable.pipeThrough(
    new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>
  );
  return coerceBackupStreamError(gunzipped, "backup_decrypt_failed");

  function openFrame(ct: Buffer, tag: Buffer, c: number): { data: Buffer; isFinal: boolean } {
    for (const isFinal of [false, true]) {
      try {
        const d = createDecipheriv(
          "aes-256-gcm",
          key as Buffer,
          frameNonce((header as ArchiveHeader).noncePrefix, c)
        );
        d.setAAD(frameAad(c, isFinal, c === 0 && headerBytes ? headerBytes : undefined));
        d.setAuthTag(tag);
        const data = Buffer.concat([d.update(ct), d.final()]); // throws on auth failure
        return { data, isFinal };
      } catch {
        /* try the other finality */
      }
    }
    throw new Error("backup_decrypt_failed"); // wrong passphrase / tamper / truncation
  }
}
