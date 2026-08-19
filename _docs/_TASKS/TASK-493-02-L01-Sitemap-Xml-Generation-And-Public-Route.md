# TASK-493-02-L01: Sitemap XML Generation & Public Route
# FileName: TASK-493-02-L01-Sitemap-Xml-Generation-And-Public-Route.md

**Parent Subtask:** TASK-493-02
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Build a sitemap XML from published pages + content entries, excluding
  noindex/`robots: noindex` targets, and serve it publicly at `/sitemap.xml`
  with a matching `robots.txt` `Sitemap:` line.
- **Owning module(s) to create-or-extend:**
  - `core/services/seo/sitemapService.ts` (**create** — pure builder
    `buildSitemapXml(entries)` + a DB-backed `collectSitemapUrls()` that reads
    `pages`/`contentEntries` and `seo_documents` robots via the existing
    `resolvePublicSeoMetadata` (`seoService.ts:454`)).
  - `core/server/publicSite.tsx` (**extend** — add `/sitemap.xml` and
    `/robots.txt` branches inside `handlePublicRequest` near the `/api/search`
    dispatch at `:317`, reusing the existing `public_read` `checkRateLimit`
    already applied at `:309` and the `new Response(...)` pattern).
- **Source-of-truth docs:** `_docs/SEARCH_SPEC.md`, `_docs/CMS_API.md` (document
  the public `/sitemap.xml`), `_docs/SECURITY_SPEC.md` (public read surface).
- **Out of scope:** sitemap **submission** to Google (L02); sitemap index
  splitting for >50k URLs (single sitemap is sufficient for current scale — note
  as a follow-on); image/video/news sitemap extensions.

> **Shared boundary `core/server/publicSite.tsx`** is also extended by TASK-493 (additive injection only; TASK-483/486/491 are Done and no longer co-write this file). S3/S4/S6 publicSite writers are separate open streams — additive injection only. Reuse the existing forms/booking public-write nonce evaluator, do not invent a competing one-off nonce.

---

## Security Contract

- **Endpoint visibility:** **public** — `GET /sitemap.xml`, `GET /robots.txt`
  served from the site root via `handlePublicRequest`.
- **Auth model:** anonymous read (public, like page rendering).
- **RBAC:** none (public read).
- **CSRF:** n/a (GET, no state change).
- **Rate-limit bucket:** `public_read` — reuse the existing
  `checkRateLimit("public_read", { ip, userAgent }, security.rateLimit)` already
  invoked in `handlePublicRequest` before route dispatch.
- **Validation:** no request body. Only published, indexable targets are emitted;
  XML-escape every URL (`&`, `<`, `>`, `"`, `'`) to prevent injection into the
  XML document.
- **Anti-abuse:** n/a (no write). Output reveals only already-public URLs — never
  draft/unpublished pages, never `noindex` targets, never internal IDs.
- **Secret/PII handling:** no secrets; do not include unpublished slugs or any
  admin-only data. Confirm draft pages are excluded by the published filter.

---

## Implementation Pseudocode

```ts
// core/services/seo/sitemapService.ts
type SitemapEntry = { loc: string; lastmod?: string };

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function buildSitemapXml(entries: SitemapEntry[], origin: string): string {
  const urls = entries.map((e) => {
    const loc = xmlEscape(e.loc.startsWith("http") ? e.loc : `${origin}${e.loc}`);
    const lastmod = e.lastmod ? `<lastmod>${xmlEscape(e.lastmod)}</lastmod>` : "";
    return `<url><loc>${loc}</loc>${lastmod}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}

export async function collectSitemapUrls(): Promise<SitemapEntry[]> {
  // published pages + entries; for each, resolvePublicSeoMetadata(...) and SKIP
  // when robots contains "noindex". Use slug -> path, updatedAt -> lastmod.
  // Returns a de-duplicated, ordered list.
}
```

```ts
// core/server/publicSite.tsx — inside handlePublicRequest, after :317
if (url.pathname === "/sitemap.xml") {
  const entries = await collectSitemapUrls();
  const xml = buildSitemapXml(entries, url.origin);
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
if (url.pathname === "/robots.txt") {
  const body = `User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
```

**Data flow:** request → `public_read` rate-limit (existing) → `collectSitemapUrls`
(published + indexable only) → `buildSitemapXml` → `Response`. The builder is
pure/synchronous and unit-testable without a DB.

**Error handling:** on DB failure, return an empty but valid `<urlset/>` rather
than a 500 (a broken sitemap must not take the public site down); log
server-side. No domain error codes cross to the client beyond standard HTTP.

**Regression-test shape:**
- Builder: escaping, absolute-vs-relative `loc`, `lastmod` presence/absence,
  empty list ⇒ valid empty `urlset`.
- Collector: noindex targets excluded; unpublished excluded; no duplicate URLs.
- Route: 200 + `application/xml`; `robots.txt` contains the `Sitemap:` line.

---

## Testing Requirements

- **Vitest** (`tests/vitest/seo/sitemapBuilder.test.ts`) — pure
  `buildSitemapXml` cases.
- **Bun** (`tests/integration/routes/sitemap.test.ts`) — `GET /sitemap.xml` and
  `GET /robots.txt` against the running public handler: content-type, noindex
  exclusion via a seeded `seo_documents` row, rate-limit bucket. Public-route
  runtime flow ⇒ **Bun lane**.
- `bun run lint` + `bun run typecheck`.
