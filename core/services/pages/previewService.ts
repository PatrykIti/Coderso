import { createHash, randomUUID } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "../../db/client";
import { previewTokens } from "../../db/schema";

export type PreviewTargetType = "page" | "content" | "page-template" | "detail-page";

export type PreviewTokenContext = null | {
  kind: "detail-page";
  sampleEntryId: string;
};

export type ValidPreviewToken = {
  id: string;
  targetType: PreviewTargetType;
  targetId: string;
  tokenHash: string;
  context: PreviewTokenContext;
  expiresAt: Date;
  createdAt: Date;
};

export type PreviewTokenValidationResult =
  | {
      status: "valid";
      token: ValidPreviewToken;
    }
  | {
      status: "missing";
    }
  | {
      status: "expired";
    };

export type CreatePreviewInput = {
  targetType: PreviewTargetType;
  targetId: string;
  ttlMinutes?: number;
  context?: PreviewTokenContext;
};

export type PreviewProbeFailureReason =
  | "unreachable"
  | "http_error"
  | "redirect_blocked"
  | "timeout"
  | "invalid_target";

export type PreviewProbeResult =
  | {
      ok: true;
      status: number;
      targetLabel: string;
    }
  | {
      ok: false;
      status?: number;
      reason: PreviewProbeFailureReason;
      targetLabel: string;
    };

type PreviewProbeFetch = (input: string, init?: RequestInit) => Promise<Response>;

type PreviewProbeOptions = {
  allowedOrigins?: string[];
  fetchImpl?: PreviewProbeFetch;
  timeoutMs?: number;
  maxRedirects?: number;
};

const DEFAULT_PREVIEW_PROBE_TIMEOUT_MS = 1500;
const DEFAULT_PREVIEW_PROBE_REDIRECTS = 3;
const HTTP_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function hashPreviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeUuid = (value: unknown) => {
  if (typeof value !== "string") throw new Error("preview_token_context_invalid");
  const normalized = value.trim().toLowerCase();
  if (!uuidPattern.test(normalized)) throw new Error("preview_token_context_invalid");
  return normalized;
};

// Stale stored "widget-template" tokens intentionally fail closed here after
// the widget-template preview surface retirement (preview_token_invalid).
const normalizeStoredTargetType = (value: unknown): PreviewTargetType => {
  if (value === "page") return "page";
  if (value === "content") return "content";
  if (value === "page-template") return "page-template";
  if (value === "detail-page") return "detail-page";
  throw new Error("preview_token_invalid");
};

const normalizePreviewTokenContext = (
  targetType: PreviewTargetType,
  value: unknown
): PreviewTokenContext => {
  if (value === undefined || value === null) {
    if (targetType === "detail-page") {
      throw new Error("preview_token_context_invalid");
    }
    return null;
  }

  if (!isRecord(value)) throw new Error("preview_token_context_invalid");

  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("kind") || !keys.includes("sampleEntryId")) {
    throw new Error("preview_token_context_invalid");
  }

  if (targetType !== "detail-page" || value.kind !== "detail-page") {
    throw new Error("preview_token_context_invalid");
  }

  return {
    kind: "detail-page",
    sampleEntryId: normalizeUuid(value.sampleEntryId),
  };
};

const isHttpProtocol = (protocol: string) => protocol === "http:" || protocol === "https:";

const resolveProbeUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return isHttpProtocol(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeAllowedOrigins = (previewUrl: URL, allowedOrigins: string[] | undefined) => {
  const origins = new Set([previewUrl.origin]);
  for (const value of allowedOrigins ?? []) {
    const parsed = resolveProbeUrl(value);
    if (parsed) origins.add(parsed.origin);
  }
  return origins;
};

const isAllowedProbeUrl = (url: URL, allowedOrigins: Set<string>) =>
  isHttpProtocol(url.protocol) && allowedOrigins.has(url.origin);

export function redactPreviewProbeTargetLabel(value: string) {
  try {
    const parsed = new URL(value);
    if (isHttpProtocol(parsed.protocol)) {
      return `${parsed.origin}${parsed.pathname || "/"}`;
    }
    parsed.searchParams.delete("token");
    parsed.searchParams.delete("device");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return value
      .replace(/([?&]token=)[^&]+/gi, "$1<redacted>")
      .replace(/([?&]device=)[^&]+/gi, "$1<redacted>");
  }
}

const cancelResponseBody = (response: Response) => {
  void response.body?.cancel().catch(() => undefined);
};

const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

// RFC 6761 reserves `localhost` and `*.localhost` for the loopback interface.
// Browsers resolve these names themselves, but server-side resolvers in some
// environments miss the name entirely or return `::1` first while the HTTP
// server only listens on IPv4 — so a direct probe fetch throws even though the
// admin browser can load the same URL. The probe stays environment-robust by
// retrying a failed loopback-name connection once against `127.0.0.1` with the
// original Host header preserved (host-based routing still applies). Target
// labels, allowed-origin checks, and token semantics are unchanged.
const isLoopbackName = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized.endsWith(".localhost");
};

const buildLoopbackFallbackProbeUrl = (url: URL) => {
  if (!isLoopbackName(url.hostname)) return null;
  const fallback = new URL(url.toString());
  fallback.hostname = "127.0.0.1";
  return fallback;
};

const fetchPreviewProbe = async (
  fetchImpl: PreviewProbeFetch,
  url: URL,
  method: "HEAD" | "GET",
  timeoutMs: number
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const baseHeaders: Record<string, string> | undefined =
    method === "GET" ? { Range: "bytes=0-0" } : undefined;
  try {
    try {
      return await fetchImpl(url.toString(), {
        method,
        redirect: "manual",
        signal: controller.signal,
        headers: baseHeaders,
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      const fallbackUrl = buildLoopbackFallbackProbeUrl(url);
      if (!fallbackUrl) throw error;
      return await fetchImpl(fallbackUrl.toString(), {
        method,
        redirect: "manual",
        signal: controller.signal,
        headers: { ...(baseHeaders ?? {}), Host: url.host },
      });
    }
  } finally {
    clearTimeout(timeout);
  }
};

const probeUrl = async (input: {
  url: URL;
  allowedOrigins: Set<string>;
  fetchImpl: PreviewProbeFetch;
  timeoutMs: number;
  redirectsRemaining: number;
}): Promise<PreviewProbeResult> => {
  if (!isAllowedProbeUrl(input.url, input.allowedOrigins)) {
    return {
      ok: false,
      reason: "redirect_blocked",
      targetLabel: redactPreviewProbeTargetLabel(input.url.toString()),
    };
  }

  for (const method of ["HEAD", "GET"] as const) {
    try {
      const response = await fetchPreviewProbe(input.fetchImpl, input.url, method, input.timeoutMs);
      cancelResponseBody(response);

      if (method === "HEAD" && (response.status === 405 || response.status === 501)) {
        continue;
      }

      if (HTTP_REDIRECT_STATUSES.has(response.status)) {
        if (input.redirectsRemaining <= 0) {
          return {
            ok: false,
            status: response.status,
            reason: "redirect_blocked",
            targetLabel: redactPreviewProbeTargetLabel(input.url.toString()),
          };
        }

        const location = response.headers.get("location");
        if (!location) {
          return {
            ok: false,
            status: response.status,
            reason: "redirect_blocked",
            targetLabel: redactPreviewProbeTargetLabel(input.url.toString()),
          };
        }

        const nextUrl = new URL(location, input.url);
        return probeUrl({
          ...input,
          url: nextUrl,
          redirectsRemaining: input.redirectsRemaining - 1,
        });
      }

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          targetLabel: redactPreviewProbeTargetLabel(input.url.toString()),
        };
      }

      return {
        ok: false,
        status: response.status,
        reason: "http_error",
        targetLabel: redactPreviewProbeTargetLabel(input.url.toString()),
      };
    } catch (error) {
      return {
        ok: false,
        reason: isAbortError(error) ? "timeout" : "unreachable",
        targetLabel: redactPreviewProbeTargetLabel(input.url.toString()),
      };
    }
  }

  return {
    ok: false,
    reason: "unreachable",
    targetLabel: redactPreviewProbeTargetLabel(input.url.toString()),
  };
};

export async function probeGeneratedPreviewUrl(
  previewUrl: string,
  options: PreviewProbeOptions = {}
): Promise<PreviewProbeResult> {
  const url = resolveProbeUrl(previewUrl);
  if (!url) {
    return {
      ok: false,
      reason: "invalid_target",
      targetLabel: redactPreviewProbeTargetLabel(previewUrl),
    };
  }

  const allowedOrigins = normalizeAllowedOrigins(url, options.allowedOrigins);
  return probeUrl({
    url,
    allowedOrigins,
    fetchImpl: options.fetchImpl ?? fetch,
    timeoutMs: options.timeoutMs ?? DEFAULT_PREVIEW_PROBE_TIMEOUT_MS,
    redirectsRemaining: options.maxRedirects ?? DEFAULT_PREVIEW_PROBE_REDIRECTS,
  });
}

export async function createPreviewToken(input: CreatePreviewInput) {
  const token = randomUUID();
  const ttlMinutes = input.ttlMinutes ?? 60;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  const tokenHash = hashPreviewToken(token);
  const context = normalizePreviewTokenContext(input.targetType, input.context);

  await db.insert(previewTokens).values({
    targetType: input.targetType,
    targetId: input.targetId,
    tokenHash,
    context,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function createDetailPagePreviewToken(input: {
  detailPageId: string;
  sampleEntryId: string;
  ttlMinutes?: number;
}) {
  return createPreviewToken({
    targetType: "detail-page",
    targetId: input.detailPageId,
    ttlMinutes: input.ttlMinutes,
    context: {
      kind: "detail-page",
      sampleEntryId: input.sampleEntryId,
    },
  });
}

export async function validatePreviewToken(
  token: string,
  targetType?: PreviewTargetType
): Promise<PreviewTokenValidationResult> {
  const tokenHash = hashPreviewToken(token);
  const [row] = await db.select().from(previewTokens).where(eq(previewTokens.tokenHash, tokenHash));

  if (!row) {
    return { status: "missing" };
  }

  let normalizedTargetType: PreviewTargetType;
  try {
    normalizedTargetType = normalizeStoredTargetType(row.targetType);
  } catch {
    return { status: "missing" };
  }

  if (targetType && normalizedTargetType !== targetType) {
    return { status: "missing" };
  }

  if (row.expiresAt <= new Date()) {
    return { status: "expired" };
  }

  let context: PreviewTokenContext;
  try {
    context = normalizePreviewTokenContext(normalizedTargetType, row.context ?? null);
  } catch {
    return { status: "missing" };
  }

  return {
    status: "valid",
    token: {
      id: row.id,
      targetType: normalizedTargetType,
      targetId: row.targetId,
      tokenHash: row.tokenHash,
      context,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    },
  };
}

export async function purgeExpiredPreviewTokens(reference = new Date()) {
  await db.delete(previewTokens).where(lt(previewTokens.expiresAt, reference));
}
