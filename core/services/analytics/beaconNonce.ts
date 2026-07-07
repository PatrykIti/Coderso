// Beacon HMAC nonce (TASK-483-02-L01) — a 1:1 mirror of
// core/services/forms/submissionNonce.ts for the public analytics beacon.
//
// Trust for the anonymous public-write beacon derives from this signed nonce,
// not a session cookie. The tracking snippet (TASK-483-03) receives a fresh
// nonce embedded at render time and echoes it back with each event; the route
// (TASK-483-02-L02) verifies it before any DB work.
//
// Error convention (binding for the 483 stream): this module throws ApiError
// DIRECTLY (analytics_nonce_required / analytics_nonce_invalid /
// analytics_nonce_secret_missing), exactly like submissionNonce.ts — those
// return via the route's `instanceof ApiError` branch and NEVER pass through
// mapAnalyticsError.

import { createHmac, timingSafeEqual } from "node:crypto";

import { ApiError } from "../../server/errorHandler";
import { resolveBeaconNonceTtlMs } from "./beaconTtl";

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

const resolveSecret = () => {
  const secret = process.env.ANALYTICS_BEACON_NONCE_SECRET?.trim();
  if (!secret) {
    throw new ApiError(
      "analytics_nonce_secret_missing",
      "Analytics beacon nonce secret is missing",
      500
    );
  }
  return secret;
};

const resolveTtlMs = () => resolveBeaconNonceTtlMs(process.env.ANALYTICS_BEACON_NONCE_TTL_MINUTES);

const signPayload = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

export function createBeaconNonce(scope = "beacon", now = Date.now()): string {
  const secret = resolveSecret();
  const timestamp = Math.floor(now);
  const signature = signPayload(secret, `${scope}.${timestamp}`);
  return `${timestamp}.${signature}`;
}

export function assertBeaconNonce(
  nonce: string | null | undefined,
  scope = "beacon",
  now = Date.now()
): void {
  if (!nonce) {
    throw new ApiError("analytics_nonce_required", "Analytics beacon nonce is required", 400);
  }

  const [timestampRaw, signature] = nonce.split(".");
  if (!timestampRaw || !signature) {
    throw new ApiError("analytics_nonce_invalid", "Analytics beacon nonce is invalid", 400);
  }

  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp) || timestamp > now + MAX_FUTURE_SKEW_MS) {
    throw new ApiError("analytics_nonce_invalid", "Analytics beacon nonce is invalid", 400);
  }

  if (now - timestamp > resolveTtlMs()) {
    throw new ApiError("analytics_nonce_invalid", "Analytics beacon nonce is invalid", 400);
  }

  const expected = signPayload(resolveSecret(), `${scope}.${timestamp}`);
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  const matches =
    expectedBuf.length === signatureBuf.length && timingSafeEqual(expectedBuf, signatureBuf);

  if (!matches) {
    throw new ApiError("analytics_nonce_invalid", "Analytics beacon nonce is invalid", 400);
  }
}
