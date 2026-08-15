/**
 * Backup v2 crypto + compression tests (TASK-511-02).
 *
 * Bun lane (streaming + node:crypto AEAD + scrypt + Web streams). Fully
 * in-memory and hermetic — no DB, no fixtures, no cleanup.
 */
import { randomBytes } from "node:crypto";

import { describe, expect, test } from "bun:test";

import {
  BACKUP_ARCHIVE_EXTENSION,
  BACKUP_ARCHIVE_FORMAT_VERSION,
  BACKUP_ARCHIVE_MAGIC,
  MAX_BACKUP_PASSPHRASE,
  MIN_BACKUP_PASSPHRASE,
  backupArchiveFileName,
  decodeHeader,
  decryptBackupArchive,
  encodeHeader,
  encryptBackupArchive,
  normalizeBackupPassphrase,
} from "../../../core/services/backups/backupCrypto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const streamFromBytes = (u8: Uint8Array, chunkSize?: number): ReadableStream<Uint8Array> => {
  const size = chunkSize ?? Math.max(1, u8.length);
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(ctrl) {
      if (offset >= u8.length) {
        ctrl.close();
        return;
      }
      ctrl.enqueue(u8.subarray(offset, Math.min(offset + size, u8.length)));
      offset += size;
    },
  });
};

async function collect(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/** Collect a stream, returning the error message (or undefined if it closed cleanly). */
async function collectError(stream: ReadableStream<Uint8Array>): Promise<string | undefined> {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }
    return undefined;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

const PASS = "correct horse battery staple"; // ≥ 12 chars, spaces significant

const encAndCollect = async (payload: Uint8Array, pass = PASS, chunkSize?: number) =>
  collect(
    encryptBackupArchive(streamFromBytes(payload), pass, chunkSize ? { chunkSize } : undefined)
  );

const roundTrip = async (
  payload: Uint8Array,
  pass = PASS,
  opts?: { chunkSize?: number; inChunk?: number; outChunk?: number }
) => {
  const cipher = await encAndCollect(payload, pass, opts?.chunkSize);
  const plain = await collect(
    decryptBackupArchive(streamFromBytes(cipher, opts?.inChunk ?? Math.max(1, cipher.length)), pass)
  );
  return { cipher, plain };
};

// ---------------------------------------------------------------------------
// 1. Round-trip identity across sizes
// ---------------------------------------------------------------------------

describe("round-trip identity", () => {
  const sizes = [0, 1, 1023, 1024, 1025, 3 * 1024];
  for (const size of sizes) {
    test(`payload of ${size} bytes (chunkSize 1024)`, async () => {
      const payload = randomBytes(size);
      const { plain } = await roundTrip(payload, PASS, { chunkSize: 1024 });
      expect(plain).toEqual(Buffer.from(payload));
    });
  }

  test("~5 MiB random payload (default chunkSize)", async () => {
    const payload = randomBytes(5 * 1024 * 1024 + 17);
    const { plain } = await roundTrip(payload);
    expect(plain).toEqual(Buffer.from(payload));
  });

  test("~5 MiB highly-compressible payload (repeated) exercises gzip both ways", async () => {
    const payload = Buffer.alloc(5 * 1024 * 1024, 0x41); // 5 MiB of 'A'
    const { cipher, plain } = await roundTrip(payload);
    expect(plain).toEqual(payload);
    // Compressible input must actually shrink through gzip.
    expect(cipher.length).toBeLessThan(payload.length / 2);
  });
});

// ---------------------------------------------------------------------------
// 2. Minimum valid chunkSize (1024) with a multi-KB high-entropy payload
// ---------------------------------------------------------------------------

test("chunkSize 1024 with multi-KB random payload produces many frames", async () => {
  const payload = randomBytes(16 * 1024);
  const { cipher, plain } = await roundTrip(payload, PASS, { chunkSize: 1024 });
  expect(plain).toEqual(Buffer.from(payload));
  // Random data is incompressible: gzip output ~= input, so the ciphertext
  // spans >= 14 full 1024-byte frames (header + frames).
  const minFrames = 14;
  const frame = 4 + 1024 + 16; // ctLen + ct + tag
  expect(cipher.length).toBeGreaterThanOrEqual(
    BACKUP_ARCHIVE_MAGIC.length + 42 + minFrames * frame
  );
});

// ---------------------------------------------------------------------------
// 3. Cross-boundary reassembly (1-byte stream chunks)
// ---------------------------------------------------------------------------

test("decrypt reassembles frames across 1-byte stream chunks", async () => {
  const payload = randomBytes(8 * 1024 + 3);
  const { cipher } = await roundTrip(payload, PASS, { chunkSize: 1024 });
  const plain = await collect(decryptBackupArchive(streamFromBytes(cipher, 1), PASS));
  expect(plain).toEqual(Buffer.from(payload));
});

// ---------------------------------------------------------------------------
// 4-9. Fail-closed tamper/truncation/reorder cases
// ---------------------------------------------------------------------------

test("wrong passphrase → backup_decrypt_failed", async () => {
  const cipher = await encAndCollect(randomBytes(4096), PASS);
  const err = await collectError(
    decryptBackupArchive(streamFromBytes(cipher), "a different passphrase!")
  );
  expect(err).toBe("backup_decrypt_failed");
});

test("tampered ciphertext byte → backup_decrypt_failed", async () => {
  const cipher = await encAndCollect(randomBytes(4096), PASS, 1024);
  // Header is 46 bytes; first frame ct starts at 46+4=50. Flip one ct byte.
  const tampered = Buffer.from(cipher);
  tampered[50 + 10] ^= 0x01;
  const err = await collectError(decryptBackupArchive(streamFromBytes(tampered), PASS));
  expect(err).toBe("backup_decrypt_failed");
});

test("tampered header: structural edit → backup_archive_unsupported, salt swap → backup_decrypt_failed", async () => {
  const cipher = await encAndCollect(randomBytes(2048), PASS);
  const flippedMagic = Buffer.from(cipher);
  flippedMagic[0] ^= 0x01;
  expect(await collectError(decryptBackupArchive(streamFromBytes(flippedMagic), PASS))).toBe(
    "backup_archive_unsupported"
  );

  const flippedVersion = Buffer.from(cipher);
  flippedVersion[4] = 99; // formatVersion byte (after 4-byte magic)
  expect(await collectError(decryptBackupArchive(streamFromBytes(flippedVersion), PASS))).toBe(
    "backup_archive_unsupported"
  );

  const flippedKdf = Buffer.from(cipher);
  flippedKdf[7] = 99; // kdfLogN byte: offset magic4+ver1+cipher1+kdf1 = 7 → out of range
  expect(await collectError(decryptBackupArchive(streamFromBytes(flippedKdf), PASS))).toBe(
    "backup_archive_unsupported"
  );

  // Salt swap (offset 17..33): still decodes structurally, key derivation
  // changes → auth failure on frame 0.
  const flippedSalt = Buffer.from(cipher);
  flippedSalt[17] ^= 0x01;
  expect(await collectError(decryptBackupArchive(streamFromBytes(flippedSalt), PASS))).toBe(
    "backup_decrypt_failed"
  );
});

test("truncation (natural chunking) → exactly backup_decrypt_failed", async () => {
  const payload = randomBytes(16 * 1024);
  const cipher = await encAndCollect(payload, PASS, 1024);
  const truncated = Buffer.from(cipher.subarray(0, cipher.length - 100)); // drop into last frame
  const err = await collectError(decryptBackupArchive(streamFromBytes(truncated), PASS));
  expect(err).toBe("backup_decrypt_failed");
});

test("truncation (1-byte chunks) → exactly backup_decrypt_failed", async () => {
  const payload = randomBytes(16 * 1024);
  const cipher = await encAndCollect(payload, PASS, 1024);
  const truncated = Buffer.from(cipher.subarray(0, cipher.length - 100));
  const err = await collectError(decryptBackupArchive(streamFromBytes(truncated, 1), PASS));
  expect(err).toBe("backup_decrypt_failed");
});

test("trailing garbage after final frame → backup_decrypt_failed", async () => {
  const cipher = await encAndCollect(randomBytes(4096), PASS, 1024);
  const trailing = Buffer.concat([cipher, randomBytes(32)]);
  const err = await collectError(decryptBackupArchive(streamFromBytes(trailing), PASS));
  expect(err).toBe("backup_decrypt_failed");
});

test("frame reorder → backup_decrypt_failed", async () => {
  const payload = randomBytes(16 * 1024);
  const cipher = await encAndCollect(payload, PASS, 1024);
  // Random data ⇒ every non-final frame is exactly 4+1024+16 bytes. Swap the
  // first two full frames (each starts at a fixed offset).
  const headerLen = BACKUP_ARCHIVE_MAGIC.length + 42; // 46
  const frame = 4 + 1024 + 16; // 1044
  const a = Buffer.from(cipher.subarray(headerLen, headerLen + frame));
  const b = Buffer.from(cipher.subarray(headerLen + frame, headerLen + 2 * frame));
  const reordered = Buffer.concat([
    cipher.subarray(0, headerLen),
    b,
    a,
    cipher.subarray(headerLen + 2 * frame),
  ]);
  const err = await collectError(decryptBackupArchive(streamFromBytes(reordered), PASS));
  expect(err).toBe("backup_decrypt_failed");
});

test("frame duplication → backup_decrypt_failed", async () => {
  const payload = randomBytes(16 * 1024);
  const cipher = await encAndCollect(payload, PASS, 1024);
  const headerLen = BACKUP_ARCHIVE_MAGIC.length + 42;
  const frame = 4 + 1024 + 16;
  const first = Buffer.from(cipher.subarray(headerLen, headerLen + frame));
  const duplicated = Buffer.concat([
    cipher.subarray(0, headerLen),
    first,
    first, // same frame bytes again → counter mismatch on second read
    cipher.subarray(headerLen + frame),
  ]);
  const err = await collectError(decryptBackupArchive(streamFromBytes(duplicated), PASS));
  expect(err).toBe("backup_decrypt_failed");
});

// ---------------------------------------------------------------------------
// 10. Header codec round-trip + reject-unknown
// ---------------------------------------------------------------------------

test("header codec round-trip", () => {
  const header = {
    formatVersion: BACKUP_ARCHIVE_FORMAT_VERSION,
    cipherId: 1,
    kdfId: 1,
    kdf: { N: 1 << 15, r: 8, p: 1 },
    salt: randomBytes(16),
    noncePrefix: randomBytes(8),
    chunkSize: 256 * 1024,
  };
  const decoded = decodeHeader(encodeHeader(header));
  expect(decoded.header).toEqual(header);
  expect(decoded.headerBytes).toEqual(encodeHeader(header));
});

test("header codec rejects structural violations as backup_archive_unsupported", () => {
  const h = {
    formatVersion: BACKUP_ARCHIVE_FORMAT_VERSION,
    cipherId: 1,
    kdfId: 1,
    kdf: { N: 1 << 15, r: 8, p: 1 },
    salt: randomBytes(16),
    noncePrefix: randomBytes(8),
    chunkSize: 256 * 1024,
  };
  const good = encodeHeader(h);
  expect(() => decodeHeader(Buffer.from("XXXX"))).toThrow("backup_archive_unsupported");
  expect(() => decodeHeader(good.subarray(0, 10))).toThrow("backup_archive_unsupported");
  expect(() => decodeHeader(encodeHeader({ ...h, formatVersion: 2 }))).toThrow(
    "backup_archive_unsupported"
  );
  expect(() => decodeHeader(encodeHeader({ ...h, cipherId: 9 }))).toThrow(
    "backup_archive_unsupported"
  );
  expect(() => decodeHeader(encodeHeader({ ...h, kdfId: 9 }))).toThrow(
    "backup_archive_unsupported"
  );
  expect(() => decodeHeader(encodeHeader({ ...h, kdf: { N: 1 << 9, r: 8, p: 1 } }))).toThrow(
    "backup_archive_unsupported"
  );
  expect(() => decodeHeader(encodeHeader({ ...h, kdf: { N: 1 << 15, r: 64, p: 1 } }))).toThrow(
    "backup_archive_unsupported"
  );
  expect(() => decodeHeader(encodeHeader({ ...h, kdf: { N: 1 << 15, r: 8, p: 32 } }))).toThrow(
    "backup_archive_unsupported"
  );
  expect(() => decodeHeader(encodeHeader({ ...h, chunkSize: 512 }))).toThrow(
    "backup_archive_unsupported"
  );
  expect(() => decodeHeader(encodeHeader({ ...h, chunkSize: 17 * 1024 * 1024 }))).toThrow(
    "backup_archive_unsupported"
  );
  // salt/noncePrefix length fields are derived from the buffers, so encode
  // always emits valid length fields; a bad length byte in raw bytes is caught
  // by decode.
  const raw = Buffer.from(good);
  raw[16] = 7; // saltLen byte → wrong length
  expect(() => decodeHeader(raw)).toThrow("backup_archive_unsupported");
  const raw2 = Buffer.from(good);
  raw2[33] = 9; // noncePrefixLen byte (after magic4+ver1+cipher1+kdf1+logN1+r4+p4+saltLen1+salt16 = 33)
  expect(() => decodeHeader(raw2)).toThrow("backup_archive_unsupported");
});

// ---------------------------------------------------------------------------
// 11. Passphrase policy
// ---------------------------------------------------------------------------

test("passphrase policy: length bounds, no trim, coded errors", () => {
  const valid = "a".repeat(MIN_BACKUP_PASSPHRASE);
  expect(normalizeBackupPassphrase(valid)).toBe(valid);
  expect(normalizeBackupPassphrase(" ".repeat(MIN_BACKUP_PASSPHRASE))).toBe(
    " ".repeat(MIN_BACKUP_PASSPHRASE)
  ); // whitespace significant — NOT trimmed
  expect(() => normalizeBackupPassphrase(undefined)).toThrow("backup_passphrase_required");
  expect(() => normalizeBackupPassphrase(123)).toThrow("backup_passphrase_required");
  expect(() => normalizeBackupPassphrase("")).toThrow("backup_passphrase_required");
  expect(() => normalizeBackupPassphrase("short")).toThrow("backup_passphrase_invalid");
  expect(() => normalizeBackupPassphrase("a".repeat(MAX_BACKUP_PASSPHRASE + 1))).toThrow(
    "backup_passphrase_invalid"
  );
});

// ---------------------------------------------------------------------------
// 12. No-secret-leakage
// ---------------------------------------------------------------------------

test("errors expose only coded strings — never passphrase/salt/key material", async () => {
  const payload = randomBytes(4096);
  const cipher = await encAndCollect(payload, PASS);
  // Salt lives in the plaintext header (bytes 17..33) — observable by design —
  // but must never leak into an error message.
  const saltHex = Buffer.from(cipher.subarray(17, 33)).toString("hex");
  const wrongPass = "a different passphrase!";
  const err = await collectError(decryptBackupArchive(streamFromBytes(cipher), wrongPass));
  expect(err).toBe("backup_decrypt_failed");
  expect(err).not.toContain(wrongPass);
  expect(err).not.toContain(PASS);
  expect(err).not.toContain(saltHex);
  // Header parse errors are coded too.
  const bogus = Buffer.from(randomBytes(200));
  const bogusErr = await collectError(decryptBackupArchive(streamFromBytes(bogus), PASS));
  expect(bogusErr).toBe("backup_archive_unsupported");
  expect(bogusErr).not.toContain(PASS);
});

test("public API surface: streams in, streams out; name/content-type constants", () => {
  const out = encryptBackupArchive(streamFromBytes(randomBytes(64)), PASS);
  expect(out).toBeInstanceOf(ReadableStream);
  const dec = decryptBackupArchive(streamFromBytes(randomBytes(46 + 16)), PASS);
  expect(dec).toBeInstanceOf(ReadableStream);
  expect(BACKUP_ARCHIVE_EXTENSION).toBe(".cbk");
  expect(backupArchiveFileName("abc")).toBe("coderso-backup-abc.cbk");
});
