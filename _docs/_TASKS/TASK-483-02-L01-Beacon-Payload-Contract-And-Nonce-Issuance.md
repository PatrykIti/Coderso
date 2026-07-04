# TASK-483-02-L01: Beacon Payload Contract And Nonce Issuance
# FileName: TASK-483-02-L01-Beacon-Payload-Contract-And-Nonce-Issuance.md

**Parent Subtask:** TASK-483-02
**Priority:** High
**Category:** Tools / Analytics / Security / Domain Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-483-01-L01
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Own the public beacon request envelope (around the
  `trafficEventSchema` from L01) and the HMAC nonce that gates public writes,
  mirroring the proven forms/booking pattern.
- **Owning module(s) to create:**
  - `core/services/analytics/beaconContract.ts` — `beaconRequestSchema` (strict
    envelope: `event` + `nonce`), `normalizeBeaconRequest()`.
  - `core/services/analytics/beaconNonce.ts` — `createBeaconNonce()` /
    `assertBeaconNonce()`, a 1:1 mirror of
    `core/services/forms/submissionNonce.ts`.
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`.
- **Out-of-scope:** the HTTP route + rate-limit + captcha wiring (L02), IP
  hashing/bot classification (L03), DB writes (TASK-483-01-L03).

## Security Contract

- **Endpoint visibility:** none here — domain modules feeding the public route.
- **Auth model:** anonymous public visitor; trust comes from the HMAC nonce, not
  a session.
- **RBAC:** N/A (public).
- **CSRF expectations:** N/A — public beacon is not an admin write; CSRF tokens
  do not apply to anonymous cross-origin beacons. The nonce + bot protection
  replace CSRF for this surface.
- **Rate-limit bucket:** enforced by L02 (`public_write`).
- **Validation schema-owner module:** `beaconContract.ts` owns
  `beaconRequestSchema` with `additionalProperties: false`; the route validates
  through it and never re-declares the shape.
- **Anti-abuse controls:** HMAC nonce via `beaconNonce.ts` using a dedicated
  secret `ANALYTICS_BEACON_NONCE_SECRET` (fail-fast `analytics_nonce_secret_missing`
  if absent, exactly like `FORM_SUBMIT_NONCE_SECRET`). TTL via
  `ANALYTICS_BEACON_NONCE_TTL_MINUTES` (default 30, matching the session window).
  reCAPTCHA is layered at the route via `enforceBotProtection` (L02).
- **Secret/PII handling:** the nonce secret is read from `process.env` only,
  never returned to the client beyond the signed token, never logged. The
  payload carries no PII (host-only referrer, opaque visitId).

## Implementation Pseudocode

```ts
// beaconNonce.ts — mirror core/services/forms/submissionNonce.ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "../../server/errorHandler";

const DEFAULT_TTL_MINUTES = 30;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

const resolveSecret = () => {
  const s = process.env.ANALYTICS_BEACON_NONCE_SECRET?.trim();
  if (!s) throw new ApiError("analytics_nonce_secret_missing", "Analytics beacon nonce secret is missing", 500);
  return s;
};

export function createBeaconNonce(scope = "beacon", now = Date.now()) {
  const ts = Math.floor(now);
  const sig = createHmac("sha256", resolveSecret()).update(`${scope}.${ts}`).digest("hex");
  return `${ts}.${sig}`;
}

export function assertBeaconNonce(nonce: string | null | undefined, scope = "beacon", now = Date.now()) {
  if (!nonce) throw new ApiError("analytics_nonce_required", "Analytics beacon nonce is required", 400);
  const [tsRaw, sig] = nonce.split(".");
  if (!tsRaw || !sig) throw new ApiError("analytics_nonce_invalid", "Analytics beacon nonce is invalid", 400);
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts) || ts > now + MAX_FUTURE_SKEW_MS) throw new ApiError("analytics_nonce_invalid", "...", 400);
  if (now - ts > resolveTtlMs()) throw new ApiError("analytics_nonce_invalid", "...", 400);
  const expected = createHmac("sha256", resolveSecret()).update(`${scope}.${ts}`).digest("hex");
  const ok = sig.length === expected.length &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) throw new ApiError("analytics_nonce_invalid", "Analytics beacon nonce is invalid", 400);
}

// beaconContract.ts
export const beaconRequestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["event", "nonce"],
  properties: {
    event: trafficEventSchema,     // imported from trafficSchemas.ts (L01)
    nonce: { type: "string", minLength: 8, maxLength: 200 },
  },
} as const;

export function normalizeBeaconRequest(input: unknown) {
  const record = assertRecord(input, "analytics_beacon_invalid");
  rejectUnknownKeys(record, ["event", "nonce"], "analytics_beacon_invalid");
  return { rawEvent: record.event, nonce: asString(record.nonce, "analytics_beacon_invalid") };
}
```

Data flow: the tracking snippet (TASK-483-03) receives a fresh nonce embedded at
render time, then POSTs `{ event, nonce }`. The route (L02) verifies the nonce
before any DB work. Error handling uses machine-readable
`analytics_nonce_*` / `analytics_beacon_invalid` codes mapped at the route.

Regression-test shape (Vitest,
`tests/vitest/analytics/beaconNonce.test.ts` + `beaconContract.test.ts`):

```ts
test("valid nonce round-trips", () => {
  process.env.ANALYTICS_BEACON_NONCE_SECRET = "x";
  expect(() => assertBeaconNonce(createBeaconNonce())).not.toThrow();
});
test("tampered signature rejected", () => {
  const n = createBeaconNonce().replace(/.$/, "0");
  expect(() => assertBeaconNonce(n)).toThrow("analytics_nonce_invalid");
});
test("expired nonce rejected", () => {
  const old = createBeaconNonce("beacon", Date.now() - 60 * 60 * 1000);
  expect(() => assertBeaconNonce(old)).toThrow("analytics_nonce_invalid");
});
test("envelope rejects unknown keys", () => {
  expect(() => normalizeBeaconRequest({ event: {}, nonce: "x", extra: 1 }))
    .toThrow("analytics_beacon_invalid");
});
```

## Testing Requirements

- **Vitest** (Bun-free; `node:crypto` is allowed): nonce sign/verify (valid,
  tampered, expired, future-skew, missing-secret fail-fast) and envelope
  reject-unknown.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
