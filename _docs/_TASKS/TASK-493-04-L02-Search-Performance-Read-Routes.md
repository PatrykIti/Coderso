# TASK-493-04-L02: SEO Routes + Validation Assembly (Read, Sync, Sitemap)
# FileName: TASK-493-04-L02-Search-Performance-Read-Routes.md

**Parent Subtask:** TASK-493-04
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-04-L01, TASK-493-02-L02, TASK-493-03-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Assemble the complete SEO route + validation surface: the L01
  aggregation read routes the SEO Manager consumes, plus the 02/03 sync and
  sitemap routes, all behind one `mapSeoError` mapping.
- **Owning module(s) to create-or-extend (this leaf is the SINGLE WRITER for
  all three):**
  - `core/server/routes/seoRoutes.ts` (**extend** — register ALL FIVE routes:
    `GET /seo/overview`, `GET /seo/search-performance` (read),
    `POST /seo/search-performance/sync` (calls the 03-L02 service),
    `GET /seo/sitemap`, `POST /seo/sitemap/submit` (calls the 02-L02 service);
    orchestration-only, no schema/enum re-declaration).
  - `core/server/validation/seoSchemas.ts` (**extend** — ALL THREE schemas:
    `seoSearchPerformanceQuerySchema`, `seoSyncSchema`,
    `seoSitemapSubmitSchema`, each `additionalProperties: false`).
  - `mapSeoError` (`seoRoutes.ts:31`) — add the GSC sync + sitemap domain codes.
  - **Cross-stream guard:** 02-L02 and 03-L02 own their SERVICES (and service
    tests) only and do NOT extend these route/validation files; this leaf is
    the only writer of `seoRoutes.ts` / `seoSchemas.ts`.
- **Source-of-truth docs:** `_docs/CMS_API.md` (SEO Manager endpoints — synced in
  06-L02), `_docs/SECURITY_SPEC.md`, `_docs/SEARCH_SPEC.md`.
- **Out of scope:** the aggregation math (L01); the sync/submit service logic
  (02-L02/03-L02 services, imported here); UI wiring (05).

---

## Security Contract

- **Endpoint visibility:** **internal** — all five routes under
  `${adminPath}/api` (`httpServer.ts:557-558`).
- **Auth model:** session admin via the `requirePermission` dep threaded
  through `registerSeoRoutes` (`routes/index.ts:102`).
- **RBAC:** the three reads (`GET /seo/overview`,
  `GET /seo/search-performance`, `GET /seo/sitemap`) → `content:read` (matching
  the existing `GET /seo` in `seoRoutes.ts:73`); the two writes
  (`POST /seo/search-performance/sync`, `POST /seo/sitemap/submit`) →
  `settings:write` (settings-grade, secret-bearing outbound ops, matching
  `integrationsRoutes.ts`). No `seo:*` permission exists.
- **CSRF:** **required** for the two POST routes (internal writes) — same CSRF
  gate as other admin writes; n/a for the three GETs.
- **Rate-limit bucket:** `admin_read` for the three GETs; `admin_write` for the
  two POSTs.
- **Validation:** all three schemas owned by
  `core/server/validation/seoSchemas.ts`, `additionalProperties: false`
  (reject-unknown):
  - `seoSearchPerformanceQuerySchema`: optional
    `{ targetId?, startDate?, endDate?, limit? }`; `limit` clamped server side;
    query params parsed to the schema before the L01 service call.
  - `seoSyncSchema`: optional `{ startDate?, endDate? }`; the date window is
    clamped in the 03-L02 service (`gsc_sync_window_invalid` on malformed /
    out-of-range input before any outbound call).
  - `seoSitemapSubmitSchema`: optional `{ sitemapPath? }`; own-origin sitemap
    path only — never submit an attacker-supplied absolute URL (no SSRF).
- **Anti-abuse:** internal admin writes — RBAC + CSRF + `admin_write`
  rate-limit; the public-form nonce/HMAC machinery does not apply.
- **Secret/PII handling:** responses carry only aggregate counts, public query
  strings, and sanitized sitemap status. The GSC credential/token is decrypted
  and used **server-side only** by the 02-L02/03-L02 services and **never**
  appears in responses, caches, audit metadata, or logs.

---

## Error Mapping (`mapSeoError` extension)

Add to the existing exact-match mapping in `mapSeoError` (`seoRoutes.ts:31`):

| Domain code | HTTP status |
|-------------|-------------|
| `gsc_not_configured` | 409 |
| `gsc_credential_invalid` | 400 |
| `gsc_sync_window_invalid` | 400 |
| `gsc_request_failed:<status>` (matched via `startsWith("gsc_request_failed:")`) | 502 |
| `sitemap_path_invalid` | 400 |
| `sitemap_submit_failed` | 502 |

Note: `mapSeoError` currently matches exact `error.message === "..."`; the
`gsc_request_failed:*` mapping requires `startsWith("gsc_request_failed:")`, not
an exact match.

---

## Implementation Pseudocode

```ts
// core/server/routes/seoRoutes.ts (extend mapSeoError + register)

// --- read routes (L01 aggregation service) ---
router.get("/seo/overview", requirePermission("content:read"), () => getSeoOverview());

router.get("/seo/search-performance", requirePermission("content:read"), async (ctx) => {
  try {
    validate(seoSearchPerformanceQuerySchema, ctx.query);
    return await getSearchPerformance({
      targetId: ctx.query.targetId,
      startDate: ctx.query.startDate,
      endDate: ctx.query.endDate,
      limit: ctx.query.limit ? Number(ctx.query.limit) : undefined,
    });
  } catch (error) { throwMappedSeoError(error); }
});

// --- sync route (03-L02 gscSyncService; moved from 03-L02) ---
router.post("/seo/search-performance/sync", requirePermission("settings:write"), async (ctx) => {
  try {
    validate(seoSyncSchema, ctx.body);
    const out = await syncSearchPerformance(ctx.body as { startDate?: string; endDate?: string });
    await syncIndexedPages();
    return out;
  } catch (error) { throwMappedSeoError(error); }
});

// --- sitemap routes (02-L02 sitemapSubmissionService; moved from 02-L02) ---
router.get("/seo/sitemap", requirePermission("content:read"), () => getSitemapStatus());

router.post("/seo/sitemap/submit", requirePermission("settings:write"), async (ctx) => {
  try {
    validate(seoSitemapSubmitSchema, ctx.body);
    return await submitSitemap(ctx.body as { sitemapPath?: string });
  } catch (error) { throwMappedSeoError(error); }
});
```

**Data flow:** validate (reject-unknown, all three schemas) → call the L01
aggregation (reads) or the 02-L02/03-L02 services (writes) → return the bounded
shape. Routes stay orchestration-only; schemas/enums/`normalize*` helpers are
re-imported from the validation + service modules, never re-declared.

**Error handling:** validation failures → `validation_error` at the route
boundary; the six domain codes above are raised in the 02/03 services and mapped
to transport status only at the route boundary via `throwMappedSeoError`
(`seoRoutes.ts:61`); any unexpected service error → `seo_error` 500.

**Regression-test shape:**
- Route: registration of ALL FIVE routes; `content:read` gate on the three
  GETs; `settings:write` gate on the two POSTs; CSRF required on the two POSTs;
  reject-unknown query/body for all three schemas; `limit` clamp; response
  shapes match `SeoOverview` / `SeoSearchPerformance`; error-code → status
  mapping for all six new codes (incl. `gsc_request_failed:<status>` via
  `startsWith`).
- Empty-data path returns zeroed totals (not an error).

---

## Testing Requirements

- **Bun** (`tests/integration/routes/seo-performance.test.ts` — **create**; the
  file does not exist on disk today, it is not an extension of the existing
  100-line `tests/integration/routes/seo.test.ts`). Route/validation assembly
  coverage: registration of all five routes, RBAC gates, CSRF on the two
  writes, reject-unknown schemas, `mapSeoError` mapping; route integration
  across all five routes with the 02-L02/03-L02 GSC + sitemap services stubbed
  and seeded 01-table rows. Route/runtime flow ⇒ Bun lane.
- Cross-stream guard: the existing `tests/integration/routes/seo.test.ts`
  (registration + `mapSeoError` suite) is updated by 06-L01 (D9); this leaf
  must not edit it.
- `bun run lint` + `bun run typecheck`.
