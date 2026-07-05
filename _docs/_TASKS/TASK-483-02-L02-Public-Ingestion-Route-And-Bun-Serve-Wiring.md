# TASK-483-02-L02: Public Ingestion Route And Bun Serve Wiring
# FileName: TASK-483-02-L02-Public-Ingestion-Route-And-Bun-Serve-Wiring.md

**Parent Subtask:** TASK-483-02
**Priority:** High
**Category:** Tools / Analytics / Public API / Security
**Estimated Effort:** Large
**Dependencies:** TASK-483-01-L03, TASK-483-02-L01, TASK-483-02-L03
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

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
  `loadSelfHosts(req)` (first-party host set passed to `normalizeTrafficEvent`;
  `classifySource` in `trafficSchemas.ts` — TASK-483-01-L01, the single owner of
  source classification — returns `"internal"` for self-referrals); no other
  module declares it. Two further **net-new** local helpers are
  owned by `publicAnalyticsApi.ts`: `readCappedJson(req, maxBytes)` (size-capped
  JSON body reader — `core/server/requestBody.ts` `parseRequestBody` has NO size
  cap, so this must be net-new) and `jsonError(error)` (ApiError → JSON
  `Response`, mirroring booking's local `errorResponse` at
  `publicBookingApi.ts:44`).
- **Owning module(s) to extend:** `core/server/publicSite.tsx` (dispatch the
  beacon inside `handlePublicRequest`, mirroring `handlePublicBookingApi` at
  `publicSite.tsx:1473`; `ip`/`userAgent`/`security` are already resolved at the
  top of `handlePublicRequest` — `publicSite.tsx:1469-1471`).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`.
- **Out-of-scope:** aggregation/read endpoints (TASK-483-04), the client snippet
  (TASK-483-03), and **campaign/UTM source attribution** — the client
  deliberately sends no query string and the path normalizer strips it, so there
  is no campaign signal to classify; `sourceKind` covers
  direct/internal/referral/search/social only (a future, privacy-reviewed task
  may add a UTM field, keeping TASK-483-01-L01 / 02-L02 / 03-L01 aligned).

> **Shared boundary `core/server/publicSite.tsx`** — the parallel streams in
> flight are TASK-482 (setup wizard) and TASK-484 (backups); neither is expected
> to contend `publicSite.tsx` (their surfaces are setup/auth/install and
> backups — TASK-483's forbidden paths). Keep edits additive injection only;
> reuse the existing forms/booking public-write nonce evaluator, do not invent a
> competing one-off nonce.

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
  2. `checkRateLimit("public_write", …)` — the shared bucket (see above).
  3. `classifyBot(userAgent)` (TASK-483-02-L03) — silent drop of crawlers.
  4. `shouldHonorDnt(headers)` — DNT/GPC short-circuit before any persistence.
  Do NOT invent a weaker one-off flow; reuse the forms/booking evaluators.
- **Captcha decision (binding, mirrored in TASK-483-02 and TASK-483-03-L01):**
  the beacon does **NOT** call `enforceBotProtection`. The client (03-L01) POSTs
  only `{ event, nonce }` via `sendBeacon` and never acquires a captcha token,
  and `enforceBotProtection` (`core/services/security/botProtection.ts`) throws
  `bot_protection_required` (400) for every token-less request whenever
  `settings.enabled` is true — an unconditional call would silently kill all
  analytics on any deployment with bot protection on. Forms/booking themselves
  only enforce captcha when `access.requireCaptcha`
  (`publicBookingApi.ts:379-387`, `routes/formsRoutes.ts:195-204`); the beacon
  is a no-value write, so nonce + `public_write` rate limit + bot/DNT filtering
  are the complete, sufficient anti-abuse stack for this surface.
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

    const raw = await readCappedJson(req, MAX_BODY_BYTES);          // net-new local helper (below); 413 if oversized
    const { rawEvent, nonce } = normalizeBeaconRequest(raw);
    assertBeaconNonce(nonce);                                       // throws ApiError directly (forms precedent)

    const ua = ctx.userAgent;
    if (classifyBot(ua)) return noContent();                       // bot drop (silent)

    // NO enforceBotProtection here — binding captcha decision in the Security
    // Contract above: the snippet sends no captcha token, and a token-less call
    // 400s whenever bot protection is enabled. Nonce + rate limit + bot/DNT
    // filtering are the full anti-abuse stack for this surface.

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

// --- net-new local helpers owned by THIS leaf (publicAnalyticsApi.ts) ---
// First-party hosts: the served Host header is the first-party domain; widen to
// configured aliases later if multi-domain publishing is added.
function loadSelfHosts(req: Request): Set<string> {
  const host = req.headers.get("host")?.toLowerCase();
  return new Set(host ? [host] : []);
}

// Size-capped JSON reader — NET-NEW: core/server/requestBody.ts parseRequestBody
// has no size cap, so this cannot be reused. Reads the body (Content-Length
// check first, then actual byte count for chunked bodies); throws
// ApiError("analytics_payload_too_large", "Payload Too Large", 413) when over
// maxBytes, ApiError("invalid_json", "Invalid JSON body", 400) on parse failure.
async function readCappedJson(req: Request, maxBytes: number): Promise<unknown> { /* … */ }

// ApiError -> JSON Response, mirroring booking's local errorResponse
// (publicBookingApi.ts:44): jsonify toErrorResponse(error) with error.status.
function jsonError(error: ApiError): Response { /* … */ }

// core/server/routes/analyticsRoutes.ts
// Net-new shared mapper. THIS leaf (TASK-483-02-L02) lands it FIRST; the admin
// read routes in TASK-483-04-L03 EXTEND the same switch (import + reuse, never
// redeclare). Full error set enumerated in the cases below.
//
// Error convention (binding for the whole 483 stream, two lanes exactly like
// forms/booking): (1) beaconNonce.ts throws ApiError DIRECTLY (mirroring
// core/services/forms/submissionNonce.ts) — those return via the
// `instanceof ApiError` branch and NEVER reach this mapper; (2) the contract
// normalizers (TASK-483-01-L01: analytics_beacon_invalid) and the repository
// (TASK-483-01-L03: analytics_persist_failed) throw plain Errors with
// machine-readable code messages — ONLY those flow through this mapper
// (mirroring mapBookingError, defined in the routes module at
// core/server/routes/bookingRoutes.ts:62 and imported by
// publicBookingApi.ts:29 — this is why mapAnalyticsError lives in
// analyticsRoutes.ts, matching the real mapBookingError-in-routes precedent).
// NOTE: real mapBookingError returns a NULLABLE ApiError (its caller,
// errorResponse at publicBookingApi.ts:44-53, has a 3-branch fallback that
// wraps a null return as a 500); mapAnalyticsError intentionally always
// returns a non-null ApiError, so its caller has no null branch.
export function mapAnalyticsError(error: unknown): ApiError {
  const code = (error as Error)?.message ?? "";
  switch (code) {
    // --- ingestion / write side (owned here, TASK-483-02-L02) ---
    case "analytics_beacon_invalid": return new ApiError(code, "Invalid analytics payload", 400);
    case "analytics_persist_failed": return new ApiError(code, "Analytics write failed", 500);
    // --- read / aggregation side (added by TASK-483-04-L03; listed for full set) ---
    case "analytics_query_failed":   return new ApiError(code, "Analytics query failed", 500);
    default: return new ApiError("internal_error", "Internal Server Error", 500);
  }
}

// core/server/publicSite.tsx  (inside handlePublicRequest, near the booking
// dispatch at publicSite.tsx:1473; `ip`/`userAgent`/`security` are already in
// scope — resolved at publicSite.tsx:1469-1471 and reused by the booking/forms
// dispatch — so the analytics dispatch reuses them, exactly like booking)
if (new URL(req.url).pathname === ANALYTICS_BEACON_PATH) {
  return handlePublicAnalyticsApi(req, { ip, userAgent, security }); // same ctx shape as booking
}
```

Data flow: snippet POST → method/DNT/rate-limit/size guards → validate envelope →
nonce → bot drop (no captcha — see the binding decision in the Security
Contract) → normalize event (server-derived device/source) → visitor hash →
repository write → `204`. Every plain-Error domain code is machine-readable and
mapped to `ApiError` at this boundary only.

Error-set ownership: `mapAnalyticsError` is **landed first by this leaf** in
`analyticsRoutes.ts` and exported. TASK-483-04-L03 **EXTENDS** the same switch
(adding the read-side `analytics_query_failed` case) and imports it — it must not
redeclare the function. The complete plain-Error code set the mapper covers:
`analytics_beacon_invalid` (400), `analytics_persist_failed` (500),
`analytics_query_failed` (500, read side), and the `internal_error` default
(500). Everything else is an `ApiError` thrown directly and returned via the
`instanceof ApiError` branch WITHOUT passing through the mapper:
`analytics_nonce_required` / `analytics_nonce_invalid` /
`analytics_nonce_secret_missing` from `beaconNonce.ts` (TASK-483-02-L01, which
throws `ApiError` directly, mirroring `core/services/forms/submissionNonce.ts`),
`analytics_ip_hash_secret_missing` from `visitorIdentity.ts` (TASK-483-02-L03),
plus the route's own `method_not_allowed` (405), `analytics_rate_limited` (429,
remapped from the helper's `rate_limited`) and the oversized-body
`analytics_payload_too_large` (413). The mapper must not duplicate any of those
codes — they would be dead cases.

Regression-test shape (**shared remote test DB** — the Postgres in `.env` is one
render.com DB used concurrently by the owner and the TASK-482/484 streams, so
every DB assertion is scoped to a unique per-run fixture key and NEVER depends
on global table emptiness or table-wide counts):

```ts
// Shared fixture scoping for BOTH suites:
const RUN_KEY = `/__task483-beacon-test/${crypto.randomUUID()}`; // unique path prefix per run
const runPath = (leaf: string) => `${RUN_KEY}/${leaf}`;
const rowsForPath = (path: string) =>
  db.select().from(analyticsPageviews).where(eq(analyticsPageviews.path, path));
afterAll(async () => {
  // delete ONLY rows this run created (unique path prefix); never truncate
  await db.delete(analyticsPageviews).where(like(analyticsPageviews.path, `${RUN_KEY}/%`));
  // sessions: delete only sessions whose entry_path is under RUN_KEY
});

// Bun route integration: tests/integration/routes/publicAnalytics.test.ts
test("valid beacon with nonce persists one pageview", async () => {
  // POST event with path runPath("happy") -> 204;
  // expect (await rowsForPath(runPath("happy"))).length === 1  — scoped, not a table count
});
test("missing nonce -> 400 analytics_nonce_required", async () => {});
test("GET -> 405", async () => {});
// Bun security: tests/security/analyticsBeacon.test.ts
test("DNT:1 -> 204 and no row written", async () => {
  // path runPath("dnt") -> expect rowsForPath(runPath("dnt")) to be empty (scoped absence)
});
test("bot UA -> 204 and no row written", async () => {
  // path runPath("bot") -> scoped absence, same pattern
});
test("beacon accepted with bot protection enabled (captcha exempt)", async () => {
  // enable botProtection in test security settings -> valid beacon still 204 +
  // scoped row present (guards the binding no-enforceBotProtection decision)
});
test("over rate limit -> 429 analytics_rate_limited", async () => {});
test("oversized body -> 413 analytics_payload_too_large", async () => {});
test("no raw IP or UA appears in persisted row or logs", async () => {
  // inspect ONLY the rows under RUN_KEY
});
```

## Testing Requirements

- **Bun lane (mandatory — runtime/route/security):**
  - `tests/integration/routes/publicAnalytics.test.ts` — dispatch, happy path,
    nonce/method errors (returned via the direct-`ApiError` branch),
    `mapAnalyticsError` coverage of its REACHABLE cases only
    (`analytics_beacon_invalid`, `analytics_persist_failed`, default — nonce
    codes never reach the mapper), scoped DB row assertion.
  - `tests/security/analyticsBeacon.test.ts` — DNT, bot drop, captcha exemption
    with bot protection enabled, rate-limit, oversized body, no-raw-PII
    persistence/logging.
- **Shared remote test DB rule (mandatory):** uniquely scoped fixtures (the
  `RUN_KEY` path-prefix pattern above), assert presence/absence only on rows
  matching the fixture key, `afterAll` deletes only rows this run created; never
  truncate/delete whole analytics tables, never assert global table counts.
- **Inline-prune safety (mandatory):** both suites drive `recordTrafficEvent`
  through the beacon route, so once TASK-483-06-L01 lands the inline
  `maybePruneExpiredTraffic()` at the reserved marker they MUST set
  `ANALYTICS_PRUNE_INLINE_DISABLED=1`; an unset flag would fire an UNSCOPED
  retention delete-by-cutoff against the shared render.com Postgres on the
  ingestion path, purging aged rows other suites/streams own. (06-L01 also
  defaults the inline prune OFF under `NODE_ENV=test` as a backstop.)
- Run security scanners from `_docs/SECURITY_SPEC.md` for the public-write change
  (or state CI-only). `set -a && source .env && set +a` for DB-backed assertions.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
