# TASK-483-02-L02: Public Ingestion Route And Bun Serve Wiring
# FileName: TASK-483-02-L02-Public-Ingestion-Route-And-Bun-Serve-Wiring.md

**Parent Subtask:** TASK-483-02
**Priority:** High
**Category:** Tools / Analytics / Public API / Security
**Estimated Effort:** Large
**Dependencies:** TASK-483-01-L03, TASK-483-02-L01, TASK-483-02-L03
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Implement and wire the public beacon collector endpoint that accepts
  one pageview event, enforces the full anti-abuse stack, and persists via the
  repository. This is the only public-write surface this feature adds.
- **Owning module(s) to create:**
  `core/server/publicAnalyticsApi.ts` (`handlePublicAnalyticsApi`), mirroring
  `core/server/publicBookingApi.ts`; plus the **net-new** `mapAnalyticsError`
  helper, which **this leaf lands first** in `analyticsRoutes.ts` and re-exports
  (the admin read routes in TASK-483-04-L03 then **EXTEND** the same function with
  the read-side `analytics_query_failed` case — they import and reuse it, never
  redeclare it; full error set enumerated under Error handling). This leaf also
  owns one small **net-new** local helper defined in `publicAnalyticsApi.ts` —
  `loadSelfHosts(req)` (first-party host set used to classify self-referrals as
  direct); no other module declares it.
- **Owning module(s) to extend:** `core/server/publicSite.tsx` (dispatch the
  beacon inside `handlePublicRequest`, mirroring `handlePublicBookingApi` at
  `publicSite.tsx:1455`; `ip`/`userAgent`/`security` are already resolved at the
  top of `handlePublicRequest` — `publicSite.tsx:1451-1453`).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`.
- **Out-of-scope:** aggregation/read endpoints (TASK-483-04), the client snippet
  (TASK-483-03), and **campaign/UTM source attribution** — the client
  deliberately sends no query string and the path normalizer strips it, so there
  is no campaign signal to classify; `sourceKind` covers
  direct/internal/referral/search/social only (a future, privacy-reviewed task
  may add a UTM field, keeping TASK-483-01-L01 / 02-L02 / 03-L01 aligned).

> **Shared boundary `core/server/publicSite.tsx`** is also extended by TASK-483/486/491/493 — additive injection only; reuse the existing forms/booking public-write nonce evaluator, do not invent a competing one-off nonce.

## Security Contract

- **Endpoint visibility:** **public** — `POST /_analytics/collect` on the public
  host (NOT under `/admin/api/*`). A public endpoint is required because the
  published site (anonymous visitors, possibly different origin) must write here;
  this is the documented exception to the internal-first rule.
- **Auth model:** anonymous; trust established by HMAC nonce, not a session.
- **RBAC:** none (public write); the route must not touch any admin/RBAC path.
- **CSRF expectations:** N/A for an anonymous cross-origin beacon — replaced by
  nonce + bot protection. The route must **not** require or read an admin CSRF
  token.
- **Rate-limit bucket:** `public_write` via
  `checkRateLimit("public_write", { ip, userAgent }, security.rateLimit)` — the
  exact 3-arg form `publicBookingApi.ts:355` uses (the `SecuritySettings["rateLimit"]`
  config arg is mandatory). The helper returns `void` and **throws
  `ApiError("rate_limited", …, 429)` itself** on exceed; the route catches that
  and remaps to `ApiError("analytics_rate_limited", "Too Many Requests", 429)`
  so the beacon surfaces a stable, feature-specific code. There is no `.ok`
  return value and no `userAgentHash`/`hashUa` — the helper hashes the UA
  internally.
- **Validation schema-owner module:** `beaconContract.ts` (`beaconRequestSchema`,
  reject-unknown) from TASK-483-02-L01; route validates through it, never
  re-declares.
- **Anti-abuse controls (mandatory, shared patterns only):**
  1. `assertBeaconNonce(nonce)` (TASK-483-02-L01) — HMAC/TTL.
  2. `enforceBotProtection({ token, action: "public_write", ip, settings })`
     (`core/services/security/botProtection.ts`) — optional reCAPTCHA per
     security settings; localhost bypass honored.
  3. `classifyBot(userAgent)` (TASK-483-02-L03) — silent drop of crawlers.
  4. `shouldHonorDnt(headers)` — DNT/GPC short-circuit before any persistence.
  Do NOT invent a weaker one-off flow; reuse the forms/booking evaluators.
- **Secret/PII handling:** raw IP/UA never persisted or logged; only the salted
  `visitorHash` reaches the DB. Method other than POST → `405`. Body size capped
  (reject > 4 KB before JSON parse). Always answer `204 No Content` on accept,
  drop, and DNT so clients cannot probe which events were stored.

## Implementation Pseudocode

```ts
// core/server/publicAnalyticsApi.ts  (mirror publicBookingApi.ts structure)
import { ApiError, toErrorResponse } from "./errorHandler";
import { checkRateLimit } from "./middleware/rateLimit";
import { normalizeBeaconRequest } from "../services/analytics/beaconContract";
import { assertBeaconNonce } from "../services/analytics/beaconNonce";
import { normalizeTrafficEvent } from "../services/analytics/trafficSchemas";
import { computeVisitorHash, classifyBot, classifyDevice, shouldHonorDnt }
  from "../services/analytics/visitorIdentity";
import { recordTrafficEvent } from "../services/analytics/trafficRepository";
import { mapAnalyticsError } from "./routes/analyticsRoutes";
import type { SecuritySettings } from "../services/settings/securitySettings";

export const ANALYTICS_BEACON_PATH = "/_analytics/collect";
const MAX_BODY_BYTES = 4096;
const noContent = () => new Response(null, { status: 204 });

// ctx mirrors PublicBookingApiContext (publicBookingApi.ts:31) — ip/userAgent/security
export async function handlePublicAnalyticsApi(
  req: Request,
  ctx: { ip?: string; userAgent?: string; security: SecuritySettings }
): Promise<Response> {
  try {
    if (req.method !== "POST") throw new ApiError("method_not_allowed", "Method Not Allowed", 405);
    if (shouldHonorDnt(req.headers)) return noContent();           // privacy short-circuit

    try {
      // returns void; throws ApiError("rate_limited", …, 429) itself on exceed
      checkRateLimit("public_write", { ip: ctx.ip, userAgent: ctx.userAgent }, ctx.security.rateLimit);
    } catch (limitError) {
      if (limitError instanceof ApiError && limitError.code === "rate_limited") {
        throw new ApiError("analytics_rate_limited", "Too Many Requests", 429); // stable beacon code
      }
      throw limitError;
    }

    const raw = await readCappedJson(req, MAX_BODY_BYTES);          // 413 if oversized
    const { rawEvent, nonce } = normalizeBeaconRequest(raw);
    assertBeaconNonce(nonce);

    const ua = ctx.userAgent;
    if (classifyBot(ua)) return noContent();                       // bot drop (silent)

    await enforceBotProtection({ token: req.headers.get("x-captcha-token"),
      action: "public_write", ip: ctx.ip, settings: await loadBotSettings() });

    const selfHosts = loadSelfHosts(req);                          // net-new local helper (below)
    const event = normalizeTrafficEvent(rawEvent, {
      uaDeviceClass: classifyDevice(ua), selfHosts,
    });
    const visitorHash = computeVisitorHash({ ip: ctx.ip, userAgent: ua });
    await recordTrafficEvent({ event, visitorHash });
    return noContent();
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error);
    const mapped = mapAnalyticsError(error);                       // machine-readable -> ApiError
    return jsonError(mapped);
  }
}

// --- net-new local helper owned by THIS leaf (publicAnalyticsApi.ts) ---
// First-party hosts: the served Host header is the first-party domain; widen to
// configured aliases later if multi-domain publishing is added.
function loadSelfHosts(req: Request): Set<string> {
  const host = req.headers.get("host")?.toLowerCase();
  return new Set(host ? [host] : []);
}

// core/server/routes/analyticsRoutes.ts
// Net-new shared mapper. THIS leaf (TASK-483-02-L02) lands it FIRST; the admin
// read routes in TASK-483-04-L03 EXTEND the same switch (import + reuse, never
// redeclare). Full error set enumerated in the cases below.
export function mapAnalyticsError(error: unknown): ApiError {
  const code = (error as Error)?.message ?? "";
  switch (code) {
    // --- ingestion / write side (owned here, TASK-483-02-L02) ---
    case "analytics_beacon_invalid": return new ApiError(code, "Invalid analytics payload", 400);
    case "analytics_nonce_required":
    case "analytics_nonce_invalid":  return new ApiError(code, "Invalid analytics nonce", 400);
    case "analytics_persist_failed": return new ApiError(code, "Analytics write failed", 500);
    // --- read / aggregation side (added by TASK-483-04-L03; listed for full set) ---
    case "analytics_query_failed":   return new ApiError(code, "Analytics query failed", 500);
    default: return new ApiError("internal_error", "Internal Server Error", 500);
  }
}

// core/server/publicSite.tsx  (inside handlePublicRequest, near the booking
// dispatch at publicSite.tsx:1455; `ip`/`userAgent`/`security` are already in
// scope — resolved at publicSite.tsx:1451-1453 and reused by the booking/forms
// dispatch — so the analytics dispatch reuses them, exactly like booking)
if (new URL(req.url).pathname === ANALYTICS_BEACON_PATH) {
  return handlePublicAnalyticsApi(req, { ip, userAgent, security }); // same ctx shape as booking
}
```

Data flow: snippet POST → method/DNT/rate-limit/size guards → validate envelope →
nonce → bot drop → captcha → normalize event (server-derived device/source) →
visitor hash → repository write → `204`. Every domain error is machine-readable
and mapped to `ApiError` at this boundary only.

Error-set ownership: `mapAnalyticsError` is **landed first by this leaf** in
`analyticsRoutes.ts` and exported. TASK-483-04-L03 **EXTENDS** the same switch
(adding the read-side `analytics_query_failed` case) and imports it — it must not
redeclare the function. The complete net-new code set the mapper covers:
`analytics_beacon_invalid` (400), `analytics_nonce_required` /
`analytics_nonce_invalid` (400), `analytics_persist_failed` (500),
`analytics_query_failed` (500, read side), and the `internal_error` default
(500). The route also throws `ApiError` directly for `method_not_allowed` (405),
`analytics_rate_limited` (429, remapped from the helper's `rate_limited`), and
the oversized-body `413`; those are already `ApiError` instances and return via
the `instanceof ApiError` branch without passing through the mapper.

Regression-test shape:

```ts
// Bun route integration: tests/integration/routes/publicAnalytics.test.ts
test("valid beacon with nonce persists one pageview", async () => { /* 204 + row count +1 */ });
test("missing nonce -> 400 analytics_nonce_required", async () => {});
test("GET -> 405", async () => {});
// Bun security: tests/security/analyticsBeacon.test.ts
test("DNT:1 -> 204 and no row written", async () => {});
test("bot UA -> 204 and no row written", async () => {});
test("over rate limit -> 429 analytics_rate_limited", async () => {});
test("oversized body -> 413", async () => {});
test("no raw IP or UA appears in persisted row or logs", async () => {});
```

## Testing Requirements

- **Bun lane (mandatory — runtime/route/security):**
  - `tests/integration/routes/publicAnalytics.test.ts` — dispatch, happy path,
    nonce/method errors, `mapAnalyticsError` coverage, DB row assertion.
  - `tests/security/analyticsBeacon.test.ts` — DNT, bot drop, rate-limit,
    oversized body, no-raw-PII persistence/logging.
- Run security scanners from `_docs/SECURITY_SPEC.md` for the public-write change
  (or state CI-only). `set -a && source .env && set +a` for DB-backed assertions.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
