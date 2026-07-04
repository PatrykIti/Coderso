# TASK-493-03-L02: GSC Data-Sync Service & Sync Route
# FileName: TASK-493-03-L02-Gsc-Data-Sync-Service.md

**Parent Subtask:** TASK-493-03
**Priority:** High
**Category:** Tools / SEO
**Estimated Effort:** Large
**Dependencies:** TASK-493-01, TASK-493-03-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Pull real search-performance + indexing data from GSC and persist it
  into the subtask-01 tables, exposed through an admin-triggered sync route.
- **Owning module(s) to create-or-extend:**
  - `core/services/seo/gscSyncService.ts` (**create** — `syncSearchPerformance()`
    calls the L01 client's `searchanalytics/query` (dimensions `date`, `page`,
    `query`) and upserts `seo_search_metrics` + `seo_search_queries`;
    `syncIndexedPages()` calls URL Inspection / coverage and upserts
    `seo_indexed_pages` via `normalizeIndexingState` from
    `seoSearchPerformanceTypes.ts`).
  - `core/server/routes/seoRoutes.ts` (**extend** — register
    `POST /seo/search-performance/sync`; orchestration-only).
  - `core/server/validation/seoSchemas.ts` (**extend** — `seoSyncSchema`,
    `additionalProperties: false`).
  - `mapSeoError` (`seoRoutes.ts:31`) — add the GSC sync domain codes.
- **Source-of-truth docs:** `_docs/SEARCH_SPEC.md` (ingest addendum),
  `_docs/CMS_API.md` (sync endpoint), `_docs/SECURITY_SPEC.md` (outbound +
  secrets), `_docs/DATA_MODEL.md`.
- **Out of scope:** the aggregation/read surface (subtask 04); the GSC auth
  client (L01); UI (subtask 05); scheduling/cron (manual + future cron is a
  follow-on — the sync is idempotent so a scheduler can reuse it later).

---

## Security Contract

- **Endpoint visibility:** **internal** — `POST /seo/search-performance/sync`
  under `${adminPath}/api` (`httpServer.ts:510`).
- **Auth model:** session admin via `requirePermission` dep
  (`registerSeoRoutes`, `routes/index.ts:96`).
- **RBAC:** `settings:write` — the sync decrypts a secret credential and makes an
  outbound call (settings-grade), matching `integrationsRoutes.ts`. No `seo:*`
  permission exists.
- **CSRF:** **required** (internal write/POST).
- **Rate-limit bucket:** `admin_write`.
- **Validation:** `seoSyncSchema` (owner = `core/server/validation/seoSchemas.ts`),
  `additionalProperties: false`. Optional `{ startDate?, endDate?, scope? }`;
  clamp the date window (e.g. ≤ 16 months, GSC's max) and reject malformed dates
  before any outbound call.
- **Anti-abuse:** internal admin write — RBAC + CSRF + `admin_write` rate-limit
  (the public-form nonce/HMAC machinery does not apply).
- **Secret/PII handling — critical:** credential decrypted **server-side only**
  via the L01 client; the token/credential never reach the response, cache,
  audit metadata, or logs. Persist only URLs, query strings, and aggregate
  counts (no PII). GSC query strings are public-aggregate search terms, not user
  PII; still keep them out of debug logs by default.

---

## Implementation Pseudocode

```ts
// core/services/seo/gscSyncService.ts
export async function syncSearchPerformance(input: { startDate?: string; endDate?: string }) {
  const { startDate, endDate } = clampWindow(input);           // throws gsc_sync_window_invalid
  const client = await getGscClient("webmasters.readonly");    // throws gsc_not_configured
  const property = encodeURIComponent(client.siteUrl);

  const byPage = await client.request("POST",
    `sites/${property}/searchAnalytics/query`,
    { startDate, endDate, dimensions: ["date", "page"], rowLimit: 25000 });
  await upsertMetrics(byPage.rows ?? []);                       // -> seo_search_metrics

  const byQuery = await client.request("POST",
    `sites/${property}/searchAnalytics/query`,
    { startDate, endDate, dimensions: ["date", "page", "query"], rowLimit: 25000 });
  await upsertQueries(byQuery.rows ?? []);                      // -> seo_search_queries

  return { metrics: byPage.rows?.length ?? 0, queries: byQuery.rows?.length ?? 0 };
}

export async function syncIndexedPages() {
  // Inspect known page/entry URLs (or read the coverage report); coerce each
  // GSC indexingState via normalizeIndexingState; upsert seo_indexed_pages by url.
}
```

```ts
// core/server/routes/seoRoutes.ts (extend)
//   map: gsc_not_configured -> 409, gsc_sync_window_invalid -> 400,
//        gsc_credential_invalid -> 400, gsc_request_failed:* -> 502
router.post("/seo/search-performance/sync", requirePermission("settings:write"), async (ctx) => {
  try {
    validate(seoSyncSchema, ctx.body);
    const out = await syncSearchPerformance(ctx.body as { startDate?: string; endDate?: string });
    await syncIndexedPages();
    return out;
  } catch (error) { throwMappedSeoError(error); }
});
```

**Data flow:** validate body → clamp window → `getGscClient` (server-side
decrypt) → outbound GSC queries → idempotent upserts keyed by the unique indexes
from 01 → return aggregate counts (no secrets). Re-running overwrites the same
day buckets (idempotent), so a future cron can reuse it.

**Error handling:** domain codes (`gsc_not_configured`, `gsc_sync_window_invalid`,
`gsc_credential_invalid`, `gsc_request_failed:<status>`) mapped at the route
boundary via `mapSeoError`.

**Regression-test shape:**
- Route: registration, `settings:write` gate, CSRF required, reject-unknown body,
  error-code → status mapping.
- Service: GSC rows upsert into the right tables; re-sync is idempotent (no dup
  rows on the unique index); `normalizeIndexingState` applied; window clamp
  rejects out-of-range/malformed dates.
- Security: token/credential never in response/audit/logs.

---

## Testing Requirements

- **Bun** (`tests/integration/routes/seo-sync.test.ts`) — sync route + service
  with the GSC client stubbed; outbound + DB-write runtime flow ⇒ Bun lane.
- **Bun security** (`tests/security/seo-sync.test.ts`) — secret-never-to-client/
  log + window-clamp guard.
- `bun run lint` + `bun run typecheck`.
