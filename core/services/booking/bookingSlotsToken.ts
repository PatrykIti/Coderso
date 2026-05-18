import { createHmac, timingSafeEqual } from "node:crypto";

import { ApiError } from "../../server/errorHandler";

const BOOKING_SLOTS_TOKEN_SCOPE = "booking_public_slots";

const DEFAULT_TTL_MINUTES = 10;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

const resolveSecret = () => {
  const secret = process.env.FORM_SUBMIT_NONCE_SECRET?.trim();
  if (!secret) {
    throw new ApiError("form_nonce_secret_missing", "Form submission nonce secret is missing", 500);
  }
  return secret;
};

const resolveTtlMs = () => {
  const raw = process.env.FORM_SUBMIT_NONCE_TTL_MINUTES;
  if (!raw) return DEFAULT_TTL_MINUTES * 60 * 1000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TTL_MINUTES * 60 * 1000;
  }
  return parsed * 60 * 1000;
};

const signPayload = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

const normalizeDateClaim = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
};

const encodeClaims = (claims: BookingSlotsPolicyClaims) =>
  Buffer.from(JSON.stringify(claims)).toString("base64url");

const verifySignature = (payload: string, signature: string) => {
  const secret = resolveSecret();
  const expected = signPayload(secret, payload);
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  const sameLength = expectedBuf.length === signatureBuf.length;
  const matches = sameLength && timingSafeEqual(expectedBuf, signatureBuf);

  if (!matches) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 403);
  }
};

const assertTimestamp = (timestampRaw: string, now: number) => {
  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp)) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
  }
  if (timestamp > now + MAX_FUTURE_SKEW_MS) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
  }
  if (now - timestamp > resolveTtlMs()) {
    throw new ApiError("form_nonce_expired", "Form submission nonce expired", 403);
  }
  return timestamp;
};

export type BookingSlotsPolicyClaims = {
  minDate?: string;
  maxDate?: string;
};

export function createBookingSlotsToken(claims: BookingSlotsPolicyClaims = {}, now = Date.now()) {
  const timestamp = Math.floor(now);
  const normalizedClaims = {
    ...(normalizeDateClaim(claims.minDate) ? { minDate: normalizeDateClaim(claims.minDate) } : {}),
    ...(normalizeDateClaim(claims.maxDate) ? { maxDate: normalizeDateClaim(claims.maxDate) } : {}),
  } satisfies BookingSlotsPolicyClaims;
  const encodedClaims = encodeClaims(normalizedClaims);
  const payload = `${BOOKING_SLOTS_TOKEN_SCOPE}.${timestamp}.${encodedClaims}`;
  const signature = signPayload(resolveSecret(), payload);
  return `${timestamp}.${encodedClaims}.${signature}`;
}

export function assertBookingSlotsToken(token: string | null | undefined, now = Date.now()) {
  if (!token) {
    throw new ApiError("form_nonce_required", "Form submission nonce is required", 400);
  }

  const parts = token.split(".");
  if (parts.length === 2) {
    const [timestampRaw, signature] = parts;
    if (!timestampRaw || !signature) {
      throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
    }
    assertTimestamp(timestampRaw, now);
    verifySignature(`${BOOKING_SLOTS_TOKEN_SCOPE}.${timestampRaw}`, signature);
    return {} satisfies BookingSlotsPolicyClaims;
  }

  if (parts.length !== 3) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
  }

  const [timestampRaw, claimsRaw, signature] = parts;
  if (!timestampRaw || !claimsRaw || !signature) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
  }

  assertTimestamp(timestampRaw, now);
  verifySignature(`${BOOKING_SLOTS_TOKEN_SCOPE}.${timestampRaw}.${claimsRaw}`, signature);

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(claimsRaw, "base64url").toString("utf8"));
  } catch {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
  }

  const record = parsed as Record<string, unknown>;
  return {
    ...(normalizeDateClaim(record.minDate) ? { minDate: normalizeDateClaim(record.minDate) } : {}),
    ...(normalizeDateClaim(record.maxDate) ? { maxDate: normalizeDateClaim(record.maxDate) } : {}),
  } satisfies BookingSlotsPolicyClaims;
}
