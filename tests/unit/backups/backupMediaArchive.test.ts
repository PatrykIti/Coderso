/**
 * Backup v2 media file streaming tests (TASK-511-03).
 *
 * Bun lane: streaming, node:stream, real fs, storage adapters, and DB keyset
 * enumeration are all Bun-runtime concerns. DB-touching cases seed uniquely
 * scoped `media` rows (key prefix `test-t511-03/<uuid>/`) and delete ONLY those
 * rows in afterEach — never truncate `media`. Media bytes flow through a hermetic
 * in-memory fake adapter; no real S3/Azure/FS is required for the round-trips.
 */
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

import { afterEach, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { media } from "../../../core/db/schema";
import { createLocalAdapter } from "../../../core/services/media/storage/local";
import type { MediaStorageAdapter } from "../../../core/services/media/storage/adapter";
import type { BackupArchiveWriter } from "../../../core/services/backups/backupArchive";
import {
  MEDIA_MEMBER_PREFIX,
  streamMediaIntoArchive,
  restoreMediaFromArchive,
  type MediaArchiveSummary,
} from "../../../core/services/backups/mediaArchive";

// ---------------------------------------------------------------------------
// Doubles
// ---------------------------------------------------------------------------

type MediaRow = { key: string; size: number };

type MemoryAdapter = {
  adapter: MediaStorageAdapter;
  store: Map<string, Buffer>;
  putAtCalls: Array<{ key: string; size: number; contentType: string }>;
};

const makeMemoryAdapter = (
  initial: Map<string, Buffer> = new Map(),
  missingError?: (key: string) => Error
): MemoryAdapter => {
  const store = new Map<string, Buffer>(initial);
  const putAtCalls: Array<{ key: string; size: number; contentType: string }> = [];
  const adapter: MediaStorageAdapter = {
    put: async (file) => {
      const key = `mem/${file.name}`;
      store.set(key, Buffer.from(await file.arrayBuffer()));
      return { key, url: `mem/${key}` };
    },
    putMedia: async () => {
      throw new Error("unused");
    },
    get: async (key) => {
      const bytes = store.get(key);
      if (!bytes) {
        const err = missingError
          ? missingError(key)
          : Object.assign(new Error(`missing ${key}`), { code: "ENOENT" });
        throw err;
      }
      return Readable.from([Uint8Array.from(bytes)]);
    },
    delete: async (key) => {
      store.delete(key);
    },
    getPublicUrl: (key) => `mem/${key}`,
    putAt: async (key, body, size, contentType) => {
      putAtCalls.push({ key, size, contentType });
      const chunks: Uint8Array[] = [];
      for await (const chunk of body) chunks.push(chunk);
      store.set(key, Buffer.concat(chunks.map((c) => Buffer.from(c))));
    },
  };
  return { adapter, store, putAtCalls };
};

// Mimics 01's spool-first writer: asserts the streamed byte count equals the
// declared size and pushes the member ONLY on a match (never a corrupt tar).
const makeWriterDouble = () => {
  const members: Array<{ name: string; size: number; bytes: Buffer }> = [];
  const writer: BackupArchiveWriter = {
    async appendStream(name, size, body) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of body) chunks.push(chunk);
      const bytes = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      if (bytes.length !== size) throw new Error("backup_archive_export_failed");
      members.push({ name, size, bytes });
    },
  };
  return { writer, members };
};

type ReaderEntry = { name: string; size: number; body: AsyncIterable<Uint8Array> };

const makeReaderDouble = (entries: ReaderEntry[]) => ({
  entries: () =>
    (async function* () {
      for (const entry of entries) yield entry;
    })(),
});

const bodyOf = (bytes: Buffer): AsyncIterable<Uint8Array> =>
  (async function* () {
    yield Uint8Array.from(bytes);
  })();

// ---------------------------------------------------------------------------
// Shared-DB hygiene
// ---------------------------------------------------------------------------

const prefix = `test-t511-03/${randomUUID()}`;
const seededIds: string[] = [];
const tmpDirs: string[] = [];

const seedMedia = async (rows: MediaRow[]): Promise<string[]> => {
  const ids: string[] = [];
  for (const row of rows) {
    const [inserted] = await db
      .insert(media)
      .values({
        key: row.key,
        url: `https://example.test/${row.key}`,
        type: "image",
        mimeType: "application/octet-stream",
        size: row.size,
        originalName: path.basename(row.key),
      })
      .returning({ id: media.id });
    ids.push(inserted.id);
  }
  seededIds.push(...ids);
  return ids;
};

afterEach(async () => {
  for (const dir of tmpDirs) await rm(dir, { recursive: true, force: true });
  tmpDirs.length = 0;
  if (seededIds.length) {
    await db.delete(media).where(inArray(media.id, seededIds));
  }
  seededIds.length = 0;
});

const tmpDir = async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "t511-03-"));
  tmpDirs.push(dir);
  return dir;
};

const mediaKey = (name: string) => `${prefix}/${name}`;

// ---------------------------------------------------------------------------
// 1. Bytes round-trip, key preserved
// ---------------------------------------------------------------------------

test("bytes round-trip: every original key restored with byte-identical content", async () => {
  const keyA = mediaKey("a.png");
  const keyB = mediaKey("sub/b.jpg");
  const bytesA = Buffer.from(`img-a-${randomUUID()}`);
  const bytesB = Buffer.from(`img-b-${randomUUID()}`);
  await seedMedia([
    { key: keyA, size: bytesA.length },
    { key: keyB, size: bytesB.length },
  ]);

  const source = makeMemoryAdapter(
    new Map([
      [keyA, bytesA],
      [keyB, bytesB],
    ])
  );
  const { writer, members } = makeWriterDouble();
  const summary = await streamMediaIntoArchive(writer, {
    getAdapter: async () => source.adapter,
    db,
  });

  // Export summary matches the members actually written.
  expect(summary.fileCount).toBe(2);
  expect(summary.totalBytes).toBe(bytesA.length + bytesB.length);
  expect(summary.skipped.filter((s) => s.key.startsWith(prefix))).toEqual([]);
  expect(members.map((m) => m.name)).toEqual([
    `${MEDIA_MEMBER_PREFIX}${keyA}`,
    `${MEDIA_MEMBER_PREFIX}${keyB}`,
  ]);
  expect(members[0].bytes).toEqual(bytesA);
  expect(members[1].bytes).toEqual(bytesB);

  // Restore into a FRESH (empty) store — key equality is the core assertion.
  const target = makeMemoryAdapter();
  const restored = await restoreMediaFromArchive(
    makeReaderDouble(members.map((m) => ({ name: m.name, size: m.size, body: bodyOf(m.bytes) }))),
    { getAdapter: async () => target.adapter }
  );
  expect(restored.restored).toBe(2);
  expect(restored.totalBytes).toBe(bytesA.length + bytesB.length);
  expect(target.store.get(keyA)).toEqual(bytesA);
  expect(target.store.get(keyB)).toEqual(bytesB);
});

// ---------------------------------------------------------------------------
// 2. Missing file skipped, not fatal — every signal path
// ---------------------------------------------------------------------------

test("missing object skipped: real SDK rejections + in-code sentinels", async () => {
  const key = mediaKey("gone.png");
  await seedMedia([{ key, size: 123 }]);

  const missingShapes: Array<() => Error> = [
    // S3 real absent key (message NOT a sentinel)
    () =>
      Object.assign(new Error("The specified key does not exist."), {
        name: "NoSuchKey",
        Code: "NoSuchKey",
        $metadata: { httpStatusCode: 404 },
      }),
    // Azure real absent blob
    () =>
      Object.assign(new Error("The specified blob does not exist."), {
        name: "RestError",
        code: "BlobNotFound",
        statusCode: 404,
      }),
    // retained in-code sentinels (rare empty-response path)
    () => new Error("s3_object_missing"),
    () => new Error("azure_object_missing"),
  ];

  for (const shape of missingShapes) {
    const fake = makeMemoryAdapter(new Map(), () => shape());
    const { writer, members } = makeWriterDouble();
    const summary = await streamMediaIntoArchive(writer, {
      getAdapter: async () => fake.adapter,
      db,
    });
    expect(summary.skipped.filter((s) => s.key === key)).toEqual([{ key, reason: "missing" }]);
    expect(members.filter((m) => m.name.endsWith(key))).toEqual([]); // never a partial member
  }
});

test("local deferred ENOENT skipped during pipe, present file still written", async () => {
  const dir = await tmpDir();
  const presentKey = mediaKey("present.png");
  const absentKey = mediaKey("absent.png");
  const bytes = Buffer.from("present-bytes");
  await seedMedia([
    { key: presentKey, size: bytes.length },
    { key: absentKey, size: 999 },
  ]);
  // Write ONLY the present file on disk (media keys carry subdirectory segments).
  await mkdir(path.dirname(path.join(dir, presentKey)), { recursive: true });
  await writeFile(path.join(dir, presentKey), bytes);

  const adapter = createLocalAdapter({ dir, baseUrl: "/media" });
  const { writer, members } = makeWriterDouble();
  const summary = await streamMediaIntoArchive(writer, {
    getAdapter: async () => adapter,
    db,
  });

  expect(summary.skipped.filter((s) => s.key === absentKey)).toEqual([
    { key: absentKey, reason: "missing" },
  ]);
  const presentMember = members.find((m) => m.name === `${MEDIA_MEMBER_PREFIX}${presentKey}`);
  expect(presentMember).toBeDefined();
  expect(presentMember!.bytes).toEqual(bytes);
  // NO partial/corrupt member for the byteless key (prime guard caught it first).
  expect(members.some((m) => m.name === `${MEDIA_MEMBER_PREFIX}${absentKey}`)).toBe(false);
});

// ---------------------------------------------------------------------------
// 3. Non-missing (auth) error fails closed, credential-free
// ---------------------------------------------------------------------------

test("auth/transport error rejects with credential-free backup_media_read_failed", async () => {
  const secret = "AKIAIOSFODNN7EXAMPLEsecret";
  await seedMedia([{ key: mediaKey("denied.png"), size: 1 }]);
  const fake = makeMemoryAdapter(new Map(), () => new Error(`AccessDenied ${secret}`));
  const { writer } = makeWriterDouble();
  let thrown: unknown;
  try {
    await streamMediaIntoArchive(writer, { getAdapter: async () => fake.adapter, db });
  } catch (err) {
    thrown = err;
  }
  expect((thrown as Error).message).toBe("backup_media_read_failed");
  expect((thrown as Error).message).not.toContain(secret);
  expect((thrown as Error).message).not.toContain(process.cwd());
});

// ---------------------------------------------------------------------------
// 4. Size mismatch → graceful per-file skip, never a whole-export failure
// ---------------------------------------------------------------------------

test("DB-size drift (short + long body) skips the row, other files still export", async () => {
  const goodKey = mediaKey("good.bin");
  const shortKey = mediaKey("short.bin");
  const longKey = mediaKey("long.bin");
  const goodBytes = Buffer.from("12345"); // size 5
  const shortBytes = Buffer.from("12"); // size 3, declared 5
  const longBytes = Buffer.from("1234567890"); // size 10, declared 5
  await seedMedia([
    { key: goodKey, size: goodBytes.length },
    { key: shortKey, size: 5 },
    { key: longKey, size: 5 },
  ]);

  const fake = makeMemoryAdapter(
    new Map([
      [goodKey, goodBytes],
      [shortKey, shortBytes],
      [longKey, longBytes],
    ])
  );
  const { writer, members } = makeWriterDouble();
  const summary = await streamMediaIntoArchive(writer, {
    getAdapter: async () => fake.adapter,
    db,
  });

  // Completed WITHOUT throwing; drifted rows recorded; no partial member.
  const skippedKeys = summary.skipped
    .filter((s) => s.key.startsWith(prefix))
    .sort((a, b) => a.key.localeCompare(b.key));
  expect(skippedKeys).toEqual(
    [
      { key: shortKey, reason: "missing" },
      { key: longKey, reason: "missing" },
    ].sort((a, b) => a.key.localeCompare(b.key))
  );
  expect(members.map((m) => m.name)).toEqual([`${MEDIA_MEMBER_PREFIX}${goodKey}`]);
  expect(members[0].bytes).toEqual(goodBytes);
});

test("genuine writer/spool failure still fails closed", async () => {
  await seedMedia([{ key: mediaKey("ok.png"), size: 1 }]);
  const fake = makeMemoryAdapter(new Map([[mediaKey("ok.png"), Buffer.from("x")]]));
  const writer: BackupArchiveWriter = {
    async appendStream() {
      throw new Error("backup_archive_export_failed");
    },
  };
  await expect(
    streamMediaIntoArchive(writer, { getAdapter: async () => fake.adapter, db })
  ).rejects.toThrow("backup_archive_export_failed");
});

// ---------------------------------------------------------------------------
// 5. Traversal guard
// ---------------------------------------------------------------------------

test("path-traversal media keys rejected before putAt", async () => {
  const badNames = ["../../etc/passwd", "//x", "a/../../b", "..\\win", "a//b", "/abs"];
  for (const bad of badNames) {
    const target = makeMemoryAdapter();
    await expect(
      restoreMediaFromArchive(
        makeReaderDouble([
          { name: `${MEDIA_MEMBER_PREFIX}${bad}`, size: 1, body: bodyOf(Buffer.from("x")) },
        ]),
        { getAdapter: async () => target.adapter }
      )
    ).rejects.toThrow("backup_media_key_unsafe");
    expect(target.putAtCalls.length).toBe(0);
    expect(target.store.size).toBe(0);
  }
});

// ---------------------------------------------------------------------------
// 6. Per-file ceiling
// ---------------------------------------------------------------------------

test("member above BACKUP_MEDIA_MAX_FILE_BYTES rejected before putAt", async () => {
  const prev = process.env.BACKUP_MEDIA_MAX_FILE_BYTES;
  process.env.BACKUP_MEDIA_MAX_FILE_BYTES = "100";
  try {
    const target = makeMemoryAdapter();
    await expect(
      restoreMediaFromArchive(
        makeReaderDouble([
          {
            name: `${MEDIA_MEMBER_PREFIX}${mediaKey("huge.bin")}`,
            size: 101,
            body: bodyOf(Buffer.alloc(101, 1)),
          },
        ]),
        { getAdapter: async () => target.adapter }
      )
    ).rejects.toThrow("backup_media_too_large");
    expect(target.putAtCalls.length).toBe(0);
  } finally {
    if (prev === undefined) delete process.env.BACKUP_MEDIA_MAX_FILE_BYTES;
    else process.env.BACKUP_MEDIA_MAX_FILE_BYTES = prev;
  }
});

// ---------------------------------------------------------------------------
// 7. putAt writes at the exact key on the real local driver
// ---------------------------------------------------------------------------

test("local putAt writes at the exact original key, not a fresh uuid key", async () => {
  const dir = await tmpDir();
  const adapter = createLocalAdapter({ dir, baseUrl: "/media" });
  const key = "2026/07/x.bin";
  const bytes = Buffer.from([1, 2, 3, 4]);
  await adapter.putAt(key, bodyOf(bytes), bytes.length, "application/octet-stream");

  const onDisk = await readFile(path.join(dir, key));
  expect(onDisk).toEqual(bytes);
  // get() streams the same bytes back under the SAME key.
  const readBack: Buffer = await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    adapter
      .get(key)
      .then((stream) => {
        stream.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      })
      .catch(reject);
  });
  expect(readBack).toEqual(bytes);
  await expect(stat(path.join(dir, "2026/07"))).resolves.toBeDefined();
});

// ---------------------------------------------------------------------------
// 8. Manifest round-trip for the media summary
// ---------------------------------------------------------------------------

test("MediaArchiveSummary survives serialize→parse and matches members", async () => {
  const summary: MediaArchiveSummary = {
    fileCount: 2,
    totalBytes: 42,
    skipped: [{ key: "2026/07/missing.png", reason: "missing" }],
  };
  expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  // Round-trip shape is what 01 embeds as manifest.media (closed type).
  expect(Object.keys(summary).sort()).toEqual(["fileCount", "skipped", "totalBytes"]);
});

// ---------------------------------------------------------------------------
// 9. Non-media members are drained before media members (reader desync guard)
// ---------------------------------------------------------------------------

test("non-media members fully drained before media member processed", async () => {
  const events: string[] = [];
  const recordedBody = (name: string, bytes: Buffer): AsyncIterable<Uint8Array> =>
    (async function* () {
      yield Uint8Array.from(bytes);
      events.push(`drained:${name}`);
    })();

  const key = mediaKey("restored.png");
  const mediaBytes = Buffer.from("media-content");
  const reader = makeReaderDouble([
    { name: "manifest.json", size: 2, body: recordedBody("manifest.json", Buffer.from("{}")) },
    {
      name: "tables/pages.ndjson",
      size: 2,
      body: recordedBody("tables/pages.ndjson", Buffer.from("[]")),
    },
    {
      name: "settings.json",
      size: 2,
      body: recordedBody("settings.json", Buffer.from("{}")),
    },
    { name: `${MEDIA_MEMBER_PREFIX}${key}`, size: mediaBytes.length, body: bodyOf(mediaBytes) },
  ]);

  const target = makeMemoryAdapter();
  const restored = await restoreMediaFromArchive(reader, {
    getAdapter: async () => target.adapter,
  });

  // Every preceding non-media body was fully drained BEFORE the media member.
  expect(events).toEqual([
    "drained:manifest.json",
    "drained:tables/pages.ndjson",
    "drained:settings.json",
  ]);
  expect(restored.restored).toBe(1);
  expect(target.store.get(key)).toEqual(mediaBytes);
  expect(target.putAtCalls[0].key).toBe(key);
});

// ---------------------------------------------------------------------------
// 10. Content-type derived from the key extension
// ---------------------------------------------------------------------------

test("putAt content-type derived from key extension (case-insensitive, fallback)", async () => {
  const target = makeMemoryAdapter();
  const entries: ReaderEntry[] = [
    ["a.png", "image/png"],
    ["b.JPG", "image/jpeg"],
    ["c.bin", "application/octet-stream"],
    ["d", "application/octet-stream"],
  ].map(([name]) => ({
    name: `${MEDIA_MEMBER_PREFIX}${mediaKey(name)}`,
    size: 1,
    body: bodyOf(Buffer.from("x")),
  }));

  await restoreMediaFromArchive(makeReaderDouble(entries), {
    getAdapter: async () => target.adapter,
  });

  const byName = new Map(target.putAtCalls.map((c) => [c.key.split("/").pop(), c.contentType]));
  expect(byName.get("a.png")).toBe("image/png");
  expect(byName.get("b.JPG")).toBe("image/jpeg");
  expect(byName.get("c.bin")).toBe("application/octet-stream");
  expect(byName.get("d")).toBe("application/octet-stream");
});
