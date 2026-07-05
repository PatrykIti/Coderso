// IP/PII redaction + bot/DNT classification (TASK-483-02-L03).
//
// Turns untrusted request signals (IP, User-Agent, DNT/GPC headers) into
// privacy-safe, server-derived values: a non-reversible salted visitor hash, a
// device classification, a bot verdict, and a DNT/consent decision. These feed
// the route (TASK-483-02-L02) and repository (TASK-483-01-L03).
//
// PII posture (SECURITY_SPEC PII_HASH_KEY): the visitor identity is
// HMAC-SHA256(ANALYTICS_IP_HASH_SECRET, ip + "|" + ua + "|" + dailySalt) with a
// UTC daily salt — one-way, so raw IP/UA are never persisted or logged, and the
// daily rotation prevents cross-day visitor correlation.
//
// This module is Bun-free (only node:crypto + a type import) so Vitest can
// import it directly.

import { createHmac } from "node:crypto";

import { ApiError } from "../../server/errorHandler";
import type { TrafficDeviceClass } from "./trafficTypes";

const UA_MAX_LENGTH = 512;

// Fail-fast if the secret is absent — thrown DIRECTLY as ApiError so it returns
// via the route's `instanceof ApiError` branch (never through mapAnalyticsError).
const resolveIpHashSecret = () => {
  const secret = process.env.ANALYTICS_IP_HASH_SECRET?.trim();
  if (!secret) {
    throw new ApiError(
      "analytics_ip_hash_secret_missing",
      "Analytics IP hash secret is missing",
      500
    );
  }
  return secret;
};

const dailySalt = (now = new Date()) => now.toISOString().slice(0, 10); // UTC day

export function computeVisitorHash(args: { ip?: string; userAgent?: string; now?: Date }): string {
  const ip = (args.ip ?? "0.0.0.0").trim();
  const ua = (args.userAgent ?? "").slice(0, UA_MAX_LENGTH);
  const payload = `${ip}|${ua}|${dailySalt(args.now)}`;
  return createHmac("sha256", resolveIpHashSecret()).update(payload).digest("hex");
}

const BOT_RE = /bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python-requests/i;

// A missing UA is treated as a bot (drop) — legitimate browsers always send one.
export function classifyBot(userAgent?: string): boolean {
  return !userAgent || BOT_RE.test(userAgent);
}

export function classifyDevice(userAgent?: string): TrafficDeviceClass {
  if (classifyBot(userAgent)) return "bot";
  if (!userAgent) return "unknown";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobi|android|iphone/i.test(userAgent)) return "mobile";
  return "desktop";
}

// Honor Do-Not-Track / Global Privacy Control: when present the route skips
// ingestion entirely (204, indistinguishable from an accepted event).
export function shouldHonorDnt(headers: Headers): boolean {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}
