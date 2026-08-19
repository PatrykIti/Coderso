# TASK-493-03-L02: GSC Data-Sync Service
# FileName: TASK-493-03-L02-Gsc-Data-Sync-Service.md

**Parent Subtask:** TASK-493-03
**Priority:** High
**Category:** Tools / SEO
**Estimated Effort:** Large
**Dependencies:** TASK-493-01, TASK-493-02-L01 (provides `collectSitemapUrls()`), TASK-493-03-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Pull real search-performance + indexing data from GSC and persist it
  into the subtask-01 tables, exposed through an admin-triggered sync route.
- **Owning module(s) to create-or-extend:**
  - `core/services/seo/gscSyncService.ts` (**create** — `syncSearchPerformance()`
    calls the L01 client's `request()` against `searchanalytics/query`
    (dimensions `date`, `page`, `query`) and upserts `seo_search_metrics` +
    `seo_search_queries`; `syncIndexedPages()` runs a BOUNDED per-URL URL
    Inspection loop (via the L01 client's `inspectUrl`) over the sitemap's public
    page/entry URLs and upserts `seo_indexed_pages` via `normalizeIndexingState`
    from `seoSearchPerformanceTypes.ts`).
  - **Route registration + schema ownership live in 04-L02.** This leaf owns the
    service + service tests only; it does NOT write
    `core/server/routes/seoRoutes.ts` or `core/server/validation/seoSchemas.ts`.
  - `mapSeoError` extension (`seoRoutes.ts:31`) is owned by 04-L02. Note: the
    current `mapSeoError` matches exact `error.message === "..."`; the new
    `gsc_request_failed:<status>` mapping needs `startsWith("gsc_request_failed:")`,
    not exact equality — 04-L02 must implement it this way.
- **Source-of-truth docs:** `_docs/SEARCH_SPEC.md` (ingest addendum),
  `_docs/CMS_API.md` (sync endpoint), `_docs/SECURITY_SPEC.md` (outbound +
  secrets), `_docs/DATA_MODEL.md`.
- **Out of scope:** the aggregation/read surface (subtask 04); the GSC auth
  client (L01); UI (subtask 05); scheduling/cron (manual + future cron is a
  follow-on — the sync is idempotent so a scheduler can reuse it later).
- **Indexing-status note:** the Search Analytics `page` dimension is NOT indexing
  status — it is a performance dimension. Indexing state comes only from the v1
  URL Inspection endpoint (`inspectUrl`), never from `searchanalytics/query`.

---

## Security Contract

> **Consumer contract (04-L02 implements the route; this leaf owns the service only).**
> `POST /seo/search-performance/sync`, `seoSyncSchema`, and the `mapSeoError`
> extension are assembled in 04-L02. 04-L02 MUST honor the endpoint/RBAC/CSRF
> contract below and call this leaf's `syncSearchPerformance`/`syncIndexedPages`.

- **Endpoint visibility:** **internal** — `POST /seo/search-performance/sync`
  under `${adminPath}/api` (`httpServer.ts:557-558`).
- **Auth model:** session admin via `requirePermission` dep
  (`registerSeoRoutes`, `routes/index.ts:102`).
- **RBAC:** `settings:write` — the sync decrypts a secret credential and makes an
  outbound call (settings-grade), matching `integrationsRoutes.ts`. No `seo:*`
  permission exists.
- **CSRF:** **required** (internal write/POST).
- **Rate-limit bucket:** `admin_write`.
- **Validation:** `seoSyncSchema` (schema owner = 04-L02,
  `core/server/validation/seoSchemas.ts`), `additionalProperties: false`.
  Optional `{ startDate?, endDate? }`; clamp the date window (e.g. ≤ 16
  months, GSC's max) and reject malformed dates before any outbound call. The
  window clamp helper (`clampWindow`) lives in this leaf's service.
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

export async function syncIndexedPages(options: { maxUrls?: number } = {}) {
  const maxUrls = clampInt(options.maxUrls ?? 50, 1, 50);   // BOUNDED per-URL loop (cap 50/run)
  const client = await getGscClient("webmasters.readonly"); // throws gsc_not_configured
  const urls = (await collectSitemapUrls()).slice(0, maxUrls); // public page/entry URLs (02-L01)
  let inspected = 0, skipped = 0;
  for (const url of urls) {
    try {
      const result = await client.inspectUrl(url);          // v1 urlInspection/index:inspect (~2000/day quota)
      await upsertIndexedPage({ url, ...normalizeIndexingState(result) }); // -> seo_indexed_pages
      inspected++;
    } catch (e) {
      if (e instanceof Error && e.message === "gsc_request_failed:429") {
        skipped = urls.length - inspected;                  // 429: soft-skip the remainder
        break;
      }
      throw e;
    }
  }
  return { inspected, skipped, total: urls.length };
}
```

Route registration, `seoSyncSchema`, and the `mapSeoError` extension live in
04-L02 (see the consumer contract above); this leaf owns the service + service
tests only.

**Data flow:** (04-L02 route validates body) → clamp window → `getGscClient`
(server-side decrypt) → outbound GSC Search Analytics queries + bounded URL
Inspection loop → idempotent upserts keyed by the unique indexes from 01 →
return aggregate counts (no secrets). Re-running overwrites the same day buckets
(idempotent), so a future cron can reuse it.

**Error handling:** domain codes (`gsc_not_configured`, `gsc_sync_window_invalid`,
`gsc_credential_invalid`, `gsc_request_failed:<status>`) raised in the service;
the 04-L02 route boundary maps them via `mapSeoError`. Note: the current
`mapSeoError` matches exact `error.message === "..."`; the
`gsc_request_failed:<status>` mapping must use
`startsWith("gsc_request_failed:")`, not exact equality.

**Regression-test shape:**
- Service: GSC rows upsert into the right tables; re-sync is idempotent (no dup
  rows on the unique index); `normalizeIndexingState` applied; window clamp
  rejects out-of-range/malformed dates; `syncIndexedPages` inspects at most 50
  URLs per run and soft-skips the remainder on 429.
- Service security: token/credential never persisted or logged.
- Route-level assertions (registration, `settings:write` gate, CSRF,
  reject-unknown body, error-code → status mapping, secret-never-to-client) land
  in 04-L02.

---

## Testing Requirements

- **Bun** (`tests/integration/seo/gscSyncService.test.ts`) — sync service with
  the GSC client stubbed (Search Analytics + URL Inspection); outbound + DB-write
  runtime flow ⇒ Bun lane. Route integration tests land in 04-L02.
- **Bun security** (`tests/security/seo-sync-service.test.ts`) — window-clamp
  guard + bounded URL Inspection loop (≤ 50 URLs, 429 soft-skip). Route-level
  secret-never-to-client assertions land in 04-L02.
- `bun run lint` + `bun run typecheck`.
