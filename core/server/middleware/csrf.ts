import { ApiError } from "../errorHandler";
import {
  getCsrfTokenHash,
  hashToken,
} from "../../services/auth/sessionService";
import type { RouteContext } from "../router";
import type { SecuritySettings } from "../../services/settings/securitySettings";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function parseIssuedAt(token: string) {
  const [ts] = token.split(".");
  if (!ts) return null;
  const parsed = Number(ts);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export async function enforceCsrf(
  req: Request,
  ctx: RouteContext,
  config: SecuritySettings["csrf"]
) {
  if (!config.enabled) return;
  if (SAFE_METHODS.has(req.method)) return;
  if (!ctx.sessionId) return;

  const token = req.headers.get(config.headerName);
  if (!token) {
    throw new ApiError("csrf_invalid", "Invalid CSRF token", 403);
  }

  const issuedAt = parseIssuedAt(token);
  if (!issuedAt) {
    throw new ApiError("csrf_invalid", "Invalid CSRF token", 403);
  }

  const maxAgeMs = config.tokenTtlMinutes * 60 * 1000;
  if (Date.now() - issuedAt > maxAgeMs) {
    throw new ApiError("csrf_expired", "CSRF token expired", 403);
  }

  const expectedHash = await getCsrfTokenHash(ctx.sessionId);
  if (!expectedHash) {
    throw new ApiError("csrf_invalid", "Invalid CSRF token", 403);
  }

  const tokenHash = hashToken(token);
  if (tokenHash !== expectedHash) {
    throw new ApiError("csrf_invalid", "Invalid CSRF token", 403);
  }
}
