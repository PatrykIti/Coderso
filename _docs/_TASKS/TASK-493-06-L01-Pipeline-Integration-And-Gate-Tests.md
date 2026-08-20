# TASK-493-06-L01: Pipeline Integration & Gate Tests
# FileName: TASK-493-06-L01-Pipeline-Integration-And-Gate-Tests.md

**Parent Subtask:** TASK-493-06
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-01, TASK-493-02, TASK-493-03, TASK-493-04, TASK-493-05
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-19

---

## Overview

- **Goal:** Prove the whole pipeline works end-to-end and lock in perf + security
  gates that span the new routes.
- **Owning module(s) to create-or-extend:**
  - `tests/integration/routes/seo-pipeline.test.ts` (**create** — seed a page →
    run sync (GSC stubbed) → assert 01-table rows → call `/seo/overview` &
    `/seo/search-performance` → submit sitemap → assert status → fetch
    `/sitemap.xml`).
  - `tests/perf/seo-sitemap.test.ts` (**create** — `/sitemap.xml` + `/seo/overview`
    stay within a response-time budget at N seeded URLs).
  - `tests/security/seo-pipeline.test.ts` (**create** — sweep all new routes for
    secret-never-to-client + RBAC/CSRF enforcement).
  - `tests/integration/routes/seo.test.ts` (**extend** — the existing ~100-line
    file covers route registration + `mapSeoError`; add registration coverage
    for the 5 new routes (`GET /seo/overview`, `GET /seo/search-performance`,
    `POST /seo/search-performance/sync`, `GET /seo/sitemap`,
    `POST /seo/sitemap/submit`) and `mapSeoError` coverage for the new codes
    (`gsc_not_configured`, `gsc_credential_invalid`, `gsc_sync_window_invalid`,
    `gsc_request_failed:<status>` via `startsWith("gsc_request_failed:")`,
    `sitemap_path_invalid`, `sitemap_submit_failed`)).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`,
  `_docs/SEARCH_SPEC.md`.
- **Out of scope:** new product behaviour; this leaf only tests what 01–05 ship.

---

## Security Contract

- **Endpoint visibility:** n/a (tests). The suite **asserts** the contracts the
  feature leaves declared.
- **Auth model / RBAC:** the security test asserts `content:read` on read routes,
  `settings:write` on `/seo/sitemap/submit` and `/seo/search-performance/sync`,
  and `403` for missing permission.
- **CSRF:** assert the two internal writes reject a missing/invalid CSRF token.
- **Rate-limit:** assert `/sitemap.xml` uses `public_read`; admin routes use
  `admin_read`/`admin_write`.
- **Validation:** assert reject-unknown on each new schema and the SSRF/sitemap
  path guard.
- **Secret/PII handling:** assert the GSC credential/token never appears in any
  response body, audit metadata, or log captured during the flow.

---

## Implementation Pseudocode

```ts
// tests/integration/routes/seo-pipeline.test.ts
test("schema -> sync -> aggregate -> sitemap end-to-end", async () => {
  await seedPublishedPage("/launch");
  stubGsc({ metrics: [...], queries: [...], index: [{ url: ".../launch", state: "INDEXED" }] });

  await POST("/seo/search-performance/sync", {}, asUser("settings:write"));   // 200
  expect(await rowCount("seo_search_metrics")).toBeGreaterThan(0);

  const overview = await GET("/seo/overview", asUser("content:read"));
  expect(overview.indexedPages).toBe(1);
  expect(overview.totalImpressions).toBeGreaterThan(0);

  await POST("/seo/sitemap/submit", {}, asUser("settings:write"));            // 200
  const status = await GET("/seo/sitemap", asUser("content:read"));
  expect(status[0].status).toBe("submitted");

  const xml = await GETpublic("/sitemap.xml");
  expect(xml).toContain("/launch");
});
```

**Data flow:** seed → stub GSC → exercise every new route in order → assert DB +
responses + secret-absence.

**Error handling:** the suite also covers the unhappy paths
(`gsc_not_configured` → 409, reject-unknown → `validation_error`, missing
permission → 403, missing CSRF → 403).

**Regression-test shape:** the end-to-end happy path + the security/perf gates
above; this is the closure evidence for the umbrella.

---

## Testing Requirements

- **Bun** for all suites — runtime/route/security/perf flows ⇒ Bun lane
  (`tests/integration/*`, `tests/security/*`, `tests/perf/*`): the three new
  files above plus the extended `tests/integration/routes/seo.test.ts`.
- Run with the full gate: `bun test` (the new suites) + the per-leaf Vitest
  suites green; `bun run lint` + `bun run typecheck`.
- State explicitly in the closeout if the Google stub had to approximate any GSC
  response shape.
