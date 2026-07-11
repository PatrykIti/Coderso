import { Readable } from "node:stream";

import type { AuthContext } from "./middleware/auth";
import { ApiError } from "./errorHandler";
import { checkRateLimit } from "./middleware/rateLimit";
import { evaluateMediaAccess, type MediaDeliveryAccessMode } from "../services/media/mediaAccess";
import {
  CANONICAL_MEDIA_PROFILES,
  buildMediaDeliveryPath,
  canonicalizeMediaBytes,
  classifyCanonicalMediaPrefix,
  isPassiveCanonicalMediaMime,
  safeMediaDisposition,
  type CanonicalMediaIdentity,
  type CanonicalMediaMime,
} from "../services/media/mediaFileTrust";
import type { MediaDeliveryRecord } from "../services/media/mediaService";
import type { MediaStorageAdapter } from "../services/media/storage/adapter";
import type { SecuritySettings } from "../services/settings/securitySettings";

const MEDIA_PREFIX = "/media";
const MEDIA_DELIVERY_PREFIX_BYTES = 12;
const ALLOWED_METHODS = new Set(["GET", "HEAD"]);
const MISSING_ERROR_VALUES = new Set([
  "ENOENT",
  "NoSuchKey",
  "NotFound",
  "BlobNotFound",
  "ResourceNotFound",
  "s3_object_missing",
  "azure_object_missing",
]);

type DestroyableAsyncReadable = NodeJS.ReadableStream &
  AsyncIterable<Buffer | Uint8Array | string> & {
    destroyed: boolean;
    destroy: (error?: Error) => unknown;
  };

type MediaDeliveryDecision = {
  contentType: string;
  disposition: string;
  inline: boolean;
};

type InspectedMediaStream = {
  passiveIdentity: CanonicalMediaIdentity | null;
  replayStream: Readable;
  destroy: () => Promise<void>;
};

export type MediaDeliveryDeps = {
  loadSecuritySettings: () => Promise<SecuritySettings>;
  chargeRateLimit: typeof checkRateLimit;
  loadAccessMode: () => Promise<MediaDeliveryAccessMode>;
  attachSession: (ctx: AuthContext) => Promise<void>;
  authenticateApiKeyScopes: (authorization: string | null) => Promise<string[] | null>;
  requireSessionMediaRead: (user: { id: string }) => Promise<void>;
  findRecord: (key: string) => Promise<MediaDeliveryRecord | null>;
  resolveAdapter: () => Promise<MediaStorageAdapter>;
};

type MediaDeliveryErrorKind = "key_invalid" | "storage_unavailable";

class MediaDeliveryError extends Error {
  constructor(readonly kind: MediaDeliveryErrorKind) {
    super(kind);
    this.name = "MediaDeliveryError";
  }
}

const defaultMediaDeliveryDeps: MediaDeliveryDeps = {
  async loadSecuritySettings() {
    const { getSecuritySettings } = await import("../services/settings/securitySettings");
    return getSecuritySettings();
  },
  chargeRateLimit: checkRateLimit,
  async loadAccessMode() {
    const { getStorageSettingsInternal } = await import("../services/settings/storageSettings");
    return (await getStorageSettingsInternal()).delivery.accessMode;
  },
  async attachSession(ctx) {
    const { attachUserFromSession } = await import("./middleware/auth");
    await attachUserFromSession(ctx);
  },
  async authenticateApiKeyScopes(authorization) {
    const { authenticateApiKey } = await import("../services/security/apiKeyAuth");
    return (await authenticateApiKey(authorization))?.scopes ?? null;
  },
  async requireSessionMediaRead(user) {
    const { requirePermission } = await import("./middleware/rbac");
    await requirePermission("media:read")({ user });
  },
  async findRecord(key) {
    const { getMediaDeliveryRecordByKey } = await import("../services/media/mediaService");
    return getMediaDeliveryRecordByKey(key);
  },
  async resolveAdapter() {
    const { getMediaStorageAdapter } = await import("../services/media/storage");
    return getMediaStorageAdapter();
  },
};

let mediaDeliveryTestDeps: Partial<MediaDeliveryDeps> | null = null;

const getMediaDeliveryDeps = (): MediaDeliveryDeps => ({
  ...defaultMediaDeliveryDeps,
  ...(process.env.NODE_ENV === "production" ? {} : (mediaDeliveryTestDeps ?? {})),
});

export function __setMediaDeliveryDepsForTests(overrides: Partial<MediaDeliveryDeps> | null): void {
  if (process.env.NODE_ENV === "production" && overrides !== null) {
    throw new Error("media_delivery_test_override_forbidden_in_production");
  }
  mediaDeliveryTestDeps = overrides === null ? null : { ...overrides };
}

function response(status: number, body: string, headers?: HeadersInit): Response {
  return new Response(body, { status, headers });
}

function resolveIp(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

function parseCookies(header: string | null): Record<string, string | undefined> {
  if (!header) return {};
  const cookies: Record<string, string | undefined> = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    const rawValue = part.slice(index + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }
  return cookies;
}

function parseCanonicalMediaKey(pathname: string): string {
  if (!pathname.startsWith(`${MEDIA_PREFIX}/`)) {
    throw new MediaDeliveryError("key_invalid");
  }
  const encodedKey = pathname.slice(MEDIA_PREFIX.length + 1);
  if (!encodedKey) throw new MediaDeliveryError("key_invalid");

  let key: string;
  try {
    key = decodeURIComponent(encodedKey);
  } catch {
    throw new MediaDeliveryError("key_invalid");
  }

  try {
    if (buildMediaDeliveryPath(key) !== pathname) {
      throw new MediaDeliveryError("key_invalid");
    }
  } catch (error) {
    if (error instanceof MediaDeliveryError) throw error;
    throw new MediaDeliveryError("key_invalid");
  }
  return key;
}

function ownValue(input: unknown, key: string): unknown {
  if (typeof input !== "object" || input === null || !Object.hasOwn(input, key)) {
    return undefined;
  }
  return (input as Record<string, unknown>)[key];
}

function ownString(input: unknown, key: string): string | null {
  const value = ownValue(input, key);
  return typeof value === "string" ? value : null;
}

function ownFiniteNumber(input: unknown, key: string): number | null {
  const value = ownValue(input, key);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function classifyMediaReadError(error: unknown): "missing" | "unavailable" {
  const candidates = [
    ownString(error, "code"),
    ownString(error, "name"),
    ownString(error, "message"),
  ];
  if (candidates.some((value) => value !== null && MISSING_ERROR_VALUES.has(value))) {
    return "missing";
  }

  if (ownFiniteNumber(error, "status") === 404 || ownFiniteNumber(error, "statusCode") === 404) {
    return "missing";
  }
  const metadata = ownValue(error, "$metadata");
  if (ownFiniteNumber(metadata, "httpStatusCode") === 404) {
    return "missing";
  }
  return "unavailable";
}

function isDestroyableAsyncReadable(
  value: NodeJS.ReadableStream
): value is DestroyableAsyncReadable {
  const candidate = value as Partial<DestroyableAsyncReadable>;
  return (
    typeof candidate[Symbol.asyncIterator] === "function" &&
    typeof candidate.destroy === "function" &&
    typeof candidate.destroyed === "boolean"
  );
}

function toBuffer(chunk: unknown): Buffer {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (chunk instanceof Uint8Array || typeof chunk === "string") {
    return Buffer.from(chunk);
  }
  throw new Error("media_stream_failed");
}

async function inspectMediaStreamPrefix(
  input: NodeJS.ReadableStream,
  expectedSize: number
): Promise<InspectedMediaStream> {
  if (!isDestroyableAsyncReadable(input)) {
    throw new MediaDeliveryError("storage_unavailable");
  }

  const source = input;
  const iterator = source[Symbol.asyncIterator]();
  let closed = false;
  const closeOnce = async () => {
    if (closed) return;
    closed = true;
    if (!source.destroyed) source.destroy();
    await Promise.resolve();
  };

  const readNextPrefixChunk = async (): Promise<Buffer | null> => {
    while (true) {
      const next = await iterator.next();
      if (next.done) return null;
      const chunk = toBuffer(next.value);
      if (chunk.byteLength > 0) return chunk;
    }
  };

  const prefixChunks: Buffer[] = [];
  const retainedChunks: Buffer[] = [];
  let prefixSize = 0;
  let observedSize = 0;
  let ended = false;

  try {
    while (prefixSize < MEDIA_DELIVERY_PREFIX_BYTES) {
      const chunk = await readNextPrefixChunk();
      if (chunk === null) {
        ended = true;
        break;
      }
      observedSize += chunk.byteLength;
      if (observedSize > expectedSize) {
        throw new MediaDeliveryError("storage_unavailable");
      }
      const remaining = MEDIA_DELIVERY_PREFIX_BYTES - prefixSize;
      const prefixPart = chunk.subarray(0, remaining);
      prefixChunks.push(prefixPart);
      prefixSize += prefixPart.byteLength;
      if (chunk.byteLength > prefixPart.byteLength) {
        retainedChunks.push(chunk.subarray(prefixPart.byteLength));
        break;
      }
    }

    if (prefixSize === MEDIA_DELIVERY_PREFIX_BYTES && retainedChunks.length === 0 && !ended) {
      const lookahead = await readNextPrefixChunk();
      if (lookahead === null) {
        ended = true;
      } else {
        observedSize += lookahead.byteLength;
        if (observedSize > expectedSize) {
          throw new MediaDeliveryError("storage_unavailable");
        }
        retainedChunks.push(lookahead);
      }
    }

    if (ended && observedSize !== expectedSize) {
      throw new MediaDeliveryError("storage_unavailable");
    }
  } catch (error) {
    await closeOnce();
    throw error;
  }

  const prefix = Buffer.concat(prefixChunks, prefixSize);
  const completeIdentity = ended ? canonicalizeMediaBytes(prefix) : null;
  const passiveIdentity = ended
    ? completeIdentity && isPassiveCanonicalMediaMime(completeIdentity.mimeType)
      ? completeIdentity
      : null
    : classifyCanonicalMediaPrefix(prefix);

  let replayStream: Readable;
  const replay = async function* () {
    let emittedSize = 0;
    const emit = (chunk: Buffer) => {
      if (emittedSize + chunk.byteLength > expectedSize) {
        throw new Error("media_stream_failed");
      }
      emittedSize += chunk.byteLength;
      return chunk;
    };

    try {
      if (prefix.byteLength > 0) yield emit(prefix);
      for (const chunk of retainedChunks) {
        if (chunk.byteLength > 0) yield emit(chunk);
      }

      if (!ended) {
        while (true) {
          let next: IteratorResult<Buffer | Uint8Array | string>;
          let chunk: Buffer;
          try {
            next = await iterator.next();
            if (next.done) break;
            chunk = toBuffer(next.value);
          } catch {
            throw new Error("media_stream_failed");
          }
          if (chunk.byteLength > 0) yield emit(chunk);
        }
      }

      if (emittedSize !== expectedSize) {
        throw new Error("media_stream_failed");
      }
    } finally {
      await closeOnce();
    }
  };

  replayStream = Readable.from(replay());
  const destroyReplay = replayStream.destroy.bind(replayStream);
  replayStream.destroy = ((error?: Error) => {
    void closeOnce();
    return destroyReplay(error);
  }) as typeof replayStream.destroy;
  replayStream.once("close", () => {
    void closeOnce();
  });

  return {
    passiveIdentity,
    replayStream,
    async destroy() {
      await closeOnce();
      if (!replayStream.destroyed) replayStream.destroy();
    },
  };
}

function resolveMediaDelivery(
  row: MediaDeliveryRecord,
  passiveIdentity: CanonicalMediaIdentity | null
): MediaDeliveryDecision {
  const mimeType = row.mimeType;
  if (Object.hasOwn(CANONICAL_MEDIA_PROFILES, mimeType)) {
    const canonicalMime = mimeType as CanonicalMediaMime;
    const profile = CANONICAL_MEDIA_PROFILES[canonicalMime];
    const extensionMatches = row.key.endsWith(profile.extension);
    if (
      profile.delivery === "inline" &&
      extensionMatches &&
      passiveIdentity?.mimeType === canonicalMime
    ) {
      return {
        contentType: canonicalMime,
        disposition: safeMediaDisposition("inline", row.originalName, profile.extension),
        inline: true,
      };
    }
    if (profile.delivery === "attachment" && extensionMatches) {
      return {
        contentType: canonicalMime,
        disposition: safeMediaDisposition("attachment", row.originalName, profile.extension),
        inline: false,
      };
    }
  }

  return {
    contentType: "application/octet-stream",
    disposition: safeMediaDisposition("attachment", null, ".bin"),
    inline: false,
  };
}

function mapStorageReadError(error: unknown): Response {
  if (classifyMediaReadError(error) === "missing") {
    return response(404, "Not Found");
  }
  return response(503, "Service Unavailable");
}

function mapBoundaryError(error: unknown): Response {
  if (error instanceof MediaDeliveryError && error.kind === "key_invalid") {
    return response(400, "Bad Request");
  }
  if (error instanceof ApiError && error.status === 429) {
    return response(429, "Too Many Requests");
  }
  return response(503, "Service Unavailable");
}

export async function handleMediaDeliveryRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith(`${MEDIA_PREFIX}/`) || url.pathname === `${MEDIA_PREFIX}/`) {
    return response(404, "Not Found");
  }

  const method = req.method.toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return response(405, "Method Not Allowed", { Allow: "GET, HEAD" });
  }

  const deps = getMediaDeliveryDeps();
  try {
    const security = await deps.loadSecuritySettings();
    deps.chargeRateLimit(
      "public_read",
      {
        ip: resolveIp(req),
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
      security.rateLimit
    );

    const key = parseCanonicalMediaKey(url.pathname);
    const mode = await deps.loadAccessMode();
    if (mode === "internal") {
      const headers: Record<string, string | undefined> = {};
      req.headers.forEach((value, name) => {
        headers[name] = value;
      });
      const authContext: AuthContext = {
        headers,
        cookies: parseCookies(req.headers.get("cookie")),
      };
      await deps.attachSession(authContext);
      const apiKeyScopes = authContext.user
        ? null
        : await deps.authenticateApiKeyScopes(req.headers.get("authorization"));
      const access = evaluateMediaAccess({
        mode,
        isAuthenticated: Boolean(authContext.user),
        apiKeyScopes,
      });
      if (!access.allow) {
        return access.reason === "forbidden"
          ? response(403, "Forbidden")
          : response(401, "Unauthorized");
      }
      if (authContext.user) {
        try {
          await deps.requireSessionMediaRead(authContext.user);
        } catch (error) {
          if (
            error instanceof Error &&
            (error.message === "forbidden" || error.message === "auth_required")
          ) {
            return response(403, "Forbidden");
          }
          throw error;
        }
      }
    }

    const row = await deps.findRecord(key);
    if (row === null || row.key !== key) return response(404, "Not Found");
    if (!Number.isSafeInteger(row.size) || row.size < 0) {
      throw new MediaDeliveryError("storage_unavailable");
    }

    const adapter = await deps.resolveAdapter();
    let source: NodeJS.ReadableStream;
    try {
      source = await adapter.get(key);
    } catch (error) {
      return mapStorageReadError(error);
    }
    let inspected: InspectedMediaStream;
    try {
      inspected = await inspectMediaStreamPrefix(source, row.size);
    } catch (error) {
      return mapStorageReadError(error);
    }
    try {
      const decision = resolveMediaDelivery(row, inspected.passiveIdentity);
      const responseHeaders = {
        "Content-Type": decision.contentType,
        "Content-Disposition": decision.disposition,
        "X-Content-Type-Options": "nosniff",
      };
      if (method === "HEAD") {
        await inspected.destroy();
        return new Response(null, {
          headers: { ...responseHeaders, "Content-Length": String(row.size) },
        });
      }
      const webBody = Readable.toWeb(inspected.replayStream) as unknown as BodyInit;
      return new Response(webBody, { headers: responseHeaders });
    } catch (error) {
      await inspected.destroy();
      throw error;
    }
  } catch (error) {
    return mapBoundaryError(error);
  }
}
