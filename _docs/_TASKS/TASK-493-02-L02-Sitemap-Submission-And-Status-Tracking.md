# TASK-493-02-L02: Sitemap Submission & Status Tracking
# FileName: TASK-493-02-L02-Sitemap-Submission-And-Status-Tracking.md

**Parent Subtask:** TASK-493-02
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-01, TASK-493-03-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Submit the generated sitemap to Google Search Console and persist its
  submission status, so the admin can submit on demand and read the latest
  status (pending/submitted/processed/error, URL count, warnings, errors).
- **Owning module(s) to create-or-extend:**
  - `core/services/seo/sitemapService.ts` (**extend** — `submitSitemap()` calls
    the GSC client (`gscClient` from `TASK-493-03-L01`)
    `PUT sitemaps/{feedpath}` then upserts a `seo_sitemap_submissions` row;
    `getSitemapStatus()` reads the latest rows; `refreshSitemapStatus()` calls
    GSC `GET sitemaps` and updates warnings/errors/lastDownloadedAt).
  - `core/server/routes/seoRoutes.ts` (**extend** — register
    `GET /seo/sitemap`, `POST /seo/sitemap/submit`; orchestration-only).
  - `core/server/validation/seoSchemas.ts` (**extend** — `seoSitemapSubmitSchema`
    with `additionalProperties: false`).
  - Error mapping: extend the existing `mapSeoError` (`seoRoutes.ts:31`) with the
    new sitemap domain codes.
- **Source-of-truth docs:** `_docs/CMS_API.md` (SEO Manager endpoints),
  `_docs/SECURITY_SPEC.md` (server-side outbound + secret handling),
  `_docs/SEARCH_SPEC.md`.
- **Out of scope:** sitemap **generation/serving** (L01); the GSC auth client
  itself (03-L01); search-analytics sync (03-L02).

---

## Security Contract

- **Endpoint visibility:** **internal** — `GET /seo/sitemap`,
  `POST /seo/sitemap/submit` under the admin API prefix
  (`${adminPath}/api`, `httpServer.ts:510`).
- **Auth model:** session (admin), via the router `requirePermission` dep
  threaded through `registerSeoRoutes` (`routes/index.ts:96`).
- **RBAC:** `GET /seo/sitemap` → `content:read`; `POST /seo/sitemap/submit` →
  `settings:write` (submission is a settings-grade, secret-bearing outbound op,
  matching `integrationsRoutes.ts`). No `seo:*` permission exists.
- **CSRF:** **required** for `POST /seo/sitemap/submit` (internal write) — same
  CSRF gate as other admin writes.
- **Rate-limit bucket:** `admin_write` for the submit POST; `admin_read` for the
  status GET.
- **Validation:** `seoSitemapSubmitSchema` (schema-owner =
  `core/server/validation/seoSchemas.ts`), `additionalProperties: false`
  (reject-unknown). Optional `{ sitemapPath?: string }`; otherwise default to the
  site `/sitemap.xml`. Validate the path is an own-origin sitemap path (no SSRF —
  never submit an attacker-supplied absolute URL).
- **Anti-abuse:** internal admin write — nonce/HMAC public-form machinery does
  not apply; protection is RBAC + CSRF + `admin_write` rate-limit.
- **Secret/PII handling:** the GSC OAuth/service-account credential is decrypted
  **server-side only** via `getIntegrationRuntimeConfig("google-search-console")`
  and used to mint a short-lived access token; the token and credential **never**
  appear in the response, cache, audit metadata, or logs. Persist only
  status/counts in `seo_sitemap_submissions`. Outbound call is server-to-Google.

---

## Implementation Pseudocode

```ts
// core/services/seo/sitemapService.ts (extend)
export async function submitSitemap(input: { sitemapPath?: string }) {
  const path = normalizeOwnOriginSitemapPath(input.sitemapPath); // throws sitemap_path_invalid
  const sitemapUrl = `${siteOrigin()}${path}`;
  const client = await getGscClient();                 // 03-L01; throws gsc_not_configured
  try {
    await client.request("PUT", `sitemaps/${encodeURIComponent(sitemapUrl)}`);
  } catch (e) {
    await upsertSubmission({ sitemapUrl, status: "error", lastErrorMessage: redact(e) });
    throw new Error("sitemap_submit_failed");
  }
  return upsertSubmission({ sitemapUrl, status: "submitted", lastSubmittedAt: new Date() });
}
```

```ts
// core/server/routes/seoRoutes.ts (extend mapSeoError + register)
//   map: sitemap_path_invalid -> 400, gsc_not_configured -> 409, sitemap_submit_failed -> 502
router.get("/seo/sitemap", requirePermission("content:read"), () => getSitemapStatus());
router.post("/seo/sitemap/submit", requirePermission("settings:write"), async (ctx) => {
  try {
    validate(seoSitemapSubmitSchema, ctx.body);
    return await submitSitemap(ctx.body as { sitemapPath?: string });
  } catch (error) { throwMappedSeoError(error); }
});
```

**Data flow:** validate body → `submitSitemap` (own-origin path guard → decrypt
credential server-side → mint token → PUT to GSC → upsert status) → return the
sanitized submission row (no secrets). Routes stay orchestration-only.

**Error handling:** machine-readable domain codes (`sitemap_path_invalid`,
`gsc_not_configured`, `sitemap_submit_failed`) raised in the service and mapped
to transport status only at the route boundary via `mapSeoError`.

**Regression-test shape:**
- Route: registration, `content:read` vs `settings:write` gating, CSRF required
  on POST, reject-unknown body, error-code → status mapping.
- Security: response/audit/logs contain **no** credential or access token;
  attacker absolute-URL `sitemapPath` rejected (`sitemap_path_invalid`).
- Service: `submitSitemap` records `error` status on GSC failure and `submitted`
  on success; status read returns latest per source.

---

## Testing Requirements

- **Bun** (`tests/integration/routes/seo-sitemap.test.ts`) — submit/status route
  integration with the GSC client stubbed; runtime/outbound flow ⇒ Bun lane.
- **Bun security** (`tests/security/seo-sitemap.test.ts`) — secret-never-to-client
  + SSRF path guard assertions.
- `bun run lint` + `bun run typecheck`.
