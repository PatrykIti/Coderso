import { createHash, randomUUID } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "../../db/client";
import { previewTokens } from "../../db/schema";

export type PreviewTargetType = "page" | "content" | "widget-template";

export type CreatePreviewInput = {
  targetType: PreviewTargetType;
  targetId: string;
  ttlMinutes?: number;
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

type PreviewProbeFetch = (
  input: string,
  init?: RequestInit
) => Promise<Response>;

type PreviewProbeOptions = {
  allowedOrigins?: string[];
  fetchImpl?: PreviewProbeFetch;
  timeoutMs?: number;
  maxRedirects?: number;
};

const DEFAULT_PREVIEW_PROBE_TIMEOUT_MS = 1500;
const DEFAULT_PREVIEW_PROBE_REDIRECTS = 3;
const HTTP_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function hashPreviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const isHttpProtocol = (protocol: string) =>
  protocol === "http:" || protocol === "https:";

const resolveProbeUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return isHttpProtocol(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeAllowedOrigins = (
  previewUrl: URL,
  allowedOrigins: string[] | undefined
) => {
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

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

const fetchPreviewProbe = async (
  fetchImpl: PreviewProbeFetch,
  url: URL,
  method: "HEAD" | "GET",
  timeoutMs: number
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url.toString(), {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers:
        method === "GET"
          ? {
              Range: "bytes=0-0",
            }
          : undefined,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const probeUrl = async (
  input: {
    url: URL;
    allowedOrigins: Set<string>;
    fetchImpl: PreviewProbeFetch;
    timeoutMs: number;
    redirectsRemaining: number;
  }
): Promise<PreviewProbeResult> => {
  if (!isAllowedProbeUrl(input.url, input.allowedOrigins)) {
    return {
      ok: false,
      reason: "redirect_blocked",
      targetLabel: redactPreviewProbeTargetLabel(input.url.toString()),
    };
  }

  for (const method of ["HEAD", "GET"] as const) {
    try {
      const response = await fetchPreviewProbe(
        input.fetchImpl,
        input.url,
        method,
        input.timeoutMs
      );
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
    redirectsRemaining:
      options.maxRedirects ?? DEFAULT_PREVIEW_PROBE_REDIRECTS,
  });
}

export async function createPreviewToken(input: CreatePreviewInput) {
  const token = randomUUID();
  const ttlMinutes = input.ttlMinutes ?? 60;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  const tokenHash = hashPreviewToken(token);

  await db.insert(previewTokens).values({
    targetType: input.targetType,
    targetId: input.targetId,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function validatePreviewToken(
  token: string,
  targetType?: PreviewTargetType
) {
  const tokenHash = hashPreviewToken(token);
  const [row] = await db
    .select()
    .from(previewTokens)
    .where(eq(previewTokens.tokenHash, tokenHash));

  if (!row) return null;
  if (row.expiresAt <= new Date()) return null;
  if (targetType && row.targetType !== targetType) return null;

  return row;
}

export async function purgeExpiredPreviewTokens(reference = new Date()) {
  await db
    .delete(previewTokens)
    .where(lt(previewTokens.expiresAt, reference));
}
