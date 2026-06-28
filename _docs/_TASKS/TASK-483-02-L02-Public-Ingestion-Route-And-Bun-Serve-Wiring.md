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
  `core/server/publicBookingApi.ts`; plus a `mapAnalyticsError` helper (own it in
  `analyticsRoutes.ts` and re-export, since internal routes also reuse it). This
  leaf also owns two small **net-new** local helpers defined in
  `publicAnalyticsApi.ts` — `loadSelfHosts(req)` (first-party host set used to
  classify self-referrals as direct) and `hasCampaignParams(rawEvent)` (pure
  UTM/campaign-marker check); no other module declares them.
- **Owning module(s) to extend:** `core/server/publicSite.tsx` (dispatch the
  beacon inside `handlePublicRequest`, mirroring `handlePublicBookingApi` at
  `publicSite.tsx:1455`).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`.
- **Out-of-scope:** aggregation/read endpoints (TASK-483-04), the client snippet
  (TASK-483-03).

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
- **Rate-limit bucket:** `public_write` via `checkRateLimit("public_write", { ip, userAgentHash })`
  (same helper `publicBookingApi.ts` uses). On exceed → `429` with
  `analytics_rate_limited`.
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

export const ANALYTICS_BEACON_PATH = "/_analytics/collect";
const MAX_BODY_BYTES = 4096;
const noContent = () => new Response(null, { status: 204 });

export async function handlePublicAnalyticsApi(req: Request, ctx: { ip?: string }): Promise<Response> {
  try {
    if (req.method !== "POST") throw new ApiError("method_not_allowed", "Method Not Allowed", 405);
    if (shouldHonorDnt(req.headers)) return noContent();           // privacy short-circuit

    const limit = checkRateLimit("public_write", { ip: ctx.ip, userAgentHash: hashUa(req) });
    if (!limit.ok) throw new ApiError("analytics_rate_limited", "Too Many Requests", 429);

    const raw = await readCappedJson(req, MAX_BODY_BYTES);          // 413 if oversized
    const { rawEvent, nonce } = normalizeBeaconRequest(raw);
    assertBeaconNonce(nonce);

    const ua = req.headers.get("user-agent") ?? undefined;
    if (classifyBot(ua)) return noContent();                       // bot drop (silent)

    await enforceBotProtection({ token: req.headers.get("x-captcha-token"),
      action: "public_write", ip: ctx.ip, settings: await loadBotSettings() });

    const selfHosts = loadSelfHosts(req);                          // net-new local helper (below)
    const event = normalizeTrafficEvent(rawEvent, {
      uaDeviceClass: classifyDevice(ua), selfHosts, campaignHit: hasCampaignParams(rawEvent),
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

// --- net-new local helpers owned by THIS leaf (publicAnalyticsApi.ts) ---
// First-party hosts: the served Host header is the first-party domain; widen to
// configured aliases later if multi-domain publishing is added.
function loadSelfHosts(req: Request): Set<string> {
  const host = req.headers.get("host")?.toLowerCase();
  return new Set(host ? [host] : []);
}
// Pure UTM/campaign-marker check on the inbound event (no I/O).
function hasCampaignParams(rawEvent: { url?: string }): boolean {
  if (!rawEvent.url) return false;
  const q = new URL(rawEvent.url, "http://x").searchParams;
  return ["utm_source", "utm_medium", "utm_campaign", "gclid", "fbclid"].some((k) => q.has(k));
}

// core/server/routes/analyticsRoutes.ts
export function mapAnalyticsError(error: unknown): ApiError {
  const code = (error as Error)?.message ?? "";
  switch (code) {
    case "analytics_beacon_invalid": return new ApiError(code, "Invalid analytics payload", 400);
    case "analytics_nonce_required":
    case "analytics_nonce_invalid":  return new ApiError(code, "Invalid analytics nonce", 400);
    case "analytics_persist_failed": return new ApiError(code, "Analytics write failed", 500);
    default: return new ApiError("internal_error", "Internal Server Error", 500);
  }
}

// core/server/publicSite.tsx  (inside handlePublicRequest, near booking dispatch ~1455;
// `ip` is already computed at the top of handlePublicRequest via the module-local
// resolveIp(req) helper — publicSite.tsx:177, also used at publicSite.tsx:1452)
if (new URL(req.url).pathname === ANALYTICS_BEACON_PATH) {
  return handlePublicAnalyticsApi(req, { ip });   // ip === resolveIp(req), already in scope
}
```

Data flow: snippet POST → method/DNT/rate-limit/size guards → validate envelope →
nonce → bot drop → captcha → normalize event (server-derived device/source) →
visitor hash → repository write → `204`. Every domain error is machine-readable
and mapped to `ApiError` at this boundary only.

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
