import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { media } from "../../../core/db/schema";
import {
  __setMediaServiceDepsForTests,
  deleteMedia,
  getMediaById,
  getMediaDeliveryRecordByKey,
  listMedia,
  recoverMediaDimensions,
  replaceMedia,
  updateMedia,
  uploadMedia,
  type MediaServiceTestDeps,
} from "../../../core/services/media/mediaService";
import type {
  CanonicalStoredUpload,
  MediaStorageAdapter,
  StoredMedia,
  UploadFile,
} from "../../../core/services/media/storage/adapter";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const encoder = new TextEncoder();
const ascii = (value: string) => Buffer.from(encoder.encode(value));
const concat = (...parts: Uint8Array[]) => Buffer.concat(parts.map((part) => Buffer.from(part)));
const u32le = (value: number) =>
  Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
const u16le = (value: number) => Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
const u16be = (value: number) => Uint8Array.of((value >>> 8) & 0xff, value & 0xff);

const pngOneByOne = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const bmpOneByOne = concat(
  ascii("BM"),
  u32le(58),
  new Uint8Array(4),
  u32le(54),
  u32le(40),
  u32le(1),
  u32le(1),
  u16le(1),
  u16le(24),
  u32le(0),
  u32le(4),
  u32le(0),
  u32le(0),
  u32le(0),
  u32le(0),
  new Uint8Array(4)
);
const jpegSegment = (marker: number, payload: Uint8Array) =>
  concat(Uint8Array.of(0xff, marker), Uint8Array.of(0, payload.length + 2), payload);
const jpegOneByOne = concat(
  Uint8Array.of(0xff, 0xd8),
  jpegSegment(0xc0, concat(Uint8Array.of(8), u16be(1), u16be(1), Uint8Array.of(1, 1, 0x11, 0))),
  jpegSegment(0xda, Uint8Array.of(1, 1, 0, 0, 63, 0)),
  Uint8Array.of(1, 2, 3),
  Uint8Array.of(0xff, 0xd9)
);
const gifOneByOne = concat(
  ascii("GIF89a"),
  u16le(1),
  u16le(1),
  Uint8Array.of(0x80, 0, 0),
  Uint8Array.of(0, 0, 0, 0xff, 0xff, 0xff),
  Uint8Array.of(0x2c),
  u16le(0),
  u16le(0),
  u16le(1),
  u16le(1),
  Uint8Array.of(0, 2, 2, 0x44, 0x01, 0, 0x3b)
);
const webpOneByOne = concat(
  ascii("RIFF"),
  u32le(18),
  ascii("WEBPVP8L"),
  u32le(5),
  Uint8Array.of(0x2f, 0, 0, 0, 0, 0)
);
const canonicalPdf = ascii(
  "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 2\ntrailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n45\n%%EOF\n"
);
const canonicalText = ascii("Plain UTF-8 text\nwith 2 < 3.");
const safeSvg = ascii(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><circle cx="0.5" cy="0.5" r="0.5" fill="red"/></svg>'
);
const unknownBinary = Buffer.from(Uint8Array.of(0, 0xff, 0x80, 1));

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function buildUploadFile(
  name: string,
  type: string,
  bytes: Buffer,
  options: { size?: number; arrayBuffer?: () => Promise<ArrayBuffer> } = {}
): UploadFile {
  return {
    name,
    type,
    size: options.size ?? bytes.byteLength,
    arrayBuffer: options.arrayBuffer ?? (async () => exactArrayBuffer(bytes)),
  };
}

type AdapterCalls = {
  put: number;
  putMedia: CanonicalStoredUpload[];
  get: string[];
  delete: string[];
  getPublicUrl: number;
  providerUrlReads: number;
};

function createFakeAdapter(overrides: Partial<MediaStorageAdapter> = {}): {
  adapter: MediaStorageAdapter;
  calls: AdapterCalls;
} {
  const calls: AdapterCalls = {
    put: 0,
    putMedia: [],
    get: [],
    delete: [],
    getPublicUrl: 0,
    providerUrlReads: 0,
  };
  const adapter: MediaStorageAdapter = {
    async put() {
      calls.put += 1;
      throw new Error("generic_put_forbidden");
    },
    async putMedia(upload): Promise<StoredMedia> {
      calls.putMedia.push(upload);
      return {
        key: `test/${randomUUID()}${upload.identity.extension}`,
        get url(): string {
          calls.providerUrlReads += 1;
          throw new Error("provider_url_read_forbidden");
        },
      };
    },
    async putAt() {
      throw new Error("generic_put_forbidden");
    },
    async get(key) {
      calls.get.push(key);
      return Readable.from([pngOneByOne]);
    },
    async delete(key) {
      calls.delete.push(key);
    },
    getPublicUrl() {
      calls.getPublicUrl += 1;
      throw new Error("get_public_url_forbidden");
    },
    ...overrides,
  };
  return { adapter, calls };
}

let config: Awaited<ReturnType<MediaServiceTestDeps["loadConfig"]>>;
let adapter: MediaStorageAdapter;
let calls: AdapterCalls;
let insertCalls = 0;
let replaceCalls = 0;
const createdMediaIds: string[] = [];

const trackedInsert: MediaServiceTestDeps["insertMedia"] = async (values) => {
  insertCalls += 1;
  const [row] = await db.insert(media).values(values).returning();
  if (row) createdMediaIds.push(row.id);
  return row ?? null;
};

const trackedReplace: MediaServiceTestDeps["replaceMedia"] = async (id, patch) => {
  replaceCalls += 1;
  const [row] = await db.update(media).set(patch).where(eq(media.id, id)).returning();
  return row ?? null;
};

function installDeps(overrides: Partial<MediaServiceTestDeps> = {}): void {
  __setMediaServiceDepsForTests({
    loadConfig: async () => config,
    resolveAdapter: async () => adapter,
    insertMedia: trackedInsert,
    replaceMedia: trackedReplace,
    ...overrides,
  });
}

async function seedMedia(overrides: Partial<typeof media.$inferInsert> = {}) {
  const [row] = await db
    .insert(media)
    .values({
      key: `legacy/${randomUUID()}.png`,
      url: "https://provider.invalid/legacy-object",
      originalName: "legacy.png",
      type: "image",
      mimeType: "image/png",
      size: pngOneByOne.byteLength,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("media_fixture_failed");
  createdMediaIds.push(row.id);
  return row;
}

beforeEach(() => {
  config = { maxSizeBytes: 10 * 1024 * 1024, allowedMime: ["image/*", "application/pdf"] };
  ({ adapter, calls } = createFakeAdapter());
  insertCalls = 0;
  replaceCalls = 0;
  installDeps();
});

afterEach(async () => {
  __setMediaServiceDepsForTests(null);
  if (hasDb && createdMediaIds.length > 0) {
    await db.delete(media).where(inArray(media.id, createdMediaIds.splice(0)));
  } else {
    createdMediaIds.length = 0;
  }
});

afterAll(() => {
  __setMediaServiceDepsForTests(null);
});

test("test dependency overrides fail closed in production while null reset remains allowed", () => {
  const prior = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    expect(() => __setMediaServiceDepsForTests({ resolveAdapter: async () => adapter })).toThrow(
      "media_service_test_override_forbidden_in_production"
    );
    expect(() => __setMediaServiceDepsForTests(null)).not.toThrow();
  } finally {
    if (prior === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prior;
  }
});

testIfDb(
  "an override installed before production is never honored after the mode changes",
  async () => {
    const prior = process.env.NODE_ENV;
    let overrideCalls = 0;
    try {
      process.env.NODE_ENV = "test";
      __setMediaServiceDepsForTests({
        loadConfig: async () => {
          overrideCalls += 1;
          throw new Error("override_used");
        },
      });
      process.env.NODE_ENV = "production";
      await expect(
        uploadMedia({ ...buildUploadFile("bad.png", "", pngOneByOne), size: Number.NaN }, {})
      ).rejects.toThrow("media_file_invalid");
      expect(overrideCalls).toBe(0);
    } finally {
      __setMediaServiceDepsForTests(null);
      if (prior === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prior;
    }
  }
);

test("malformed transport and size policies reject before adapter or DB work", async () => {
  const base = buildUploadFile("pixel.png", "image/png", pngOneByOne);
  const invalidSizes = [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    1.5,
    -1,
    Number.MAX_SAFE_INTEGER + 1,
  ];
  for (const size of invalidSizes) {
    let reads = 0;
    await expect(
      uploadMedia(
        { ...base, size, arrayBuffer: async () => ((reads += 1), exactArrayBuffer(pngOneByOne)) },
        {}
      )
    ).rejects.toThrow("media_file_invalid");
    expect(reads).toBe(0);
  }

  for (const maxSizeBytes of invalidSizes) {
    let reads = 0;
    await expect(
      uploadMedia(
        { ...base, arrayBuffer: async () => ((reads += 1), exactArrayBuffer(pngOneByOne)) },
        {},
        undefined,
        { maxSizeBytes }
      )
    ).rejects.toThrow("media_file_invalid");
    expect(reads).toBe(0);
  }

  let zeroFieldCapReads = 0;
  await expect(
    uploadMedia(
      {
        ...base,
        arrayBuffer: async () => ((zeroFieldCapReads += 1), exactArrayBuffer(pngOneByOne)),
      },
      {},
      undefined,
      { maxSizeBytes: 0 }
    )
  ).rejects.toThrow("media_file_too_large");
  expect(zeroFieldCapReads).toBe(0);

  let honestReads = 0;
  await expect(
    uploadMedia(
      { ...base, size: 2, arrayBuffer: async () => ((honestReads += 1), new ArrayBuffer(2)) },
      {},
      undefined,
      { maxSizeBytes: 1 }
    )
  ).rejects.toThrow("media_file_too_large");
  expect(honestReads).toBe(0);

  let lyingReads = 0;
  await expect(
    uploadMedia(
      {
        ...base,
        size: 1,
        arrayBuffer: async () => ((lyingReads += 1), exactArrayBuffer(pngOneByOne)),
      },
      {},
      undefined,
      { maxSizeBytes: 1 }
    )
  ).rejects.toThrow("media_file_too_large");
  expect(lyingReads).toBe(1);

  await expect(
    uploadMedia({ ...base, arrayBuffer: async () => Promise.reject(new Error("read_failed")) }, {})
  ).rejects.toThrow("media_file_invalid");
  await expect(
    uploadMedia(
      { ...base, arrayBuffer: async () => new Uint8Array() as unknown as ArrayBuffer },
      {}
    )
  ).rejects.toThrow("media_file_invalid");

  for (const maxSizeBytes of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    0,
    1.5,
    -1,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    let reads = 0;
    config = { ...config, maxSizeBytes };
    await expect(
      uploadMedia(
        { ...base, arrayBuffer: async () => ((reads += 1), exactArrayBuffer(pngOneByOne)) },
        {}
      )
    ).rejects.toThrow("media_storage_unavailable");
    expect(reads).toBe(0);
  }

  expect(calls.putMedia).toHaveLength(0);
  expect(insertCalls).toBe(0);
});

test("ordinary field MIME policy rejects globally allowed canonical bytes before storage", async () => {
  config = { maxSizeBytes: 1024 * 1024, allowedMime: ["image/*"] };
  await expect(
    uploadMedia(buildUploadFile("pixel.jpg", "image/jpeg", pngOneByOne), {}, undefined, {
      allowedMime: ["image/jpeg"],
    })
  ).rejects.toThrow("media_mime_not_allowed");
  expect(calls.putMedia).toHaveLength(0);
  expect(insertCalls).toBe(0);
});

test("generic global MIME policy rejects canonical PNG before field policy or storage", async () => {
  config = { maxSizeBytes: 1024 * 1024, allowedMime: ["application/pdf"] };
  for (const constraints of [undefined, { allowedMime: ["image/*"] }]) {
    await expect(
      uploadMedia(
        buildUploadFile("pixel.png", "image/png", pngOneByOne),
        {},
        undefined,
        constraints
      )
    ).rejects.toThrow("media_mime_not_allowed");
  }
  expect(calls.putMedia).toHaveLength(0);
  expect(insertCalls).toBe(0);
});

testIfDb(
  "byte identity and sniff flag parity own persisted MIME, key, type, and proxy URL",
  async () => {
    const declaredTypes = ["", "image/jpeg;charset=utf-8", "text/html"];
    for (const [index, sniffContent] of [undefined, false, true].entries()) {
      const uploaded = await uploadMedia(
        buildUploadFile(`folder\\deceptive-${index}.jpg.exe`, declaredTypes[index]!, pngOneByOne),
        {},
        undefined,
        sniffContent === undefined ? undefined : { sniffContent }
      );
      expect(uploaded.mimeType).toBe("image/png");
      expect(uploaded.type).toBe("image");
      expect(uploaded.width).toBe(1);
      expect(uploaded.height).toBe(1);
      expect(uploaded.key.endsWith(".png")).toBe(true);
      expect(uploaded.url).toBe(`/media/${uploaded.key}`);
      expect(uploaded.url).not.toContain("provider.invalid");
      const raw = await db.select().from(media).where(eq(media.id, uploaded.id));
      expect(raw[0]?.url).toBe(`/media/${uploaded.key}`);
    }

    expect(calls.put).toBe(0);
    expect(calls.putMedia).toHaveLength(3);
    expect(Object.keys(calls.putMedia[0]!.bytes).sort()).toEqual(["arrayBuffer", "size"]);
    expect(calls.getPublicUrl).toBe(0);
    expect(calls.providerUrlReads).toBe(0);
  }
);

testIfDb("display filename normalization is exact and reaches metadata plus adapter", async () => {
  const backslash = await uploadMedia(
    buildUploadFile("folder\\backslash.png", "", pngOneByOne),
    {}
  );
  expect(backslash.originalName).toBe("backslash.png");
  expect(calls.putMedia.at(-1)?.downloadName).toBe("backslash.png");

  const slash = await uploadMedia(buildUploadFile("folder/slash.png", "", pngOneByOne), {});
  expect(slash.originalName).toBe("slash.png");
  expect(calls.putMedia.at(-1)?.downloadName).toBe("slash.png");

  const unsafeName = `folder\\nested/  fi\u0000le\u0085\u202E\uD800.  `;
  const uploaded = await uploadMedia(buildUploadFile(unsafeName, "ignored/type", pngOneByOne), {});
  expect(uploaded.originalName).toBe("file");
  expect(uploaded.title).toBe("file");
  expect(calls.putMedia.at(-1)?.downloadName).toBe("file");

  const longName = `${"界".repeat(100)}.`;
  const long = await uploadMedia(buildUploadFile(longName, "", pngOneByOne), {});
  expect(long.originalName).toBe("界".repeat(85));
  expect(encoder.encode(long.originalName ?? "").byteLength).toBe(255);
  expect(calls.putMedia.at(-1)?.downloadName).toBe(long.originalName);

  const truncatesOnDot = await uploadMedia(
    buildUploadFile(`${"a".repeat(254)}.z`, "", pngOneByOne),
    {}
  );
  expect(truncatesOnDot.originalName).toBe("a".repeat(254));
  expect(encoder.encode(truncatesOnDot.originalName ?? "").byteLength).toBe(254);
  expect(calls.putMedia.at(-1)?.downloadName).toBe(truncatesOnDot.originalName);

  const fallback = await uploadMedia(buildUploadFile("folder/..\u0000", "", pngOneByOne), {});
  expect(fallback.originalName).toBe("upload.png");
  expect(fallback.title).toBe("upload.png");
  expect(calls.putMedia.at(-1)?.downloadName).toBe("upload.png");
});

testIfDb("SVG and octet-stream require exact global and field authorization", async () => {
  config = { maxSizeBytes: 1024 * 1024, allowedMime: ["image/*", "application/*"] };
  await expect(uploadMedia(buildUploadFile("safe.svg", "image/png", safeSvg), {})).rejects.toThrow(
    "media_mime_not_allowed"
  );
  await expect(
    uploadMedia(buildUploadFile("data.bin", "application/octet-stream", unknownBinary), {})
  ).rejects.toThrow("media_mime_not_allowed");

  config = {
    maxSizeBytes: 1024 * 1024,
    allowedMime: ["image/svg+xml", "application/octet-stream"],
  };
  await expect(
    uploadMedia(buildUploadFile("safe.svg", "", safeSvg), {}, undefined, {
      allowedMime: ["image/*"],
    })
  ).rejects.toThrow("media_mime_not_allowed");
  await expect(
    uploadMedia(buildUploadFile("data.bin", "", unknownBinary), {}, undefined, {})
  ).rejects.toThrow("media_mime_not_allowed");

  const svg = await uploadMedia(buildUploadFile("safe.svg.exe", "text/html", safeSvg), {});
  expect(svg).toMatchObject({ mimeType: "image/svg+xml", type: "file", width: null, height: null });
  expect(svg.key.endsWith(".svg")).toBe(true);
  const fieldSvg = await uploadMedia(
    buildUploadFile("field.svg", "application/octet-stream", safeSvg),
    {},
    undefined,
    { allowedMime: ["image/svg+xml"] }
  );
  expect(fieldSvg.mimeType).toBe("image/svg+xml");
  const octet = await uploadMedia(
    buildUploadFile("data.txt", "text/plain", unknownBinary),
    {},
    undefined,
    { allowedMime: ["application/octet-stream"] }
  );
  expect(octet).toMatchObject({ mimeType: "application/octet-stream", type: "file" });
  expect(octet.key.endsWith(".bin")).toBe(true);
});

testIfDb(
  "null and undefined global max use 10 MiB and projections never expose provider URLs",
  async () => {
    const acceptedAtDefaultLimit: Awaited<ReturnType<typeof uploadMedia>>[] = [];
    for (const maxSizeBytes of [null, undefined]) {
      config = { maxSizeBytes, allowedMime: ["image/*"] };
      let oversizeReads = 0;
      await expect(
        uploadMedia(
          {
            ...buildUploadFile("too-large.png", "", pngOneByOne),
            size: 10 * 1024 * 1024 + 1,
            arrayBuffer: async () => ((oversizeReads += 1), exactArrayBuffer(pngOneByOne)),
          },
          {}
        )
      ).rejects.toThrow("media_file_too_large");
      expect(oversizeReads).toBe(0);

      const accepted = await uploadMedia(
        {
          ...buildUploadFile("at-default-limit.png", "", pngOneByOne),
          size: 10 * 1024 * 1024,
        },
        {}
      );
      expect(accepted.mimeType).toBe("image/png");
      expect(accepted.size).toBe(pngOneByOne.byteLength);
      acceptedAtDefaultLimit.push(accepted);
    }

    expect(acceptedAtDefaultLimit).toHaveLength(2);
    const uploaded = acceptedAtDefaultLimit[1]!;
    await updateMedia(uploaded.id, { alt: "Alt" });
    const listed = (await listMedia()).find((item) => item.id === uploaded.id);
    const fetched = await getMediaById(uploaded.id);
    const updated = await updateMedia(uploaded.id, { caption: "Updated" });
    expect(listed?.url).toBe(`/media/${uploaded.key}`);
    expect(fetched?.url).toBe(`/media/${uploaded.key}`);
    expect(updated?.url).toBe(`/media/${uploaded.key}`);

    const delivery = await getMediaDeliveryRecordByKey(uploaded.key);
    expect(delivery).toEqual({
      key: uploaded.key,
      mimeType: "image/png",
      originalName: "at-default-limit.png",
      size: pngOneByOne.byteLength,
    });
    expect(Object.keys(delivery ?? {}).sort()).toEqual(["key", "mimeType", "originalName", "size"]);
  }
);

testIfDb(
  "resolver, put, unsafe-key, and insert failures preserve primary errors and DB state",
  async () => {
    installDeps({ resolveAdapter: async () => Promise.reject(new Error("resolver_failed")) });
    await expect(uploadMedia(buildUploadFile("pixel.png", "", pngOneByOne), {})).rejects.toThrow(
      "media_storage_unavailable"
    );
    expect(insertCalls).toBe(0);

    ({ adapter, calls } = createFakeAdapter({
      putMedia: async () => Promise.reject(new Error("put")),
    }));
    installDeps();
    await expect(uploadMedia(buildUploadFile("pixel.png", "", pngOneByOne), {})).rejects.toThrow(
      "media_storage_unavailable"
    );
    expect(insertCalls).toBe(0);

    ({ adapter, calls } = createFakeAdapter({
      putMedia: async () => ({ key: "../unsafe.png", url: "https://provider.invalid/x" }),
    }));
    installDeps();
    await expect(uploadMedia(buildUploadFile("pixel.png", "", pngOneByOne), {})).rejects.toThrow(
      "media_storage_unavailable"
    );
    expect(calls.delete).toEqual([]);
    expect(insertCalls).toBe(0);

    ({ adapter, calls } = createFakeAdapter({
      delete: async (key) => {
        calls.delete.push(key);
        throw new Error("cleanup_failed");
      },
    }));
    installDeps({ insertMedia: async () => Promise.reject(new Error("db_failed")) });
    await expect(uploadMedia(buildUploadFile("pixel.png", "", pngOneByOne), {})).rejects.toThrow(
      "media_storage_unavailable"
    );
    expect(calls.delete).toHaveLength(1);

    ({ adapter, calls } = createFakeAdapter());
    installDeps({ insertMedia: async () => null });
    await expect(uploadMedia(buildUploadFile("pixel.png", "", pngOneByOne), {})).rejects.toThrow(
      "media_storage_unavailable"
    );
    expect(calls.delete).toHaveLength(1);
  }
);

testIfDb(
  "all nine canonical profiles keep byte-owned create/replace identity through DB and adapter",
  async () => {
    const cases = [
      {
        bytes: pngOneByOne,
        mime: "image/png",
        extension: ".png",
        delivery: "inline",
        type: "image",
      },
      {
        bytes: jpegOneByOne,
        mime: "image/jpeg",
        extension: ".jpg",
        delivery: "inline",
        type: "image",
      },
      {
        bytes: gifOneByOne,
        mime: "image/gif",
        extension: ".gif",
        delivery: "inline",
        type: "image",
      },
      {
        bytes: webpOneByOne,
        mime: "image/webp",
        extension: ".webp",
        delivery: "inline",
        type: "image",
      },
      {
        bytes: bmpOneByOne,
        mime: "image/bmp",
        extension: ".bmp",
        delivery: "inline",
        type: "image",
      },
      {
        bytes: canonicalPdf,
        mime: "application/pdf",
        extension: ".pdf",
        delivery: "attachment",
        type: "file",
      },
      {
        bytes: canonicalText,
        mime: "text/plain",
        extension: ".txt",
        delivery: "attachment",
        type: "file",
      },
      {
        bytes: safeSvg,
        mime: "image/svg+xml",
        extension: ".svg",
        delivery: "attachment",
        type: "file",
      },
      {
        bytes: unknownBinary,
        mime: "application/octet-stream",
        extension: ".bin",
        delivery: "attachment",
        type: "file",
      },
    ] as const;

    for (const [index, entry] of cases.entries()) {
      config = { maxSizeBytes: 1024 * 1024, allowedMime: [entry.mime] };
      const createName = `folder\\create-${index}${entry.extension}.exe`;
      const created = await uploadMedia(buildUploadFile(createName, "text/html", entry.bytes), {});
      expect(created).toMatchObject({ mimeType: entry.mime, type: entry.type });
      expect(created.key.endsWith(entry.extension)).toBe(true);
      expect(created.originalName).toBe(`create-${index}${entry.extension}.exe`);
      expect(created.size).toBe(entry.bytes.byteLength);
      const createPut = calls.putMedia.at(-1);
      expect(createPut?.identity).toEqual({
        mimeType: entry.mime,
        extension: entry.extension,
        delivery: entry.delivery,
      });
      expect(createPut?.downloadName).toBe(created.originalName);
      expect(createPut?.bytes.size).toBe(entry.bytes.byteLength);
      expect(Buffer.from(await createPut!.bytes.arrayBuffer())).toEqual(entry.bytes);
      const [createdRow] = await db.select().from(media).where(eq(media.id, created.id));
      expect(createdRow).toMatchObject({
        key: created.key,
        url: `/media/${created.key}`,
        originalName: created.originalName,
        type: entry.type,
        mimeType: entry.mime,
        size: entry.bytes.byteLength,
      });
      if (entry.mime === "image/png") expect(created).toMatchObject({ width: 1, height: 1 });
      if (entry.mime === "image/bmp") expect(created).toMatchObject({ width: null, height: null });
      if (entry.type === "file") expect(created).toMatchObject({ width: null, height: null });

      const oldKey = created.key;
      let keyObservedDuringOldDelete: string | undefined;
      ({ adapter, calls } = createFakeAdapter({
        delete: async (key) => {
          calls.delete.push(key);
          if (key === oldKey) {
            const [row] = await db
              .select({ key: media.key })
              .from(media)
              .where(eq(media.id, created.id));
            keyObservedDuringOldDelete = row?.key;
          }
        },
      }));
      installDeps();
      const replaceName = `folder/replace-${index}${entry.extension}.html`;
      const replaced = await replaceMedia(
        created.id,
        buildUploadFile(replaceName, "image/x-client-declared", entry.bytes)
      );
      expect(replaced).toMatchObject({ mimeType: entry.mime, type: entry.type });
      expect(replaced.key.endsWith(entry.extension)).toBe(true);
      expect(replaced.url).toBe(`/media/${replaced.key}`);
      expect(replaced.originalName).toBe(`replace-${index}${entry.extension}.html`);
      const replacePut = calls.putMedia.at(-1);
      expect(replacePut?.identity).toEqual({
        mimeType: entry.mime,
        extension: entry.extension,
        delivery: entry.delivery,
      });
      expect(replacePut?.downloadName).toBe(replaced.originalName);
      expect(replacePut?.bytes.size).toBe(entry.bytes.byteLength);
      expect(Buffer.from(await replacePut!.bytes.arrayBuffer())).toEqual(entry.bytes);
      const [replacedRow] = await db.select().from(media).where(eq(media.id, created.id));
      expect(replacedRow).toMatchObject({
        key: replaced.key,
        url: `/media/${replaced.key}`,
        originalName: replaced.originalName,
        type: entry.type,
        mimeType: entry.mime,
        size: entry.bytes.byteLength,
      });
      if (entry.mime === "image/png") expect(replaced).toMatchObject({ width: 1, height: 1 });
      if (entry.mime === "image/bmp") expect(replaced).toMatchObject({ width: null, height: null });
      if (entry.type === "file") {
        expect(replaced).toMatchObject({ width: null, height: null });
      }
      expect(keyObservedDuringOldDelete).toBe(replaced.key);
      expect(calls.delete).toContain(oldKey);
      expect(calls.providerUrlReads).toBe(0);
    }
    expect(calls.put).toBe(0);
    expect(calls.getPublicUrl).toBe(0);
  }
);

testIfDb(
  "replace failures compensate only validated new keys and never delete the old key",
  async () => {
    const existing = await seedMedia();

    ({ adapter, calls } = createFakeAdapter({
      putMedia: async () => Promise.reject(new Error("put_failed")),
    }));
    installDeps();
    await expect(
      replaceMedia(existing.id, buildUploadFile("new.png", "", pngOneByOne))
    ).rejects.toThrow("media_storage_unavailable");
    expect(calls.delete).toEqual([]);
    expect((await db.select().from(media).where(eq(media.id, existing.id)))[0]?.key).toBe(
      existing.key
    );

    ({ adapter, calls } = createFakeAdapter({
      putMedia: async () => ({ key: "../unsafe.png", url: "https://provider.invalid/x" }),
    }));
    installDeps();
    await expect(
      replaceMedia(existing.id, buildUploadFile("new.png", "", pngOneByOne))
    ).rejects.toThrow("media_storage_unavailable");
    expect(replaceCalls).toBe(0);
    expect(calls.delete).toEqual([]);
    expect((await db.select().from(media).where(eq(media.id, existing.id)))[0]?.key).toBe(
      existing.key
    );

    ({ adapter, calls } = createFakeAdapter());
    installDeps({ replaceMedia: async () => Promise.reject(new Error("update_failed")) });
    await expect(
      replaceMedia(existing.id, buildUploadFile("new.png", "", pngOneByOne))
    ).rejects.toThrow("media_storage_unavailable");
    expect(calls.delete).toHaveLength(1);
    expect(calls.delete).not.toContain(existing.key);
    expect((await db.select().from(media).where(eq(media.id, existing.id)))[0]?.key).toBe(
      existing.key
    );

    ({ adapter, calls } = createFakeAdapter({
      delete: async (key) => {
        calls.delete.push(key);
        throw new Error("cleanup_failed");
      },
    }));
    installDeps({ replaceMedia: async () => null });
    await expect(
      replaceMedia(existing.id, buildUploadFile("new.png", "", pngOneByOne))
    ).rejects.toThrow("media_not_found");
    expect(calls.delete).toHaveLength(1);
    expect(calls.delete).not.toContain(existing.key);
    expect((await db.select().from(media).where(eq(media.id, existing.id)))[0]?.key).toBe(
      existing.key
    );
  }
);

testIfDb(
  "safe and unsafe legacy rows project without provider fallback or unsafe adapter I/O",
  async () => {
    const safe = await seedMedia({ key: `legacy/a safe-${randomUUID()}.png` });
    const unsafe = await seedMedia({ key: "../unsafe%2f.png", mimeType: "image/png" });
    const svg = await seedMedia({ key: `legacy/${randomUUID()}.svg`, mimeType: "image/svg+xml" });
    const alias = await seedMedia({ key: `legacy/${randomUUID()}.jpg`, mimeType: "image/jpg" });

    expect((await getMediaById(safe.id))?.url).toContain("/media/legacy/a%20safe-");
    expect((await getMediaById(unsafe.id))?.url).toBe(`/media/%00unavailable/${unsafe.id}`);
    expect((await updateMedia(unsafe.id, { title: "Still visible" }))?.url).toBe(
      `/media/%00unavailable/${unsafe.id}`
    );
    expect((await listMedia()).find((item) => item.id === unsafe.id)?.url).toBe(
      `/media/%00unavailable/${unsafe.id}`
    );

    let resolverCalls = 0;
    installDeps({
      resolveAdapter: async () => {
        resolverCalls += 1;
        return adapter;
      },
    });
    expect((await recoverMediaDimensions(unsafe.id)).url).toBe(
      `/media/%00unavailable/${unsafe.id}`
    );
    await recoverMediaDimensions(svg.id);
    await recoverMediaDimensions(alias.id);
    expect(resolverCalls).toBe(0);
    expect(calls.get).toEqual([]);

    const recoverable = await seedMedia({ width: null, height: null });
    const recovered = await recoverMediaDimensions(recoverable.id);
    expect(recovered).toMatchObject({ width: 1, height: 1 });
    expect(recovered.url).toBe(`/media/${recoverable.key}`);
    expect(resolverCalls).toBe(1);
    expect(calls.get).toEqual([recoverable.key]);

    const unsafeReplace = await replaceMedia(
      unsafe.id,
      buildUploadFile("replacement.png", "", pngOneByOne)
    );
    expect(unsafeReplace.key).not.toBe(unsafe.key);
    expect(calls.delete).not.toContain(unsafe.key);

    const unsafeDelete = await seedMedia({ key: "../../delete-me.png" });
    const resolvesBeforeDelete = resolverCalls;
    await deleteMedia(unsafeDelete.id);
    createdMediaIds.splice(createdMediaIds.indexOf(unsafeDelete.id), 1);
    expect(resolverCalls).toBe(resolvesBeforeDelete);
    expect(calls.delete).not.toContain("../../delete-me.png");
    expect(await getMediaById(unsafeDelete.id)).toBeNull();

    const safeDelete = await seedMedia();
    const successfulDeleteKeys: string[] = [];
    let safeRowPresentDuringAdapterDelete = false;
    ({ adapter, calls } = createFakeAdapter({
      delete: async (key) => {
        successfulDeleteKeys.push(key);
        const [row] = await db
          .select({ id: media.id })
          .from(media)
          .where(eq(media.id, safeDelete.id));
        safeRowPresentDuringAdapterDelete = row?.id === safeDelete.id;
      },
    }));
    installDeps();
    await deleteMedia(safeDelete.id);
    createdMediaIds.splice(createdMediaIds.indexOf(safeDelete.id), 1);
    expect(successfulDeleteKeys).toEqual([safeDelete.key]);
    expect(safeRowPresentDuringAdapterDelete).toBe(true);
    expect(await getMediaById(safeDelete.id)).toBeNull();

    const failedDelete = await seedMedia();
    const failedDeleteKeys: string[] = [];
    let failedRowPresentDuringAdapterDelete = false;
    ({ adapter, calls } = createFakeAdapter({
      delete: async (key) => {
        failedDeleteKeys.push(key);
        const [row] = await db
          .select({ id: media.id })
          .from(media)
          .where(eq(media.id, failedDelete.id));
        failedRowPresentDuringAdapterDelete = row?.id === failedDelete.id;
        throw new Error("delete_failed");
      },
    }));
    installDeps();
    await expect(deleteMedia(failedDelete.id)).rejects.toThrow("media_storage_unavailable");
    expect(failedDeleteKeys).toEqual([failedDelete.key]);
    expect(failedRowPresentDuringAdapterDelete).toBe(true);
    expect((await getMediaById(failedDelete.id))?.id).toBe(failedDelete.id);
  }
);
