# TASK-517-02-L01: HMAC Entry-Unlock Cookie Sign/Verify Util

# FileName: TASK-517-02-L01-Unlock-Cookie-HMAC-Util.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-02
**Priority:** High
**Category:** Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Creates NEW `core/services/content/entryUnlockToken.ts`: a stateless
HMAC token util that MIRRORS `core/services/forms/submissionNonce.ts` (proven pattern — do
NOT invent a weaker one-off). Signs a per-entry unlock token bound to the entry id, and
verifies it constant-time with TTL + future-skew rejection. No DB, no table — the token
lives only in the visitor's `SameSite=Strict; HttpOnly; Secure` cookie (cookie EMIT/PARSE
is 517-02-L02/L03; this leaf is the sign/verify core). This leaf is ALSO the single owner of
`hashEntryCookieId(entryId)` — the deterministic short hash used to build the cookie NAME
(`entry_unlock_<hashEntryCookieId(entryId)>`) — exported here so BOTH the WRITE side
(517-02-L02) and the READ side (517-02-L03) import the identical function and can never
diverge on the cookie name (a divergence would silently break every unlock).

## Grounded anchors

- Pattern source `submissionNonce.ts`: `signPayload(secret, payload) =
  createHmac("sha256", secret).update(payload).digest("hex")` (`:30`);
  `createFormSubmissionNonce` payload `${formId}.${timestamp}` → `${timestamp}.${signature}`
  (`:33-39`); `assertFormSubmissionNonce` splits `timestamp.signature`, future-skew reject
  (`MAX_FUTURE_SKEW_MS = 5*60*1000`, `:6/:60`), TTL expiry (`:64-67`), constant-time
  `timingSafeEqual` on equal-length Buffers (`:73-80`), secret via `resolveSecret()` from
  env (`:8-18`). `ApiError` from `../../server/errorHandler` (`:3`).
- Dedicated env secret `ENTRY_UNLOCK_SECRET` (NOT reuse `FORM_SUBMIT_NONCE_SECRET` — a
  distinct trust domain). TTL ~12 h via `ENTRY_UNLOCK_TTL_HOURS` (default 12).

## Implementation pseudocode

```ts
// core/services/content/entryUnlockToken.ts
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "../../server/errorHandler";

const DEFAULT_TTL_HOURS = 12;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

const resolveSecret = () => {
  const secret = process.env.ENTRY_UNLOCK_SECRET?.trim();
  if (!secret) throw new ApiError("entry_unlock_secret_missing", "Entry unlock secret is missing", 500);
  return secret;
};

const resolveTtlMs = () => {
  const raw = process.env.ENTRY_UNLOCK_TTL_HOURS;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TTL_HOURS * 3600 * 1000;
  return parsed * 3600 * 1000;
};

const signPayload = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

// SINGLE owner of the cookie-NAME hash. Deterministic (NOT secret-keyed — it only makes the
// cookie name opaque/bounded, it does not authenticate anything; the token still binds the
// full entryId). Both 517-02-L02 (write) and 517-02-L03 (read) import THIS exact function so
// the written cookie name === the read cookie name.
export const hashEntryCookieId = (entryId: string): string =>
  createHash("sha256").update(entryId).digest("hex").slice(0, 16);

// token = `${timestamp}.${signature}` where signature = HMAC(`${entryId}.${timestamp}`)
export function createEntryUnlockToken(entryId: string, now = Date.now()): string {
  const secret = resolveSecret();
  const timestamp = Math.floor(now);
  const signature = signPayload(secret, `${entryId}.${timestamp}`);
  return `${timestamp}.${signature}`;
}

// Boolean verify (NO throw) — used by the render-path unlock context which must never 500
// a page render; the endpoint side may still branch on false. Binds to THIS entryId.
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
  if (timestamp > now + MAX_FUTURE_SKEW_MS) return false;         // future-skew
  if (now - timestamp > resolveTtlMs()) return false;            // expired
  let secret: string;
  try { secret = resolveSecret(); } catch { return false; }      // missing secret → locked, never 500 a GET render
  const expected = signPayload(secret, `${entryId}.${timestamp}`);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);         // constant-time, equal-length only
}
```

**Design notes.** The signature binds `entryId` — a token minted for entry A fails
verification for entry B (payload differs → HMAC differs → `timingSafeEqual` false), so a
per-entry cookie cannot cross-unlock. `verifyEntryUnlockToken` returns a boolean (never
throws) because it is called on the GET render path (517-02-L03 `buildEntryUnlockContext`),
which must fail-closed to "locked" rather than 500 the page; a missing `ENTRY_UNLOCK_SECRET`
therefore yields "locked", not a crash. (The submit endpoint may surface the missing-secret
500 via `createEntryUnlockToken`'s `resolveSecret` throw — acceptable on the POST write
path.) Constant-time compare only on equal-length Buffers (mirrors `submissionNonce.ts`).

## Regression-test shape

- **Lane:** Vitest `tests/vitest/content/entry-unlock-token.test.ts` (NEW; pure crypto, no
  DB → Vitest). Set `process.env.ENTRY_UNLOCK_SECRET` in the suite setup.
- Assert: `verifyEntryUnlockToken(id, createEntryUnlockToken(id))` → true (round-trip);
  wrong entry id (`createEntryUnlockToken("A")` verified against `"B"`) → false
  (cross-entry binding); tampered signature (flip a hex char) → false; tampered timestamp →
  false; malformed token (`""`, `"nodot"`, `".sig"`, `"123."`) → false; expired token
  (`now` far past `timestamp + TTL`, pass a controlled `now`) → false; future-skewed token
  (`timestamp > now + skew`) → false; missing secret (unset env) → `verify` returns false
  (never throws) and `createEntryUnlockToken` throws `ApiError` 500.
- Also assert `hashEntryCookieId` is deterministic (same id → same hash), stable-length,
  and distinct for distinct ids — proving the write/read cookie name matches.
- Pure — no DB, no teardown; restore env in `afterAll`.

## Hard Invariants

1. Mirrors `submissionNonce.ts`: HMAC-sha256-hex, `timingSafeEqual` equal-length,
   TTL + future-skew.
2. Signature binds `entryId` → no cross-entry unlock.
3. Dedicated env secret `ENTRY_UNLOCK_SECRET` (not the forms secret).
4. `verifyEntryUnlockToken` NEVER throws (render-path safe); `createEntryUnlockToken` may
   throw on missing secret (write path).
5. No DB, no table, no dependency.
6. `hashEntryCookieId` is the single exported owner of the cookie-NAME hash (deterministic
   sha256-hex truncated); imported read-only by 517-02-L02 (write) and 517-02-L03 (read) so
   the cookie name is byte-identical on both sides.
