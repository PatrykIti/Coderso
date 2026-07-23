import { createHmac, timingSafeEqual } from "node:crypto";

import { ApiError } from "../../server/errorHandler";

const DEFAULT_TTL_MINUTES = 10;
const MINUTE_MS = 60 * 1000;
const DEFAULT_TTL_MS = DEFAULT_TTL_MINUTES * MINUTE_MS;
const MAX_TTL_MS = Number.MAX_SAFE_INTEGER;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const CANONICAL_TIMESTAMP_PATTERN = /^(?:0|[1-9]\d*)$/;
const CANONICAL_SIGNATURE_PATTERN = /^[0-9a-f]{64}$/;

const resolveSecret = () => {
  const secret = process.env.FORM_SUBMIT_NONCE_SECRET?.trim();
  if (!secret) {
    throw new ApiError("form_nonce_secret_missing", "Form submission nonce secret is missing", 500);
  }
  return secret;
};

const resolveTtlMs = () => {
  const raw = process.env.FORM_SUBMIT_NONCE_TTL_MINUTES;
  if (!raw) return DEFAULT_TTL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TTL_MS;
  }
  const ttlMs = parsed * MINUTE_MS;
  if (!Number.isFinite(ttlMs) || ttlMs > MAX_TTL_MS) {
    return DEFAULT_TTL_MS;
  }
  return ttlMs;
};

const signPayload = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

export function createFormSubmissionNonce(formId: string, now = Date.now()) {
  const secret = resolveSecret();
  const timestamp = Math.floor(now);
  const payload = `${formId}.${timestamp}`;
  const signature = signPayload(secret, payload);
  return `${timestamp}.${signature}`;
}

export function assertFormSubmissionNonce(
  formId: string,
  nonce: string | null | undefined,
  now = Date.now()
) {
  if (!nonce) {
    throw new ApiError("form_nonce_required", "Form submission nonce is required", 400);
  }

  const segments = nonce.split(".");
  if (segments.length !== 2) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
  }
  const [timestampRaw, signature] = segments;
  if (
    !timestampRaw ||
    !signature ||
    !CANONICAL_TIMESTAMP_PATTERN.test(timestampRaw) ||
    !CANONICAL_SIGNATURE_PATTERN.test(signature)
  ) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
  }

  const timestamp = Number(timestampRaw);
  if (!Number.isSafeInteger(timestamp) || String(timestamp) !== timestampRaw) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
  }

  if (timestamp > now + MAX_FUTURE_SKEW_MS) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 400);
  }

  const ttlMs = resolveTtlMs();
  if (now - timestamp > ttlMs) {
    throw new ApiError("form_nonce_expired", "Form submission nonce expired", 403);
  }

  const secret = resolveSecret();
  const payload = `${formId}.${timestamp}`;
  const expected = signPayload(secret, payload);

  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  const sameLength = expectedBuf.length === signatureBuf.length;
  const matches = sameLength && timingSafeEqual(expectedBuf, signatureBuf);

  if (!matches) {
    throw new ApiError("form_nonce_invalid", "Form submission nonce is invalid", 403);
  }
}
