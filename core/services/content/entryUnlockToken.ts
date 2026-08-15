import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { ApiError } from "../../server/errorHandler";

const DEFAULT_TTL_HOURS = 12;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

const resolveSecret = () => {
  const secret = process.env.ENTRY_UNLOCK_SECRET?.trim();
  if (!secret) {
    throw new ApiError("entry_unlock_secret_missing", "Entry unlock secret is missing", 500);
  }
  return secret;
};

// TTL resolver is EXPORTED so 517-02-L02 derives the Set-Cookie `Max-Age` from the
// SAME source (no drift between the token expiry and the cookie lifetime).
export const resolveEntryUnlockTtlMs = () => {
  const raw = process.env.ENTRY_UNLOCK_TTL_HOURS;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TTL_HOURS * 3600 * 1000;
  return parsed * 3600 * 1000;
};

const signPayload = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

// SINGLE owner of the cookie-NAME hash. Deterministic (NOT secret-keyed — it only
// makes the cookie name opaque/bounded, it does not authenticate anything; the token
// still binds the full entryId). Both 517-02-L02 (write) and 517-02-L03 (read) import
// THIS exact function so the written cookie name === the read cookie name.
export const hashEntryCookieId = (entryId: string): string =>
  createHash("sha256").update(entryId).digest("hex").slice(0, 16);

// token = `${timestamp}.${signature}` where signature = HMAC(`${entryId}.${timestamp}`)
export function createEntryUnlockToken(entryId: string, now = Date.now()): string {
  const secret = resolveSecret();
  const timestamp = Math.floor(now);
  const signature = signPayload(secret, `${entryId}.${timestamp}`);
  return `${timestamp}.${signature}`;
}

// Boolean verify (NO throw) — used by the render-path unlock context which must never
// 500 a page render; the endpoint side may still branch on false. Binds to THIS entryId.
export function verifyEntryUnlockToken(
  entryId: string,
  token: string | null | undefined,
  now = Date.now()
): boolean {
  if (!entryId || !token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const timestampRaw = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const timestamp = Number(timestampRaw);
  if (!signature || !Number.isFinite(timestamp)) return false;
  if (timestamp > now + MAX_FUTURE_SKEW_MS) return false; // future-skew
  if (now - timestamp > resolveEntryUnlockTtlMs()) return false; // expired
  let secret: string;
  try {
    secret = resolveSecret();
  } catch {
    return false; // missing secret → locked, never 500 a GET render
  }
  const expected = signPayload(secret, `${entryId}.${timestamp}`);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b); // constant-time, equal-length only
}
