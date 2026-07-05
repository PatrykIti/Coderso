// Public beacon collector (TASK-483-02-L02).
//
// The only public-write surface this feature adds: POST /_analytics/collect on
// the published host (NOT under /admin/api/*). Anonymous, cross-origin
// `sendBeacon` writes; trust derives from the HMAC nonce (TASK-483-02-L01), not
// a session. Mirrors publicBookingApi.ts structure.
//
// Anti-abuse stack (complete for this no-value write): HMAC nonce + `public_write`
// rate limit + server-side classifyBot/DNT filtering. It deliberately does NOT
// call enforceBotProtection — the snippet sends no captcha token, and a
// token-less enforceBotProtection call 400s whenever bot protection is enabled,
// which would silently kill the whole analytics pipeline (binding captcha
// decision in TASK-483-02 / 02-L02).
//
// PII posture: raw IP/UA are never persisted or logged; only the salted
// visitorHash reaches the DB. Every accept/drop/DNT path answers 204 No Content
// so clients cannot probe which events were stored.

import { ApiError, toErrorResponse } from "./errorHandler";
import { checkRateLimit } from "./middleware/rateLimit";
import { mapAnalyticsError } from "./routes/analyticsRoutes";
import { normalizeBeaconRequest } from "../services/analytics/beaconContract";
import { assertBeaconNonce } from "../services/analytics/beaconNonce";
import { normalizeTrafficEvent } from "../services/analytics/trafficSchemas";
import {
  classifyBot,
  classifyDevice,
  computeVisitorHash,
  shouldHonorDnt,
} from "../services/analytics/visitorIdentity";
import { recordTrafficEvent } from "../services/analytics/trafficRepository";
import type { SecuritySettings } from "../services/settings/securitySettings";

export const ANALYTICS_BEACON_PATH = "/_analytics/collect";
const MAX_BODY_BYTES = 4096;

export type PublicAnalyticsApiContext = {
  ip?: string;
  userAgent?: string;
  security: SecuritySettings;
};

const noContent = () => new Response(null, { status: 204 });

// ApiError -> JSON Response, mirroring booking's local errorResponse
// (publicBookingApi.ts). All error paths funnel through here.
function jsonError(error: ApiError): Response {
  return new Response(JSON.stringify(toErrorResponse(error)), {
    status: error.status,
    headers: { "Content-Type": "application/json" },
  });
}

// First-party hosts: the served Host header is the first-party domain, so
// classifySource (trafficSchemas.ts) reports self-referrals as "internal".
// Widen to configured aliases later if multi-domain publishing is added.
function loadSelfHosts(req: Request): Set<string> {
  const host = req.headers.get("host")?.toLowerCase();
  return new Set(host ? [host] : []);
}

// Size-capped JSON reader — NET-NEW: core/server/requestBody.ts parseRequestBody
// has no size cap, so it cannot be reused. Checks the declared Content-Length
// first, then the actual byte count (chunked bodies omit Content-Length).
// Throws ApiError("analytics_payload_too_large", 413) when over maxBytes and
// ApiError("invalid_json", 400) on empty/invalid bodies.
async function readCappedJson(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiError("analytics_payload_too_large", "Payload Too Large", 413);
  }

  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new ApiError("analytics_payload_too_large", "Payload Too Large", 413);
  }
  if (text.length === 0) {
    throw new ApiError("invalid_json", "Invalid JSON body", 400);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("invalid_json", "Invalid JSON body", 400);
  }
}

export async function handlePublicAnalyticsApi(
  req: Request,
  ctx: PublicAnalyticsApiContext
): Promise<Response> {
  try {
    if (req.method !== "POST") {
      throw new ApiError("method_not_allowed", "Method Not Allowed", 405);
    }
    if (shouldHonorDnt(req.headers)) return noContent(); // privacy short-circuit

    try {
      // returns void; throws ApiError("rate_limited", …, 429) itself on exceed
      checkRateLimit(
        "public_write",
        { ip: ctx.ip, userAgent: ctx.userAgent },
        ctx.security.rateLimit
      );
    } catch (limitError) {
      if (limitError instanceof ApiError && limitError.code === "rate_limited") {
        // Remap to a stable, feature-specific code for this surface.
        throw new ApiError("analytics_rate_limited", "Too Many Requests", 429);
      }
      throw limitError;
    }

    const raw = await readCappedJson(req, MAX_BODY_BYTES); // 413 if oversized
    const { rawEvent, nonce } = normalizeBeaconRequest(raw);
    assertBeaconNonce(nonce); // throws ApiError directly (forms precedent)

    const ua = ctx.userAgent;
    if (classifyBot(ua)) return noContent(); // silent bot drop

    // NO enforceBotProtection here — binding captcha decision: the snippet sends
    // no captcha token, and a token-less call 400s whenever bot protection is
    // enabled. Nonce + rate limit + bot/DNT filtering are the full anti-abuse
    // stack for this surface.

    const selfHosts = loadSelfHosts(req);
    const event = normalizeTrafficEvent(rawEvent, {
      uaDeviceClass: classifyDevice(ua),
      selfHosts,
    });
    const visitorHash = computeVisitorHash({ ip: ctx.ip, userAgent: ua });
    await recordTrafficEvent({ event, visitorHash });
    return noContent();
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error);
    return jsonError(mapAnalyticsError(error)); // machine-readable -> ApiError
  }
}
