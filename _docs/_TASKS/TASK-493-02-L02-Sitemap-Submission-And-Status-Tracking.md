# TASK-493-02-L02: Sitemap Submission & Status Tracking
# FileName: TASK-493-02-L02-Sitemap-Submission-And-Status-Tracking.md

**Parent Subtask:** TASK-493-02
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-01, TASK-493-03-L01
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-19

---

## Overview

- **Goal:** Submit the generated sitemap to Google Search Console and persist its
  submission status, so the admin can submit on demand and read the latest
  status (pending/submitted/processed/error, URL count, warnings, errors).
- **Owning module(s) to create-or-extend:**
  - `core/services/seo/sitemapSubmissionService.ts` (**create** —
    `submitSitemap()` calls the GSC client (`getGscClient` from
    `TASK-493-03-L01`) `PUT sites/{siteUrl}/sitemaps/{feedpath}` then upserts a
    `seo_sitemap_submissions` row; `getSitemapStatus()` reads the latest rows;
    `refreshSitemapStatus()` calls GSC `GET sitemaps` and updates
    warnings/errors/lastDownloadedAt).
  - **Route registration + schema ownership live in 04-L02.** This leaf owns the
    service + service tests only; it does NOT write
    `core/server/routes/seoRoutes.ts` or `core/server/validation/seoSchemas.ts`.
  - `core/services/seo/sitemapService.ts` is owned exclusively by 02-L01
    (builder + collector); 02-L02 does not extend it.
- **Source-of-truth docs:** `_docs/CMS_API.md` (SEO Manager endpoints),
  `_docs/SECURITY_SPEC.md` (server-side outbound + secret handling),
  `_docs/SEARCH_SPEC.md`.
- **Out of scope:** sitemap **generation/serving** (L01); the GSC auth client
  itself (03-L01); search-analytics sync (03-L02).

---

## Security Contract

> **Consumer contract (04-L02 implements the route; this leaf owns the service only).**
> `GET /seo/sitemap`, `POST /seo/sitemap/submit`, `seoSitemapSubmitSchema`, and
> the `mapSeoError` extension are assembled in 04-L02. 04-L02 MUST honor the
> endpoint/RBAC/CSRF contract below and call this leaf's
> `submitSitemap`/`getSitemapStatus`/`refreshSitemapStatus`.

- **Endpoint visibility:** **internal** — `GET /seo/sitemap`,
  `POST /seo/sitemap/submit` under the admin API prefix
  (`${adminPath}/api`, `httpServer.ts:557-558`).
- **Auth model:** session (admin), via the router `requirePermission` dep
  threaded through `registerSeoRoutes` (`routes/index.ts:102`).
- **RBAC:** `GET /seo/sitemap` → `content:read`; `POST /seo/sitemap/submit` →
  `settings:write` (submission is a settings-grade, secret-bearing outbound op,
  matching `integrationsRoutes.ts`). No `seo:*` permission exists.
- **CSRF:** **required** for `POST /seo/sitemap/submit` (internal write) — same
  CSRF gate as other admin writes.
- **Rate-limit bucket:** `admin_write` for the submit POST; `admin_read` for the
  status GET.
- **Validation:** `seoSitemapSubmitSchema` (schema owner = 04-L02,
  `core/server/validation/seoSchemas.ts`), `additionalProperties: false`
  (reject-unknown). Optional `{ sitemapPath?: string }`; otherwise default to the
  site `/sitemap.xml`. The own-origin path guard
  (`normalizeOwnOriginSitemapPath`) lives in this leaf's service and rejects any
  attacker-supplied absolute URL (no SSRF).
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
// core/services/seo/sitemapSubmissionService.ts (create)
export async function submitSitemap(input: { sitemapPath?: string }) {
  const feedpath = normalizeOwnOriginSitemapPath(input.sitemapPath); // throws sitemap_path_invalid
  const client = await getGscClient("webmasters"); // 03-L01; write scope required for the submit PUT (default is webmasters.readonly); throws gsc_not_configured
  try {
    await client.request("PUT",
      `sites/${encodeURIComponent(client.siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`);
  } catch (e) {
    await upsertSubmission({ feedpath, status: "error", lastErrorMessage: redact(e) });
    throw new Error("sitemap_submit_failed");
  }
  return upsertSubmission({ feedpath, status: "submitted", lastSubmittedAt: new Date() });
}
```

Route registration, `seoSitemapSubmitSchema`, and the `mapSeoError` extension
live in 04-L02 (see the consumer contract above); this leaf owns the service +
service tests only.

**Data flow:** (04-L02 route validates body) → `submitSitemap` (own-origin path
guard → decrypt credential server-side → mint token → PUT to GSC → upsert
status) → return the sanitized submission row (no secrets). The 04-L02 route
stays orchestration-only.

**Error handling:** machine-readable domain codes (`sitemap_path_invalid`,
`gsc_not_configured`, `sitemap_submit_failed`) raised in the service; the 04-L02
route boundary maps them to transport status via `mapSeoError`.

**Regression-test shape:**
- Service: `submitSitemap` records `error` status on GSC failure and `submitted`
  on success; `getSitemapStatus` returns latest per source;
  `refreshSitemapStatus` updates warnings/errors/lastDownloadedAt from GSC.
- Service security: attacker absolute-URL `sitemapPath` rejected
  (`sitemap_path_invalid`); no credential/token persisted to the submission row.
- Route-level assertions (registration, `content:read` vs `settings:write`
  gating, CSRF, reject-unknown body, error-code → status mapping,
  secret-never-to-client) land in 04-L02.

---

## Testing Requirements

- **Bun** (`tests/integration/seo/sitemapSubmissionService.test.ts`) — submit/
  status/refresh service flow with the GSC client stubbed; runtime/outbound flow
  ⇒ Bun lane. Route integration tests land in 04-L02.
- **Bun security** (`tests/security/seo-sitemap-submission.test.ts`) — SSRF path
  guard assertions (attacker absolute URL rejected). Route-level
  secret-never-to-client assertions land in 04-L02.
- `bun run lint` + `bun run typecheck`.
