// Shared support for the media delivery access contract suites.
//
// Each split suite owns its bindings by calling createMediaDeliveryHarness()
// once at module scope. The harness creates fresh mutable state, registers the
// beforeEach/afterEach/afterAll hooks against bun:test, binds installHarness to
// that state, and hands back the __setMediaDeliveryDepsForTests singleton seam.
// Every extracted file therefore stays independently runnable in its lane.
import { afterAll, afterEach, beforeEach, expect } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import type { S3Client } from "@aws-sdk/client-s3";
import type { BlobServiceClient } from "@azure/storage-blob";

import {
  __setMediaDeliveryDepsForTests,
  type MediaDeliveryDeps,
} from "../../../core/server/mediaDelivery";
import type { AuthContext } from "../../../core/server/middleware/auth";
import type { MediaDeliveryRecord } from "../../../core/services/media/mediaService";
import type { MediaStorageAdapter } from "../../../core/services/media/storage/adapter";
import { createAzureAdapter } from "../../../core/services/media/storage/azure";
import { createLocalAdapter } from "../../../core/services/media/storage/local";
import { createS3Adapter } from "../../../core/services/media/storage/s3";
import type { SecuritySettings } from "../../../core/services/settings/securitySettings";

const baseUrl = "http://coderso.test";

export const passiveFixtures = [
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

export const attachmentFixtures = [
  { mimeType: "application/pdf", extension: ".pdf", bytes: Buffer.from("%PDF-1.4\n%%EOF") },
  { mimeType: "image/svg+xml", extension: ".svg", bytes: Buffer.from("not-svg-but-attached") },
  { mimeType: "text/plain", extension: ".txt", bytes: Buffer.from("plain attachment") },
  {
    mimeType: "application/octet-stream",
    extension: ".bin",
    bytes: Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  },
] as const;

export const securitySettings: SecuritySettings = {
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
  loginAlerts: {
    enabled: false,
    notifyOnNewDevice: false,
    notifyOnNewLocation: false,
    recipients: [],
    webhookUrl: null,
    webhookSecret: null,
    deliveryError: null,
  },
  botProtection: {
    enabled: false,
    provider: "recaptcha_v3",
    siteKey: null,
    secretKey: null,
    thresholds: { login: 0.5, reset: 0.5, publicWrite: 0.5 },
    enforceOnLocalhost: false,
  },
};

export type StreamTracker = { closeCount: number };

export type HarnessCalls = {
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

export type MediaDeliveryHarnessState = {
  records: Map<string, MediaDeliveryRecord>;
  bodies: Map<string, Buffer>;
  mode: "public" | "internal";
  permissionAllowed: boolean;
  calls: HarnessCalls;
  streamFactory: (key: string) => NodeJS.ReadableStream;
  adapterGet: (key: string) => Promise<NodeJS.ReadableStream>;
};

export function trackedStream(
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

export function poisonTailStream(first: Buffer): { stream: Readable; tracker: StreamTracker } {
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

export function request(path: string, init?: RequestInit): Request {
  return new Request(`${baseUrl}${path}`, init);
}

export type RealDeliveryAdapterFixture = {
  adapter: MediaStorageAdapter;
  key: string;
  readCount: () => number;
  cleanup: () => Promise<void>;
};

export async function createRealDeliveryAdapterFixture(
  provider: "local" | "s3" | "azure",
  bytes: Buffer
): Promise<RealDeliveryAdapterFixture> {
  const key = `2026/07/${provider}-composition.png`;

  if (provider === "local") {
    const directory = await mkdtemp(join(tmpdir(), "coderso-media-delivery-"));
    const target = join(directory, key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    const adapter = createLocalAdapter({
      dir: directory,
      baseUrl: "https://local-provider.invalid/media",
    });
    const realGet = adapter.get.bind(adapter);
    let reads = 0;
    adapter.get = async (requestedKey) => {
      reads += 1;
      return realGet(requestedKey);
    };
    return {
      adapter,
      key,
      readCount: () => reads,
      cleanup: () => rm(directory, { recursive: true, force: true }),
    };
  }

  if (provider === "s3") {
    let reads = 0;
    const client = {
      async send(command: { input?: { Bucket?: string; Key?: string } }) {
        expect(command.input).toMatchObject({
          Bucket: "delivery-bucket",
          Key: key,
        });
        reads += 1;
        return { Body: Readable.from([Buffer.from(bytes)]) };
      },
    } as unknown as S3Client;
    return {
      adapter: createS3Adapter({
        bucket: "delivery-bucket",
        region: "test-region-1",
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
        endpoint: "https://s3-provider.invalid",
        baseUrl: "https://s3-provider.invalid/delivery-bucket",
        client,
      }),
      key,
      readCount: () => reads,
      cleanup: () => Promise.resolve(),
    };
  }

  let reads = 0;
  const serviceClient = {
    getContainerClient(container: string) {
      expect(container).toBe("delivery-container");
      return {
        getBlobClient(requestedKey: string) {
          expect(requestedKey).toBe(key);
          return {
            async download() {
              reads += 1;
              return { readableStreamBody: Readable.from([Buffer.from(bytes)]) };
            },
          };
        },
      };
    },
  } as unknown as BlobServiceClient;
  return {
    adapter: createAzureAdapter({
      account: "deliveryaccount",
      container: "delivery-container",
      connectionString: "AccountName=deliveryaccount;AccountKey=test-key",
      baseUrl: "https://azure-provider.invalid/delivery-container",
      serviceClient,
    }),
    key,
    readCount: () => reads,
    cleanup: () => Promise.resolve(),
  };
}

export type MediaDeliveryHarness = {
  state: MediaDeliveryHarnessState;
  recordFor: (
    key: string,
    mimeType: string,
    bytes: Buffer,
    originalName?: string
  ) => MediaDeliveryRecord;
  installHarness: (overrides?: Partial<MediaDeliveryDeps>) => void;
  beforeEach: typeof beforeEach;
  afterEach: typeof afterEach;
  afterAll: typeof afterAll;
  setMediaDeliveryDepsForTests: typeof __setMediaDeliveryDepsForTests;
};

export function createMediaDeliveryHarness(): MediaDeliveryHarness {
  const state: MediaDeliveryHarnessState = {
    records: new Map<string, MediaDeliveryRecord>(),
    bodies: new Map<string, Buffer>(),
    mode: "public",
    permissionAllowed: true,
    calls: {
      rate: [],
      records: [],
      resolves: 0,
      gets: [],
      publicUrls: 0,
      sessions: 0,
      apiKeys: 0,
      permissions: 0,
    },
    streamFactory: () => trackedStream([Buffer.alloc(0)]).stream,
    adapterGet: async () => trackedStream([Buffer.alloc(0)]).stream,
  };

  function recordFor(
    key: string,
    mimeType: string,
    bytes: Buffer,
    originalName = 'folder/unsafe"name.exe'
  ): MediaDeliveryRecord {
    const record = { key, mimeType, originalName, size: bytes.byteLength };
    state.records.set(key, record);
    state.bodies.set(key, bytes);
    return record;
  }

  function installHarness(overrides: Partial<MediaDeliveryDeps> = {}): void {
    const adapter: MediaStorageAdapter = {
      async put() {
        throw new Error("generic_put_forbidden");
      },
      async putMedia() {
        throw new Error("media_put_forbidden");
      },
      async putAt() {
        throw new Error("media_put_forbidden");
      },
      async get(key) {
        state.calls.gets.push(key);
        return state.adapterGet(key);
      },
      async delete() {
        throw new Error("delete_forbidden");
      },
      getPublicUrl() {
        state.calls.publicUrls += 1;
        throw new Error("provider_url_forbidden");
      },
    };

    __setMediaDeliveryDepsForTests({
      loadSecuritySettings: async () => securitySettings,
      chargeRateLimit: (bucket, identity) => {
        state.calls.rate.push({ bucket, identity });
      },
      loadAccessMode: async () => state.mode,
      attachSession: async (ctx: AuthContext) => {
        state.calls.sessions += 1;
        if (ctx.cookies?.session === "allowed") ctx.user = { id: "session-user" };
      },
      authenticateApiKeyScopes: async (authorization) => {
        state.calls.apiKeys += 1;
        if (authorization === "Bearer allowed") return ["media.read"];
        if (authorization === "Bearer wrong") return ["forms.submit"];
        return null;
      },
      requireSessionMediaRead: async () => {
        state.calls.permissions += 1;
        if (!state.permissionAllowed) throw new Error("forbidden");
      },
      findRecord: async (key) => {
        state.calls.records.push(key);
        return state.records.get(key) ?? null;
      },
      resolveAdapter: async () => {
        state.calls.resolves += 1;
        return adapter;
      },
      ...overrides,
    });
  }

  beforeEach(() => {
    state.records.clear();
    state.bodies.clear();
    state.mode = "public";
    state.permissionAllowed = true;
    state.calls = {
      rate: [],
      records: [],
      resolves: 0,
      gets: [],
      publicUrls: 0,
      sessions: 0,
      apiKeys: 0,
      permissions: 0,
    };
    state.streamFactory = (key) => trackedStream([state.bodies.get(key) ?? Buffer.alloc(0)]).stream;
    state.adapterGet = async (key) => state.streamFactory(key);
    installHarness();
  });

  afterEach(() => {
    __setMediaDeliveryDepsForTests(null);
  });

  afterAll(() => {
    __setMediaDeliveryDepsForTests(null);
  });

  return {
    state,
    recordFor,
    installHarness,
    beforeEach,
    afterEach,
    afterAll,
    setMediaDeliveryDepsForTests: __setMediaDeliveryDepsForTests,
  };
}
