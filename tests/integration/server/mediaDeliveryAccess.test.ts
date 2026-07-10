import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { Readable } from "node:stream";

import { ApiError } from "../../../core/server/errorHandler";
import {
  __setMediaDeliveryDepsForTests,
  handleMediaDeliveryRequest,
  type MediaDeliveryDeps,
} from "../../../core/server/mediaDelivery";
import type { AuthContext } from "../../../core/server/middleware/auth";
import type { MediaDeliveryRecord } from "../../../core/services/media/mediaService";
import type { MediaStorageAdapter } from "../../../core/services/media/storage/adapter";
import type { SecuritySettings } from "../../../core/services/settings/securitySettings";

const baseUrl = "http://coderso.test";

const passiveFixtures = [
  {
    mimeType: "image/png",
    extension: ".png",
    bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]),
  },
  {
    mimeType: "image/jpeg",
    extension: ".jpg",
    bytes: Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  },
  {
    mimeType: "image/gif",
    extension: ".gif",
    bytes: Buffer.from("GIF89a1234567"),
  },
  {
    mimeType: "image/webp",
    extension: ".webp",
    bytes: Buffer.from("RIFF1234WEBP!"),
  },
  {
    mimeType: "image/bmp",
    extension: ".bmp",
    bytes: Buffer.from("BM12345678901"),
  },
] as const;

const attachmentFixtures = [
  { mimeType: "application/pdf", extension: ".pdf", bytes: Buffer.from("%PDF-1.4\n%%EOF") },
  { mimeType: "image/svg+xml", extension: ".svg", bytes: Buffer.from("not-svg-but-attached") },
  { mimeType: "text/plain", extension: ".txt", bytes: Buffer.from("plain attachment") },
  {
    mimeType: "application/octet-stream",
    extension: ".bin",
    bytes: Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  },
] as const;

const securitySettings: SecuritySettings = {
  requestId: { enabled: true, headerName: "x-request-id" },
  csrf: { enabled: true, headerName: "x-csrf-token", tokenTtlMinutes: 60 },
  cors: {
    allowedOrigins: [],
    allowCredentials: false,
    allowedMethods: [],
    allowedHeaders: [],
    maxAgeSeconds: 0,
  },
  rateLimit: {
    enabled: true,
    buckets: {
      auth: { windowSeconds: 60, maxRequests: 100 },
      admin_read: { windowSeconds: 60, maxRequests: 100 },
      admin_write: { windowSeconds: 60, maxRequests: 100 },
      public_read: { windowSeconds: 60, maxRequests: 100 },
      public_write: { windowSeconds: 60, maxRequests: 100 },
      assistant: { windowSeconds: 60, maxRequests: 100 },
    },
  },
  headers: {
    enabled: true,
    frameOptions: "DENY",
    contentTypeOptions: true,
    referrerPolicy: null,
    permissionsPolicy: null,
    csp: null,
    hsts: null,
  },
  validation: { rejectUnknownFields: true },
  plugins: { safeMode: false },
  session: { ttlDays: 7, maxPerUser: 10, singleSession: false },
  loginAlerts: { enabled: false, notifyOnNewDevice: false, notifyOnNewLocation: false },
  botProtection: {
    enabled: false,
    provider: "recaptcha_v3",
    siteKey: null,
    secretKey: null,
    thresholds: { login: 0.5, reset: 0.5, publicWrite: 0.5 },
    enforceOnLocalhost: false,
  },
};

type StreamTracker = { closeCount: number };

type HarnessCalls = {
  rate: Array<{
    bucket: string;
    identity: { ip?: string; userAgent?: string };
  }>;
  records: string[];
  resolves: number;
  gets: string[];
  publicUrls: number;
  sessions: number;
  apiKeys: number;
  permissions: number;
};

const records = new Map<string, MediaDeliveryRecord>();
const bodies = new Map<string, Buffer>();
let mode: "public" | "internal" = "public";
let permissionAllowed = true;
let streamFactory: (key: string) => NodeJS.ReadableStream;
let adapterGet: (key: string) => Promise<NodeJS.ReadableStream>;
let calls: HarnessCalls;

function trackedStream(
  chunks: Array<Buffer | Uint8Array | string>,
  options: { tailError?: Error; keepOpen?: boolean } = {}
): { stream: Readable; tracker: StreamTracker } {
  const tracker: StreamTracker = { closeCount: 0 };
  let index = 0;
  let errored = false;
  const stream = new Readable({
    read() {
      if (index < chunks.length) {
        this.push(chunks[index++]);
        return;
      }
      if (options.tailError && !errored) {
        errored = true;
        this.destroy(options.tailError);
        return;
      }
      if (!options.keepOpen) this.push(null);
    },
    destroy(error, callback) {
      tracker.closeCount += 1;
      callback(error);
    },
  });
  return { stream, tracker };
}

function poisonTailStream(first: Buffer): { stream: Readable; tracker: StreamTracker } {
  const tracker: StreamTracker = { closeCount: 0 };
  let step = 0;
  const poison = {
    valueOf() {
      throw new Error("provider credential SECRET");
    },
  };
  const stream = new Readable({
    objectMode: true,
    read() {
      if (step === 0) this.push(first);
      else if (step === 1) this.push(poison);
      else this.push(null);
      step += 1;
    },
    destroy(error, callback) {
      tracker.closeCount += 1;
      callback(error);
    },
  });
  return { stream, tracker };
}

function recordFor(
  key: string,
  mimeType: string,
  bytes: Buffer,
  originalName = 'folder/unsafe"name.exe'
): MediaDeliveryRecord {
  const record = { key, mimeType, originalName, size: bytes.byteLength };
  records.set(key, record);
  bodies.set(key, bytes);
  return record;
}

function request(path: string, init?: RequestInit): Request {
  return new Request(`${baseUrl}${path}`, init);
}

function installHarness(overrides: Partial<MediaDeliveryDeps> = {}): void {
  const adapter: MediaStorageAdapter = {
    async put() {
      throw new Error("generic_put_forbidden");
    },
    async putMedia() {
      throw new Error("media_put_forbidden");
    },
    async get(key) {
      calls.gets.push(key);
      return adapterGet(key);
    },
    async delete() {
      throw new Error("delete_forbidden");
    },
    getPublicUrl() {
      calls.publicUrls += 1;
      throw new Error("provider_url_forbidden");
    },
  };

  __setMediaDeliveryDepsForTests({
    loadSecuritySettings: async () => securitySettings,
    chargeRateLimit: (bucket, identity) => {
      calls.rate.push({ bucket, identity });
    },
    loadAccessMode: async () => mode,
    attachSession: async (ctx: AuthContext) => {
      calls.sessions += 1;
      if (ctx.cookies?.session === "allowed") ctx.user = { id: "session-user" };
    },
    authenticateApiKeyScopes: async (authorization) => {
      calls.apiKeys += 1;
      if (authorization === "Bearer allowed") return ["media.read"];
      if (authorization === "Bearer wrong") return ["forms.submit"];
      return null;
    },
    requireSessionMediaRead: async () => {
      calls.permissions += 1;
      if (!permissionAllowed) throw new Error("forbidden");
    },
    findRecord: async (key) => {
      calls.records.push(key);
      return records.get(key) ?? null;
    },
    resolveAdapter: async () => {
      calls.resolves += 1;
      return adapter;
    },
    ...overrides,
  });
}

beforeEach(() => {
  records.clear();
  bodies.clear();
  mode = "public";
  permissionAllowed = true;
  calls = {
    rate: [],
    records: [],
    resolves: 0,
    gets: [],
    publicUrls: 0,
    sessions: 0,
    apiKeys: 0,
    permissions: 0,
  };
  streamFactory = (key) => trackedStream([bodies.get(key) ?? Buffer.alloc(0)]).stream;
  adapterGet = async (key) => streamFactory(key);
  installHarness();
});

afterEach(() => {
  __setMediaDeliveryDepsForTests(null);
});

afterAll(() => {
  __setMediaDeliveryDepsForTests(null);
});

test("test dependency overrides reject in production while null reset remains allowed", () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    expect(() => __setMediaDeliveryDepsForTests({ loadAccessMode: async () => "public" })).toThrow(
      "media_delivery_test_override_forbidden_in_production"
    );
    expect(() => __setMediaDeliveryDepsForTests(null)).not.toThrow();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("an override installed before production is ignored by the handler", async () => {
  const previous = process.env.NODE_ENV;
  let overrideCalls = 0;
  try {
    process.env.NODE_ENV = "test";
    __setMediaDeliveryDepsForTests({
      loadSecuritySettings: async () => {
        overrideCalls += 1;
        return securitySettings;
      },
    });
    process.env.NODE_ENV = "production";
    const result = await handleMediaDeliveryRequest(request("/media/object.png"));
    expect(result.status).toBe(503);
    expect(overrideCalls).toBe(0);
  } finally {
    __setMediaDeliveryDepsForTests(null);
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("mount and method failures are exact and perform zero downstream work", async () => {
  for (const path of ["/media", "/media/", "/mediax/key.png"]) {
    expect((await handleMediaDeliveryRequest(request(path))).status).toBe(404);
  }
  const method = await handleMediaDeliveryRequest(request("/media/key.png", { method: "POST" }));
  expect(method.status).toBe(405);
  expect(method.headers.get("allow")).toBe("GET, HEAD");
  expect(calls.rate).toEqual([]);
  expect(calls.records).toEqual([]);
  expect(calls.resolves).toBe(0);
});

test("canonical key parsing rejects observable aliases and the unsafe sentinel before lookup", async () => {
  const invalidPaths = [
    "/media/%00unavailable/id",
    "/media/%ZZ.png",
    "/media/a%2Fb.png",
    "/media/%252e%252e/file.png",
    "/media/%c5%bc.png",
    "/media/a%25b.png",
  ];
  for (const path of invalidPaths) {
    expect((await handleMediaDeliveryRequest(request(path))).status).toBe(400);
  }
  expect(calls.rate).toHaveLength(invalidPaths.length);
  expect(calls.records).toEqual([]);
  expect(calls.resolves).toBe(0);
});

test("WHATWG-normalized dot segments cannot create a traversal storage key", async () => {
  const bytes = passiveFixtures[0].bytes;
  recordFor("safe.png", "image/png", bytes);
  const normalized = request("/media/folder/../safe.png");
  expect(new URL(normalized.url).pathname).toBe("/media/safe.png");
  expect((await handleMediaDeliveryRequest(normalized)).status).toBe(200);
  expect(calls.records).toEqual(["safe.png"]);

  const outside = request("/media/%2e%2e/outside.png");
  expect(new URL(outside.url).pathname).toBe("/outside.png");
  expect((await handleMediaDeliveryRequest(outside)).status).toBe(404);
  expect(calls.records).toEqual(["safe.png"]);
});

test("encoded space and Unicode keys round-trip canonically with one public_read charge", async () => {
  const first = passiveFixtures[0];
  const firstKey = "folder/a b.png";
  recordFor(firstKey, first.mimeType, first.bytes);
  const firstResponse = await handleMediaDeliveryRequest(
    request("/media/folder/a%20b.png", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1", "user-agent": "agent" },
    })
  );
  expect(firstResponse.status).toBe(200);
  expect(calls.records).toEqual([firstKey]);
  expect(calls.rate[0]).toEqual({
    bucket: "public_read",
    identity: { ip: "203.0.113.10", userAgent: "agent" },
  });

  const secondKey = "folder/żółć.png";
  recordFor(secondKey, first.mimeType, first.bytes);
  const secondResponse = await handleMediaDeliveryRequest(
    request("/media/folder/%C5%BC%C3%B3%C5%82%C4%87.png")
  );
  expect(secondResponse.status).toBe(200);
  expect(calls.records.at(-1)).toBe(secondKey);
  expect(calls.rate).toHaveLength(2);
});

test("rate-limit rejection maps to 429 before key, record, or adapter work", async () => {
  installHarness({
    chargeRateLimit: () => {
      throw new ApiError("rate_limited", "Too many requests", 429);
    },
  });
  const result = await handleMediaDeliveryRequest(request("/media/%ZZ.png"));
  expect(result.status).toBe(429);
  expect(calls.records).toEqual([]);
  expect(calls.resolves).toBe(0);
});

test("internal auth and RBAC complete before row lookup for missing and existing keys", async () => {
  mode = "internal";
  recordFor("existing.png", "image/png", passiveFixtures[0].bytes);

  for (const key of ["existing.png", "missing.png"]) {
    expect((await handleMediaDeliveryRequest(request(`/media/${key}`))).status).toBe(401);
  }
  expect(calls.records).toEqual([]);

  expect(
    (
      await handleMediaDeliveryRequest(
        request("/media/existing.png", { headers: { authorization: "Bearer wrong" } })
      )
    ).status
  ).toBe(403);
  expect(calls.records).toEqual([]);

  permissionAllowed = false;
  expect(
    (
      await handleMediaDeliveryRequest(
        request("/media/existing.png", { headers: { cookie: "session=allowed" } })
      )
    ).status
  ).toBe(403);
  expect(calls.records).toEqual([]);

  permissionAllowed = true;
  expect(
    (
      await handleMediaDeliveryRequest(
        request("/media/existing.png", { headers: { cookie: "session=allowed" } })
      )
    ).status
  ).toBe(200);
  expect(calls.records).toEqual(["existing.png"]);
  expect(calls.permissions).toBe(2);
});

test("internal API key scope streams through the proxy and never asks for provider URL", async () => {
  mode = "internal";
  const fixture = passiveFixtures[0];
  recordFor("allowed.png", fixture.mimeType, fixture.bytes);
  const result = await handleMediaDeliveryRequest(
    request("/media/allowed.png", {
      headers: {
        authorization: "Bearer allowed",
        "x-forwarded-for": "198.51.100.20, 10.0.0.2",
        "user-agent": "internal-agent",
      },
    })
  );
  expect(result.status).toBe(200);
  expect(Buffer.from(await result.arrayBuffer())).toEqual(fixture.bytes);
  expect(calls.publicUrls).toBe(0);
  expect(calls.apiKeys).toBe(1);
  expect(calls.rate).toEqual([
    {
      bucket: "public_read",
      identity: { ip: "198.51.100.20", userAgent: "internal-agent" },
    },
  ]);
});

test("all passive canonical profiles require matching bytes and emit inline safe headers", async () => {
  for (const [index, fixture] of passiveFixtures.entries()) {
    const key = `2026/07/passive-${index}${fixture.extension}`;
    recordFor(key, fixture.mimeType, fixture.bytes);
    const result = await handleMediaDeliveryRequest(request(`/media/${key}`));
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe(fixture.mimeType);
    expect(result.headers.get("content-disposition")?.startsWith("inline;")).toBe(true);
    expect(result.headers.get("content-disposition")).toContain(fixture.extension);
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(result.headers.get("content-length")).toBe(String(fixture.bytes.byteLength));
    expect(Buffer.from(await result.arrayBuffer())).toEqual(fixture.bytes);
  }
  expect(calls.publicUrls).toBe(0);
});

test("canonical active profiles remain attachments based on persisted MIME and key", async () => {
  for (const [index, fixture] of attachmentFixtures.entries()) {
    const key = `2026/07/active-${index}${fixture.extension}`;
    const bytes = index === 1 ? passiveFixtures[0].bytes : fixture.bytes;
    recordFor(key, fixture.mimeType, bytes, `unsafe\r\nname${fixture.extension}.exe`);
    const result = await handleMediaDeliveryRequest(request(`/media/${key}`));
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe(fixture.mimeType);
    expect(result.headers.get("content-disposition")?.startsWith("attachment;")).toBe(true);
    expect(result.headers.get("content-disposition")).toContain(fixture.extension);
    expect(result.headers.get("content-disposition")).not.toContain("\r");
    expect(result.headers.get("content-disposition")).not.toContain("\n");
    expect(Buffer.from(await result.arrayBuffer())).toEqual(bytes);
  }
});

test("legacy MIME/key or passive byte mismatches fall back to octet-stream download.bin", async () => {
  const cases = [
    { key: "legacy/wrong.jpg", mimeType: "image/png", bytes: passiveFixtures[0].bytes },
    { key: "legacy/spoof.png", mimeType: "image/png", bytes: Buffer.from("plain text body") },
    { key: "legacy/page.html", mimeType: "text/html", bytes: Buffer.from("<html>safe download") },
  ];
  for (const entry of cases) {
    recordFor(entry.key, entry.mimeType, entry.bytes, "deceptive.svg.html");
    const result = await handleMediaDeliveryRequest(request(`/media/${entry.key}`));
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("application/octet-stream");
    expect(result.headers.get("content-disposition")).toBe(
      "attachment; filename=\"download.bin\"; filename*=UTF-8''download.bin"
    );
    expect(Buffer.from(await result.arrayBuffer())).toEqual(entry.bytes);
  }
});

test("absent and mismatched records never resolve or read storage", async () => {
  expect((await handleMediaDeliveryRequest(request("/media/missing.png"))).status).toBe(404);
  expect(calls.resolves).toBe(0);
  expect(calls.gets).toEqual([]);

  installHarness({
    findRecord: async (key) => {
      calls.records.push(key);
      return { key: "different.png", mimeType: "image/png", originalName: null, size: 13 };
    },
  });
  expect((await handleMediaDeliveryRequest(request("/media/requested.png"))).status).toBe(404);
  expect(calls.resolves).toBe(0);
  expect(calls.gets).toEqual([]);
});

test("invalid row size and resolver failures map to generic 503", async () => {
  for (const [index, size] of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ].entries()) {
    const key = `invalid-${index}.png`;
    records.set(key, { key, mimeType: "image/png", originalName: null, size });
    expect((await handleMediaDeliveryRequest(request(`/media/${key}`))).status).toBe(503);
  }
  expect(calls.resolves).toBe(0);

  recordFor("resolver.png", "image/png", passiveFixtures[0].bytes);
  installHarness({ resolveAdapter: async () => Promise.reject(new Error("secret resolver")) });
  const result = await handleMediaDeliveryRequest(request("/media/resolver.png"));
  expect(result.status).toBe(503);
  expect(await result.text()).toBe("Service Unavailable");
});

test("missing-shaped failures outside object get/prefix reads remain generic 503", async () => {
  const enoent = () => Object.assign(new Error("missing"), { code: "ENOENT" });

  installHarness({ loadSecuritySettings: async () => Promise.reject(enoent()) });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);

  installHarness({
    loadAccessMode: async () =>
      Promise.reject(Object.assign(new Error("missing"), { $metadata: { httpStatusCode: 404 } })),
  });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);

  mode = "internal";
  installHarness({ attachSession: async () => Promise.reject(new Error("s3_object_missing")) });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);

  installHarness({
    attachSession: async (ctx) => {
      ctx.user = { id: "session-user" };
    },
    requireSessionMediaRead: async () => Promise.reject(enoent()),
  });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);

  mode = "public";
  installHarness({
    findRecord: async () => Promise.reject(Object.assign(new Error("missing"), { status: 404 })),
  });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);

  recordFor("object.png", "image/png", passiveFixtures[0].bytes);
  installHarness({ resolveAdapter: async () => Promise.reject(enoent()) });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);
});

test("local, S3, and Azure missing shapes map to 404 while other get failures map to 503", async () => {
  recordFor("object.png", "image/png", passiveFixtures[0].bytes);
  const missingErrors: unknown[] = [
    Object.assign(new Error("missing"), { code: "ENOENT" }),
    new Error("s3_object_missing"),
    new Error("azure_object_missing"),
    Object.assign(new Error("missing"), { name: "NoSuchKey" }),
    Object.assign(new Error("missing"), { name: "NotFound" }),
    Object.assign(new Error("missing"), { code: "BlobNotFound" }),
    Object.assign(new Error("missing"), { name: "ResourceNotFound" }),
    Object.assign(new Error("missing"), { status: 404 }),
    Object.assign(new Error("missing"), { statusCode: 404 }),
    Object.assign(new Error("missing"), { $metadata: { httpStatusCode: 404 } }),
  ];
  for (const error of missingErrors) {
    adapterGet = async () => Promise.reject(error);
    expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(404);
  }

  adapterGet = async () => Promise.reject(new Error("provider secret"));
  const unavailable = await handleMediaDeliveryRequest(request("/media/object.png"));
  expect(unavailable.status).toBe(503);
  expect(await unavailable.text()).toBe("Service Unavailable");
});

test("prefix-time stream errors map missing to 404 and unavailable to 503", async () => {
  recordFor("stream.png", "image/png", passiveFixtures[0].bytes);
  let tracked = trackedStream([], {
    tailError: Object.assign(new Error("missing"), { code: "ENOENT" }),
  });
  streamFactory = () => tracked.stream;
  expect((await handleMediaDeliveryRequest(request("/media/stream.png"))).status).toBe(404);
  expect(tracked.tracker.closeCount).toBe(1);

  tracked = trackedStream([], { tailError: new Error("credential=secret") });
  streamFactory = () => tracked.stream;
  const unavailable = await handleMediaDeliveryRequest(request("/media/stream.png"));
  expect(unavailable.status).toBe(503);
  expect(await unavailable.text()).not.toContain("secret");
  expect(tracked.tracker.closeCount).toBe(1);
});

test("one-byte chunks and an oversized first chunk replay without loss", async () => {
  const bytes = Buffer.from("RIFF1234WEBP!exact-replay");
  recordFor("one.webp", "image/webp", bytes);
  let tracked = trackedStream(Array.from(bytes, (byte) => Buffer.from([byte])));
  streamFactory = () => tracked.stream;
  let result = await handleMediaDeliveryRequest(request("/media/one.webp"));
  expect(Buffer.from(await result.arrayBuffer())).toEqual(bytes);
  expect(tracked.tracker.closeCount).toBe(1);

  recordFor("chunk.webp", "image/webp", bytes);
  tracked = trackedStream([bytes]);
  streamFactory = () => tracked.stream;
  result = await handleMediaDeliveryRequest(request("/media/chunk.webp"));
  expect(Buffer.from(await result.arrayBuffer())).toEqual(bytes);
  expect(tracked.tracker.closeCount).toBe(1);
});

test("signature-only EOF never promotes a truncated passive image", async () => {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  recordFor("truncated.png", "image/png", signature);
  const result = await handleMediaDeliveryRequest(request("/media/truncated.png"));
  expect(result.status).toBe(200);
  expect(result.headers.get("content-type")).toBe("application/octet-stream");
  expect(result.headers.get("content-disposition")).toContain(".bin");
  expect(Buffer.from(await result.arrayBuffer())).toEqual(signature);
});

test("pre-header short and excess objects fail with 503", async () => {
  records.set("short.png", {
    key: "short.png",
    mimeType: "image/png",
    originalName: null,
    size: 10,
  });
  bodies.set("short.png", Buffer.from("short"));
  expect((await handleMediaDeliveryRequest(request("/media/short.png"))).status).toBe(503);

  records.set("excess.png", {
    key: "excess.png",
    mimeType: "image/png",
    originalName: null,
    size: 2,
  });
  bodies.set("excess.png", Buffer.from("excess"));
  expect((await handleMediaDeliveryRequest(request("/media/excess.png"))).status).toBe(503);
});

test("tail short, excess, and provider errors reject only with generic stream failure", async () => {
  const first = Buffer.from("RIFF1234WEBP!");
  const cases: Array<{
    key: string;
    size: number;
    source: ReturnType<typeof trackedStream>;
  }> = [
    { key: "short.webp", size: first.byteLength + 5, source: trackedStream([first]) },
    {
      key: "excess.webp",
      size: first.byteLength + 1,
      source: trackedStream([first, Buffer.from("xx")]),
    },
    {
      key: "error.webp",
      size: first.byteLength + 1,
      source: trackedStream([first], { tailError: new Error("provider credential secret") }),
    },
  ];

  for (const entry of cases) {
    records.set(entry.key, {
      key: entry.key,
      mimeType: "image/webp",
      originalName: null,
      size: entry.size,
    });
    streamFactory = () => entry.source.stream;
    const result = await handleMediaDeliveryRequest(request(`/media/${entry.key}`));
    expect(result.status).toBe(200);
    let caught: unknown;
    try {
      await result.arrayBuffer();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe("media_stream_failed");
    expect((caught as Error).message).not.toContain("secret");
    expect((caught as Error & { cause?: unknown }).cause).toBeUndefined();
    expect(entry.source.tracker.closeCount).toBe(1);
  }
});

test("resolved poison tail chunks reject generically without coercing provider data", async () => {
  const first = Buffer.from("RIFF1234WEBP!");
  records.set("poison.webp", {
    key: "poison.webp",
    mimeType: "image/webp",
    originalName: null,
    size: first.byteLength + 1,
  });
  const poisoned = poisonTailStream(first);
  streamFactory = () => poisoned.stream;
  const result = await handleMediaDeliveryRequest(request("/media/poison.webp"));
  expect(result.status).toBe(200);
  let caught: unknown;
  try {
    await result.arrayBuffer();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toBe("media_stream_failed");
  expect((caught as Error).message).not.toContain("SECRET");
  expect((caught as Error & { cause?: unknown }).cause).toBeUndefined();
  expect(poisoned.tracker.closeCount).toBe(1);
});

test("GET and HEAD share headers while HEAD is bodyless and closes the source", async () => {
  const bytes = Buffer.from("RIFF1234WEBP!head-parity");
  recordFor("head.webp", "image/webp", bytes);
  let tracked = trackedStream([bytes]);
  streamFactory = () => tracked.stream;
  const get = await handleMediaDeliveryRequest(request("/media/head.webp"));
  await get.arrayBuffer();

  tracked = trackedStream([bytes.subarray(0, 13)], { keepOpen: true });
  streamFactory = () => tracked.stream;
  const head = await handleMediaDeliveryRequest(request("/media/head.webp", { method: "HEAD" }));
  expect(head.status).toBe(200);
  for (const name of [
    "content-type",
    "content-disposition",
    "content-length",
    "x-content-type-options",
  ]) {
    expect(head.headers.get(name)).toBe(get.headers.get(name));
  }
  expect(await head.text()).toBe("");
  expect(tracked.tracker.closeCount).toBe(1);
});

test("Web-stream cancellation closes the source once without a synthetic body error", async () => {
  const first = Buffer.from("RIFF1234WEBP!");
  records.set("cancel.webp", {
    key: "cancel.webp",
    mimeType: "image/webp",
    originalName: null,
    size: first.byteLength + 100,
  });
  const tracked = trackedStream([first], { keepOpen: true });
  streamFactory = () => tracked.stream;
  const result = await handleMediaDeliveryRequest(request("/media/cancel.webp"));
  const reader = result.body?.getReader();
  expect(reader).toBeDefined();
  let received = 0;
  while (received < first.byteLength) {
    const chunk = await reader!.read();
    expect(chunk.done).toBe(false);
    received += chunk.value?.byteLength ?? 0;
  }
  const pendingRead = reader!.read();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await expect(reader!.cancel("done")).resolves.toBeUndefined();
  await expect(pendingRead).resolves.toMatchObject({ done: true });
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  expect(tracked.tracker.closeCount).toBe(1);
});
